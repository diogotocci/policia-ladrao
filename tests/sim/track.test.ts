import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { createCar, stepCar, type CarState } from '../../src/sim/car';
import { NO_INTENTS } from '../../src/sim/intents';
import { bumpXRange, bumpsBetween, jumpHeight, stepJump } from '../../src/sim/track';

const DT = 1 / 60;
const SEED = 7;

describe('bumpsBetween', () => {
  it('is deterministic, spaced 240–560 m, none before 150 m, always 2 adjacent lanes', () => {
    const a = bumpsBetween(SEED, 0, 20000);
    expect(a).toEqual(bumpsBetween(SEED, 0, 20000));
    expect(a[0]!.s).toBeGreaterThanOrEqual(150);
    for (let i = 1; i < a.length; i++) {
      const gap = a[i]!.s - a[i - 1]!.s;
      expect(gap).toBeGreaterThanOrEqual(240);
      expect(gap).toBeLessThanOrEqual(560);
    }
    for (const b of a) expect(b.lanes[1] - b.lanes[0]).toBe(1);
    expect(new Set(a.map((b) => b.lanes[0])).size).toBe(3); // uses the 3 combinations
  });

  it('returns the same bumps for overlapping queries', () => {
    const all = bumpsBetween(SEED, 0, 5000);
    const part = bumpsBetween(SEED, 1000, 3000);
    expect(part).toEqual(all.filter((b) => b.s >= 1000 && b.s < 3000));
  });
});

/** cruising car driving over (or not) the first speed bump */
function drive(xOffset: (b: ReturnType<typeof bumpsBetween>[number]) => number) {
  const bump = bumpsBetween(SEED, 0, 2000)[0]!;
  let car: CarState = { ...createCar('police', 1, bump.s - 40), speed: PC, x: xOffset(bump) };
  const trace: CarState[] = [];
  for (let i = 0; i < 240; i++) {
    const prevS = car.s;
    car = stepCar(car, NO_INTENTS, DT);
    car = stepJump(car, prevS, SEED, DT);
    trace.push(car);
  }
  return { bump, trace };
}
const coveredCentre = (b: ReturnType<typeof bumpsBetween>[number]) => (bumpXRange(b)[0] + bumpXRange(b)[1]) / 2;
const freeLaneX = (b: ReturnType<typeof bumpsBetween>[number]) => {
  const free = [0, 1, 2, 3].find((l) => l !== b.lanes[0] && l !== b.lanes[1])!;
  return BALANCE.road.laneCenters[free]!;
};

const PC = BALANCE.movement.cruise.police;

describe('stepJump', () => {
  it('driving over it: jumps 0.6 s and loses 25% speed at once', () => {
    const { bump, trace } = drive(coveredCentre);
    const i = trace.findIndex((c) => c.airTime > 0);
    expect(i).toBeGreaterThan(0);
    expect(trace[i - 1]!.s).toBeLessThan(bump.s);
    expect(trace[i]!.speed).toBeCloseTo(PC * 0.75, 1);
    const air = trace.filter((c) => c.airTime > 0).length;
    expect(air).toBeGreaterThanOrEqual(35);
    expect(air).toBeLessThanOrEqual(37);
  });

  it('does not accelerate in the air, then recovers to cruise in about 1 s after landing', () => {
    const { trace } = drive(coveredCentre);
    const air = trace.filter((c) => c.airTime > 0);
    expect(Math.max(...air.map((c) => c.speed))).toBeCloseTo(PC * 0.75, 1);
    const landed = trace.findIndex((c, k) => k > 0 && c.airTime === 0 && trace[k - 1]!.airTime > 0);
    const back = trace.findIndex((c, k) => k > landed && c.speed >= PC - 0.01);
    expect((back - landed) * DT).toBeGreaterThan(0.8);
    expect((back - landed) * DT).toBeLessThan(1.3);
  });

  it('a free lane passes without any effect', () => {
    const { trace } = drive(freeLaneX);
    expect(trace.every((c) => c.airTime === 0)).toBe(true);
    expect(trace.every((c) => c.speed >= PC - 0.01)).toBe(true);
  });

  it('half the car over the covered lanes counts (edge)', () => {
    const { trace } = drive((b) => bumpXRange(b)[1] + BALANCE.car.halfWidth * 0.5);
    expect(trace.some((c) => c.airTime > 0)).toBe(true);
  });

  it('crossing another bump in the air neither restarts the jump nor costs speed again', () => {
    let car: CarState = { ...createCar('police', 1, 0), speed: 25, airTime: 0.4 };
    car = stepJump({ ...car, s: 10 }, 9, SEED, DT); // no speed bump here, just deducts
    expect(car.airTime).toBeCloseTo(0.4 - DT, 10);
    expect(car.speed).toBe(25);
  });
});

describe('jumpHeight', () => {
  it('parabola: 0 at the ends, 0.9 m in the middle', () => {
    expect(jumpHeight(0)).toBe(0);
    expect(jumpHeight(0.6)).toBeCloseTo(0, 10);
    expect(jumpHeight(0.3)).toBeCloseTo(0.9, 10);
  });
});
