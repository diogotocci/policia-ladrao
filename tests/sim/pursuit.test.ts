import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { stepCar } from '../../src/sim/car';
import { resolveCollisions } from '../../src/sim/collisions';
import { NO_INTENTS } from '../../src/sim/intents';
import { enforceNoOvertake, pursuitBonus } from '../../src/sim/pursuit';
import { createRng } from '../../src/sim/rng';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const L = BALANCE.car.length;

/** mini-loop: move os dois, colisões, regra de não-ultrapassar */
const step = (w: WorldState, thiefIntents = NO_INTENTS, policeIntents = NO_INTENTS) => {
  let s = withCar(w, 'thief', stepCar(thiefOf(w), thiefIntents, DT));
  s = withCar(s, 'police', stepCar(policeOf(s), policeIntents, DT, { speedBonus: pursuitBonus(s) }));
  s = resolveCollisions(s, DT);
  return enforceNoOvertake(s);
};

const setup = (thief: Partial<ReturnType<typeof thiefOf>>, police: Partial<ReturnType<typeof policeOf>>) => {
  const w = createWorld({ seed: 1, playerRole: 'thief' });
  return withCar(withCar(w, 'thief', { ...thiefOf(w), ...thief }), 'police', { ...policeOf(w), ...police });
};

describe('pursuitBonus', () => {
  it('is the catch-up bonus while police is behind, 0 when alongside', () => {
    expect(pursuitBonus(setup({ s: 85 }, { s: 0 }))).toBeCloseTo(0.175, 10);
    expect(pursuitBonus(setup({ s: 50 }, { s: 50 }))).toBe(0);
  });

  it('no catch-up turbo while the police is recovering from a hit (nitro still works)', () => {
    const w = { ...setup({ s: 85 }, { s: 0 }), time: 10, policeTurboOffUntil: 12 };
    expect(pursuitBonus(w)).toBe(0);
    expect(pursuitBonus({ ...w, time: 12 })).toBeCloseTo(0.175, 10);
    const nitro = withCar(w, 'police', { ...policeOf(w), upgrades: { ...policeOf(w).upgrades, nitroUntil: 20 } });
    expect(pursuitBonus(nitro)).toBeCloseTo(BALANCE.items.police.nitroBonus, 10);
  });

  it('a rear-end lets the thief get away: ≥ 15 m ahead 4 s later, then the police comes back', () => {
    let w = setup({ s: 200 + L * 0.6, speed: 34 }, { s: 200, speed: 34, x: thiefOf(createWorld({ seed: 1, playerRole: 'thief' })).x });
    w = step(w);
    for (let i = 0; i < 4 * 60; i++) w = { ...step(w), time: w.time + DT };
    expect(thiefOf(w).s - policeOf(w).s).toBeGreaterThanOrEqual(15);
    for (let i = 0; i < 8 * 60; i++) w = { ...step(w), time: w.time + DT };
    expect(thiefOf(w).s - policeOf(w).s).toBeLessThanOrEqual(25);
  });
});

describe('enforceNoOvertake', () => {
  it('a faster police car in another lane never gets ahead (at most alongside)', () => {
    let w = setup({ s: 10, speed: 20, x: 1.5 }, { s: 0, speed: 40, x: -1.5 });
    for (let i = 0; i < 600; i++) {
      w = step(w);
      expect(policeOf(w).s).toBeLessThanOrEqual(thiefOf(w).s + 1e-9);
    }
  });

  it('thief brakes to a stop with police alongside → police stops alongside', () => {
    let w = setup({ s: 100, speed: 30, x: 1.5 }, { s: 100, speed: 30, x: -1.5 });
    for (let i = 0; i < 240; i++) w = step(w, { ...NO_INTENTS, brake: true });
    expect(thiefOf(w).speed).toBe(0);
    expect(policeOf(w).speed).toBe(0);
    expect(policeOf(w).s).toBeLessThanOrEqual(thiefOf(w).s);
    expect(thiefOf(w).s - policeOf(w).s).toBeLessThan(1);
  });

  it('same lane → police stops one car length behind', () => {
    let w = setup({ s: 100, speed: 30, x: 1.5 }, { s: 80, speed: 30, x: 1.5 });
    for (let i = 0; i < 300; i++) w = step(w, { ...NO_INTENTS, brake: true });
    expect(policeOf(w).speed).toBe(0);
    expect(thiefOf(w).s - policeOf(w).s).toBeCloseTo(L, 1);
  });

  it('police steering into a thief alongside is never yanked backwards', () => {
    for (const startX of [-4.5, -1.5, 1.5]) {
      let w = setup({ s: 100, speed: 33, x: startX + 3 }, { s: 100, speed: 33, x: startX });
      for (let i = 0; i < 180; i++) {
        const before = policeOf(w).s;
        w = step(w, NO_INTENTS, { ...NO_INTENTS, right: true });
        expect(policeOf(w).s - before, `startX ${startX} step ${i}`).toBeGreaterThan(-0.5);
      }
    }
  });

  it('120 s of random thief driving: police is never ahead', () => {
    const rng = createRng(42);
    let w = setup({ s: 40 }, { s: 0 });
    let intents = NO_INTENTS;
    for (let i = 0; i < 7200; i++) {
      if (i % 30 === 0) intents = { ...NO_INTENTS, left: rng.next() < 0.3, right: rng.next() < 0.3, brake: rng.next() < 0.25 };
      w = step(w, intents, { ...NO_INTENTS, right: policeOf(w).x < thiefOf(w).x - 0.5, left: policeOf(w).x > thiefOf(w).x + 0.5 });
      expect(policeOf(w).s).toBeLessThanOrEqual(thiefOf(w).s + 1e-9);
    }
  });
});
