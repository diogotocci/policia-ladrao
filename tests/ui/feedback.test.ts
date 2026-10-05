import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { feedbackFor } from '../../src/ui/feedback';

describe('player feedback (works on iPhone: visual first, vibration where supported)', () => {
  it('taking a hit flashes the screen edge, stronger for bigger hits, and buzzes', () => {
    const small = feedbackFor({ type: 'hit', target: 'police', amount: 1, s: 0, x: 0 }, 'police')!;
    const big = feedbackFor({ type: 'hit', target: 'police', amount: 8, s: 0, x: 0 }, 'police')!;
    expect(small.flash).toBeGreaterThan(0);
    expect(big.flash!).toBeGreaterThan(small.flash!);
    expect(big.flash!).toBeLessThanOrEqual(1);
    expect(small.buzz).toBeGreaterThan(0);
    expect(feedbackFor({ type: 'hit', target: 'thief', amount: 1, s: 0, x: 0 }, 'police')).toBeNull();
  });

  it('crashes the player is part of (curb, traffic, the other car) also flash and buzz', () => {
    expect(feedbackFor({ type: 'crash', a: 'thief', b: 'scenery', s: 0, x: 0 }, 'thief')?.flash).toBeGreaterThan(0);
    expect(feedbackFor({ type: 'crash', a: 'thief', b: 'traffic', s: 0, x: 0 }, 'thief')?.buzz).toBeGreaterThan(0);
    expect(feedbackFor({ type: 'crash', a: 'police', b: 'thief', s: 0, x: 0 }, 'thief')?.flash).toBeGreaterThan(0);
    expect(feedbackFor({ type: 'crash', a: 'police', b: 'scenery', s: 0, x: 0 }, 'thief')).toBeNull();
  });

  it('a bomb hitting the police: the thief gets a big notice, its own sound and a buzz; the police gets a full flash', () => {
    const e = { type: 'explosion', s: 0, x: 0 } as const;
    const t = feedbackFor(e, 'thief')!;
    expect(t.toast).toContain('Bomba acertou');
    expect(t.toast).toContain(`−${BALANCE.items.bomb.damage}`);
    expect(t.cue).toBe('bomb-hit');
    expect(t.buzz).toBeGreaterThan(0);
    expect(t.flash).toBeUndefined();
    expect(feedbackFor(e, 'police')!.flash).toBe(1);
  });
});

import { feedbackForFrame } from '../../src/ui/feedback';
describe('one feedback per frame (events of the same frame never cancel each other)', () => {
  it('bomb on the police = explosion + hit in the same frame: the full flash and long buzz win', () => {
    const f = feedbackForFrame(
      [
        { type: 'explosion', s: 0, x: 0 },
        { type: 'hit', target: 'police', amount: 15, s: 0, x: 0 },
      ],
      'police',
    );
    expect(f.flash).toBe(1);
    expect(f.buzz).toBe(80);
  });
  it('crash on the curb + its hit: the crash buzz is kept; nothing for the player → empty', () => {
    const f = feedbackForFrame(
      [
        { type: 'crash', a: 'thief', b: 'scenery', s: 0, x: 0 },
        { type: 'hit', target: 'thief', amount: 5, s: 0, x: 0 },
      ],
      'thief',
    );
    expect(f.buzz).toBe(40);
    expect(f.flash).toBeGreaterThanOrEqual(0.6);
    expect(feedbackForFrame([{ type: 'hit', target: 'police', amount: 1, s: 0, x: 0 }], 'thief')).toEqual({});
  });
});
