// Player profile (V2 part 1): coin balance and lifetime stats, versioned so later parts can migrate it.
import { BALANCE, type Role } from '../config/balance';
import type { Board } from '../storage/ranking';
import type { Reward } from './rewards';

export const PROFILE_VERSION = 1;
/** upper bound for any stored number: rejects absurd values from a hand-edited backup */
const MAX_VALUE = 1e9;

export interface ProfileStats {
  matches: number;
  wins: number;
  escapes: number;
  arrests: number;
  coinsEarned: number;
}

export interface Profile {
  v: 1;
  coins: number;
  stats: ProfileStats;
  welcomeGranted: boolean;
}

const STAT_KEYS: (keyof ProfileStats)[] = ['matches', 'wins', 'escapes', 'arrests', 'coinsEarned'];

export const emptyProfile = (): Profile => ({
  v: 1,
  coins: 0,
  stats: { matches: 0, wins: 0, escapes: 0, arrests: 0, coinsEarned: 0 },
  welcomeGranted: false,
});

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_VALUE;
const isObject = (o: unknown): o is Record<string, unknown> => typeof o === 'object' && o !== null;

/** Validates untrusted data (storage, backup code); returns a clean copy or undefined. */
export function parseProfile(raw: unknown): Profile | undefined {
  if (!isObject(raw) || raw.v !== PROFILE_VERSION || !isCount(raw.coins) || typeof raw.welcomeGranted !== 'boolean') return undefined;
  const st = raw.stats;
  if (!isObject(st) || !STAT_KEYS.every((k) => isCount(st[k]))) return undefined;
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, st[k]])) as unknown as ProfileStats;
  return { v: 1, coins: raw.coins, stats, welcomeGranted: raw.welcomeGranted };
}

export function applyMatch(
  p: Profile,
  result: { winner: Role; reason?: 'escape' | 'policeDown' | 'thiefDown' },
  player: Role,
  reward: Reward,
): Profile {
  const won = result.winner === player;
  const s = p.stats;
  return {
    ...p,
    coins: Math.min(MAX_VALUE, p.coins + reward.total),
    stats: {
      matches: s.matches + 1,
      wins: s.wins + (won ? 1 : 0),
      escapes: s.escapes + (won && player === 'thief' && result.reason === 'escape' ? 1 : 0),
      arrests: s.arrests + (won && player === 'police' ? 1 : 0),
      coinsEarned: Math.min(MAX_VALUE, s.coinsEarned + reward.total),
    },
  };
}

/** One-time welcome for players from before V2: coins for each record already in the local ranking. */
export function grantWelcome(p: Profile, board: Board): Profile {
  if (p.welcomeGranted) return p;
  const coins = (board.police.length + board.thief.length) * BALANCE.rewards.welcomePerRecord;
  return { ...p, coins: p.coins + coins, welcomeGranted: true };
}
