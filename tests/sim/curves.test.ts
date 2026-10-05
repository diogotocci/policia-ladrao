import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { curvatureAt, curvesBetween } from '../../src/sim/curves';
import { bumpsBetween } from '../../src/sim/track';

const C = BALANCE.curves;

describe('curves layout', () => {
  it('is deterministic and independent of query order', () => {
    const a = curvesBetween(7, 0, 5000);
    curvesBetween(8, 10000, 12000);
    const b = curvesBetween(7, 0, 5000);
    expect(b).toEqual(a);
    expect(curvesBetween(7, 3000, 5000)).toEqual(a.filter((c) => c.start + c.length > 3000 && c.start < 5000));
  });

  it('straight for the first 300 m', () => {
    for (let seed = 1; seed <= 20; seed++) for (let s = 0; s <= C.straightStart; s += 5) expect(curvatureAt(seed, s)).toBe(0);
  });

  it('gentle curves have r ≥ 350 m, sharp ones 130–180 (balance pass) m, about 1/3 sharp, both directions', () => {
    const all = Array.from({ length: 10 }, (_, i) => curvesBetween(i + 1, 0, 40000)).flat();
    expect(all.length).toBeGreaterThan(200);
    const sharp = all.filter((c) => c.sharp);
    for (const c of sharp) {
      expect(c.radius).toBeGreaterThanOrEqual(130);
      expect(c.radius).toBeLessThanOrEqual(180);
    }
    for (const c of all.filter((x) => !x.sharp)) expect(c.radius).toBeGreaterThanOrEqual(350);
    expect(sharp.length / all.length).toBeGreaterThan(0.22);
    expect(sharp.length / all.length).toBeLessThan(0.45);
    expect(all.some((c) => c.dir === 1) && all.some((c) => c.dir === -1)).toBe(true);
    for (const c of all) {
      expect(c.length).toBeGreaterThanOrEqual(120);
      expect(c.length).toBeLessThanOrEqual(300);
    }
  });

  it('curvature is continuous: ramps in and out, no steps', () => {
    for (let seed = 1; seed <= 5; seed++)
      for (let s = 0; s < 8000; s += 1) {
        const d = Math.abs(curvatureAt(seed, s + 1) - curvatureAt(seed, s));
        expect(d).toBeLessThan(1 / (110 * 20));
      }
  });

  it('peak curvature equals 1/radius in the middle of the curve, sign = direction', () => {
    const c = curvesBetween(3, 0, 4000)[0]!;
    expect(curvatureAt(3, c.start + c.length / 2)).toBeCloseTo(c.dir / c.radius, 6);
  });

  it('never a curve over a speed bump (±20 m)', () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const b of bumpsBetween(seed, 0, 20000))
        for (const c of curvesBetween(seed, b.s - 400, b.s + 400)) {
          const inside = b.s > c.start - 20 && b.s < c.start + c.length + 20;
          expect(inside, `seed ${seed} bump ${b.s}`).toBe(false);
        }
  });

  it('off switch: no curvature at all', () => {
    for (let s = 0; s < 5000; s += 7) expect(curvatureAt(5, s, false)).toBe(0);
  });
});
