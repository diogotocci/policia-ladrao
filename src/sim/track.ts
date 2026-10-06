// Speed bumps: 1 every ~400 m, covering 2 adjacent lanes. Driving over one makes the car jump for 0.6 s and lose 25%.
import { BALANCE } from '../config/balance';
import type { CarState } from './car';
import { createRng } from './rng';

export interface Bump {
  s: number;
  /** indices of the 2 adjacent lanes covered */
  lanes: [number, number];
}

const LANE_WIDTH = 3;

function bumpInBlock(seed: number, k: number): Bump {
  const t = BALANCE.track;
  const rng = createRng((Math.imul(seed, 2654435761) + Math.imul(k + 1, 97531)) >>> 0);
  let s = k * t.bumpEvery + t.bumpEvery / 2 + rng.range(-t.bumpJitter, t.bumpJitter);
  if (k === 0) s = Math.max(s, t.firstBumpAfter);
  const first = rng.int(0, 2);
  return { s, lanes: [first, first + 1] };
}

/** Speed bumps with s in [s0, s1), deterministic from the seed. */
export function bumpsBetween(seed: number, s0: number, s1: number): Bump[] {
  const every = BALANCE.track.bumpEvery;
  const out: Bump[] = [];
  for (let k = Math.max(0, Math.floor(s0 / every) - 1); k * every < s1 + every; k++) {
    const b = bumpInBlock(seed, k);
    if (b.s >= s0 && b.s < s1) out.push(b);
  }
  return out;
}

/** Lateral range covered by the speed bump: [xMin, xMax]. */
export function bumpXRange(b: Bump): [number, number] {
  const c0 = BALANCE.road.laneCenters[b.lanes[0]]!;
  const c1 = BALANCE.road.laneCenters[b.lanes[1]]!;
  return [c0 - LANE_WIDTH / 2, c1 + LANE_WIDTH / 2];
}

/** Did the car (on the ground) drive over a speed bump between prevS and car.s? */
export function crossedBump(car: CarState, prevS: number, seed: number): Bump | undefined {
  if (car.s <= prevS) return undefined;
  const W = BALANCE.car.halfWidth;
  for (const b of bumpsBetween(seed, prevS, car.s + 1e-9)) {
    if (b.s <= prevS || b.s > car.s) continue;
    const [xMin, xMax] = bumpXRange(b);
    if (car.x + W > xMin && car.x - W < xMax) return b;
  }
  return undefined;
}

/** Updates the jump: in the air it only counts down; on the ground, crossing a speed bump starts the jump and removes 25%. */
export function stepJump(car: CarState, prevS: number, seed: number, dt: number): CarState {
  if (car.airTime > 0) return { ...car, airTime: Math.max(0, car.airTime - dt) };
  if (!crossedBump(car, prevS, seed)) return car;
  const t = BALANCE.track;
  return { ...car, airTime: t.jumpTime, speed: car.speed * (1 - t.bumpSpeedLoss) };
}

/** Jump height (m) from the remaining air time: parabola peaking at 0.9 m in the middle. */
export function jumpHeight(airTime: number): number {
  const T = BALANCE.track.jumpTime;
  if (airTime <= 0 || airTime >= T) return 0;
  const u = airTime / T; // 1 → 0
  return 4 * BALANCE.track.jumpHeight * u * (1 - u);
}
