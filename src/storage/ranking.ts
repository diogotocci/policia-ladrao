// Local ranking (spec §8): top 10 per side, validated on load, never breaks the game.
import { DIFFICULTIES, MODES, type Difficulty, type Mode, type Role } from '../config/balance';

// v2 (Delivery 7): the thief now wins by escaping at 1:30 — the rules changed, both rankings restart
export const RANKING_KEY = 'pl.ranking.v2';
const MAX = 10;

export interface Entry {
  initials: string;
  time: number; // s
  date: string; // ISO (yyyy-mm-dd or full)
  /** thief: life left (breaks ties between escapes) */
  hp?: number;
  /** thief: escaped at 1:30, destroyed the police, or (Sobrevivência) was caught after `time` alive */
  how?: 'escape' | 'kill' | 'caught';
}
export interface Board {
  police: Entry[];
  thief: Entry[];
}

export const emptyBoard = (): Board => ({ police: [], thief: [] });

// v3 (V2 part 2): one ranking per difficulty. The first load without v3 turns v2 into Médio; v2 is never deleted.
export const RANKING_V3_KEY = 'pl.ranking.v3';
export type Boards = Record<Difficulty, Board>;
export const emptyBoards = (): Boards => ({ easy: emptyBoard(), normal: emptyBoard(), hard: emptyBoard() });
export const countRecords = (b: Boards): number => DIFFICULTIES.reduce((n, d) => n + b[d].police.length + b[d].thief.length, 0);

type Result = Pick<Entry, 'time' | 'hp'>;
/**
 * Winning faster is better; thief tied (escapes at 1:30) → more life first.
 * Sobrevivência thief (V2 part 3): the longest time alive is better (losses count too).
 */
const better = (role: Role, a: Result, b: Result, mode: Mode = 'pursuit') => {
  const longest = mode === 'survival' && role === 'thief';
  if (Math.abs(a.time - b.time) > 1e-6) return longest ? a.time > b.time : a.time < b.time;
  return role === 'thief' && (a.hp ?? 0) > (b.hp ?? 0);
};
const same = (role: Role, a: Result, b: Result, mode: Mode = 'pursuit') => !better(role, a, b, mode) && !better(role, b, a, mode);

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
  ((x as Entry).how === undefined || (x as Entry).how === 'escape' || (x as Entry).how === 'kill' || (x as Entry).how === 'caught');

/** Sorts keeping the original order on ties (the oldest was inserted first) and truncates to 10. */
function normalize(role: Role, list: Entry[], mode: Mode = 'pursuit'): Entry[] {
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (same(role, a.e, b.e, mode) ? a.i - b.i : better(role, a.e, b.e, mode) ? -1 : 1))
    .slice(0, MAX)
    .map((x) => x.e);
}

/** Only wins qualify (police: arrested; thief: escaped or destroyed the police) — except the Sobrevivência thief. */
export function qualifies(board: Board, role: Role, time: number, won: boolean, hp?: number, mode: Mode = 'pursuit'): boolean {
  if (!won && !(mode === 'survival' && role === 'thief')) return false;
  const list = board[role];
  if (list.length < MAX) return true;
  return better(role, { time, hp }, list[list.length - 1]!, mode);
}

/** Inserts and returns the position (1 = first; 0 = didn't make it). Tie: the new one goes after the old ones. */
export function insert(board: Board, role: Role, entry: Entry, mode: Mode = 'pursuit'): { board: Board; rank: number } {
  const list = board[role];
  let at = list.findIndex((e) => better(role, entry, e, mode));
  if (at < 0) at = list.length;
  if (at >= MAX) return { board, rank: 0 };
  const next = [...list.slice(0, at), entry, ...list.slice(at)].slice(0, MAX);
  return { board: { ...board, [role]: next }, rank: at + 1 };
}

/** Validates one board (police + thief lists) read from storage. */
function parseBoard(data: unknown, mode: Mode = 'pursuit'): Board {
  if (typeof data !== 'object' || data === null) return emptyBoard();
  const d = data as Partial<Record<Role, unknown>>;
  const pick = (role: Role) => (Array.isArray(d[role]) ? normalize(role, (d[role] as unknown[]).filter(valid), mode) : []);
  return { police: pick('police'), thief: pick('thief') };
}

/** v2: a single ranking (now the Médio one); kept only to migrate into v3 */
export function loadBoard(storage: Storage | undefined): Board {
  try {
    const raw = storage?.getItem(RANKING_KEY);
    return raw ? parseBoard(JSON.parse(raw)) : emptyBoard();
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

export function loadBoards(storage: Storage | undefined): Boards {
  let raw: string | null | undefined;
  try {
    raw = storage?.getItem(RANKING_V3_KEY);
  } catch {
    return emptyBoards();
  }
  if (raw === null || raw === undefined) return { ...emptyBoards(), normal: loadBoard(storage) };
  try {
    const data = JSON.parse(raw) as Partial<Record<Difficulty, unknown>>;
    if (typeof data !== 'object' || data === null) return emptyBoards();
    return { easy: parseBoard(data.easy), normal: parseBoard(data.normal), hard: parseBoard(data.hard) };
  } catch {
    return emptyBoards();
  }
}

export function saveBoards(storage: Storage | undefined, boards: Boards): void {
  try {
    storage?.setItem(RANKING_V3_KEY, JSON.stringify(boards));
  } catch {
    /* no storage: the ranking only lasts this session */
  }
}

// v4 (V2 part 3): one set of rankings per mode. The first load without v4 turns v3 into Perseguição; v3 is never deleted.
export const RANKING_V4_KEY = 'pl.ranking.v4';
export type ModeBoards = Record<Mode, Boards>;
export const emptyModeBoards = (): ModeBoards => ({ pursuit: emptyBoards(), survival: emptyBoards() });
export const countModeRecords = (b: ModeBoards): number => MODES.reduce((n, m) => n + countRecords(b[m]), 0);

function parseBoards(data: unknown, mode: Mode): Boards {
  if (typeof data !== 'object' || data === null) return emptyBoards();
  const d = data as Partial<Record<Difficulty, unknown>>;
  return { easy: parseBoard(d.easy, mode), normal: parseBoard(d.normal, mode), hard: parseBoard(d.hard, mode) };
}

export function loadModeBoards(storage: Storage | undefined): ModeBoards {
  let raw: string | null | undefined;
  try {
    raw = storage?.getItem(RANKING_V4_KEY);
  } catch {
    return emptyModeBoards();
  }
  if (raw === null || raw === undefined) return { pursuit: loadBoards(storage), survival: emptyBoards() };
  try {
    const data = JSON.parse(raw) as Partial<Record<Mode, unknown>>;
    if (typeof data !== 'object' || data === null) return emptyModeBoards();
    return { pursuit: parseBoards(data.pursuit, 'pursuit'), survival: parseBoards(data.survival, 'survival') };
  } catch {
    return emptyModeBoards();
  }
}

export function saveModeBoards(storage: Storage | undefined, boards: ModeBoards): void {
  try {
    storage?.setItem(RANKING_V4_KEY, JSON.stringify(boards));
  } catch {
    /* no storage: the ranking only lasts this session */
  }
}

/** The ranking entry of a finished match; the thief also keeps the life left and how it ended. */
export function recordEntry(
  role: Role,
  result: { winner: Role; time: number; reason?: 'escape' | 'policeDown' | 'thiefDown'; hp?: number },
  initials: string,
  date: string,
): Entry {
  if (role === 'police') return { initials, time: result.time, date };
  const how = result.winner === 'police' ? 'caught' : result.reason === 'escape' ? 'escape' : 'kill';
  return { initials, time: result.time, date, hp: Math.max(0, Math.min(100, result.hp ?? 0)), how };
}
