// Player profile: coin balance and lifetime stats (V2 part 1), shop items bought and in use (v2, part 4).
// A v1 profile (local or from a backup code) is migrated when read: nothing bought, default cars.
import { BALANCE, type Difficulty, type Mode, type Role } from '../config/balance';
import { emptyStats, rewardFor, type MatchStats, type Reward } from './rewards';
import { defaultEquipped, sanitizeShop, type Equipped } from './shop';

export const PROFILE_VERSION = 2;
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
  v: 2;
  coins: number;
  stats: ProfileStats;
  welcomeGranted: boolean;
  /** shop item ids bought (meta/shop.ts) */
  owned: string[];
  equipped: Equipped;
}

const STAT_KEYS: (keyof ProfileStats)[] = ['matches', 'wins', 'escapes', 'arrests', 'coinsEarned'];

export const emptyProfile = (): Profile => ({
  v: 2,
  coins: 0,
  stats: { matches: 0, wins: 0, escapes: 0, arrests: 0, coinsEarned: 0 },
  welcomeGranted: false,
  owned: [],
  equipped: defaultEquipped(),
});

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_VALUE;
const isObject = (o: unknown): o is Record<string, unknown> => typeof o === 'object' && o !== null;

/**
 * Validates untrusted data (storage, backup code); returns a clean copy or undefined. v1 is migrated to v2.
 * Unknown shop ids are dropped and anything in use that was not bought goes back to the default.
 */
export function parseProfile(raw: unknown): Profile | undefined {
  if (!isObject(raw) || (raw.v !== 1 && raw.v !== 2) || !isCount(raw.coins) || typeof raw.welcomeGranted !== 'boolean') return undefined;
  const st = raw.stats;
  if (!isObject(st) || !STAT_KEYS.every((k) => isCount(st[k]))) return undefined;
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, st[k]])) as unknown as ProfileStats;
  if (raw.v === 2 && !Array.isArray(raw.owned)) return undefined;
  const shop =
    raw.v === 2
      ? sanitizeShop(raw.owned as unknown[], isObject(raw.equipped) ? (raw.equipped as Partial<Equipped>) : undefined)
      : sanitizeShop([], undefined);
  return { v: 2, coins: raw.coins, stats, welcomeGranted: raw.welcomeGranted, ...shop };
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

/** One-time welcome for players from before V2: coins for each record already in the local rankings. */
export function grantWelcome(p: Profile, records: number): Profile {
  if (p.welcomeGranted) return p;
  const coins = Math.max(0, Math.floor(records)) * BALANCE.rewards.welcomePerRecord;
  return { ...p, coins: p.coins + coins, welcomeGranted: true };
}

/** Coins for a finished match, credited to the profile (called once, when the match ends). */
export function settleMatch(
  p: Profile,
  result: { winner: Role; time: number; reason?: 'escape' | 'policeDown' | 'thiefDown'; stats?: MatchStats },
  player: Role,
  difficulty: Difficulty = 'normal',
  mode: Mode = 'pursuit',
): { profile: Profile; reward: Reward } {
  const reward = rewardFor({ time: result.time, won: result.winner === player }, result.stats ?? emptyStats(), difficulty, mode);
  return { profile: applyMatch(p, result, player, reward), reward };
}
