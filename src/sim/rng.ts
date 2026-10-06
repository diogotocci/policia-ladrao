// Deterministic RNG (mulberry32). The simulation never uses Math.random.
export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [min, max) */
  range(min: number, max: number): number;
  /** integer in [min, maxInclusive] */
  int(min: number, maxInclusive: number): number;
  /** internal state (number), to store in the world snapshot */
  state(): number;
}

/** Resumes an RNG from `rng.state()`. */
export function createRngFromState(state: number): Rng {
  return makeRng(state >>> 0);
}

export function createRng(seed: number): Rng {
  return makeRng(seed >>> 0);
}

function makeRng(initial: number): Rng {
  let a = initial;
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
    state: () => a,
  };
}
