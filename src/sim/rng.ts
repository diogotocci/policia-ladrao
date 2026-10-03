// RNG determinístico (mulberry32). A simulação nunca usa Math.random.
export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [min, max) */
  range(min: number, max: number): number;
  /** inteiro em [min, maxInclusive] */
  int(min: number, maxInclusive: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, maxInclusive) => min + Math.floor(next() * (maxInclusive - min + 1)),
  };
}
