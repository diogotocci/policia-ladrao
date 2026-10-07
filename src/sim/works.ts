// Roadworks (V2 part 3, Sobrevivência chaos 3+): a lane closed by cones for 60 m, every 500-700 m, from the seed.
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
const BLOCK = (S.worksEvery[0] + S.worksEvery[1]) / 2;
const CLEARANCE = 20; // m from bumps and sharp curves
const LANE_HALF = 1.5;
/** m into the works that still count as a front hit */
const FRONT = 4;
const HOLD_SPEED = 0.35;

export interface Works {
  s: number;
  lane: 0 | 1 | 2 | 3;
  length: number;
}

export const worksLaneX = (wk: Works): number => BALANCE.road.laneCenters[wk.lane];

function worksInBlock(seed: number, k: number): Works | undefined {
  const rng = createRng((Math.imul(seed ^ 0x5bd1e995, 2246822519) + Math.imul(k + 1, 3266489917)) >>> 0);
  const half = (S.worksEvery[1] - S.worksEvery[0]) / 2;
  let s = (k + 1) * BLOCK + rng.range(-half / 2, half / 2);
  const lane = rng.int(0, 3) as Works['lane'];
  // pushed forward past a speed bump or a sharp curve in the way (a few tries; otherwise this block has none)
  for (let tries = 0; tries < 4; tries++) {
    const to = s + S.worksLength + CLEARANCE;
    const bump = bumpsBetween(seed, s - CLEARANCE, to)[0];
    const curve = curvesBetween(seed, s - CLEARANCE, to).find((c) => c.sharp);
    if (!bump && !curve) return s < (k + 2) * BLOCK - half ? { s, lane, length: S.worksLength } : undefined;
    s = Math.max(bump ? bump.s : 0, curve ? curve.start + curve.length : 0) + CLEARANCE + 1;
  }
  return undefined;
}

/** Works starting in [s0, s1), in order. */
export function worksBetween(seed: number, s0: number, s1: number): Works[] {
  const out: Works[] = [];
  for (let k = Math.max(0, Math.floor(s0 / BLOCK) - 2); (k + 1) * BLOCK < s1 + BLOCK; k++) {
    const wk = worksInBlock(seed, k);
    if (wk && wk.s >= s0 && wk.s < s1) out.push(wk);
  }
  return out;
}

/**
 * Turns roadworks on the first time chaos reaches 3 (from 150 m ahead of the leading car, never on top of it)
 * and keeps the list of works near the cars.
 */
export function stepWorks(w: WorldState): WorldState {
  let { worksFromS } = w;
  const back = Math.min(policeOf(w).s, thiefOf(w).s);
  const front = Math.max(policeOf(w).s, thiefOf(w).s);
  if (worksFromS === null && w.mode === 'survival' && w.chaos >= S.worksFromChaos) worksFromS = front + 150;
  if (worksFromS === null) return w.works.length ? { ...w, works: [] } : w;
  const works = worksBetween(w.seed, Math.max(worksFromS, back - 80), front + 400);
  return { ...w, worksFromS, works };
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
