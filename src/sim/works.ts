// Roadworks (V2 part 3, Sobrevivência chaos 3+): a lane closed by cones for 60 m, from the seed.
// More of them at each chaos level: about every 300 m at chaos 3, 220 m at 4 and 180 m at 5.
// Never on a speed bump or a sharp curve. Driving into the cones costs like the curb.
import { BALANCE } from '../config/balance';
import type { CarState } from './car';
import { hurt, scaledDamage } from './chaos';
import { curvesBetween } from './curves';
import { createRng } from './rng';
import { bumpsBetween } from './track';
import type { GameEvent, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const S = BALANCE.survival;
/**
 * One candidate per block; the densest level (chaos 5) uses all of them. About 4 in 10 blocks have no room
 * (speed bumps and sharp curves), so 110 m blocks give works about every 180 m.
 */
const BLOCK = 110;
const DENSEST = S.worksEvery[S.worksEvery.length - 1]!;
const CLEARANCE = 20; // m from bumps and sharp curves
/** m kept free at the end of a block, so two works never touch */
const GAP = 20;
const LANE_HALF = 1.5;
/** m into the works that still count as a front hit */
const FRONT = 4;
const HOLD_SPEED = 0.35;
/** m ahead kept in the list: past the farthest traffic car (they always see the cones in time) */
const AHEAD = BALANCE.traffic.spawnAheadMax + 260;

export interface Works {
  s: number;
  lane: 0 | 1 | 2 | 3;
  length: number;
  /** first chaos level where these works are on the road */
  chaos: number;
}

export const worksLaneX = (wk: Works): number => BALANCE.road.laneCenters[wk.lane];

/** Chaos level a candidate with roll r (0..1) belongs to: a share DENSEST / every of the candidates at each level. */
function levelOf(r: number): number {
  for (let i = 0; i < S.worksEvery.length; i++) if (r < DENSEST / S.worksEvery[i]!) return S.worksFromChaos + i;
  return Infinity;
}

const clear = (seed: number, s: number) =>
  bumpsBetween(seed, s - CLEARANCE, s + S.worksLength + CLEARANCE).length === 0 &&
  !curvesBetween(seed, s - CLEARANCE, s + S.worksLength + CLEARANCE).some((c) => c.sharp);

function worksInBlock(seed: number, k: number): Works | undefined {
  const rng = createRng((Math.imul(seed ^ 0x5bd1e995, 2246822519) + Math.imul(k + 1, 3266489917)) >>> 0);
  const chaos = levelOf(rng.next());
  const lane = rng.int(0, 3) as Works['lane'];
  const room = BLOCK - S.worksLength - GAP;
  // a few spots in the block away from speed bumps and sharp curves; otherwise this block has none
  for (let tries = 0; tries < 6; tries++) {
    const s = (k + 1) * BLOCK + rng.range(0, room);
    if (clear(seed, s)) return { s, lane, length: S.worksLength, chaos };
  }
  return undefined;
}

/** Works starting in [s0, s1), in order, up to the given chaos level (all of them by default). */
export function worksBetween(seed: number, s0: number, s1: number, chaos = Infinity): Works[] {
  const out: Works[] = [];
  for (let k = Math.max(0, Math.floor(s0 / BLOCK) - 2); (k + 1) * BLOCK < s1; k++) {
    const wk = worksInBlock(seed, k);
    if (wk && wk.chaos <= chaos && wk.s >= s0 && wk.s < s1) out.push(wk);
  }
  return out;
}

/**
 * Each chaos level from 3 turns its roadworks on the first time it is reached, from 150 m ahead of the
 * leading car and past the traffic already there (never on top of them), and keeps the list of works near the cars.
 */
export function stepWorks(w: WorldState): WorldState {
  let { worksFrom } = w;
  const back = Math.min(policeOf(w).s, thiefOf(w).s);
  const front = Math.max(policeOf(w).s, thiefOf(w).s);
  if (w.mode === 'survival') {
    // past every traffic car already on the road, so the cones never appear on top of one
    const from = Math.max(
      front + 150,
      w.traffic.reduce((m, t) => Math.max(m, t.s + 10), 0),
    );
    for (let level = S.worksFromChaos; level <= w.chaos; level++) {
      if (worksFrom[level] === undefined) worksFrom = { ...worksFrom, [level]: from };
    }
  }
  const levels = Object.keys(worksFrom).map(Number);
  if (levels.length === 0) return w.works.length ? { ...w, works: [] } : w;
  const first = Math.min(...levels.map((l) => worksFrom[l]!));
  const works = worksBetween(w.seed, Math.max(first, back - 80), front + AHEAD, Math.max(...levels)).filter(
    (wk) => wk.s >= (worksFrom[wk.chaos] ?? Infinity),
  );
  return { ...w, worksFrom, works };
}

const inside = (car: CarState, wk: Works) =>
  car.s >= wk.s && car.s <= wk.s + wk.length && Math.abs(car.x - worksLaneX(wk)) < LANE_HALF + BALANCE.car.halfWidth - 0.3;

/** Cones: like the curb (damage, speed loss), pushing the car out of the closed lane; 1 s immunity per car. */
export function hitWorks(w: WorldState): WorldState {
  if (w.works.length === 0) return w;
  let out = w;
  const events: GameEvent[] = [...w.events];
  const immunity = { ...w.immunity };
  for (const role of ['police', 'thief'] as const) {
    const car = role === 'police' ? policeOf(out) : thiefOf(out);
    const wk = out.works.find((x) => inside(car, x));
    const key = `works:${role}`;
    if (!wk || car.airTime > 0) continue;
    const lx = worksLaneX(wk);
    // the cones always block; damage and the crash event only once per immunity window
    const fresh = (immunity[key] ?? 0) <= 0;
    let moved: CarState;
    if (car.s - wk.s < FRONT) {
      // straight into the first cones: held right before them, much slower (like hitting a barrier)
      moved = { ...car, s: wk.s - BALANCE.car.length / 2 - 0.1, speed: fresh ? car.speed * HOLD_SPEED : Math.min(car.speed, 3) };
    } else {
      // from the side: pushed back out on the nearest side that is still on the road
      const edge = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
      const out1 = lx + (LANE_HALF + BALANCE.car.halfWidth + 0.05);
      const out0 = lx - (LANE_HALF + BALANCE.car.halfWidth + 0.05);
      const options = [out0, out1].filter((x) => Math.abs(x) <= edge);
      const x = options.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a));
      moved = { ...car, x, speed: fresh ? car.speed * (1 - BALANCE.collision.speedLoss) : car.speed };
    }
    if (!fresh) {
      out = withCar(out, role, moved);
      continue;
    }
    const hit = hurt(moved, BALANCE.collision.scenery, out);
    out = withCar(out, role, hit);
    immunity[key] = BALANCE.collision.immunity;
    events.push({ type: 'crash', a: role, b: 'works', s: car.s, x: lx });
    events.push({ type: 'hit', target: role, amount: scaledDamage(BALANCE.collision.scenery, out, role), s: car.s, x: car.x });
  }
  return { ...out, immunity, events };
}
