import { describe, expect, it } from 'vitest';
import { RECIPES, envelopeAt, recipeDuration, type Voice } from '../../src/audio/sfx';

describe('sound recipes', () => {
  it('there is a recipe for every game sound', () => {
    for (const k of ['shot-police', 'shot-thief', 'hit', 'crash', 'explosion', 'pickup', 'wrong', 'bomb-drop', 'win', 'lose', 'beep', 'go', 'ui', 'skid', 'bomb-hit', 'rotor', 'escape'])
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

  it('shots sound like gunshots (playtest 2026-10-05): noise-led bang with an instant attack; police crack brighter and shorter, thief boom lower and longer', () => {
    const loud = (r: readonly Voice[]) => r.reduce((a, b) => (b.gain > a.gain ? b : a));
    const bright = (r: readonly Voice[]) => Math.max(...r.filter((x) => x.wave === 'noise').map((x) => x.freq));
    const police = RECIPES['shot-police'];
    const thief = RECIPES['shot-thief'];
    for (const r of [police, thief]) {
      expect(loud(r).wave).toBe('noise');
      expect(loud(r).attack).toBeLessThanOrEqual(0.002);
      expect(r.some((x) => x.wave !== 'noise' && x.freq <= 250)).toBe(true); // corpo grave do estampido
    }
    expect(bright(police)).toBeGreaterThanOrEqual(bright(thief) * 2);
    expect(recipeDuration(thief)).toBeGreaterThan(recipeDuration(police) * 1.3);
  });

  it('tyre screech, not a slide (playtest): high tonal squeal with two close tones beating, ~0.5 s', () => {
    const r = RECIPES.skid;
    const tones = r.filter((x) => x.wave !== 'noise' && x.freq >= 1000 && x.freq <= 2500);
    expect(tones.length).toBeGreaterThanOrEqual(2);
    const [a, b] = tones;
    expect(Math.abs(a!.freq - b!.freq)).toBeGreaterThan(20);
    expect(Math.abs(a!.freq - b!.freq)).toBeLessThan(120); // batimento áspero de pneu
    const toneGain = tones.reduce((s, x) => s + x.gain, 0);
    const noiseGain = r.filter((x) => x.wave === 'noise').reduce((s, x) => s + x.gain, 0);
    expect(toneGain).toBeGreaterThan(noiseGain);
    expect(recipeDuration(r)).toBeGreaterThanOrEqual(0.4);
    expect(recipeDuration(r)).toBeLessThanOrEqual(0.8);
  });
});
