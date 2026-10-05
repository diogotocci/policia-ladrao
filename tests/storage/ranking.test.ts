import { describe, expect, it } from 'vitest';
import { RANKING_KEY, emptyBoard, insert, loadBoard, qualifies, sanitizeInitials, saveBoard, type Board } from '../../src/storage/ranking';

const memory = (init?: string) => {
  const m = new Map<string, string>();
  if (init !== undefined) m.set(RANKING_KEY, init);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & { m: Map<string, string> };
};
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } as unknown as Storage;
const e = (initials: string, time: number, date = '2026-10-04') => ({ initials, time, date });

describe('who qualifies', () => {
  it('police only when it won playing police; thief always (alive time)', () => {
    const b = emptyBoard();
    expect(qualifies(b, 'police', 80, true)).toBe(true);
    expect(qualifies(b, 'police', 80, false)).toBe(false);
    expect(qualifies(b, 'thief', 30, false)).toBe(true);
    expect(qualifies(b, 'thief', 30, true)).toBe(true);
  });

  it('a full board only takes a better time', () => {
    let b: Board = emptyBoard();
    for (let i = 0; i < 10; i++) b = insert(b, 'police', e('AAA', 60 + i)).board;
    expect(qualifies(b, 'police', 70, true)).toBe(false); // pior que o 10º (69)
    expect(qualifies(b, 'police', 68.5, true)).toBe(true);
    for (let i = 0; i < 10; i++) b = insert(b, 'thief', e('BBB', 100 + i)).board;
    expect(qualifies(b, 'thief', 99, false)).toBe(false);
    expect(qualifies(b, 'thief', 101, false)).toBe(true);
  });
});

describe('insert', () => {
  it('police ascending, thief descending, cut at 10 and returns the rank (1-based)', () => {
    let b = emptyBoard();
    for (const t of [90, 70, 80]) b = insert(b, 'police', e('POL', t)).board;
    expect(b.police.map((x) => x.time)).toEqual([70, 80, 90]);
    for (const t of [40, 120, 60]) b = insert(b, 'thief', e('LAD', t)).board;
    expect(b.thief.map((x) => x.time)).toEqual([120, 60, 40]);
    const r = insert(b, 'thief', e('NEW', 100));
    expect(r.rank).toBe(2);
    for (let i = 0; i < 12; i++) b = insert(b, 'police', e('X', 50 + i)).board;
    expect(b.police).toHaveLength(10);
  });

  it('ties keep the older record ahead', () => {
    let b = emptyBoard();
    b = insert(b, 'police', e('OLD', 75)).board;
    const r = insert(b, 'police', e('NEW', 75));
    expect(r.board.police.map((x) => x.initials)).toEqual(['OLD', 'NEW']);
    expect(r.rank).toBe(2);
  });

  it('an entry that does not fit returns rank 0 and the board unchanged', () => {
    let b = emptyBoard();
    for (let i = 0; i < 10; i++) b = insert(b, 'police', e('AAA', 60 + i)).board;
    const r = insert(b, 'police', e('ZZZ', 99));
    expect(r.rank).toBe(0);
    expect(r.board).toEqual(b);
  });
});

describe('storage', () => {
  it('round trip under a versioned key', () => {
    const s = memory();
    let b = insert(emptyBoard(), 'thief', e('DIO', 88.4)).board;
    b = insert(b, 'police', e('ANA', 61.2)).board;
    saveBoard(s, b);
    expect(s.m.has(RANKING_KEY)).toBe(true);
    expect(RANKING_KEY).toMatch(/v\d+$/);
    expect(loadBoard(s)).toEqual(b);
  });

  it('corrupted data, wrong types or a blocked storage give an empty board without throwing', () => {
    for (const raw of ['{', 'null', '42', '{"police":"x","thief":[]}', '{"police":[{"initials":5,"time":"a","date":1}],"thief":[]}'])
      expect(loadBoard(memory(raw)), raw).toEqual(emptyBoard());
    expect(loadBoard(broken)).toEqual(emptyBoard());
    expect(() => saveBoard(broken, emptyBoard())).not.toThrow();
  });

  it('keeps the valid entries, drops invalid ones, re-sorts and cuts at 10', () => {
    const raw = JSON.stringify({
      police: [e('BBB', 80), { initials: 'X', time: -1, date: 'x' }, e('AAA', 70), ...Array.from({ length: 12 }, (_, i) => e('CCC', 90 + i))],
      thief: [],
    });
    const b = loadBoard(memory(raw));
    expect(b.police[0]!.initials).toBe('AAA');
    expect(b.police).toHaveLength(10);
  });
});

describe('sanitizeInitials', () => {
  it('3 uppercase letters A–Z, padded with A', () => {
    expect(sanitizeInitials('dio')).toBe('DIO');
    expect(sanitizeInitials('d1o!z')).toBe('DOZ');
    expect(sanitizeInitials('')).toBe('AAA');
    expect(sanitizeInitials('j')).toBe('JAA');
  });
});
