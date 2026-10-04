import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { createCar, stepCar, type CarState } from '../../src/sim/car';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';

const DT = 1 / 60;
const run = (car: CarState, intents: Partial<Intents>, seconds: number): CarState => {
  let c = car;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) c = stepCar(c, { ...NO_INTENTS, ...intents }, DT);
  return c;
};
const atCruise = (role: 'police' | 'thief') => run(createCar(role, 1), {}, 10);
const edge = BALANCE.road.halfWidth - BALANCE.car.halfWidth;

const PC = BALANCE.movement.cruise.police;

describe('createCar', () => {
  it('spawns centred on the lane, stopped', () => {
    const c = createCar('thief', 2);
    expect(c.x).toBe(1.5);
    expect(c.speed).toBe(0);
    expect(c.s).toBe(0);
    expect(c.role).toBe('thief');
    expect(c.hp).toBe(100);
    expect(c.hasGun).toBe(false);
    expect(c.fireCooldown).toBe(0);
  });
});

describe('stepCar', () => {
  it('auto-accelerates to the role cruise speed and never exceeds it', () => {
    let c = createCar('police', 1);
    let max = 0;
    for (let i = 0; i < 600; i++) {
      c = stepCar(c, NO_INTENTS, DT);
      max = Math.max(max, c.speed);
    }
    expect(c.speed).toBeCloseTo(PC, 2);
    expect(max).toBeLessThanOrEqual(PC);
    expect(atCruise('thief').speed).toBeCloseTo(34, 2);
  });

  it('accelerates at 8 m/s²', () => {
    expect(run(createCar('police', 1), {}, 1).speed).toBeCloseTo(8, 1);
  });

  it('brakes at 20 m/s² and never goes negative', () => {
    expect(run(atCruise('police'), { brake: true }, 1).speed).toBeCloseTo(PC - 20, 1);
    expect(run(atCruise('police'), { brake: true }, 5).speed).toBe(0);
  });

  it('resumes accelerating after releasing the brake', () => {
    const stopped = run(atCruise('police'), { brake: true }, 5);
    expect(run(stopped, {}, 1).speed).toBeCloseTo(8, 1);
  });

  it('steers left at 7 m/s', () => {
    const c0 = createCar('police', 2);
    const c = run(c0, { left: true }, 0.5);
    expect(c.x).toBeCloseTo(1.5 - 3.5, 5);
    expect(c.steer).toBe(-1);
  });

  it('left + right cancel out', () => {
    const c = run(createCar('police', 2), { left: true, right: true }, 0.5);
    expect(c.x).toBe(1.5);
    expect(c.steer).toBe(0);
  });

  it('clamps at the road edge and flags touchingEdge', () => {
    const c = run(createCar('police', 3), { right: true }, 5);
    expect(c.x).toBeCloseTo(edge, 10);
    expect(c.touchingEdge).toBe(true);
    const back = run(c, { left: true }, 0.2);
    expect(back.touchingEdge).toBe(false);
    const leftEdge = run(createCar('police', 0), { left: true }, 5);
    expect(leftEdge.x).toBeCloseTo(-edge, 10);
    expect(leftEdge.touchingEdge).toBe(true);
  });

  it('advances s by speed * dt', () => {
    const c = atCruise('police');
    const next = stepCar(c, NO_INTENTS, DT);
    expect(next.s - c.s).toBeCloseTo(PC * DT, 10);
  });

  it('speedBonus raises the cruise target (catch-up turbo)', () => {
    let c = atCruise('police');
    for (let i = 0; i < 600; i++) c = stepCar(c, NO_INTENTS, DT, { speedBonus: 0.35 });
    expect(c.speed).toBeCloseTo(PC * 1.35, 2);
  });

  it('when the bonus ends, eases back down at 8 m/s² and never below cruise', () => {
    let c = { ...atCruise('police'), speed: PC * 1.35 };
    c = run(c, {}, 1);
    expect(c.speed).toBeCloseTo(PC * 1.35 - 8, 1);
    c = run(c, {}, 5);
    expect(c.speed).toBeCloseTo(PC, 5);
  });

  it('does not mutate its input', () => {
    const c = createCar('police', 1);
    const copy = { ...c };
    stepCar(c, { ...NO_INTENTS, left: true }, DT);
    expect(c).toEqual(copy);
  });
});
