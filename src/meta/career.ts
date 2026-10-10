// Career (V2 part 5): daily challenges, achievements, ranks per side and the day streak. Pure: the app passes
// "today" (local date, yyyy-mm-dd) and the summary of each finished match; this returns the new state, the coins
// earned and what to show on the end screen. Rewards are coins and shop unlocks (meta/shop.ts asks unlockOf here).
import type { Role } from '../config/balance';
import { DAILY_COINS, arrested, dailiesFor, escaped, type MatchSummary } from './dailies';
import { WHEEL_RANK, type WheelStyle } from './parts';
import { MASTERY_CARS, MASTERY_MAX, masteryLevel, masteryLevelFor, rewardId } from './mastery';

// ---------- ranks ----------
export const RANK_XP = [0, 300, 900, 2000, 4000, 7000, 12000] as const;
export const RANK_NAMES: Record<Role, readonly string[]> = {
  police: ['Recruta', 'Soldado', 'Cabo', 'Sargento', 'Tenente', 'Capitão', 'Delegado'],
  thief: ['Pivete', 'Trombadinha', 'Batedor', 'Assaltante', 'Fugitivo', 'Procurado', 'Chefão'],
};
export const MAX_RANK = RANK_XP.length;
/** coins for reaching each rank (index = rank), paid when claimed in Carreira */
export const RANK_COINS = [0, 0, 200, 400, 600, 1000, 1500, 2000] as const;
/** rank 1..7 for an amount of XP */
export const rankOf = (xp: number): number => RANK_XP.filter((t) => xp >= t).length;

// ---------- lifetime counters (achievements) ----------
export interface Counters {
  matches: number;
  arrests: number;
  arrestsHard: number;
  escapes: number;
  escapesHard: number;
  kills: number; // thief destroyed the patrol car
  roadblocks: number;
  bombHits: number;
  fastArrest: number; // 1 once an arrest under 40 s happened
  survival3min: number; // 1 once the thief lasted 3 min in Sobrevivência
  cleanEscape: number; // 1 once the thief escaped with more than 80% life
  bestStreak: number;
  dailiesDone: number;
  /** V2 part 6 delivery 2 */
  skids: number;
  boxes: number;
  survival5min: number; // 1 once the thief lasted 5 min in Sobrevivência
}
/** Fixed order (backup positions): new counters only at the end. */
export const COUNTER_KEYS: (keyof Counters)[] = [
  'matches',
  'arrests',
  'arrestsHard',
  'escapes',
  'escapesHard',
  'kills',
  'roadblocks',
  'bombHits',
  'fastArrest',
  'survival3min',
  'cleanEscape',
  'bestStreak',
  'dailiesDone',
  'skids',
  'boxes',
  'survival5min',
];
export const emptyCounters = (): Counters => Object.fromEntries(COUNTER_KEYS.map((k) => [k, 0])) as unknown as Counters;

export interface Achievement {
  id: string;
  side: Role | 'any';
  title: string;
  counter: keyof Counters;
  target: number;
  /** shop item it unlocks */
  unlock?: string;
  coins?: number;
}
/** Fixed order (backup positions): new ones only at the end. */
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'arrest10', side: 'police', title: 'Prenda 10 ladrões', counter: 'arrests', target: 10, unlock: 'car:esportivo' },
  { id: 'arrest30', side: 'police', title: 'Prenda 30 ladrões', counter: 'arrests', target: 30, unlock: 'car:blazer' },
  { id: 'arrestHard15', side: 'police', title: 'Prenda 15 ladrões no Difícil', counter: 'arrestsHard', target: 15, unlock: 'car:caveirao' },
  { id: 'roadblock10', side: 'police', title: 'Use 10 bloqueios', counter: 'roadblocks', target: 10, unlock: 'sound:choque' },
  { id: 'fastArrest', side: 'police', title: 'Prenda um ladrão em menos de 40 s', counter: 'fastArrest', target: 1, unlock: 'sound:yelp' },
  { id: 'escape10', side: 'thief', title: 'Fuja 10 vezes', counter: 'escapes', target: 10, unlock: 'car:picape' },
  { id: 'kill10', side: 'thief', title: 'Destrua a viatura 10 vezes', counter: 'kills', target: 10, unlock: 'car:moto' },
  { id: 'escapeHard15', side: 'thief', title: 'Fuja 15 vezes no Difícil', counter: 'escapesHard', target: 15, unlock: 'car:van' },
  { id: 'bomb20', side: 'thief', title: 'Acerte 20 bombas na viatura', counter: 'bombHits', target: 20, unlock: 'sound:grave' },
  { id: 'survive3', side: 'thief', title: 'Sobreviva 3 min no Sobrevivência', counter: 'survival3min', target: 1, unlock: 'sound:corneta' },
  { id: 'cleanEscape', side: 'thief', title: 'Fuja com mais de 80% de vida', counter: 'cleanEscape', target: 1, unlock: 'sound:dupla' },
  { id: 'play10', side: 'any', title: 'Jogue 10 partidas', counter: 'matches', target: 10, coins: 300 },
  { id: 'play50', side: 'any', title: 'Jogue 50 partidas', counter: 'matches', target: 50, coins: 1000 },
  { id: 'play200', side: 'any', title: 'Jogue 200 partidas', counter: 'matches', target: 200, coins: 3000 },
  { id: 'streak7', side: 'any', title: '7 dias seguidos', counter: 'bestStreak', target: 7, coins: 1000 },
  { id: 'daily20', side: 'any', title: 'Complete 20 desafios do dia', counter: 'dailiesDone', target: 20, coins: 1500 },
  // V2 part 6 delivery 2: coloured smoke and the thief's accessories
  { id: 'skid100', side: 'any', title: 'Derrape 100 vezes', counter: 'skids', target: 100, unlock: 'smoke' },
  { id: 'escape30', side: 'thief', title: 'Fuja 30 vezes', counter: 'escapes', target: 30, unlock: 'acc:aerofolio' },
  { id: 'boxes100', side: 'thief', title: 'Pegue 100 caixas', counter: 'boxes', target: 100, unlock: 'acc:rack' },
  { id: 'kill25', side: 'thief', title: 'Destrua a viatura 25 vezes', counter: 'kills', target: 25, unlock: 'acc:antena' },
  {
    id: 'survive5',
    side: 'thief',
    title: 'Sobreviva 5 min no Sobrevivência',
    counter: 'survival5min',
    target: 1,
    unlock: 'acc:escapamento',
  },
];

// ---------- daily challenges: meta/dailies.ts ----------
export { DAILIES, DAILY_COINS, POOL_FROM, dailiesFor, type Daily, type MatchSummary } from './dailies';

// ---------- streak ----------
export const STREAK_COINS = [50, 100, 150, 200, 250, 300, 500] as const;
export const streakCoins = (days: number) => STREAK_COINS[Math.min(days, STREAK_COINS.length) - 1] ?? 0;

/** The day before `date` (yyyy-mm-dd), calendar-wise. */
export function dayBefore(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
/** Local calendar date of a Date (the player's midnight renews the challenges). */
export const localDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- state ----------
export interface Career {
  xp: Record<Role, number>;
  counters: Counters;
  /** achievement ids completed */
  achieved: string[];
  /** today's challenges: the date they belong to and the progress of each */
  daily: { date: string; progress: [number, number, number] };
  streak: { last: string; days: number };
  /**
   * Rewards waiting for "Resgatar" in Carreira (playtest 2026-10-08): `daily:<date>:<0..2>`, `ach:<id>`,
   * `rank:<side>:<2..7>`. Their coins (and what they unlock in the shop) come only when claimed.
   */
  claims: string[];
  /** V2 part 6: mastery XP per car (the coins of the matches played with it) */
  carXp: Partial<Record<string, number>>;
}

export const emptyCareer = (): Career => ({
  xp: { police: 0, thief: 0 },
  counters: emptyCounters(),
  achieved: [],
  daily: { date: '', progress: [0, 0, 0] },
  streak: { last: '', days: 0 },
  claims: [],
  carXp: {},
});

/** Today's progress (a new day starts at zero). */
export const dailyProgress = (c: Career, today: string): [number, number, number] =>
  c.daily.date === today ? c.daily.progress : [0, 0, 0];

export const progressOf = (c: Career, a: Achievement): number => Math.min(a.target, c.counters[a.counter]);

export type CareerEvent =
  | { kind: 'streak'; days: number; coins: number }
  | { kind: 'xp'; side: Role; gained: number; xp: number }
  | { kind: 'rank'; side: Role; rank: number; coins: number }
  | { kind: 'daily'; title: string; coins: number }
  | { kind: 'achievement'; title: string; unlock?: string; coins: number }
  /** V2 part 6: the car of the match went up a mastery level; `unlock` is the shop id it frees */
  | { kind: 'mastery'; car: string; level: number; gained: number; unlock: string | null };

/** Credits one finished match: XP, counters, challenges, achievements and the streak. */
export function careerAfterMatch(c: Career, m: MatchSummary, today: string): { career: Career; coins: number; events: CareerEvent[] } {
  const events: CareerEvent[] = [];
  let coins = 0;
  const k = { ...c.counters };
  const claims = [...c.claims];
  // the device clock went back (or a trip west): the day already credited stays as it is, nothing is paid twice
  const past = (c.daily.date !== '' && today < c.daily.date) || (c.streak.last !== '' && today < c.streak.last);

  // streak: the first match finished each day counts
  let streak = c.streak;
  if (!past && streak.last !== today) {
    const days = streak.last === dayBefore(today) ? streak.days + 1 : 1;
    streak = { last: today, days };
    const paid = streakCoins(days);
    coins += paid;
    events.push({ kind: 'streak', days, coins: paid });
    k.bestStreak = Math.max(k.bestStreak, days);
  }

  // XP and rank of the side played
  const before = c.xp[m.role];
  const xp = { ...c.xp, [m.role]: before + Math.max(0, Math.floor(m.coins)) };
  events.push({ kind: 'xp', side: m.role, gained: xp[m.role] - before, xp: xp[m.role] });
  for (let r = rankOf(before) + 1; r <= rankOf(xp[m.role]); r++) {
    claims.push(`rank:${m.role}:${r}`);
    events.push({ kind: 'rank', side: m.role, rank: r, coins: RANK_COINS[r] ?? 0 });
  }

  // mastery of the car played (V2 part 6)
  const carXp = { ...c.carXp };
  if (m.car) {
    const was = carXp[m.car] ?? 0;
    const now = was + Math.max(0, Math.floor(m.coins));
    carXp[m.car] = now;
    for (let l = masteryLevel(was) + 1; l <= masteryLevel(now); l++) {
      events.push({ kind: 'mastery', car: m.car, level: l, gained: now - was, unlock: rewardId(m.car, l) });
      if (l === MASTERY_MAX) claims.push(`mast:${m.car}`); // the legendary paint waits for "Resgatar"
    }
  }

  // lifetime counters
  const hard = m.difficulty === 'hard';
  k.matches++;
  if (arrested(m)) {
    k.arrests++;
    if (hard) k.arrestsHard++;
    if (m.time < 40) k.fastArrest = 1;
  }
  if (escaped(m)) {
    k.escapes++;
    if (hard) k.escapesHard++;
    if (m.hpFrac > 0.8) k.cleanEscape = 1;
  }
  if (m.role === 'thief' && m.won && m.reason !== 'escape') k.kills++; // the patrol car destroyed (also in Sobrevivência)
  if (m.role === 'thief' && m.mode === 'survival' && m.time >= 180) k.survival3min = 1;
  if (m.role === 'thief' && m.mode === 'survival' && m.time >= 300) k.survival5min = 1;
  k.skids += m.skids ?? 0;
  if (m.role === 'thief') k.boxes += m.boxes ?? 0;
  k.roadblocks += m.roadblocks;
  k.bombHits += m.bombHits;

  // today's challenges
  const list = dailiesFor(today);
  const prev = dailyProgress(c, today);
  const progress = prev.map((p, i) => {
    const d = list[i]!;
    const add = past ? 0 : !d.side || d.side === m.role ? d.count(m) : 0;
    const next = Math.min(d.target, p + add);
    if (p < d.target && next >= d.target) {
      claims.push(`daily:${today}:${i}`);
      k.dailiesDone++;
      events.push({ kind: 'daily', title: d.title, coins: DAILY_COINS[d.tier] });
    }
    return next;
  }) as [number, number, number];

  // achievements (after the counters, the streak and the challenges of this match)
  const achieved = [...c.achieved];
  for (const a of ACHIEVEMENTS) {
    if (achieved.includes(a.id) || k[a.counter] < a.target) continue;
    achieved.push(a.id);
    claims.push(`ach:${a.id}`);
    events.push({ kind: 'achievement', title: a.title, unlock: a.unlock, coins: a.coins ?? 0 });
  }

  return {
    career: { xp, counters: k, achieved, daily: past ? c.daily : { date: today, progress }, streak, claims, carXp },
    coins,
    events,
  };
}

// ---------- shop unlocks (spec §4) ----------
export type Requirement =
  | { kind: 'achievement'; achievement: Achievement }
  | { kind: 'rank'; side: Role | 'any'; rank: number }
  | { kind: 'mastery'; car: string; level: number };

const NEON_FIRST: Record<Role, string[]> = { police: ['azul', 'roxo'], thief: ['verde', 'rosa'] };

/** What unlocks a shop item (null: always available). */
export function unlockOf(id: string): Requirement | null {
  const a = ACHIEVEMENTS.find((x) => x.unlock === id || (x.unlock === 'smoke' && id.startsWith('smoke:')));
  if (a) return { kind: 'achievement', achievement: a };
  const m = masteryLevelFor(id);
  if (m) return { kind: 'mastery', car: m.car, level: m.level };
  return rankUnlock(id);
}
const wheelsUnlock = (side: string | undefined, style: string | undefined): Requirement | null =>
  (side === 'police' || side === 'thief') && style && style in WHEEL_RANK
    ? { kind: 'rank', side, rank: WHEEL_RANK[style as WheelStyle] }
    : null;
/** Items unlocked by a rank (plate, paints, neon, wheels). */
function rankUnlock(id: string): Requirement | null {
  const [kind, x, y] = id.split(':');
  if (id === 'plate') return { kind: 'rank', side: 'any', rank: 2 };
  if (kind === 'paint') return { kind: 'rank', side: paintSide(x!), rank: [0, 2, 4, 6][Number(y)] ?? 2 };
  if (kind === 'neon' && (x === 'police' || x === 'thief')) return { kind: 'rank', side: x, rank: NEON_FIRST[x].includes(y!) ? 3 : 5 };
  if (kind === 'wheels') return wheelsUnlock(x, y);
  return null;
}
const POLICE_CARS = ['viatura', 'esportivo', 'blazer', 'caveirao'];
const paintSide = (car: string): Role => (POLICE_CARS.includes(car) ? 'police' : 'thief');

/** A rank counts once reached and claimed (every rank up to it on that side). */
const rankClaimed = (c: Career, side: Role, rank: number) =>
  rankOf(c.xp[side]) >= rank && !c.claims.some((x) => x.startsWith(`rank:${side}:`) && Number(x.split(':')[2]) <= rank);

/** Requirement met: the achievement done and claimed, or the rank reached and claimed. */
export function meets(c: Career, r: Requirement): boolean {
  if (r.kind === 'achievement') return c.achieved.includes(r.achievement.id) && !c.claims.includes(`ach:${r.achievement.id}`);
  if (r.kind === 'mastery')
    return masteryLevel(c.carXp[r.car] ?? 0) >= r.level && !(r.level === MASTERY_MAX && c.claims.includes(`mast:${r.car}`));
  return r.side === 'any' ? rankClaimed(c, 'police', r.rank) || rankClaimed(c, 'thief', r.rank) : rankClaimed(c, r.side, r.rank);
}

/** Done but waiting in Carreira. */
export function awaitingClaim(c: Career, r: Requirement): boolean {
  if (meets(c, r)) return false;
  if (r.kind === 'achievement') return c.achieved.includes(r.achievement.id);
  if (r.kind === 'mastery') return masteryLevel(c.carXp[r.car] ?? 0) >= r.level;
  const sides: Role[] = r.side === 'any' ? ['police', 'thief'] : [r.side];
  return sides.some((s) => rankOf(c.xp[s]) >= r.rank);
}

/** Player-facing text of what is missing: "Prenda 30 ladrões (14/30)" or "Patente Sargento". */
export function requirementText(c: Career, r: Requirement): string {
  if (awaitingClaim(c, r)) return 'Resgate na Carreira';
  if (r.kind === 'mastery') return `Maestria ${r.level}`;
  if (r.kind === 'achievement') {
    const a = r.achievement;
    return a.target > 1 ? `${a.title} (${progressOf(c, a)}/${a.target})` : a.title;
  }
  if (r.side === 'any') return `Patente ${RANK_NAMES.police[r.rank - 1]} ou ${RANK_NAMES.thief[r.rank - 1]}`;
  return `Patente ${RANK_NAMES[r.side][r.rank - 1]}`;
}

// ---------- validation (profile v3) ----------
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 1e9;
const isDate = (s: unknown): s is string => typeof s === 'string' && (s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s));

/** Untrusted data (storage, backup) to a clean Career; anything broken falls back to the empty value. */
export function parseCareer(raw: unknown): Career {
  const out = emptyCareer();
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  const xp = r.xp as Record<string, unknown> | undefined;
  if (xp && isCount(xp.police) && isCount(xp.thief)) out.xp = { police: xp.police, thief: xp.thief };
  const k = r.counters as Record<string, unknown> | undefined;
  if (k) for (const key of COUNTER_KEYS) if (isCount(k[key])) out.counters[key] = k[key];
  if (Array.isArray(r.achieved)) out.achieved = [...new Set(r.achieved.filter((x): x is string => ACHIEVEMENTS.some((a) => a.id === x)))];
  const d = r.daily as Record<string, unknown> | undefined;
  if (d && isDate(d.date) && Array.isArray(d.progress) && d.progress.length === 3 && d.progress.every(isCount))
    out.daily = { date: d.date, progress: d.progress as [number, number, number] };
  const s = r.streak as Record<string, unknown> | undefined;
  if (s && isDate(s.last) && isCount(s.days)) out.streak = { last: s.last, days: s.days };
  const cx = r.carXp as Record<string, unknown> | undefined;
  if (cx && typeof cx === 'object') for (const car of MASTERY_CARS) if (isCount(cx[car]) && cx[car] > 0) out.carXp[car] = cx[car];
  if (Array.isArray(r.claims)) out.claims = [...new Set(r.claims.filter((x): x is string => typeof x === 'string' && validClaim(out, x)))];
  return out;
}

/** First load of a profile from before part 5: counts already known from the stats, XP split between the sides. */
export function careerFromStats(stats: { matches: number; arrests: number; escapes: number; coinsEarned: number }): Career {
  const c = emptyCareer();
  c.counters.matches = stats.matches;
  c.counters.arrests = stats.arrests;
  c.counters.escapes = stats.escapes;
  const half = Math.floor(stats.coinsEarned / 2);
  c.xp = { police: half, thief: half };
  // achievements already reached by those counts are given silently (no coins: they were played before part 5)
  c.achieved = ACHIEVEMENTS.filter((a) => c.counters[a.counter] >= a.target).map((a) => a.id);
  return c;
}

/** A claim id that can exist for this career (rejects tampered or unknown ones). */
function validClaim(c: Career, id: string): boolean {
  const [kind, a, b] = id.split(':');
  if (kind === 'daily') return isDate(a) && a !== '' && (b === '0' || b === '1' || b === '2');
  if (kind === 'ach') return c.achieved.includes(a!);
  if (kind === 'rank' && (a === 'police' || a === 'thief')) return Number(b) >= 2 && Number(b) <= rankOf(c.xp[a]);
  if (kind === 'mast') return masteryLevel(c.carXp[a!] ?? 0) >= MASTERY_MAX;
  return false;
}

/** Coins of a claim (0 for an unknown one). */
export function claimCoins(id: string): number {
  const [kind, a, b] = id.split(':');
  if (kind === 'daily') return DAILY_COINS[dailiesFor(a!)[Number(b)]?.tier ?? 0];
  if (kind === 'ach') return ACHIEVEMENTS.find((x) => x.id === a)?.coins ?? 0;
  if (kind === 'rank') return RANK_COINS[Number(b)] ?? 0;
  return 0;
}

/** "Resgatar": takes the claim out of the list and returns its coins (unknown id: nothing happens). */
export function claim(c: Career, id: string): { career: Career; coins: number } {
  if (!c.claims.includes(id)) return { career: c, coins: 0 };
  return { career: { ...c, claims: c.claims.filter((x) => x !== id) }, coins: claimCoins(id) };
}
