import { BALANCE } from '../../src/config/balance';
import { describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/balance';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';
import { fireWeapons, stepProjectiles } from '../../src/sim/projectiles';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const FIRE = { ...NO_INTENTS, fire: true };
const both = (police: Intents, thief: Intents): Record<Role, Intents> => ({ police, thief });

const setup = (thief: Partial<ReturnType<typeof thiefOf>>, police: Partial<ReturnType<typeof policeOf>> = {}) => {
  const w = createWorld({ seed: 1, playerRole: 'police' });
  return withCar(
    withCar(w, 'thief', { ...thiefOf(w), speed: 30, ...thief }),
    'police',
    { ...policeOf(w), s: 100, x: 1.5, speed: 30, ...police },
  );
};

const flyUntilDone = (w: WorldState) => {
  let s = w;
  for (let i = 0; i < 120 && s.projectiles.length > 0; i++) s = stepProjectiles(s, DT);
  return s;
};

/** voa os tiros com o ladrão andando (30 m/s) e, opcionalmente, desviando de lado a 7 m/s */
const flyWithThief = (w: WorldState, lateral: number) => {
  let s = w;
  for (let i = 0; i < 120 && s.projectiles.length > 0; i++) {
    const t = thiefOf(s);
    s = withCar(s, 'thief', { ...t, s: t.s + t.speed * DT, x: t.x + lateral * DT });
    s = withCar(s, 'police', { ...policeOf(s), s: policeOf(s).s + policeOf(s).speed * DT });
    s = stepProjectiles(s, DT);
  }
  return s;
};

describe('dodging (zigzag) — playtest 2026-10-04', () => {
  const lat = BALANCE.movement.lateralSpeed;
  it('police shots are slower than the thief ones (the thief can dodge sideways)', () => {
    expect(BALANCE.combat.policeProjectileSpeed).toBeLessThan(BALANCE.combat.projectileSpeed);
  });
  it('at 40 m a thief steering sideways makes the police shot miss; driving straight it hits', () => {
    const fire = (w: WorldState) => fireWeapons(w, both(FIRE, NO_INTENTS), DT);
    const dodging = flyWithThief(fire(setup({ s: 140, x: 1.5 })), lat);
    expect(thiefOf(dodging).hp).toBe(100);
    const straight = flyWithThief(fire(setup({ s: 140, x: 1.5 })), 0);
    expect(thiefOf(straight).hp).toBeLessThan(100);
  });
  it('close (12 m) there is no time to dodge', () => {
    const w = flyWithThief(fireWeapons(setup({ s: 112, x: 1.5 }), both(FIRE, NO_INTENTS), DT), lat);
    expect(thiefOf(w).hp).toBeLessThan(100);
  });
});

describe('fireWeapons', () => {
  it('police holding fire with the thief 20 m ahead shoots every 0.8 s (5 shots in 4 s)', () => {
    let w = setup({ s: 120, x: 1.5 });
    for (let i = 0; i < 240; i++) w = fireWeapons({ ...w, events: [] }, both(FIRE, NO_INTENTS), DT);
    expect(w.projectiles.filter((p) => p.from === 'police')).toHaveLength(5);
  });

  it('a hit at 20 m removes 1 hp', () => {
    let w = fireWeapons(setup({ s: 120, x: 1.5 }), both(FIRE, NO_INTENTS), DT);
    w = flyUntilDone(w);
    expect(thiefOf(w).hp).toBeCloseTo(99, 10);
    expect(w.events.some((e) => e.type === 'hit' && e.target === 'thief')).toBe(true);
  });

  it('a hit at 95 m removes 0.5 hp (distance falloff)', () => {
    let w = fireWeapons(setup({ s: 195, x: 1.5, speed: 0 }, { speed: 0 }), both(FIRE, NO_INTENTS), DT);
    w = flyUntilDone(w);
    expect(thiefOf(w).hp).toBeCloseTo(99.5, 10);
  });

  it('no target in the cone: no shot, a noTarget event, cooldown untouched', () => {
    const w = fireWeapons(setup({ s: 90, x: 1.5 }), both(FIRE, NO_INTENTS), DT);
    expect(w.projectiles).toEqual([]);
    expect(w.events).toContainEqual({ type: 'noTarget', from: 'police' });
    expect(policeOf(w).fireCooldown).toBe(0);
  });

  it('thief without a gun never shoots', () => {
    const w = fireWeapons(setup({ s: 120 }), both(NO_INTENTS, FIRE), DT);
    expect(w.projectiles).toEqual([]);
  });

  it('thief with a gun cannot shoot below 8 m/s, can at 10 m/s (backwards at the police)', () => {
    const slow = fireWeapons(setup({ s: 120, x: 1.5, hasGun: true, speed: 5 }), both(NO_INTENTS, FIRE), DT);
    expect(slow.projectiles).toEqual([]);
    let w = fireWeapons(setup({ s: 120, x: 1.5, hasGun: true, speed: 10 }), both(NO_INTENTS, FIRE), DT);
    expect(w.projectiles).toHaveLength(1);
    w = flyUntilDone(w);
    expect(policeOf(w).hp).toBeCloseTo(100 - BALANCE.combat.thiefDamage, 10);
  });
});

describe('stepProjectiles', () => {
  it('misses when the target dodges 3 m sideways during the flight', () => {
    let w = fireWeapons(setup({ s: 160, x: 1.5, speed: 0 }, { speed: 0 }), both(FIRE, NO_INTENTS), DT);
    w = withCar(w, 'thief', { ...thiefOf(w), x: 4.5 });
    w = flyUntilDone(w);
    expect(thiefOf(w).hp).toBe(100);
  });

  it('removes projectiles after 150 m of travel', () => {
    let w = fireWeapons(setup({ s: 160, x: 1.5, speed: 0 }, { speed: 0 }), both(FIRE, NO_INTENTS), DT);
    w = withCar(w, 'thief', { ...thiefOf(w), x: 4.5 });
    const perStep = BALANCE.combat.policeProjectileSpeed * DT;
    const steps = Math.ceil(150 / perStep);
    for (let i = 0; i < steps - 1; i++) w = stepProjectiles(w, DT);
    expect(w.projectiles).toHaveLength(1); // ainda voando antes dos 150 m
    w = stepProjectiles(w, DT);
    expect(w.projectiles).toEqual([]);
  });
});
