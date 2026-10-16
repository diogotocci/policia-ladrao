// Frame pacing on high-refresh screens: a slow phone draws every second refresh, evenly.
import { describe, expect, it } from 'vitest';
import { createFramePacer } from '../../src/render/pacer';

/**
 * Runs the pacer on a screen of `hz` for `seconds`. `cost` is how long a drawn frame takes: the next callback comes
 * on the first refresh after it finishes (like the browser). Returns the drawn intervals in ms after the decision.
 */
function run(hz: number, cost: (i: number) => number, seconds = 8) {
  const p = createFramePacer();
  const vsync = 1000 / hz;
  let t = 0;
  let i = 0;
  const drawnAt: number[] = [];
  while (t < seconds * 1000) {
    if (p.shouldDraw(t)) {
      drawnAt.push(t);
      const busy = cost(i++);
      t += Math.max(1, Math.ceil(busy / vsync)) * vsync;
    } else t += vsync;
  }
  const late = drawnAt.filter((x) => x > 5000);
  const gaps = late.slice(1).map((x, k) => Math.round(x - late[k]!));
  return { p, gaps };
}

describe('frame pacer', () => {
  it('a 90 Hz phone that keeps up draws every refresh', () => {
    const { p, gaps } = run(90, () => 8);
    expect(p.halved).toBe(false);
    expect(p.target).toBe(60); // the governor's aim
    expect(new Set(gaps)).toEqual(new Set([11]));
  });

  it('a 90 Hz phone that cannot keep up (frames of 1 or 2 refreshes) draws every second refresh, evenly', () => {
    const { p, gaps } = run(90, (i) => (i % 3 === 0 ? 14 : 10)); // ~70 fps, uneven
    expect(p.halved).toBe(true);
    expect(Math.round(p.target)).toBe(45);
    expect(new Set(gaps)).toEqual(new Set([22]));
  });

  it('a 60 Hz screen is never halved (the quality governor handles it)', () => {
    const { p } = run(60, () => 25);
    expect(p.halved).toBe(false);
    expect(Math.round(p.target)).toBe(60);
  });

  it('120 Hz that cannot keep up goes to 60', () => {
    const { p } = run(120, (i) => (i % 2 ? 9 : 7));
    expect(p.halved).toBe(true);
    expect(Math.round(p.target)).toBe(60);
  });

  it('a screen that drops from 90 to 60 Hz mid-match goes back to drawing every refresh', () => {
    const p = createFramePacer();
    let t = 0;
    let vsync = 1000 / 90;
    let i = 0;
    while (t < 16000) {
      if (t > 8000) vsync = 1000 / 60;
      if (p.shouldDraw(t)) t += (i++ % 3 === 0 ? 2 : 1) * vsync;
      else t += vsync;
    }
    expect(p.halved).toBe(false);
    expect(p.target).toBe(60);
  });

  it('frames during the countdown or a pause are not measured; reset() starts over at full rate', () => {
    const frozen = createFramePacer();
    for (let t = 0; t < 6000; t += 2 * (1000 / 90)) frozen.shouldDraw(t, false); // slow, but not playing
    expect(frozen.halved).toBe(false);
    const { p } = run(90, (i) => (i % 3 === 0 ? 14 : 10));
    expect(p.halved).toBe(true);
    p.reset();
    expect(p.halved).toBe(false);
  });

  it('a computer (pacing off) is never halved', () => {
    const p = createFramePacer({ enabled: false });
    for (let k = 0, t = 0; t < 8000; k++) t += p.shouldDraw(t) ? (k % 3 === 0 ? 2 : 1) * (1000 / 144) : 1000 / 144;
    expect(p.halved).toBe(false);
  });
});
