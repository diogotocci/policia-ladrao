import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { hpPct } from '../../src/sim/car';
import { applyItem, colorChance } from '../../src/sim/items';
import { createWorld, policeOf, thiefOf } from '../../src/sim/world';

describe('Sobrevivência: 200 of life for both (playtest 2026-10-07: matches ended too fast)', () => {
  it('both cars start with 200 and 200 is their max; Perseguição stays at 100', () => {
    const w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival' });
    for (const c of [policeOf(w), thiefOf(w)]) expect(c).toMatchObject({ hp: 200, maxHp: 200 });
    const p = createWorld({ seed: 1, playerRole: 'thief' });
    expect(thiefOf(p)).toMatchObject({ hp: 100, maxHp: 100 });
    expect(BALANCE.survival.hp).toBe(200);
  });

  it('heal is capped at the car max; life as a percentage for bars, damage looks and box colors', () => {
    const w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival' });
    const hurt = { ...thiefOf(w), hp: 198.5 };
    expect(applyItem(hurt, 'heal', 0).hp).toBe(200);
    expect(applyItem({ ...hurt, hp: 150 }, 'heal', 0).hp).toBe(150 + BALANCE.items.thief.heal);
    expect(hpPct({ ...hurt, hp: 50 })).toBe(25);
    expect(colorChance(50, 50)).toBeCloseTo(0.5); // percentages in, as before
  });
});

it('debug HP is capped at the mode maximum', () => {
  const w = createWorld({ seed: 1, playerRole: 'police', debugHp: { police: 300, thief: 150 } });
  expect(policeOf(w).hp).toBe(BALANCE.hp);
  const s = createWorld({ seed: 1, playerRole: 'police', mode: 'survival', debugHp: { police: 300 } });
  expect(policeOf(s).hp).toBe(BALANCE.survival.hp);
});
