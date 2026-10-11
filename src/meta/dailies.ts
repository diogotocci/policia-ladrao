// Daily challenges (V2 part 5; 21 since playtest 2026-10-08): the pool, what each one counts in a match and the
// 3 of each day. Pure: the same date gives the same challenges to everyone.
import type { Difficulty, Mode, Role } from '../config/balance';

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
  /** playtest 2026-10-08 (more daily challenges): opponent's boxes, shots fired, every box picked */
  wrongBoxes?: number;
  shots?: number;
  boxes?: number;
  /** V2 part 6: skids of the player's car */
  skids?: number;
  /** V2 part 6 delivery 3: nitro used by the police player */
  nitros?: number;
  /** V2 part 6: the car played (mastery) */
  car?: string;
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
export const arrested = (m: MatchSummary) => m.role === 'police' && m.won;
/** The thief got away: by the clock, or by winning in Sobrevivência (no clock there; playtest 2026-10-09) */
export const escaped = (m: MatchSummary) => m.role === 'thief' && m.won && (m.reason === 'escape' || m.mode === 'survival');
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
  // playtest 2026-10-08: a bigger pool, so the days do not repeat (some ask for something bad on purpose)
  { id: 'shots30', tier: 0, title: 'Atire 30 vezes', target: 30, count: (m) => m.shots ?? 0 },
  { id: 'halfLife', tier: 0, title: 'Termine uma partida com mais de metade da vida', target: 1, count: (m) => (m.hpFrac > 0.5 ? 1 : 0) },
  { id: 'wrong3', tier: 0, title: 'Pegue 3 caixas do adversário', target: 3, count: (m) => m.wrongBoxes ?? 0 },
  { id: 'mystery4', tier: 1, title: 'Abra 4 caixas ?', target: 4, count: (m) => m.mysteryBoxes },
  { id: 'roadblock2', tier: 1, title: 'Use 2 bloqueios', target: 2, side: 'police', count: (m) => m.roadblocks },
  { id: 'wrong6', tier: 1, title: 'Pegue 6 caixas do adversário', target: 6, count: (m) => m.wrongBoxes ?? 0 },
  {
    id: 'kill1',
    tier: 2,
    title: 'Destrua a viatura 1 vez',
    target: 1,
    side: 'thief',
    count: (m) => (m.role === 'thief' && m.won && m.reason !== 'escape' ? 1 : 0),
  },
  { id: 'winNoBox', tier: 2, title: 'Vença sem pegar nenhuma caixa', target: 1, count: (m) => (m.won && (m.boxes ?? 0) === 0 ? 1 : 0) },
  { id: 'winLowHp', tier: 2, title: 'Vença com menos de 30% de vida', target: 1, count: (m) => (m.won && m.hpFrac < 0.3 ? 1 : 0) },
];

/** Small deterministic hash of a string (same challenges for everyone on the same day). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The challenges of the first version (12): the days before the bigger pool keep them, so a challenge already done
 * or waiting for "Resgatar" stays the same one. */
const FIRST_POOL = DAILIES.slice(0, 12);
/** First day of the bigger pool (playtest 2026-10-08). */
export const POOL_FROM = '2026-10-09';

function firstPoolDay(date: string): Daily[] {
  const pick = (tier: number, pool: Daily[]) => pool[hash(`${date}#${tier}`) % pool.length]!;
  const easy = pick(
    0,
    FIRST_POOL.filter((d) => d.tier === 0),
  );
  const mid = pick(
    1,
    FIRST_POOL.filter((d) => d.tier === 1),
  );
  const hard = pick(
    2,
    FIRST_POOL.filter((d) => d.tier === 2 && (!mid.side || !d.side)),
  );
  return [easy, mid, hard];
}

const dayAfter = (date: string): string => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** One day of the bigger pool: per tier, the challenges in a shuffled order of that day, the first one that is not
 * yesterday's of that tier; the hard one cannot ask for a side when the medium one already does. */
function poolDay(date: string, yesterday: Daily[] | null): Daily[] {
  const out: Daily[] = [];
  for (const tier of [0, 1, 2] as const) {
    const order = DAILIES.filter((d) => d.tier === tier)
      .map((d) => ({ d, h: hash(`${date}#${tier}#${d.id}`) }))
      .sort((a, b) => a.h - b.h || (a.d.id < b.d.id ? -1 : 1))
      .map((x) => x.d);
    const ok = (d: Daily) => d !== yesterday?.[tier] && !(tier === 2 && out[1]!.side && d.side);
    out.push(order.find(ok)!);
  }
  return out;
}

const poolCache = new Map<string, Daily[]>();
/** Days of the bigger pool are chained (no repeats from the day before), so they are worked out from POOL_FROM. */
function poolDays(date: string): Daily[] {
  const hit = poolCache.get(date);
  if (hit) return hit;
  let day = POOL_FROM;
  let prev: Daily[] | null = null;
  // start from the latest day already known before `date`
  for (const [k, v] of poolCache) if (k < date && k >= day) [day, prev] = [dayAfter(k), v];
  for (; day <= date; day = dayAfter(day)) {
    prev = poolDay(day, prev);
    poolCache.set(day, prev);
  }
  return prev!;
}

/** The 3 challenges of a day (easy, medium, hard); at most one asks for a side; none repeats the day before. */
export function dailiesFor(date: string): Daily[] {
  // a clock set to a far year would chain thousands of years of days: those fall back to the simple pick
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < POOL_FROM || date >= '2100') return firstPoolDay(date);
  return poolDays(date);
}
