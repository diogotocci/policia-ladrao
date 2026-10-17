// Two copies of the same player's progress (V3 part 1, spec §4.3): a phone that played offline and the account that
// moved on in another phone. Nothing earned is lost: items, achievements and the most of every XP and counter are
// kept from both; coins, what is in use, today's challenges and the streak come from the newer copy.
import { rankOf } from './career.js';
import { MASTERY_MAX, masteryLevel } from './mastery.js';
import type { Profile } from './profile.js';
import type { Role } from '../config/balance.js';

const union = (a: readonly string[], b: readonly string[]) => [...new Set([...b, ...a])];
const maxOf = <K extends string>(a: Partial<Record<K, number>>, b: Partial<Record<K, number>>) => {
  const out: Partial<Record<K, number>> = { ...b };
  for (const [k, v] of Object.entries(a) as [K, number][]) out[k] = Math.max(v ?? 0, out[k] ?? 0);
  return out;
};

/** `older` and `newer` are two versions of one profile; the result keeps everything earned in either. */
export function mergeProfiles(older: Profile, newer: Profile): Profile {
  const a = older.career;
  const b = newer.career;
  // per side, the copy with more prestige stars wins (its XP restarted from zero); same stars: the most XP
  const ahead = (side: Role) => (a.prestige[side] !== b.prestige[side] ? (a.prestige[side] > b.prestige[side] ? a : b) : null);
  const sideXp = (side: Role) => (ahead(side) ?? (a.xp[side] > b.xp[side] ? a : b)).xp[side];
  const xp = { police: sideXp('police'), thief: sideXp('thief') };
  const prestige = { police: Math.max(a.prestige.police, b.prestige.police), thief: Math.max(a.prestige.thief, b.prestige.thief) };
  const carXp = maxOf(a.carXp, b.carXp);
  const achieved = union(a.achieved, b.achieved);
  // a reward still waiting in the older copy survives when the newer copy never earned it (it was not claimed there)
  const stillOwed = (id: string) => {
    const [kind, x, y] = id.split(':');
    if (kind === 'ach') return !b.achieved.includes(x!);
    if (kind === 'rank') return prestige[x as Role] === 0 && rankOf(b.xp[x as Role] ?? 0) < Number(y);
    if (kind === 'mast') return masteryLevel(b.carXp[x!] ?? 0) < MASTERY_MAX;
    return false; // the day's challenges belong to the newer copy
  };
  // a rank reward of a side that earned a star in the other copy was paid by the prestige
  const claims = union(a.claims.filter(stillOwed), b.claims).filter((id) => {
    const [kind, x] = id.split(':');
    return kind !== 'rank' || prestige[x as Role] === b.prestige[x as Role];
  });
  return {
    ...newer,
    stats: maxOf(older.stats as never, newer.stats as never) as unknown as Profile['stats'],
    welcomeGranted: older.welcomeGranted || newer.welcomeGranted,
    owned: union(older.owned, newer.owned),
    career: { ...b, xp, prestige, carXp, achieved, claims, counters: maxOf(a.counters as never, b.counters as never) as never },
  };
}
