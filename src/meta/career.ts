// Career (V2 part 5): daily challenges, achievements, ranks per side and the day streak. Pure: the app passes
// "today" (local date, yyyy-mm-dd) and the summary of each finished match; this returns the new state, the coins
// earned and what to show on the end screen. Rewards are coins and shop unlocks (meta/shop.ts asks unlockOf here).
import type { Difficulty, Mode, Role } from '../config/balance';

// ---------- ranks ----------
export const RANK_XP = [0, 300, 900, 2000, 4000, 7000, 12000] as const;
export const RANK_NAMES: Record<Role, readonly string[]> = {
  police: ['Recruta', 'Soldado', 'Cabo', 'Sargento', 'Tenente', 'Capitão', 'Delegado'],
  thief: ['Pivete', 'Trombadinha', 'Batedor', 'Assaltante', 'Fugitivo', 'Procurado', 'Chefão'],
};
export const MAX_RANK = RANK_XP.length;
export const TOP_RANK_COINS = 2000;
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
];

// ---------- daily challenges ----------
/** What one match did, as the career sees it. */
export interface MatchSummary {
  role: Role;
  mode: Mode;
  difficulty: Difficulty;
  won: boolean;
  reason?: 'escape' | 'policeDown' | 'thiefDown';
  time: number;
  /** player's life left, 0..1 */
  hpFrac: number;
  rightBoxes: number;
  mysteryBoxes: number;
  damageDealt: number;
  roadblocks: number;
  bombHits: number;
  /** coins the match paid (= XP for that side) */
  coins: number;
}

export interface Daily {
  id: string;
  tier: 0 | 1 | 2;
  title: string;
  target: number;
  side?: Role;
  /** progress this match adds */
  count(m: MatchSummary): number;
}
const arrested = (m: MatchSummary) => m.role === 'police' && m.won;
const escaped = (m: MatchSummary) => m.role === 'thief' && m.won && m.reason === 'escape';
export const DAILY_COINS = [150, 250, 350] as const;
export const DAILIES: readonly Daily[] = [
  { id: 'play2', tier: 0, title: 'Jogue 2 partidas', target: 2, count: () => 1 },
  { id: 'boxes8', tier: 0, title: 'Pegue 8 caixas da sua cor', target: 8, count: (m) => m.rightBoxes },
  { id: 'survival1', tier: 0, title: 'Jogue 1 partida no Sobrevivência', target: 1, count: (m) => (m.mode === 'survival' ? 1 : 0) },
  { id: 'mystery2', tier: 0, title: 'Abra 2 caixas ?', target: 2, count: (m) => m.mysteryBoxes },
  { id: 'win2', tier: 1, title: 'Vença 2 partidas', target: 2, count: (m) => (m.won ? 1 : 0) },
  { id: 'escape1', tier: 1, title: 'Fuja 1 vez', target: 1, side: 'thief', count: (m) => (escaped(m) ? 1 : 0) },
  { id: 'arrest1', tier: 1, title: 'Prenda 1 ladrão', target: 1, side: 'police', count: (m) => (arrested(m) ? 1 : 0) },
  { id: 'damage300', tier: 1, title: 'Cause 300 de dano', target: 300, count: (m) => Math.round(m.damageDealt) },
  { id: 'winHard3', tier: 2, title: 'Vença 3 partidas no Difícil', target: 3, count: (m) => (m.won && m.difficulty === 'hard' ? 1 : 0) },
  { id: 'escape2', tier: 2, title: 'Fuja 2 vezes', target: 2, side: 'thief', count: (m) => (escaped(m) ? 1 : 0) },
  {
    id: 'fastArrest2',
    tier: 2,
    title: 'Prenda 2 ladrões em menos de 1 min',
    target: 2,
    side: 'police',
    count: (m) => (arrested(m) && m.time < 60 ? 1 : 0),
  },
  {
    id: 'survive2',
    tier: 2,
    title: 'Sobreviva 2 min no Sobrevivência',
    target: 1,
    side: 'thief',
    count: (m) => (m.role === 'thief' && m.mode === 'survival' && m.time >= 120 ? 1 : 0),
  },
];

/** Small deterministic hash of a string (same challenges for everyone on the same day). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The 3 challenges of a day (easy, medium, hard); at most one asks for a side. */
export function dailiesFor(date: string): Daily[] {
  const pick = (tier: number, pool: Daily[]) => pool[hash(`${date}#${tier}`) % pool.length]!;
  const easy = pick(
    0,
    DAILIES.filter((d) => d.tier === 0),
  );
  const mid = pick(
    1,
    DAILIES.filter((d) => d.tier === 1),
  );
  const hard = pick(
    2,
    DAILIES.filter((d) => d.tier === 2 && (!mid.side || !d.side)),
  );
  return [easy, mid, hard];
}

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
  /** things to look at in Carreira (title badge); cleared when it opens */
  unseen: number;
}

export const emptyCareer = (): Career => ({
  xp: { police: 0, thief: 0 },
  counters: emptyCounters(),
  achieved: [],
  daily: { date: '', progress: [0, 0, 0] },
  streak: { last: '', days: 0 },
  unseen: 0,
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
  | { kind: 'achievement'; title: string; unlock?: string; coins: number };

/** Credits one finished match: XP, counters, challenges, achievements and the streak. */
export function careerAfterMatch(c: Career, m: MatchSummary, today: string): { career: Career; coins: number; events: CareerEvent[] } {
  const events: CareerEvent[] = [];
  let coins = 0;
  const k = { ...c.counters };
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
    const paid = r === MAX_RANK ? TOP_RANK_COINS : 0;
    coins += paid;
    events.push({ kind: 'rank', side: m.role, rank: r, coins: paid });
  }

  // lifetime counters
  const hard = m.difficulty === 'hard';
  k.matches++;
  if (arrested(m)) {
    k.arrests++;
    if (hard) k.arrestsHard++;
    if (m.time < 40) k.fastArrest = 1;
  }
  if (m.role === 'thief' && m.won) {
    if (m.reason === 'escape') {
      k.escapes++;
      if (hard) k.escapesHard++;
      if (m.hpFrac > 0.8) k.cleanEscape = 1;
    } else k.kills++;
  }
  if (m.role === 'thief' && m.mode === 'survival' && m.time >= 180) k.survival3min = 1;
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
      coins += DAILY_COINS[d.tier];
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
    coins += a.coins ?? 0;
    events.push({ kind: 'achievement', title: a.title, unlock: a.unlock, coins: a.coins ?? 0 });
  }

  const news = events.filter((e) => e.kind === 'rank' || e.kind === 'daily' || e.kind === 'achievement').length;
  return {
    career: { xp, counters: k, achieved, daily: past ? c.daily : { date: today, progress }, streak, unseen: c.unseen + news },
    coins,
    events,
  };
}

// ---------- shop unlocks (spec §4) ----------
export type Requirement = { kind: 'achievement'; achievement: Achievement } | { kind: 'rank'; side: Role | 'any'; rank: number };

const NEON_FIRST: Record<Role, string[]> = { police: ['azul', 'roxo'], thief: ['verde', 'rosa'] };

/** What unlocks a shop item (null: always available). */
export function unlockOf(id: string): Requirement | null {
  const a = ACHIEVEMENTS.find((x) => x.unlock === id);
  if (a) return { kind: 'achievement', achievement: a };
  const [kind, x, y] = id.split(':');
  if (id === 'plate') return { kind: 'rank', side: 'any', rank: 2 };
  if (kind === 'paint') return { kind: 'rank', side: paintSide(x!), rank: [0, 2, 4, 6][Number(y)] ?? 2 };
  if (kind === 'neon' && (x === 'police' || x === 'thief')) return { kind: 'rank', side: x, rank: NEON_FIRST[x].includes(y!) ? 3 : 5 };
  return null;
}
const POLICE_CARS = ['viatura', 'esportivo', 'blazer', 'caveirao'];
const paintSide = (car: string): Role => (POLICE_CARS.includes(car) ? 'police' : 'thief');

export function meets(c: Career, r: Requirement): boolean {
  if (r.kind === 'achievement') return c.achieved.includes(r.achievement.id);
  const best = r.side === 'any' ? Math.max(rankOf(c.xp.police), rankOf(c.xp.thief)) : rankOf(c.xp[r.side]);
  return best >= r.rank;
}

/** Player-facing text of what is missing: "Prenda 30 ladrões (14/30)" or "Patente Sargento". */
export function requirementText(c: Career, r: Requirement): string {
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
  if (isCount(r.unseen)) out.unseen = r.unseen;
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
