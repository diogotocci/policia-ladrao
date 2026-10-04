import { describe, expect, it } from 'vitest';
import { createRng, createRngFromState } from '../../src/sim/rng';

const take = (seed: number, n: number) => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
};

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    expect(take(42, 5)).toEqual(take(42, 5));
  });

  it('differs between seeds', () => {
    expect(take(1, 5)).not.toEqual(take(2, 5));
  });

  it('next() stays in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(1, 3) only returns 1, 2 or 3 and hits all of them', () => {
    const r = createRng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(r.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('range(min, max) stays in [min, max)', () => {
    const r = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const v = r.range(-2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe('rng state', () => {
  it('can be saved and resumed (keeps the world snapshot plain data)', () => {
    const a = createRng(5);
    a.next();
    a.next();
    const b = createRngFromState(a.state());
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });
});
