import { describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const FIRE = { ...NO_INTENTS, fire: true };

const run = (w: WorldState, steps: number, intents: Parameters<typeof stepWorld>[1] = NO_INTENTS) => {
  let s = w;
  for (let i = 0; i < steps; i++) s = stepWorld(s, intents, DT);
  return s;
};

describe('match end', () => {
  it('police shooting a 1-hp thief wins; endTime is the time of that step', () => {
    let w = createWorld({ seed: 3, playerRole: 'police', debugHp: { thief: 1 } });
    let steps = 0;
    while (!w.match.over && steps < 3600) {
      w = stepWorld(w, FIRE, DT);
      steps++;
    }
    expect(w.match.over).toBe(true);
    expect(w.match.winner).toBe('police');
    expect(w.match.endTime).toBeCloseTo(w.time, 10);
    expect(w.events).toContainEqual({ type: 'end', winner: 'police' });
  });

  it('after the end nothing changes any more', () => {
    let w = createWorld({ seed: 3, playerRole: 'police', debugHp: { thief: 1 } });
    while (!w.match.over) w = stepWorld(w, FIRE, DT);
    const frozen = stepWorld(w, NO_INTENTS, DT);
    expect(run(frozen, 100, { ...NO_INTENTS, left: true, fire: true })).toEqual(frozen);
  });

  it('a step after the end returns no events (no replayed sparks/shake)', () => {
    let w = createWorld({ seed: 3, playerRole: 'police', debugHp: { thief: 1 } });
    for (let i = 0; i < 3600 && !w.match.over; i++) w = stepWorld(w, FIRE, DT);
    expect(w.events.length).toBeGreaterThan(0);
    const after = stepWorld(w, FIRE, DT);
    expect(after.events).toEqual([]);
    expect({ ...after, events: w.events }).toEqual(w);
  });

  it('both at 0 in the same step → the thief wins', () => {
    let w = createWorld({ seed: 3, playerRole: 'police', debugHp: { police: 3, thief: 3 } });
    // encosta a polícia no ladrão (mesma faixa) para uma batida que tira 5 / 3
    const t = thiefOf(w);
    w = withCar(w, 'police', { ...policeOf(w), s: t.s - 2, x: t.x, speed: t.speed + 5 });
    w = stepWorld(w, NO_INTENTS, DT);
    expect(policeOf(w).hp).toBe(0);
    expect(thiefOf(w).hp).toBe(0);
    expect(w.match.winner).toBe('thief');
  });

  it('a car zeroed by a crash does not shoot in the same step', () => {
    let w = createWorld({ seed: 3, playerRole: 'police', debugHp: { police: 3 } });
    const t = thiefOf(w);
    w = withCar(w, 'police', { ...policeOf(w), s: t.s - 2, x: t.x, speed: t.speed + 5 });
    w = stepWorld(w, FIRE, DT);
    expect(policeOf(w).hp).toBe(0);
    expect(w.events.some((e) => e.type === 'shot')).toBe(false);
    expect(w.projectiles).toEqual([]);
  });

  it('level is 2 at 30 s', () => {
    const w = run(createWorld({ seed: 1, playerRole: 'thief' }), 30 * 60 + 1);
    expect(w.level).toBe(2);
  });
});

describe('AI vs AI (player also driven by the AI)', () => {
  it('with traffic and items the thief fights back (hurts the police in most matches) and matches last', () => {
    let hurt = 0;
    let total = 0;
    for (const role of ['police', 'thief'] as Role[]) {
      for (let seed = 1; seed <= 8; seed++) {
        let w = createWorld({ seed, playerRole: role });
        for (let i = 0; i < 10 * 60 * 60 && !w.match.over; i++) w = stepWorld(w, 'ai', DT);
        expect(w.match.over, `seed ${seed} ${role}`).toBe(true);
        if (policeOf(w).hp < 100) hurt++;
        total += w.time;
      }
    }
    expect(hurt).toBeGreaterThanOrEqual(10);
    expect(total / 16).toBeGreaterThanOrEqual(90);
  });

  for (const role of ['police', 'thief'] as Role[]) {
    it(`always ends within 10 simulated minutes — player as ${role}`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        let w = createWorld({ seed, playerRole: role });
        let steps = 0;
        while (!w.match.over && steps < 10 * 60 * 60) {
          w = stepWorld(w, 'ai', DT);
          steps++;
        }
        expect(w.match.over, `seed ${seed}`).toBe(true);
        expect(policeOf(w).s).toBeLessThanOrEqual(thiefOf(w).s + 1e-9);
      }
    });
  }
});

describe('determinism', () => {
  it('same seed and inputs → identical state after 3600 steps', () => {
    const script = (i: number) => ({ ...NO_INTENTS, left: i % 120 < 40, fire: true });
    const go = () => {
      let w = createWorld({ seed: 11, playerRole: 'police' });
      for (let i = 0; i < 3600; i++) w = stepWorld(w, script(i), DT);
      return w;
    };
    expect(go()).toEqual(go());
  });
});
