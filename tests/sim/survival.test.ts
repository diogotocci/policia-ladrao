import { describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/balance';
import { createWorld, stepWorld } from '../../src/sim/world';

const DT = 1 / 60;

describe('Sobrevivência AI vs AI (Médio)', () => {
  it('every match ends within 10 simulated minutes and the thief wins 30-70%', () => {
    let thief = 0;
    let n = 0;
    for (const role of ['police', 'thief'] as Role[])
      for (let seed = 1; seed <= 20; seed++) {
        let w = createWorld({ seed, playerRole: role, mode: 'survival' });
        for (let i = 0; i < 600 * 60 && !w.match.over; i++) w = stepWorld(w, 'ai', DT);
        expect(w.match.over, `seed ${seed} as ${role}`).toBe(true);
        n++;
        if (w.match.winner === 'thief') thief++;
      }
    expect(thief / n).toBeGreaterThanOrEqual(0.3);
    expect(thief / n).toBeLessThanOrEqual(0.7);
  }, 300_000);
});
