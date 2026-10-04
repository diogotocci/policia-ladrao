import { describe, expect, it } from 'vitest';
import { createWorld, policeOf, stepWorld, thiefOf, type WorldState } from '../../src/sim/world';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';

const DT = 1 / 60;
const play = (w: WorldState, script: (i: number) => Partial<Intents>, steps: number) => {
  let s = w;
  for (let i = 0; i < steps; i++) s = stepWorld(s, { ...NO_INTENTS, ...script(i) }, DT);
  return s;
};

describe('world', () => {
  it('spawns police on lane 1 at s = 0 and thief on lane 2 at s = 40, both with 100 hp', () => {
    for (const playerRole of ['police', 'thief'] as const) {
      const w = createWorld({ seed: 1, playerRole });
      const police = policeOf(w);
      const thief = thiefOf(w);
      expect([police.x, police.s, police.hp]).toEqual([-1.5, 0, 100]);
      expect([thief.x, thief.s, thief.hp]).toEqual([1.5, 40, 100]);
      expect(w.player.role).toBe(playerRole);
      expect(w.opponent.role).toBe(playerRole === 'police' ? 'thief' : 'police');
      expect(w.time).toBe(0);
      expect(w.level).toBe(1);
      expect(w.match.over).toBe(false);
      expect(w.projectiles).toEqual([]);
    }
  });

  it('debugHp overrides starting hp', () => {
    const w = createWorld({ seed: 1, playerRole: 'police', debugHp: { thief: 2 } });
    expect(thiefOf(w).hp).toBe(2);
    expect(policeOf(w).hp).toBe(100);
  });

  it('advances time by dt', () => {
    const w = play(createWorld({ seed: 1, playerRole: 'police' }), () => ({}), 60);
    expect(w.time).toBeCloseTo(1, 10);
  });

  it('is deterministic for the same seed and inputs', () => {
    const script = (i: number) => ({ left: i % 90 < 30, brake: i % 200 > 180 });
    const a = play(createWorld({ seed: 5, playerRole: 'police' }), script, 600);
    const b = play(createWorld({ seed: 5, playerRole: 'police' }), script, 600);
    expect(a).toEqual(b);
    expect(a.player.s).toBeGreaterThan(0);
  });
});
