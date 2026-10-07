import { describe, expect, it } from 'vitest';
import { DIFFICULTY_KEY, loadDifficulty, saveDifficulty } from '../../src/storage/difficulty';

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & {
    m: Map<string, string>;
  };
};

describe('difficulty preference', () => {
  it('reads a saved difficulty; anything else is Médio', () => {
    expect(loadDifficulty(mem({ [DIFFICULTY_KEY]: 'hard' }))).toBe('hard');
    for (const v of ['insano', '', 'NORMAL']) expect(loadDifficulty(mem({ [DIFFICULTY_KEY]: v }))).toBe('normal');
    expect(loadDifficulty(mem())).toBe('normal');
    expect(loadDifficulty(undefined)).toBe('normal');
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(loadDifficulty(broken)).toBe('normal');
  });

  it('saves; a failing storage does not throw', () => {
    const s = mem();
    saveDifficulty(s, 'easy');
    expect(s.m.get(DIFFICULTY_KEY)).toBe('easy');
    const broken = {
      setItem: () => {
        throw new Error('quota');
      },
    } as unknown as Storage;
    expect(() => saveDifficulty(broken, 'hard')).not.toThrow();
    expect(() => saveDifficulty(undefined, 'hard')).not.toThrow();
  });
});
