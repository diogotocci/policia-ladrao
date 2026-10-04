import { describe, expect, it } from 'vitest';
import { RECIPES, envelopeAt, recipeDuration } from '../../src/audio/sfx';

describe('sound recipes', () => {
  it('there is a recipe for every game sound', () => {
    for (const k of ['shot-police', 'shot-thief', 'hit', 'crash', 'explosion', 'pickup', 'wrong', 'bomb-drop', 'win', 'lose'])
      expect(RECIPES[k as keyof typeof RECIPES], k).toBeDefined();
  });

  it('every voice is short, has a positive duration and an envelope that ends at 0', () => {
    for (const [name, r] of Object.entries(RECIPES)) {
      expect(recipeDuration(r), name).toBeGreaterThan(0);
      expect(recipeDuration(r), name).toBeLessThanOrEqual(1.6);
      for (const v of r) {
        expect(envelopeAt(v, 0)).toBe(0);
        expect(envelopeAt(v, v.delay)).toBe(0);
        expect(envelopeAt(v, v.delay + v.attack)).toBeCloseTo(v.gain, 5);
        expect(envelopeAt(v, v.delay + v.duration)).toBe(0);
      }
    }
  });

  it('the explosion is lower and longer than a shot', () => {
    expect(recipeDuration(RECIPES.explosion)).toBeGreaterThan(recipeDuration(RECIPES['shot-police']));
    const tone = (r: readonly { wave: string; freq: number }[]) => Math.min(...r.filter((x) => x.wave !== 'noise').map((x) => x.freq));
    expect(tone(RECIPES.explosion)).toBeLessThan(tone(RECIPES['shot-police']));
  });
});
