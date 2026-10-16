import { describe, expect, it } from 'vitest';
import {
  PROBE_EVERY,
  QUALITY,
  QUALITY_KEY,
  computeRenderSize,
  createQualityGovernor,
  saveTier,
  startTier,
} from '../../src/render/renderer';

describe('computeRenderSize', () => {
  it('uses the CSS size and caps the pixel ratio by quality tier', () => {
    expect(computeRenderSize(844, 390, 3, 'high')).toEqual({ width: 844, height: 390, pixelRatio: 2 });
    expect(computeRenderSize(844, 390, 3, 'medium')).toEqual({ width: 844, height: 390, pixelRatio: 1.5 });
    expect(computeRenderSize(844, 390, 3, 'low')).toEqual({ width: 844, height: 390, pixelRatio: 1 });
    // lowest draws fewer pixels than the CSS size and the browser scales up
    expect(computeRenderSize(844, 390, 2, 'lowest')).toEqual({ width: 844, height: 390, pixelRatio: 0.75 });
  });

  it('never upsamples beyond the device ratio', () => {
    expect(computeRenderSize(1280, 720, 1, 'high').pixelRatio).toBe(1);
  });

  it('survives a zero-sized container', () => {
    const r = computeRenderSize(0, 0, 2, 'high');
    expect(r.width).toBeGreaterThanOrEqual(1);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });
});

describe('QUALITY tiers', () => {
  it('high has shadows, low has none', () => {
    expect(QUALITY.high.shadowMapSize).toBeGreaterThan(0);
    expect(QUALITY.medium.shadowMapSize).toBeGreaterThan(0);
    expect(QUALITY.low.shadowMapSize).toBe(0);
    expect(QUALITY.lowest.shadowMapSize).toBe(0);
  });

  it('multisampling only on high and medium', () => {
    expect([QUALITY.high, QUALITY.medium, QUALITY.low, QUALITY.lowest].map((q) => q.antialias)).toEqual([true, true, false, false]);
  });
});

describe('startTier', () => {
  const store = (v?: string) => {
    const m = new Map<string, string>(v ? [[QUALITY_KEY, v]] : []);
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, x: string) => void m.set(k, x), m };
  };
  it('a phone starts on medium and a computer on high the first time', () => {
    expect(startTier(store(), true)).toBe('medium');
    expect(startTier(store(), false)).toBe('high');
  });
  it('later matches start where the device settled; every few matches one tries a tier higher', () => {
    const s = store();
    saveTier(s, 'low');
    const tiers = Array.from({ length: PROBE_EVERY * 2 }, () => startTier(s, true));
    expect(tiers.filter((t) => t === 'medium')).toHaveLength(2);
    expect(tiers.filter((t) => t === 'low')).toHaveLength(PROBE_EVERY * 2 - 2);
    expect(tiers[PROBE_EVERY - 1]).toBe('medium');
  });
  it('a try that holds is remembered; high is never tried above', () => {
    const s = store();
    saveTier(s, 'low');
    saveTier(s, 'medium');
    expect(startTier(s, true)).toBe('medium');
    const top = store('high|9');
    expect(startTier(top, false)).toBe('high');
  });
  it('nonsense or blocked storage falls back', () => {
    expect(startTier(store('ultra'), false)).toBe('high');
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(startTier(blocked, true)).toBe('medium');
    saveTier(blocked, 'low'); // does not throw
  });
});

describe('createQualityGovernor', () => {
  const feed = (g: ReturnType<typeof createQualityGovernor>, fps: number, seconds: number) => {
    let tier = g.tier;
    for (let t = 0; t < seconds; t += 1 / fps) tier = g.sample(1 / fps);
    return tier;
  };
  /** irregular frames (average = fps), like a device that is really struggling */
  const feedJitter = (g: ReturnType<typeof createQualityGovernor>, fps: number, seconds: number) => {
    let tier = g.tier;
    let t = 0;
    let i = 0;
    while (t < seconds) {
      const dt = (1 / fps) * (i++ % 2 === 0 ? 0.7 : 1.3);
      t += dt;
      tier = g.sample(dt);
    }
    return tier;
  };

  it('keeps the tier at a steady 60 fps', () => {
    expect(feed(createQualityGovernor('high'), 60, 10)).toBe('high');
  });

  it('ignores the first 2 s (shader compile, page load), then drops after a 3 s window below 45 fps', () => {
    const g = createQualityGovernor('high');
    expect(feedJitter(g, 25, 4)).toBe('high');
    expect(feedJitter(g, 25, 1.5)).toBe('medium');
  });

  it('waits 1 s of grace after a tier change before measuring again', () => {
    const g = createQualityGovernor('high');
    feedJitter(g, 20, 5.2); // → medium
    expect(g.tier).toBe('medium');
    expect(feedJitter(g, 20, 3.5)).toBe('medium'); // 1 s grace period + window still incomplete
    expect(feedJitter(g, 20, 1)).toBe('low');
  });

  it('goes down to lowest at most', () => {
    const g = createQualityGovernor('high');
    expect(feedJitter(g, 15, 60)).toBe('lowest');
  });

  it('does not downgrade a device capped at a steady 30 Hz (battery saver)', () => {
    expect(feed(createQualityGovernor('high'), 30, 30)).toBe('high');
  });

  it('ignores single long frames (> 0.5 s)', () => {
    const g = createQualityGovernor('high');
    feed(g, 60, 3);
    for (let i = 0; i < 10; i++) g.sample(2);
    expect(feed(g, 60, 3)).toBe('high');
  });

  it('reset() (tab visible again) restarts with 1 s of grace', () => {
    const g = createQualityGovernor('high');
    feed(g, 60, 3);
    g.reset();
    expect(feedJitter(g, 25, 3.5)).toBe('high');
    expect(feedJitter(g, 25, 1)).toBe('medium');
  });

  it('never upgrades on its own (avoids oscillation)', () => {
    const g = createQualityGovernor('medium');
    expect(feed(g, 120, 30)).toBe('medium');
  });
});
