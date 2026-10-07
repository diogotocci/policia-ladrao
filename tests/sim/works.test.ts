import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { bumpsBetween } from '../../src/sim/track';
import { curvesBetween } from '../../src/sim/curves';
import { worksBetween, worksLaneX } from '../../src/sim/works';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const S = BALANCE.survival;

describe('roadworks (Sobrevivência, chaos 3+)', () => {
  it('deterministic, about 500-700 m apart (pushed past bumps and sharp curves), never on them', () => {
    for (const seed of [1, 7, 42, 999]) {
      const a = worksBetween(seed, 0, 20_000);
      expect(worksBetween(seed, 0, 20_000)).toEqual(a);
      expect(a.length).toBeGreaterThan(20);
      for (let i = 1; i < a.length; i++) expect(a[i]!.s - a[i - 1]!.s).toBeGreaterThanOrEqual(S.worksLength + 100);
      for (const wk of a) {
        expect(wk.length).toBe(S.worksLength);
        expect(bumpsBetween(seed, wk.s - 20, wk.s + wk.length + 20)).toHaveLength(0);
        expect(curvesBetween(seed, wk.s - 20, wk.s + wk.length + 20).some((c) => c.sharp)).toBe(false);
      }
    }
    // gaps stay bounded (a block can be skipped when bumps and curves leave no room)
    const a = worksBetween(3, 0, 20_000);
    for (let i = 1; i < a.length; i++) expect(a[i]!.s - a[i - 1]!.s).toBeLessThan(2 * S.worksEvery[1] + 400);
  });

  it('only appear in Sobrevivência from chaos 3, starting ahead of the cars (never on top of them)', () => {
    let w = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', chaosEvery: 3, traffic: false, curves: false });
    for (let i = 0; i < 5 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.chaos).toBe(2);
    expect(w.works).toHaveLength(0);
    for (let i = 0; i < 2 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.chaos).toBe(3);
    const front = Math.max(policeOf(w).s, thiefOf(w).s);
    expect(w.worksFromS).toBeGreaterThan(front);
    let p = createWorld({ seed: 4, playerRole: 'thief', traffic: false, curves: false });
    for (let i = 0; i < 60 * 60; i++) p = stepWorld(p, NO_INTENTS, DT);
    expect(p.works).toHaveLength(0); // Perseguição
  });

  it('driving into the cones costs like the curb, slows down and pushes the car out of the lane', () => {
    let w: WorldState = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', traffic: false, curves: false });
    const wk = worksBetween(4, 2000, 5000)[0]!;
    const x = worksLaneX(wk);
    w = { ...w, chaos: 3, worksFromS: 0 };
    w = withCar(w, 'thief', { ...thiefOf(w), s: wk.s + 5, x, speed: 30 });
    w = withCar(w, 'police', { ...policeOf(w), s: wk.s - 200 });
    const next = stepWorld(w, NO_INTENTS, DT);
    const t = thiefOf(next);
    expect(next.events.some((e) => e.type === 'crash' && e.b === 'works')).toBe(true);
    expect(BALANCE.hp - t.hp).toBeCloseTo(BALANCE.collision.scenery * 1.4 * BALANCE.survival.thiefDamageTaken);
    expect(t.speed).toBeLessThan(30);
    expect(Math.abs(t.x - x)).toBeGreaterThan(1.5);
  });

  it('the computer changes lane before the works', () => {
    let w: WorldState = createWorld({ seed: 4, playerRole: 'police', mode: 'survival', traffic: false, curves: false });
    const wk = worksBetween(4, 2000, 5000)[0]!;
    const x = worksLaneX(wk);
    w = { ...w, chaos: 3, worksFromS: 0, level: 10 };
    w = withCar(w, 'thief', { ...thiefOf(w), s: wk.s - 120, x, speed: 34 });
    w = withCar(w, 'police', { ...policeOf(w), s: wk.s - 300, speed: 34 });
    let hit = false;
    for (let i = 0; i < 6 * 60; i++) {
      w = stepWorld(w, NO_INTENTS, DT);
      if (w.events.some((e) => e.type === 'crash' && e.a === 'thief' && e.b === 'works')) hit = true;
    }
    expect(hit).toBe(false);
  });
});

describe('traffic and roadworks', () => {
  it('traffic never drives through the cones', () => {
    let w: WorldState = createWorld({ seed: 11, playerRole: 'thief', mode: 'survival', chaosEvery: 1, curves: false });
    let inside = 0;
    for (let i = 0; i < 90 * 60; i++) {
      w = stepWorld(w, 'ai', DT);
      for (const t of w.traffic)
        for (const wk of w.works) if (t.s > wk.s && t.s < wk.s + wk.length && Math.abs(t.x - worksLaneX(wk)) < 1.2) inside++;
    }
    expect(w.works.length).toBeGreaterThan(0);
    expect(inside).toBe(0);
  }, 60_000);
});
