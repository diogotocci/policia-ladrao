// Global ranking records (V3 part 1, delivery 2, spec §5). Shared by the server (api/, as Node ESM: imports end in .js)
// and the game: the shape of a record, which results go up, the plausibility check and the order of each board.
import { BALANCE, DIFFICULTIES, MODES, type Difficulty, type Mode, type Role } from '../config/balance.js';
import { CARS } from './cars.js';

/** stars a side can earn (meta/career.ts PRESTIGE_MAX; kept here so the server does not load the whole career) */
export const PRESTIGE_MAX = 10;

/** one finished match that goes to the global ranking */
export interface RecordIn {
  /** unique per match: sending it twice (offline queue, retries) keeps one */
  matchId: string;
  mode: Mode;
  side: Role;
  difficulty: Difficulty;
  /** seconds */
  time: number;
  /** life left (the thief's tiebreak) */
  hp: number;
  /** thief: escaped, destroyed the police, or (Sobrevivência) caught after `time` alive */
  how?: 'escape' | 'kill' | 'caught';
  car: string;
  /** the player's rank on that side, 1..7 */
  rank: number;
  /** prestige stars on that side, 0..10 (0.37.0; older phones send none) */
  prestige?: number;
  /** when the match ended (ISO, phone clock), so records sent together after a while offline are still spaced like the matches were */
  endedAt: string;
  /** when the phone sent it (phone clock): the server takes the difference, so a phone clock that is off does not matter */
  sentAt?: string;
  /** from 0.28: the phone sent the match_end event of this match first, so the server checks one against the other */
  ev?: boolean;
}

/** a line of a global board */
export interface GlobalRow {
  pos: number;
  username: string;
  time: number;
  hp: number;
  how?: 'escape' | 'kill' | 'caught';
  car: string;
  rank: number;
  /** prestige stars on that side when the match was played (absent: none) */
  prestige?: number;
  /** this is the signed-in player */
  me?: boolean;
  /** the signed-in player already reported this name */
  reported?: boolean;
}

export interface GlobalBoard {
  /** the top GLOBAL_TOP matches (a player can appear more than once) */
  rows: GlobalRow[];
  /** the player's best line when none of the player's matches is in the top */
  me?: GlobalRow;
}

export const GLOBAL_TOP = 30;
const MAX_HP = Math.max(...Object.values(BALANCE.survival.hp), 100);
/** a Sobrevivência match longer than this is not believable */
const MAX_SURVIVAL = 2 * 3600;
/** the escape happens exactly at the escape time; the frame step leaves a little slack */
const ESCAPE_SLACK = 0.5;
const MIN_TIME = 1;
/** a day: longer than any match */
const MAX_TIME = 86_400;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Only wins go up (police: arrested or destroyed the thief; thief: escaped or destroyed the police), except the
 * Sobrevivência thief, whose time alive counts even when caught (same rule as the ranking on the phone). */
export const goesGlobal = (mode: Mode, side: Role, won: boolean) => won || (mode === 'survival' && side === 'thief');

/** The record as sent by a phone, or undefined when its shape is wrong (refused). */
export function parseRecord(x: unknown): RecordIn | undefined {
  if (!isObj(x)) return undefined;
  const { matchId, mode, side, difficulty, time, hp, how, car, rank, endedAt, sentAt, prestige } = x;
  if (typeof matchId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(matchId)) return undefined;
  if (!MODES.includes(mode as Mode) || (side !== 'police' && side !== 'thief') || !DIFFICULTIES.includes(difficulty as Difficulty))
    return undefined;
  // bounded so a forged number cannot overflow the database columns (suspect, but stored)
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0 || time > MAX_TIME) return undefined;
  if (typeof hp !== 'number' || !Number.isFinite(hp) || hp < 0 || hp > 10_000) return undefined;
  if (how !== undefined && how !== 'escape' && how !== 'kill' && how !== 'caught') return undefined;
  if (typeof car !== 'string' || car.length > 32 || typeof rank !== 'number' || !Number.isInteger(rank) || Math.abs(rank) > 100)
    return undefined;
  if (typeof endedAt !== 'string' || Number.isNaN(Date.parse(endedAt))) return undefined;
  const sent = typeof sentAt === 'string' && !Number.isNaN(Date.parse(sentAt)) ? { sentAt } : {};
  const ev = (x as { ev?: unknown }).ev === true ? { ev: true } : {};
  if (prestige !== undefined && (typeof prestige !== 'number' || !Number.isInteger(prestige) || Math.abs(prestige) > 100)) return undefined;
  const stars = typeof prestige === 'number' ? { prestige } : {};
  return {
    matchId,
    mode: mode as Mode,
    side,
    difficulty: difficulty as Difficulty,
    time,
    hp,
    how,
    car,
    rank,
    endedAt,
    ...sent,
    ...ev,
    ...stars,
  };
}

/** Whether the numbers can come from a real match (spec §5). A record that fails is kept as suspect and never shown. */
export function plausible(r: RecordIn): boolean {
  const car = (CARS as Record<string, { role: Role } | undefined>)[r.car];
  if (!car || car.role !== r.side || r.rank < 1 || r.rank > 7) return false;
  if ((r.prestige ?? 0) < 0 || (r.prestige ?? 0) > PRESTIGE_MAX) return false;
  if (r.hp < 0 || r.hp > MAX_HP || r.time < MIN_TIME) return false;
  const escape = BALANCE.match.escapeTime;
  if (r.mode === 'survival') return r.time <= MAX_SURVIVAL && (r.side === 'police' ? r.how === undefined : r.how !== undefined);
  if (r.side === 'police') return r.how === undefined && r.time < escape + ESCAPE_SLACK;
  if (r.how === 'escape') return Math.abs(r.time - escape) <= ESCAPE_SLACK && r.hp > 0;
  return r.how === 'kill' && r.time < escape + ESCAPE_SLACK;
}

/** Sobrevivência thief: the longest time alive is best; everything else: the fastest win (thief ties: more life). */
export const longestFirst = (mode: Mode, side: Role) => mode === 'survival' && side === 'thief';

/** a better than b on that board */
export function better(mode: Mode, side: Role, a: { time: number; hp: number }, b: { time: number; hp: number }): boolean {
  if (Math.abs(a.time - b.time) > 1e-6) return longestFirst(mode, side) ? a.time > b.time : a.time < b.time;
  return side === 'thief' && a.hp > b.hp;
}
