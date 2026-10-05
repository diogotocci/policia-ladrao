import { describe, expect, it } from 'vitest';
import { createTrackFrame } from '../../src/render/trackFrame';
import { curvatureAt, curvesBetween } from '../../src/sim/curves';

describe('track frame (world position along the curves)', () => {
  it('without curves it is the old straight mapping (x = x, z = −(s − origin))', () => {
    const f = createTrackFrame(4, false);
    for (const [s, x, o] of [[0, 0, 0], [123.4, 2.5, 100], [5000, -4.5, 4990]] as const) {
      const p = f.toWorld(s, x, o);
      expect(p.x).toBeCloseTo(x, 9);
      expect(p.z).toBeCloseTo(-(s - o), 9);
      expect(p.heading).toBe(0);
    }
  });

  it('is continuous (0.1 m of track moves at most ~0.11 m) and x is perpendicular to the heading', () => {
    const f = createTrackFrame(3, true);
    let prev = f.toWorld(0, 0, 0);
    for (let s = 0.1; s < 6000; s += 0.1) {
      const p = f.toWorld(s, 0, 0);
      expect(Math.hypot(p.x - prev.x, p.z - prev.z)).toBeLessThan(0.11);
      prev = p;
    }
    const c = curvesBetween(3, 0, 6000)[0]!;
    const mid = c.start + c.length / 2;
    const a = f.toWorld(mid, 0, 0);
    const b = f.toWorld(mid, 3, 0);
    const fwd = { x: Math.sin(a.heading), z: -Math.cos(a.heading) };
    expect((b.x - a.x) * fwd.x + (b.z - a.z) * fwd.z).toBeCloseTo(0, 6);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(3, 6);
  });

  it('heading follows the integral of the curvature (a right curve turns towards +x)', () => {
    const f = createTrackFrame(5, true);
    const c = curvesBetween(5, 0, 8000)[0]!;
    let integral = 0;
    for (let s = 0; s < c.start + c.length; s += 0.05) integral += curvatureAt(5, s + 0.025) * 0.05;
    expect(f.toWorld(c.start + c.length, 0, 0).heading).toBeCloseTo(integral, 3);
    expect(Math.sign(f.toWorld(c.start + c.length, 0, 0).heading)).toBe(c.dir);
  });

  it('stays numerically stable far away (20 km)', () => {
    const f = createTrackFrame(9, true);
    const a = f.toWorld(20000.5, 1.5, 20000);
    const b = createTrackFrame(9, true).toWorld(20000.5, 1.5, 20000);
    expect(Math.abs(a.x - b.x)).toBeLessThan(1e-3);
    expect(Math.abs(a.z - b.z)).toBeLessThan(1e-3);
    expect(Math.hypot(a.x, a.z)).toBeLessThan(3); // relativo à origem: números pequenos
  });

  it('behind the start line (s < 0) the road continues straight — camera and mirror sit behind the car', () => {
    const f = createTrackFrame(3, true);
    expect(f.toWorld(-6, 0, 0).z).toBeCloseTo(6, 6);
    expect(f.toWorld(-50, 3, 0)).toMatchObject({ x: 3, heading: 0 });
    expect(f.toWorld(-50, 3, 0).z).toBeCloseTo(50, 6);
  });
});
