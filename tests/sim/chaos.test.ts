import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { chaosAt, damageScale, hurt } from '../../src/sim/chaos';
import { NO_INTENTS } from '../../src/sim/intents';
import { trafficTarget } from '../../src/sim/traffic';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const run = (w: WorldState, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) w = stepWorld(w, NO_INTENTS, DT);
  return w;
};

describe('chaos (Sobrevivência)', () => {
  it('starts at 1 and rises every 45 s up to 5; always 1 in Perseguição', () => {
    expect(chaosAt(0, 'survival')).toBe(1);
    expect(chaosAt(44.9, 'survival')).toBe(2 - 1);
    expect(chaosAt(45, 'survival')).toBe(2);
    expect(chaosAt(180, 'survival')).toBe(5);
    expect(chaosAt(9999, 'survival')).toBe(5);
    expect(chaosAt(9999, 'pursuit')).toBe(1);
    expect(chaosAt(10, 'survival', 5)).toBe(3); // debug: short chaos
  });

  it('damage x(1 + 0.15 x (chaos - 1)); hurt never goes below 0', () => {
    const w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival' });
    expect(damageScale(w)).toBe(1);
    expect(damageScale({ ...w, chaos: 3 })).toBeCloseTo(1.3);
    const car = policeOf(w);
    expect(hurt(car, 10, { ...w, chaos: 3 }).hp).toBeCloseTo(BALANCE.survival.hp.normal - 13);
    expect(hurt({ ...car, hp: 3 }, 10, w).hp).toBe(0);
    // Sobrevivência: the thief takes x1.05 (tuned for ~50%); the police takes it all
    expect(hurt(thiefOf(w), 10, w).hp).toBeCloseTo(BALANCE.survival.hp.normal - 10 * BALANCE.survival.thiefDamageTaken);
    expect(hurt(policeOf(w), 10, w).hp).toBeCloseTo(BALANCE.survival.hp.normal - 10);
    expect(damageScale(createWorld({ seed: 1, playerRole: 'thief' }))).toBe(1); // Perseguição
  });

  it('the world keeps mode and chaos; the debug chaos pace works', () => {
    let w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival', chaosEvery: 5, traffic: false, curves: false });
    expect(w.mode).toBe('survival');
    expect(w.chaos).toBe(1);
    w = run(w, 10.1);
    expect(w.chaos).toBe(3);
    expect(createWorld({ seed: 1, playerRole: 'thief' }).mode).toBe('pursuit');
  });

  it('no escape at 1:30 in Sobrevivência', () => {
    let w = createWorld({ seed: 1, playerRole: 'police', mode: 'survival', traffic: false, curves: false });
    w = withCar(w, 'police', { ...policeOf(w), hp: 10_000 });
    w = withCar(w, 'thief', { ...thiefOf(w), hp: 10_000 });
    w = run(w, 95);
    expect(w.match.escapeAt).toBeUndefined();
    expect(w.match.over).toBe(false);
  });

  it('a wall hit at chaos 3 costs 6.5 x 0.9 for the thief and reports the same', () => {
    let w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival', traffic: false, curves: false });
    w = { ...w, time: 90, chaos: 3 };
    w = withCar(w, 'thief', { ...thiefOf(w), x: BALANCE.road.halfWidth, steer: 1 });
    const before = thiefOf(w).hp;
    const next = stepWorld(w, { ...NO_INTENTS, right: true }, DT);
    const hit = next.events.find((e) => e.type === 'hit' && e.target === 'thief');
    const cost = BALANCE.collision.scenery * 1.3 * BALANCE.survival.thiefDamageTaken;
    expect(hit && hit.type === 'hit' && hit.amount).toBeCloseTo(cost);
    expect(before - thiefOf(next).hp).toBeCloseTo(cost);
  });

  it('Sobrevivência traffic: x1.3 from the start and +25% per chaos level above 1 (playtest 2026-10-07)', () => {
    expect(trafficTarget(1, 'normal', 1)).toBe(3); // Perseguição
    expect(trafficTarget(1, 'normal', 1, 'survival')).toBe(Math.round(3 * 1.3));
    expect(trafficTarget(1, 'normal', 3, 'survival')).toBe(Math.round(3 * 1.3 * 1.5));
    expect(trafficTarget(5, 'hard', 5, 'survival')).toBe(Math.round(3 * (1 + 0.08 * 4) * 1.3 * 1.3 * 2));
  });
});
