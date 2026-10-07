import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { stepCar } from '../../src/sim/car';
import { scaledDamage } from '../../src/sim/chaos';
import { NO_INTENTS } from '../../src/sim/intents';
import { applyBad, BAD_EFFECTS, pickMystery } from '../../src/sim/mystery';
import { createRng } from '../../src/sim/rng';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const M = BALANCE.items.mystery;

describe('yellow "?" box (both modes)', () => {
  it('appears in Perseguição and Sobrevivência, about 15% of the boxes (10 matches each)', () => {
    for (const mode of ['pursuit', 'survival'] as const) {
      let yellow = 0;
      let n = 0;
      for (let seed = 1; seed <= 10; seed++) {
        let w = createWorld({ seed, playerRole: 'thief', mode, traffic: false });
        const seen = new Map<number, string>();
        for (let i = 0; i < 90 * 60 && !w.match.over; i++) {
          w = stepWorld(w, 'ai', DT);
          for (const b of w.boxes) seen.set(b.id, b.color);
        }
        for (const c of seen.values()) {
          n++;
          if (c === 'yellow') yellow++;
        }
      }
      expect(yellow / n, mode).toBeGreaterThan(0.08);
      expect(yellow / n, mode).toBeLessThan(0.25);
    }
  }, 120_000);

  it('good chance by difficulty: 70% Fácil, 60% Médio, 45% Difícil', () => {
    for (const [difficulty, p] of [
      ['easy', 0.7],
      ['normal', 0.6],
      ['hard', 0.45],
    ] as const) {
      const w = createWorld({ seed: 1, playerRole: 'thief', difficulty });
      const rng = createRng(9);
      let good = 0;
      for (let i = 0; i < 2000; i++) if (pickMystery(thiefOf(w), w, rng).mystery!.outcome.good) good++;
      expect(good / 2000).toBeCloseTo(p, 1);
    }
  });

  it('picking it starts a 0.6 s roulette; then the good item of your side or the bad effect applies', () => {
    let w = { ...createWorld({ seed: 4, playerRole: 'police', traffic: false, curves: false }), nextBoxAt: 1e9 };
    const p = policeOf(w);
    w = { ...w, boxes: [{ id: 1, s: p.s + 1, x: p.x, color: 'yellow' }] };
    w = stepWorld(w, NO_INTENTS, DT);
    const ev = w.events.find((e) => e.type === 'mystery');
    expect(ev && ev.type === 'mystery' && ev.role).toBe('police');
    expect(policeOf(w).mystery).not.toBeNull();
    expect(w.events.some((e) => e.type === 'pickup')).toBe(false); // no wrong-box damage, no normal pickup
    let revealed = false;
    let t = 0;
    for (let i = 0; i < 60 && !revealed; i++) {
      w = stepWorld(w, NO_INTENTS, DT);
      t += DT;
      revealed = w.events.some((e) => e.type === 'mysteryReveal');
    }
    expect(revealed).toBe(true);
    expect(t).toBeCloseTo(M.revealTime, 1);
    expect(policeOf(w).mystery).toBeNull();
  });

  it('bad: engine failing (slower), double damage, mud (screen only), no brake', () => {
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    const car = { ...thiefOf(w), speed: 34 };
    expect(BAD_EFFECTS).toEqual(['slow', 'double', 'mud', 'noBrake']);
    const slow = applyBad(car, 'slow', 0);
    let c = slow;
    for (let i = 0; i < 120; i++) c = stepCar(c, NO_INTENTS, DT, { time: 0.5 });
    expect(c.speed).toBeLessThan(34 * M.slow.factor + 1);
    const nb = applyBad(car, 'noBrake', 0);
    expect(stepCar(nb, { ...NO_INTENTS, brake: true }, DT, { time: 1 }).speed).toBeGreaterThanOrEqual(33.9);
    expect(stepCar(nb, { ...NO_INTENTS, brake: true }, DT, { time: 4 }).speed).toBeLessThan(33.9); // over after 3 s
    const dbl: WorldState = withCar(w, 'thief', applyBad(car, 'double', 0));
    expect(scaledDamage(10, dbl, 'thief')).toBeCloseTo(20);
    expect(scaledDamage(10, { ...dbl, time: M.double.time + 0.1 } as WorldState, 'thief')).toBeCloseTo(10);
    expect(scaledDamage(10, dbl, 'police')).toBeCloseTo(10);
    expect(applyBad(car, 'mud', 2).effects.mudUntil).toBe(2 + M.mud.time);
  });

  it('end scenes cancel a roulette still spinning', () => {
    let w = { ...createWorld({ seed: 4, playerRole: 'police', traffic: false, curves: false }), nextBoxAt: 1e9 };
    const t = thiefOf(w);
    w = withCar(w, 'thief', { ...t, hp: 0, mystery: { at: 99, outcome: { good: false, effect: 'double' } } });
    w = stepWorld(w, NO_INTENTS, DT);
    expect(w.match.arrestAt).toBeDefined();
    expect(thiefOf(w).mystery).toBeNull();
  });
});
