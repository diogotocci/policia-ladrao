// Local ranking (spec §8): top 10 per side, validated on load, never breaks the game.
import type { Role } from '../config/balance';

// v2 (Delivery 7): the thief now wins by escaping at 1:30 — the rules changed, both rankings restart
export const RANKING_KEY = 'pl.ranking.v2';
const MAX = 10;

export interface Entry {
  initials: string;
  time: number; // s
  date: string; // ISO (yyyy-mm-dd or full)
  /** thief: life left (breaks ties between escapes) */
  hp?: number;
  /** thief: escaped at 1:30 or destroyed the police */
  how?: 'escape' | 'kill';
}
export interface Board {
  police: Entry[];
  thief: Entry[];
}

export const emptyBoard = (): Board => ({ police: [], thief: [] });

type Result = Pick<Entry, 'time' | 'hp'>;
/** both sides: winning faster is better; thief tied (escapes at 1:30) → more life first */
const better = (role: Role, a: Result, b: Result) => {
  if (Math.abs(a.time - b.time) > 1e-6) return a.time < b.time;
  return role === 'thief' && (a.hp ?? 0) > (b.hp ?? 0);
};
const same = (role: Role, a: Result, b: Result) => !better(role, a, b) && !better(role, b, a);

const valid = (x: unknown): x is Entry =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as Entry).initials === 'string' &&
  /^[A-Z]{3}$/.test((x as Entry).initials) &&
  typeof (x as Entry).time === 'number' &&
  Number.isFinite((x as Entry).time) &&
  (x as Entry).time >= 0 &&
  typeof (x as Entry).date === 'string' &&
  ((x as Entry).hp === undefined || (typeof (x as Entry).hp === 'number' && (x as Entry).hp! >= 0 && (x as Entry).hp! <= 100)) &&
  ((x as Entry).how === undefined || (x as Entry).how === 'escape' || (x as Entry).how === 'kill');

/** Sorts keeping the original order on ties (the oldest was inserted first) and truncates to 10. */
function normalize(role: Role, list: Entry[]): Entry[] {
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (same(role, a.e, b.e) ? a.i - b.i : better(role, a.e, b.e) ? -1 : 1))
    .slice(0, MAX)
    .map((x) => x.e);
}

/** only wins qualify (police: arrested; thief: escaped or destroyed the police) */
export function qualifies(board: Board, role: Role, time: number, won: boolean, hp?: number): boolean {
  if (!won) return false;
  const list = board[role];
  if (list.length < MAX) return true;
  return better(role, { time, hp }, list[list.length - 1]!);
}

/** Inserts and returns the position (1 = first; 0 = didn't make it). Tie: the new one goes after the old ones. */
export function insert(board: Board, role: Role, entry: Entry): { board: Board; rank: number } {
  const list = board[role];
  let at = list.findIndex((e) => better(role, entry, e));
  if (at < 0) at = list.length;
  if (at >= MAX) return { board, rank: 0 };
  const next = [...list.slice(0, at), entry, ...list.slice(at)].slice(0, MAX);
  return { board: { ...board, [role]: next }, rank: at + 1 };
}

export function loadBoard(storage: Storage | undefined): Board {
  try {
    const raw = storage?.getItem(RANKING_KEY);
    if (!raw) return emptyBoard();
    const data = JSON.parse(raw) as Partial<Record<Role, unknown>>;
    if (typeof data !== 'object' || data === null) return emptyBoard();
    const pick = (role: Role) => (Array.isArray(data[role]) ? normalize(role, (data[role] as unknown[]).filter(valid)) : []);
    return { police: pick('police'), thief: pick('thief') };
  } catch {
    return emptyBoard();
  }
}

export function saveBoard(storage: Storage | undefined, board: Board): void {
  try {
    storage?.setItem(RANKING_KEY, JSON.stringify(board));
  } catch {
    /* no storage: the ranking only lasts this session */
  }
}

export function sanitizeInitials(s: string): string {
  return (s.toUpperCase().replace(/[^A-Z]/g, '') + 'AAA').slice(0, 3);
}
