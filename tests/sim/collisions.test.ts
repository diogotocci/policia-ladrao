import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { resolveCollisions } from '../../src/sim/collisions';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
const L = BALANCE.car.length;
const DT = 1 / 60;

const base = () => createWorld({ seed: 1, playerRole: 'police' });
/** applies resolveCollisions n times, advancing the immunities by dt */
const tick = (w: WorldState, n = 1) => {
  let s = w;
  for (let i = 0; i < n; i++) s = resolveCollisions(s, DT);
  return s;
};

describe('scenery collisions', () => {
  const atEdge = () => {
    const w = base();
    const p = { ...policeOf(w), x: EDGE, touchingEdge: true, speed: 30 };
    return withCar(w, 'police', p);
  };

  it('hitting the edge costs 5 hp, 30% speed and pushes 0.4 m inward', () => {
    const w = tick(atEdge());
    const p = policeOf(w);
    expect(p.hp).toBe(95);
    expect(p.speed).toBeCloseTo(21, 10);
    expect(p.x).toBeCloseTo(EDGE - 0.4, 10);
    expect(w.events.some((e) => e.type === 'crash' && e.b === 'scenery')).toBe(true);
  });

  it('staying on the edge only costs again after 1 s of immunity', () => {
    let w = tick(atEdge());
    for (let i = 0; i < 59; i++) {
      w = withCar(w, 'police', { ...policeOf(w), x: EDGE, touchingEdge: true });
      w = tick(w);
    }
    expect(policeOf(w).hp).toBe(95);
    w = withCar(w, 'police', { ...policeOf(w), x: EDGE, touchingEdge: true });
    w = tick(w, 2);
    expect(policeOf(w).hp).toBe(90);
  });
});

describe('car × car collisions', () => {
  const overlapping = (dx: number, ds: number) => {
    const w = base();
    const t = thiefOf(w);
    const p = { ...policeOf(w), s: t.s - ds, x: t.x + dx, speed: 30 };
    return withCar(withCar(w, 'police', p), 'thief', { ...t, speed: 30 });
  };

  it('rear-end in the same lane: thief −5, police −3; only the police loses speed (50%), police ends 1 length behind', () => {
    const w = tick(overlapping(0, L * 0.6));
    expect(thiefOf(w).hp).toBe(95);
    expect(policeOf(w).hp).toBe(97);
    expect(thiefOf(w).speed).toBeCloseTo(30, 10);
    expect(policeOf(w).speed).toBeCloseTo(15, 10);
    expect(thiefOf(w).s - policeOf(w).s).toBeCloseTo(L, 1);
  });

  it('after hitting the thief, the police loses the catch-up turbo for 4 s', () => {
    const w0 = overlapping(0, L * 0.6);
    const w = tick({ ...w0, time: 10 });
    expect(w.policeTurboOffUntil).toBeCloseTo(14, 10);
  });

  // side by side (playtest 2026-10-08): whoever steers into the other hurts it; both at once, both are hurt.
  // overlapping(dx > 0): the police is on the thief's right, so steering into the other is -1 (police), +1 (thief)
  const side = (policeSteer: -1 | 0 | 1, thiefSteer: -1 | 0 | 1) => {
    const w = overlapping(BALANCE.car.halfWidth * 1.4, 0);
    return tick(withCar(withCar(w, 'police', { ...policeOf(w), steer: policeSteer }), 'thief', { ...thiefOf(w), steer: thiefSteer }));
  };

  it('side hit by the police: only the thief is hurt; the police still drops back; pushed apart', () => {
    const w = side(-1, 0);
    expect(thiefOf(w).hp).toBe(100 - BALANCE.collision.sideHit);
    expect(policeOf(w).hp).toBe(100);
    expect(policeOf(w).speed).toBeCloseTo(30 * (1 - BALANCE.collision.carCarPoliceSpeedLoss));
    expect(Math.abs(thiefOf(w).x - policeOf(w).x)).toBeGreaterThanOrEqual(BALANCE.car.halfWidth * 2 - 1e-9);
  });

  it('side hit by the thief: the police is hurt, not the thief', () => {
    const w = side(0, 1);
    expect(policeOf(w).hp).toBe(100 - BALANCE.collision.sideHit);
    expect(thiefOf(w).hp).toBe(100);
    expect(w.events.some((e) => e.type === 'crash' && e.a === 'thief')).toBe(true);
  });

  it('both steering into each other: both are hurt; nobody steering in: no damage, just pushed apart', () => {
    const both = side(-1, 1);
    expect(thiefOf(both).hp).toBe(100 - BALANCE.collision.sideHit);
    expect(policeOf(both).hp).toBe(100 - BALANCE.collision.sideHit);
    const none = side(0, 0);
    expect(thiefOf(none).hp).toBe(100);
    expect(policeOf(none).hp).toBe(100);
    expect(Math.abs(thiefOf(none).x - policeOf(none).x)).toBeGreaterThanOrEqual(BALANCE.car.halfWidth * 2 - 1e-9);
  });

  it('a car pushed sideways against the edge does not take wall damage next step', () => {
    const w0 = base();
    const t = { ...thiefOf(w0), x: EDGE - 0.3, speed: 30 };
    const p = { ...policeOf(w0), s: t.s, x: t.x - 1.3, speed: 30, steer: 1 as const };
    let w = withCar(withCar(w0, 'thief', t), 'police', p);
    w = tick(w);
    expect(Math.abs(thiefOf(w).x)).toBeLessThan(EDGE);
    w = tick(withCar(w, 'thief', { ...thiefOf(w), touchingEdge: Math.abs(thiefOf(w).x) >= EDGE }));
    expect(thiefOf(w).hp).toBe(100 - BALANCE.collision.sideHit); // only the hit from the police
  });

  it('a new overlap within 1 s costs nothing', () => {
    let w = tick(overlapping(0, L * 0.6));
    const t = thiefOf(w);
    w = withCar(w, 'police', { ...policeOf(w), s: t.s - L * 0.6, x: t.x });
    w = tick(w, 10);
    expect(thiefOf(w).hp).toBe(95);
    expect(policeOf(w).hp).toBe(97);
  });

  it('cars far apart do nothing', () => {
    const w = tick(base());
    expect(thiefOf(w).hp).toBe(100);
    expect(policeOf(w).hp).toBe(100);
    expect(w.events).toEqual([]);
  });
});
