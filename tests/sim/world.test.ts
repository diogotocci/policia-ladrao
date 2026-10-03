import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../../src/sim/world';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';

const DT = 1 / 60;
const play = (w: WorldState, script: (i: number) => Partial<Intents>, steps: number) => {
  let s = w;
  for (let i = 0; i < steps; i++) s = stepWorld(s, { ...NO_INTENTS, ...script(i) }, DT);
  return s;
};

describe('world', () => {
  it('spawns the player on lane 1 at s = 0 with the chosen role', () => {
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    expect(w.player.role).toBe('thief');
    expect(w.player.x).toBe(-1.5);
    expect(w.player.s).toBe(0);
    expect(w.time).toBe(0);
    expect(w.seed).toBe(1);
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
