// Curve layout (Delivery 6): alternating straights and curves, deterministic from the seed.
// The sim stays in (s, x); the curve only enters as curvature κ(s) (lateral drift in physics and drawing in the renderer).
import { BALANCE } from '../config/balance';
import { createRng } from './rng';
import { bumpsBetween } from './track';

export interface Curve {
  start: number; // s at entry
  length: number; // m
  radius: number; // m (no meio da curva)
  dir: -1 | 1; // 1 = direita, -1 = esquerda
  sharp: boolean;
}

interface Layout {
  curves: Curve[];
  until: number; // s up to where the layout has been generated
  next: number; // s where the next straight starts
  rng: ReturnType<typeof createRng>;
}

const MIN_LEN = 120;
const layouts = new Map<number, Layout>();

function layoutFor(seed: number): Layout {
  let l = layouts.get(seed);
  if (!l) {
    l = { curves: [], until: 0, next: BALANCE.curves.straightStart, rng: createRng((Math.imul(seed, 0x2c1b3c6d) ^ 0x51ed27) >>> 0) };
    layouts.set(seed, l);
    if (layouts.size > 32) layouts.delete(layouts.keys().next().value!); // doesn't grow without limit
  }
  return l;
}

/** generates curves, in order, until s is covered (same sequence regardless of query order) */
function extend(seed: number, l: Layout, s: number) {
  const C = BALANCE.curves;
  const gap = C.bumpClearance;
  while (l.until < s) {
    let start = l.next + l.rng.range(C.straightMin, C.straightMax);
    let length = l.rng.range(C.lengthMin, C.lengthMax);
    const sharp = l.rng.next() < C.sharpChance;
    const [r0, r1] = sharp ? C.sharpRadius : C.gentleRadius;
    const radius = l.rng.range(r0, r1);
    const dir: -1 | 1 = l.rng.next() < 0.5 ? -1 : 1;
    // stays between two speed bumps, with clearance; if it doesn't fit, skips to after the next one
    for (let tries = 0; tries < 20; tries++) {
      const bumps = bumpsBetween(seed, start - gap, start + length + gap).filter((b) => b.s > start - gap + 1e-6);
      if (bumps.length === 0) break;
      const first = bumps[0]!;
      if (first.s - gap - start >= MIN_LEN) {
        length = first.s - gap - start;
        break;
      }
      start = first.s + gap;
    }
    l.curves.push({ start, length, radius, dir, sharp });
    l.next = start + length;
    l.until = l.next;
  }
}

export function curvesBetween(seed: number, s0: number, s1: number): Curve[] {
  const l = layoutFor(seed);
  extend(seed, l, s1 + BALANCE.curves.straightMax + BALANCE.curves.lengthMax);
  return l.curves.filter((c) => c.start + c.length > s0 && c.start < s1);
}

/** curvature at s (1/m): positive = curve to the right. Smooth ramp (cosine) in and out. */
export function curvatureAt(seed: number, s: number, on = true): number {
  if (!on || s < BALANCE.curves.straightStart) return 0;
  const l = layoutFor(seed);
  extend(seed, l, s + 1);
  // binary search for the curve containing s
  const cs = l.curves;
  let lo = 0;
  let hi = cs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cs[mid]!;
    if (s < c.start) hi = mid - 1;
    else if (s >= c.start + c.length) lo = mid + 1;
    else {
      const u = (s - c.start) / c.length; // 0..1
      const r = BALANCE.curves.ramp;
      const t = u < r ? u / r : u > 1 - r ? (1 - u) / r : 1;
      const ease = (1 - Math.cos(Math.PI * Math.min(1, t))) / 2;
      return (c.dir / c.radius) * ease;
    }
  }
  return 0;
}
