// Usage events (V3 delivery 3, spec §6): what the game records for the /admin panel. Shared by the server (Node ESM:
// imports end in .js) and the game. No personal data beyond the account id, which deletion clears.
import { DIFFICULTIES, MODES, type Difficulty, type Mode, type Role } from '../config/balance.js';

/** events the phone sends; account_created, username_set and account_deleted are written by the server itself */
export type ClientEventType = 'session_start' | 'match_end' | 'purchase' | 'claim';
export const CLIENT_EVENTS: readonly ClientEventType[] = ['session_start', 'match_end', 'purchase', 'claim'];

export interface MatchEndData {
  matchId: string;
  mode: Mode;
  side: Role;
  difficulty: Difficulty;
  car: string;
  won: boolean;
  reason?: string;
  /** seconds */
  time: number;
  /** the computer's highest level reached */
  level: number;
  coins: number;
}

export interface ClientEvent {
  /** unique per event: a resend from the offline queue counts once */
  id: string;
  type: ClientEventType;
  /** when it happened (ISO, phone clock) */
  at: string;
  data: Record<string, unknown>;
}

/** the app's version and where it runs: the Play app (TWA), the installed web app or a browser tab */
export interface EventContext {
  version: string;
  client: 'play' | 'pwa' | 'web';
}

const ID = /^[A-Za-z0-9-]{8,64}$/;

const num = (v: unknown, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined;
const str = (v: unknown, re: RegExp): string | undefined => (typeof v === 'string' && re.test(v) ? v : undefined);
const WORD = /^[A-Za-z0-9_:-]{1,48}$/;

/**
 * Only the fields each event is known to carry, within sane bounds: nothing else (no personal data, no huge numbers
 * that would break the panel's sums) is ever stored. Undefined when a required field is missing.
 */
function cleanData(type: ClientEventType, d: Record<string, unknown>): Record<string, unknown> | undefined {
  if (type === 'session_start') return {};
  if (type === 'purchase') {
    const item = str(d.item, /^[a-z]+:[A-Za-z0-9_:-]{1,40}$/);
    const price = num(d.price, 1_000_000);
    if (!item || price === undefined) return undefined;
    return { item, price, ...(d.admin === true ? { admin: true } : {}) };
  }
  if (type === 'claim') {
    const id = str(d.id, WORD);
    return id ? { id, coins: num(d.coins, 1_000_000) ?? 0 } : undefined;
  }
  // match_end
  const matchId = str(d.matchId, ID);
  const time = num(d.time, 86_400);
  if (!matchId || time === undefined || typeof d.won !== 'boolean') return undefined;
  if (!MODES.includes(d.mode as Mode) || (d.side !== 'police' && d.side !== 'thief') || !DIFFICULTIES.includes(d.difficulty as Difficulty))
    return undefined;
  const reason = str(d.reason, WORD);
  return {
    matchId,
    mode: d.mode,
    side: d.side,
    difficulty: d.difficulty,
    car: str(d.car, WORD) ?? 'unknown',
    won: d.won,
    ...(reason ? { reason } : {}),
    time,
    level: Math.round(num(d.level, 100) ?? 0),
    coins: Math.round(num(d.coins, 1_000_000) ?? 0),
  };
}

/** One event as sent by a phone, or undefined when its shape is wrong (dropped). */
export function parseEvent(x: unknown): ClientEvent | undefined {
  if (typeof x !== 'object' || x === null) return undefined;
  const { id, type, at, data } = x as Record<string, unknown>;
  if (typeof id !== 'string' || !ID.test(id)) return undefined;
  if (!CLIENT_EVENTS.includes(type as ClientEventType)) return undefined;
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return undefined;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined;
  const clean = cleanData(type as ClientEventType, data as Record<string, unknown>);
  return clean ? { id, type: type as ClientEventType, at, data: clean } : undefined;
}

export function parseContext(x: unknown): EventContext {
  const c = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
  const version = typeof c.version === 'string' && /^[0-9A-Za-z.+-]{1,20}$/.test(c.version) ? c.version : 'unknown';
  const client = c.client === 'play' || c.client === 'pwa' ? c.client : 'web';
  return { version, client };
}

/** what the /admin panel shows for a period (spec §6) */
export interface AdminStats {
  days: number;
  accounts: { total: number; today: number };
  active: { today: number; week: number; weekBefore: number; month: number };
  matches: { total: number; players: number };
  /** share of the accounts created in the period that came back on day 1, 7 and 30 (null: no account old enough yet) */
  retention: { d1: number | null; d7: number | null; d30: number | null };
  /** one point per day of the period (yyyy-mm-dd, Brasília time) */
  daily: { day: string; accounts: number; active: number }[];
  byModeSide: { mode: Mode; side: Role; matches: number }[];
  byDifficulty: { difficulty: Difficulty; matches: number }[];
  /** share of wins, 0..1 */
  wins: { side: Role; difficulty: Difficulty; rate: number; matches: number }[];
  carsUsed: { car: string; matches: number }[];
  carsBought: { car: string; count: number }[];
  /** shop items other than cars, by kind (paint, neon, wheels...) */
  itemsBought: { kind: string; count: number }[];
  /** average match length in seconds */
  duration: { mode: Mode; seconds: number }[];
  /** players per app version and per client in the period */
  versions: { version: string; players: number }[];
  clients: { client: string; players: number }[];
}
