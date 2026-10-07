import { describe, expect, it } from 'vitest';
import { loadMode, MODE_KEY, saveMode } from '../../src/storage/mode';

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & {
    m: Map<string, string>;
  };
};

describe('mode preference', () => {
  it('reads a saved mode; anything else is Perseguição; saving never throws', () => {
    expect(loadMode(mem({ [MODE_KEY]: 'survival' }))).toBe('survival');
    for (const v of ['', 'arcade', 'SURVIVAL']) expect(loadMode(mem({ [MODE_KEY]: v }))).toBe('pursuit');
    expect(loadMode(undefined)).toBe('pursuit');
    const s = mem();
    saveMode(s, 'survival');
    expect(s.m.get(MODE_KEY)).toBe('survival');
    const broken = {
      getItem: () => {
        throw new Error('x');
      },
      setItem: () => {
        throw new Error('x');
      },
    } as unknown as Storage;
    expect(loadMode(broken)).toBe('pursuit');
    expect(() => saveMode(broken, 'survival')).not.toThrow();
  });
});
