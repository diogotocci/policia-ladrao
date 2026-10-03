import { describe, expect, it } from 'vitest';
import { CHUNK_LENGTH, renderOrigin, visibleChunkRange } from '../../src/render/roadChunks';

describe('visibleChunkRange', () => {
  it('s = 0 → chunks -1..5', () => {
    expect(visibleChunkRange(0)).toEqual({ first: -1, last: 5 });
  });

  it('stays the same inside a chunk', () => {
    expect(visibleChunkRange(49.9)).toEqual({ first: -1, last: 5 });
  });

  it('shifts by one at the chunk boundary', () => {
    expect(visibleChunkRange(50)).toEqual({ first: 0, last: 6 });
  });

  it('works far down the road', () => {
    expect(visibleChunkRange(1e6)).toEqual({ first: 19999, last: 20005 });
  });

  it('always spans 7 chunks', () => {
    for (const s of [0, 12.3, 777.7, 123456.78, 9.99e6]) {
      const { first, last } = visibleChunkRange(s);
      expect(last - first + 1).toBe(7);
    }
  });

  it('CHUNK_LENGTH is 50 m', () => {
    expect(CHUNK_LENGTH).toBe(50);
  });
});

describe('renderOrigin', () => {
  it('snaps s down to the chunk grid so render coords stay small', () => {
    expect(renderOrigin(0)).toBe(0);
    expect(renderOrigin(49.9)).toBe(0);
    expect(renderOrigin(1e6 + 30)).toBe(1e6);
    expect(1e6 + 30 - renderOrigin(1e6 + 30)).toBeLessThan(CHUNK_LENGTH);
  });
});
