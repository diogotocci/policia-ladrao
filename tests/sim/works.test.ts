import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { bumpsBetween } from '../../src/sim/track';
import { curvesBetween } from '../../src/sim/curves';
import { stepWorks, worksBetween, worksLaneX } from '../../src/sim/works';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const S = BALANCE.survival;

describe('roadworks (Sobrevivência, chaos 3+)', () => {
  it('deterministic, never on bumps or sharp curves, never touching; more of them at each chaos level', () => {
    for (const seed of [1, 7, 42, 999]) {
      const a = worksBetween(seed, 0, 20_000);
      expect(worksBetween(seed, 0, 20_000)).toEqual(a);
      for (let i = 1; i < a.length; i++) expect(a[i]!.s - a[i - 1]!.s).toBeGreaterThanOrEqual(S.worksLength + 20);
      for (const wk of a) {
        expect(wk.length).toBe(S.worksLength);
        expect(bumpsBetween(seed, wk.s - 20, wk.s + wk.length + 20)).toHaveLength(0);
        expect(curvesBetween(seed, wk.s - 20, wk.s + wk.length + 20).some((c) => c.sharp)).toBe(false);
      }
      // playtest 2026-10-07: at 500-700 m they almost never came. Now ~300 m at chaos 3, ~220 at 4, ~180 at 5
      // (a few fewer: some spots are taken by bumps and sharp curves)
      const per = (chaos: number) => 20_000 / worksBetween(seed, 0, 20_000, chaos).length;
      expect(per(3)).toBeLessThan(S.worksEvery[0] * 1.35);
      expect(per(4)).toBeLessThan(S.worksEvery[1] * 1.35);
      expect(per(5)).toBeLessThan(S.worksEvery[2] * 1.35);
      expect(per(3)).toBeGreaterThan(per(4));
      expect(per(4)).toBeGreaterThan(per(5));
      // a lower level's works are still there at a higher one
      for (const wk of worksBetween(seed, 0, 20_000, 3)) expect(a).toContainEqual(wk);
    }
  });

  it('a new chaos level adds its works only from 150 m ahead (no cones popping up next to the cars)', () => {
    let w = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', chaosEvery: 3, traffic: false, curves: false });
    for (let i = 0; i < 7 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.chaos).toBe(3);
    for (let i = 0; i < 3 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.chaos).toBe(4);
    const front = Math.max(policeOf(w).s, thiefOf(w).s);
    expect(w.worksFrom[4]).toBeGreaterThan(front);
    expect(w.worksFrom[3]).toBeLessThan(w.worksFrom[4]!);
    for (const wk of w.works) expect(wk.chaos <= 3 || wk.s >= w.worksFrom[4]!).toBe(true);
  });

  it('a chaos level skipped in one step still gets its works', () => {
    let w = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', traffic: false, curves: false });
    w = stepWorks({ ...w, chaos: 5 });
    expect(Object.keys(w.worksFrom).map(Number)).toEqual([3, 4, 5]);
  });

  it('only appear in Sobrevivência from chaos 3, starting ahead of the cars (never on top of them)', () => {
    let w = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', chaosEvery: 3, traffic: false, curves: false });
    for (let i = 0; i < 5 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.chaos).toBe(2);
    expect(w.works).toHaveLength(0);
    for (let i = 0; i < 2 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.chaos).toBe(3);
    const front = Math.max(policeOf(w).s, thiefOf(w).s);
    expect(w.worksFrom[3]).toBeGreaterThan(front);
    let p = createWorld({ seed: 4, playerRole: 'thief', traffic: false, curves: false });
    for (let i = 0; i < 60 * 60; i++) p = stepWorld(p, NO_INTENTS, DT);
    expect(p.works).toHaveLength(0); // Perseguição
  });

  it('driving into the cones costs like the curb, slows down and pushes the car out of the lane', () => {
    let w: WorldState = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', traffic: false, curves: false });
    const wk = worksBetween(4, 2000, 5000, 3)[0]!;
    const x = worksLaneX(wk);
    w = { ...w, chaos: 3, worksFrom: { 3: 0 } };
    w = withCar(w, 'thief', { ...thiefOf(w), s: wk.s + 5, x, speed: 30 });
    w = withCar(w, 'police', { ...policeOf(w), s: wk.s - 200 });
    const next = stepWorld(w, NO_INTENTS, DT);
    const t = thiefOf(next);
    expect(next.events.some((e) => e.type === 'crash' && e.b === 'works')).toBe(true);
    expect(BALANCE.survival.hp.normal - t.hp).toBeCloseTo(BALANCE.collision.scenery * 1.3 * BALANCE.survival.thiefDamageTaken);
    expect(t.speed).toBeLessThan(30);
    expect(Math.abs(t.x - x)).toBeGreaterThan(1.5);
  });

  it('steering into the closed lane from the side pushes the car back out on that side (no jump across the lane)', () => {
    let w: WorldState = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', traffic: false, curves: false });
    const wk = worksBetween(4, 2000, 5000, 3).find((x) => x.lane === 0 || x.lane === 1)!;
    const lx = worksLaneX(wk);
    w = { ...w, chaos: 3, worksFrom: { 3: 0 } };
    // coming from the lane on the right of the works, already alongside the cones
    const from = lx + 2.2;
    w = withCar(w, 'thief', { ...thiefOf(w), s: wk.s + 20, x: from, speed: 30 });
    w = withCar(w, 'police', { ...policeOf(w), s: wk.s - 200 });
    const next = stepWorld(w, NO_INTENTS, DT);
    expect(Math.abs(thiefOf(next).x - from)).toBeLessThan(0.6);
    expect(thiefOf(next).x).toBeGreaterThan(lx);
  });

  it('driving straight into the start of the works stops the car at the cones (held, not teleported sideways)', () => {
    let w: WorldState = createWorld({ seed: 4, playerRole: 'thief', mode: 'survival', traffic: false, curves: false });
    const wk = worksBetween(4, 2000, 5000, 3).find((x) => x.lane === 0)!;
    const lx = worksLaneX(wk);
    w = { ...w, chaos: 3, worksFrom: { 3: 0 } };
    w = withCar(w, 'thief', { ...thiefOf(w), s: wk.s + 0.2, x: lx - 0.5, speed: 30 });
    w = withCar(w, 'police', { ...policeOf(w), s: wk.s - 200 });
    let next = stepWorld(w, NO_INTENTS, DT);
    const t = thiefOf(next);
    expect(Math.abs(t.x - (lx - 0.5))).toBeLessThan(0.2);
    expect(t.s).toBeLessThan(wk.s);
    expect(t.speed).toBeLessThan(15);
    // still pushing forward (immune for 1 s): held at the cones, never through them, no extra damage
    for (let i = 0; i < 120; i++) next = stepWorld(next, NO_INTENTS, DT);
    expect(thiefOf(next).s).toBeLessThan(wk.s + 0.5);
  });

  it('the computer changes lane before the works', () => {
    let w: WorldState = createWorld({ seed: 4, playerRole: 'police', mode: 'survival', traffic: false, curves: false });
    const wk = worksBetween(4, 2000, 5000, 3)[0]!;
    const x = worksLaneX(wk);
    w = { ...w, chaos: 3, worksFrom: { 3: 0 }, level: 10 };
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
  it('traffic never drives through the cones (10 seeds, 2 min each)', () => {
    let inside = 0;
    let seen = 0;
    for (let seed = 1; seed <= 10; seed++) {
      let w: WorldState = createWorld({ seed, playerRole: 'thief', mode: 'survival', chaosEvery: 5 });
      w = withCar(withCar(w, 'thief', { ...thiefOf(w), hp: 1e6 }), 'police', { ...policeOf(w), hp: 1e6 });
      for (let i = 0; i < 120 * 60; i++) {
        w = stepWorld(w, 'ai', DT);
        seen += w.works.length ? 1 : 0;
        for (const t of w.traffic)
          for (const wk of w.works) if (t.s > wk.s && t.s < wk.s + wk.length && Math.abs(t.x - worksLaneX(wk)) < 1.4) inside++;
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(inside).toBe(0);
  }, 240_000);
});
