import { describe, expect, it } from 'vitest';
import {
  RANKING_KEY,
  RANKING_V4_KEY,
  countModeRecords,
  loadModeBoards,
  saveModeBoards,
  emptyBoard,
  insert,
  loadBoard,
  qualifies,
  sanitizeInitials,
  saveBoard,
  type Board,
  countRecords,
  emptyBoards,
  loadBoards,
  RANKING_V3_KEY,
  saveBoards,
} from '../../src/storage/ranking';

const memory = (init?: string) => {
  const m = new Map<string, string>();
  if (init !== undefined) m.set(RANKING_KEY, init);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & {
    m: Map<string, string>;
  };
};
const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;
const e = (initials: string, time: number, date = '2026-10-04') => ({ initials, time, date });
/** thief win: escape (1:30) or destroyed the police, with the life left */
const t = (initials: string, time: number, hp: number, how: 'escape' | 'kill' = 'escape') => ({
  initials,
  time,
  hp,
  how,
  date: '2026-10-05',
});

describe('who qualifies', () => {
  it('only wins count, on both sides (the thief now wins by escaping 1:30 or destroying the police)', () => {
    const b = emptyBoard();
    expect(qualifies(b, 'police', 80, true)).toBe(true);
    expect(qualifies(b, 'police', 80, false)).toBe(false);
    expect(qualifies(b, 'thief', 90, false, 40)).toBe(false);
    expect(qualifies(b, 'thief', 90, true, 40)).toBe(true);
  });

  it('a full board only takes a better result', () => {
    let b: Board = emptyBoard();
    for (let i = 0; i < 10; i++) b = insert(b, 'police', e('AAA', 60 + i)).board;
    expect(qualifies(b, 'police', 70, true)).toBe(false); // worse than 10th (69)
    expect(qualifies(b, 'police', 68.5, true)).toBe(true);
    for (let i = 0; i < 10; i++) b = insert(b, 'thief', t('BBB', 90, 50 + i)).board;
    expect(qualifies(b, 'thief', 90, true, 49)).toBe(false); // same escape with less life
    expect(qualifies(b, 'thief', 90, true, 51)).toBe(true);
    expect(qualifies(b, 'thief', 85, true, 5)).toBe(true); // destroyed the police before 1:30
  });
});

describe('insert', () => {
  it('police: fastest arrest first; thief: fastest win first, escapes tie at 1:30 and the one with more life left goes ahead', () => {
    let b = emptyBoard();
    for (const x of [90, 70, 80]) b = insert(b, 'police', e('POL', x)).board;
    expect(b.police.map((x) => x.time)).toEqual([70, 80, 90]);
    b = insert(b, 'thief', t('ESC', 90, 30)).board;
    b = insert(b, 'thief', t('KIL', 62, 10, 'kill')).board;
    b = insert(b, 'thief', t('TOP', 90, 80)).board;
    expect(b.thief.map((x) => x.initials)).toEqual(['KIL', 'TOP', 'ESC']);
    expect(insert(b, 'thief', t('NEW', 90, 50)).rank).toBe(3);
    for (let i = 0; i < 12; i++) b = insert(b, 'police', e('X', 50 + i)).board;
    expect(b.police).toHaveLength(10);
  });

  it('ties keep the older record ahead', () => {
    let b = emptyBoard();
    b = insert(b, 'police', e('OLD', 75)).board;
    const r = insert(b, 'police', e('NEW', 75));
    expect(r.board.police.map((x) => x.initials)).toEqual(['OLD', 'NEW']);
    expect(r.rank).toBe(2);
    const th = insert(insert(emptyBoard(), 'thief', t('OLD', 90, 40)).board, 'thief', t('NEW', 90, 40));
    expect(th.board.thief.map((x) => x.initials)).toEqual(['OLD', 'NEW']);
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
  it('both boards restart with the new rules: the old v1 records are ignored', () => {
    expect(RANKING_KEY).toBe('pl.ranking.v2');
    const m = new Map([['pl.ranking.v1', JSON.stringify({ police: [e('OLD', 60)], thief: [e('OLD', 300)] })]]);
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: () => {} } as unknown as Storage;
    expect(loadBoard(s)).toEqual(emptyBoard());
  });

  it('round trip under a versioned key', () => {
    const s = memory();
    let b = insert(emptyBoard(), 'thief', t('DIO', 88.4, 12, 'kill')).board;
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
      police: [
        e('BBB', 80),
        { initials: 'X', time: -1, date: 'x' },
        e('AAA', 70),
        ...Array.from({ length: 12 }, (_, i) => e('CCC', 90 + i)),
      ],
      thief: [t('ESC', 90, 20), { initials: 'BAD', time: 90, hp: 200, how: 'fly', date: 'x' }, t('KIL', 70, 5, 'kill')],
    });
    const b = loadBoard(memory(raw));
    expect(b.thief.map((x) => x.initials)).toEqual(['KIL', 'ESC']);
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

describe('one ranking per difficulty (v3)', () => {
  const mem = (): Storage => {
    const m = new Map<string, string>();
    return {
      get length() {
        return m.size;
      },
      clear: () => m.clear(),
      getItem: (k) => m.get(k) ?? null,
      key: (i) => [...m.keys()][i] ?? null,
      removeItem: (k) => void m.delete(k),
      setItem: (k, v) => void m.set(k, String(v)),
    };
  };
  const v2 = { police: [e('AAA', 50), e('BBB', 60)], thief: [] };

  it('first load: the old ranking becomes Médio; Fácil and Difícil start empty; v2 is kept', () => {
    const s = mem();
    s.setItem(RANKING_KEY, JSON.stringify(v2));
    const b = loadBoards(s);
    expect(b.normal.police.map((x) => x.initials)).toEqual(['AAA', 'BBB']);
    expect(b.easy).toEqual(emptyBoard());
    expect(b.hard).toEqual(emptyBoard());
    expect(s.getItem(RANKING_KEY)).toBe(JSON.stringify(v2));
    expect(countRecords(b)).toBe(2);
  });

  it('with v3 saved, v2 is ignored (no second migration)', () => {
    const s = mem();
    s.setItem(RANKING_KEY, JSON.stringify(v2));
    const b = emptyBoards();
    b.hard.thief = [t('NEW', 70, 10, 'kill')];
    saveBoards(s, b);
    const back = loadBoards(s);
    expect(back.normal).toEqual(emptyBoard());
    expect(back.hard.thief[0]!.initials).toBe('NEW');
    expect(s.getItem(RANKING_V3_KEY)).not.toBeNull();
  });

  it('unreadable v3 starts empty and keeps v2; invalid entries are dropped', () => {
    const s = mem();
    s.setItem(RANKING_KEY, JSON.stringify(v2));
    s.setItem(RANKING_V3_KEY, '{oops');
    expect(loadBoards(s)).toEqual(emptyBoards());
    expect(s.getItem(RANKING_KEY)).toBe(JSON.stringify(v2));
    s.setItem(RANKING_V3_KEY, JSON.stringify({ easy: { police: [e('OKK', 40), { initials: 5 }], thief: 'x' } }));
    const b = loadBoards(s);
    expect(b.easy.police.map((x) => x.initials)).toEqual(['OKK']);
    expect(b.easy.thief).toEqual([]);
    expect(b.normal).toEqual(emptyBoard());
  });
});

describe('one ranking per mode (v4)', () => {
  const mem = (): Storage => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
  };

  it('first load: v3 becomes Perseguição; Sobrevivência starts empty; v3 is kept', () => {
    const s = mem();
    const v3 = emptyBoards();
    v3.hard.police = [e('OLD', 50)];
    saveBoards(s, v3);
    const b = loadModeBoards(s);
    expect(b.pursuit.hard.police[0]!.initials).toBe('OLD');
    expect(b.survival).toEqual(emptyBoards());
    expect(s.getItem(RANKING_V3_KEY)).toBe(JSON.stringify(v3));
    saveModeBoards(s, { ...b, survival: { ...b.survival, easy: { police: [e('NEW', 30)], thief: [] } } });
    const again = loadModeBoards(s);
    expect(again.survival.easy.police[0]!.initials).toBe('NEW');
    expect(s.getItem(RANKING_V4_KEY)).not.toBeNull();
    expect(countModeRecords(again)).toBe(2);
  });

  it('Sobrevivência thief: longest time alive first, losses count ("caught"); police: fastest win', () => {
    let board = emptyBoard();
    expect(qualifies(board, 'thief', 150, false, 0, 'survival')).toBe(true); // a loss still counts
    board = insert(board, 'thief', { initials: 'WIN', time: 150, hp: 30, how: 'kill', date: 'x' }, 'survival').board;
    board = insert(board, 'thief', { initials: 'LOS', time: 200, hp: 0, how: 'caught', date: 'x' }, 'survival').board;
    expect(board.thief.map((x) => x.initials)).toEqual(['LOS', 'WIN']);
    expect(qualifies(board, 'police', 100, false, undefined, 'survival')).toBe(false);
    board = insert(board, 'police', { initials: 'SLO', time: 300, date: 'x' }, 'survival').board;
    board = insert(board, 'police', { initials: 'FST', time: 120, date: 'x' }, 'survival').board;
    expect(board.police.map((x) => x.initials)).toEqual(['FST', 'SLO']);
  });
});
