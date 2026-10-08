import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  DAILY_COINS,
  RANK_NAMES,
  careerAfterMatch,
  careerFromStats,
  dailiesFor,
  dailyProgress,
  dayBefore,
  emptyCareer,
  localDate,
  parseCareer,
  rankOf,
  streakCoins,
  unlockOf,
  claim,
  claimCoins,
  meets,
  requirementText,
  type Career,
  type MatchSummary,
} from '../../src/meta/career';

const match = (o: Partial<MatchSummary> = {}): MatchSummary => ({
  role: 'police',
  mode: 'pursuit',
  difficulty: 'normal',
  won: false,
  time: 90,
  hpFrac: 0.5,
  rightBoxes: 0,
  mysteryBoxes: 0,
  damageDealt: 0,
  roadblocks: 0,
  bombHits: 0,
  coins: 50,
  ...o,
});
const DAY = '2026-10-08';

describe('ranks (spec §3)', () => {
  it('7 ranks per side by XP: 0, 300, 900, 2000, 4000, 7000, 12000', () => {
    expect([0, 299, 300, 899, 900, 2000, 4000, 6999, 7000, 12000, 1e6].map(rankOf)).toEqual([1, 1, 2, 2, 3, 4, 5, 5, 6, 7, 7]);
    expect(RANK_NAMES.police[6]).toBe('Delegado');
    expect(RANK_NAMES.thief[6]).toBe('Chefão');
  });

  it('XP = the coins of the match on the side played; a rank up waits in Carreira with its coins (top rank 2000)', () => {
    let c: Career = { ...emptyCareer(), streak: { last: DAY, days: 1 } };
    let r = careerAfterMatch(c, match({ coins: 320 }), DAY);
    expect(r.career.xp).toEqual({ police: 320, thief: 0 });
    expect(r.events).toContainEqual({ kind: 'rank', side: 'police', rank: 2, coins: 200 });
    expect(r.career.claims).toContain('rank:police:2');
    expect(r.coins).toBe(0); // nothing paid until "Resgatar"
    c = { ...r.career, xp: { police: 11_990, thief: 0 } };
    r = careerAfterMatch(c, match({ coins: 50 }), DAY);
    expect(r.events).toContainEqual({ kind: 'rank', side: 'police', rank: 7, coins: 2000 });
  });
});

describe('Resgatar (playtest 2026-10-08)', () => {
  it('challenges, achievements and ranks pay only when claimed, once; the shop unlock waits for the claim too', () => {
    let c = { ...emptyCareer(), streak: { last: DAY, days: 1 } };
    for (let i = 0; i < 10; i++) c = careerAfterMatch(c, match({ won: true, time: 80, coins: 40 }), DAY).career;
    expect(c.claims).toContain('ach:arrest10');
    const req = unlockOf('car:esportivo')!;
    expect(meets(c, req)).toBe(false);
    expect(requirementText(c, req)).toBe('Resgate na Carreira');
    let r = claim(c, 'ach:arrest10');
    expect(r.coins).toBe(0); // it unlocks a car, no coins
    expect(meets(r.career, req)).toBe(true);
    expect(claim(r.career, 'ach:arrest10')).toEqual({ career: r.career, coins: 0 }); // twice: nothing
    r = claim(r.career, 'ach:play10');
    expect(r.coins).toBe(300);
    const rank = r.career.claims.find((x) => x.startsWith('rank:police:'))!;
    expect(meets(r.career, unlockOf('plate')!)).toBe(false); // rank 2 reached, not claimed yet
    r = claim(r.career, rank);
    expect(r.coins).toBe(claimCoins(rank));
    expect(meets(r.career, unlockOf('plate')!)).toBe(true);
    const daily = r.career.claims.find((x) => x.startsWith('daily:'));
    if (daily) expect(claim(r.career, daily).coins).toBe(DAILY_COINS[dailiesFor(DAY)[Number(daily.split(':')[2])]!.tier]);
  });

  it('tampered claims are dropped when the career is read', () => {
    const c = parseCareer({
      ...emptyCareer(),
      achieved: ['arrest10'],
      claims: ['ach:arrest10', 'ach:arrest30', 'rank:police:5', 'daily:bad:1', 'x'],
    });
    expect(c.claims).toEqual(['ach:arrest10']);
  });
});

describe('streak (spec §3)', () => {
  it('first match of the day pays 50, 100, ... 500 on consecutive days; a missed day restarts', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 30].map(streakCoins)).toEqual([50, 100, 150, 200, 250, 300, 500, 500, 500]);
    let c = emptyCareer();
    let r = careerAfterMatch(c, match(), '2026-10-06');
    expect(r.events[0]).toEqual({ kind: 'streak', days: 1, coins: 50 });
    r = careerAfterMatch(r.career, match(), '2026-10-06'); // same day: nothing
    expect(r.events.some((e) => e.kind === 'streak')).toBe(false);
    r = careerAfterMatch(r.career, match(), '2026-10-07');
    expect(r.events[0]).toEqual({ kind: 'streak', days: 2, coins: 100 });
    c = r.career;
    r = careerAfterMatch(c, match(), '2026-10-09'); // skipped the 8th
    expect(r.events[0]).toEqual({ kind: 'streak', days: 1, coins: 50 });
  });

  it('dates: the day before crosses months and years; local date of the device', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2027-01-01')).toBe('2026-12-31');
    expect(localDate(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
  });
});

describe('daily challenges (spec §3)', () => {
  it('3 per day (easy, medium, hard), the same for everyone on that day, at most one asks for a side', () => {
    for (let d = 1; d <= 60; d++) {
      const date = `2026-${String(Math.ceil(d / 30) + 9).padStart(2, '0')}-${String(((d - 1) % 28) + 1).padStart(2, '0')}`;
      const list = dailiesFor(date);
      expect(list.map((x) => x.tier)).toEqual([0, 1, 2]);
      expect(list.filter((x) => x.side).length).toBeLessThanOrEqual(1);
      expect(dailiesFor(date).map((x) => x.id)).toEqual(list.map((x) => x.id));
    }
    const ids = new Set(Array.from({ length: 40 }, (_, i) => dailiesFor(`2026-11-${String((i % 28) + 1).padStart(2, '0')}`)[1]!.id));
    expect(ids.size).toBeGreaterThan(1); // they change from day to day
  });

  it('progress adds up during the day, pays once when complete and starts over the next day', () => {
    const today = dailiesFor(DAY);
    const easy = today[0]!;
    let c = emptyCareer();
    let paid = 0;
    // play enough neutral matches to finish the easy one whatever it is
    for (let i = 0; i < 10; i++) {
      const r = careerAfterMatch(c, match({ mode: 'survival', rightBoxes: 3, mysteryBoxes: 1, won: true, damageDealt: 50 }), DAY);
      paid += r.events.filter((e) => e.kind === 'daily' && e.title === easy.title).length;
      c = r.career;
    }
    expect(paid).toBe(1);
    expect(dailyProgress(c, DAY)[0]).toBe(easy.target);
    expect(dailyProgress(c, '2026-10-09')).toEqual([0, 0, 0]);
    expect(c.counters.dailiesDone).toBeGreaterThanOrEqual(1);
    expect(DAILY_COINS).toEqual([150, 250, 350]);
  });

  it('a challenge for one side does not count matches on the other side', () => {
    const date = Array.from({ length: 200 }, (_, i) => dayBefore(`2027-0${(i % 9) + 1}-15`)).find(
      (d) => dailiesFor(d)[1]!.id === 'escape1',
    )!;
    expect(date).toBeDefined();
    let r = careerAfterMatch(emptyCareer(), match({ role: 'police', won: true }), date);
    expect(dailyProgress(r.career, date)[1]).toBe(0);
    r = careerAfterMatch(r.career, match({ role: 'thief', won: true, reason: 'escape' }), date);
    expect(dailyProgress(r.career, date)[1]).toBe(1);
  });
});

describe('achievements (spec §3)', () => {
  it('counting arrests unlocks the Esportivo at 10 (once)', () => {
    let c = { ...emptyCareer(), streak: { last: DAY, days: 1 } };
    const unlocked: string[] = [];
    for (let i = 0; i < 12; i++) {
      const r = careerAfterMatch(c, match({ won: true, time: 80 }), DAY);
      for (const e of r.events) if (e.kind === 'achievement' && e.unlock) unlocked.push(e.unlock);
      c = r.career;
    }
    expect(c.counters.arrests).toBe(12);
    expect(unlocked.filter((u) => u === 'car:esportivo')).toHaveLength(1);
    expect(c.achieved).toContain('arrest10');
    expect(c.achieved).toContain('play10');
  });

  it('special ones: fast arrest, Sobrevivência 3 min, escape with 80% life, kills, roadblocks and bombs', () => {
    let c = { ...emptyCareer(), streak: { last: DAY, days: 1 } };
    c = careerAfterMatch(c, match({ won: true, time: 35 }), DAY).career;
    expect(c.achieved).toContain('fastArrest');
    c = careerAfterMatch(c, match({ role: 'thief', mode: 'survival', time: 200 }), DAY).career;
    expect(c.achieved).toContain('survive3');
    c = careerAfterMatch(c, match({ role: 'thief', won: true, reason: 'escape', hpFrac: 0.9 }), DAY).career;
    expect(c.achieved).toContain('cleanEscape');
    c = careerAfterMatch(c, match({ role: 'thief', won: true, reason: 'policeDown', bombHits: 20 }), DAY).career;
    expect(c.counters.kills).toBe(1);
    expect(c.achieved).toContain('bomb20');
    c = careerAfterMatch(c, match({ roadblocks: 10 }), DAY).career;
    expect(c.achieved).toContain('roadblock10');
  });

  it('every car and sound has exactly one unlock; ids are unique', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const id of ['car:esportivo', 'car:blazer', 'car:caveirao', 'car:picape', 'car:moto', 'car:van', 'sound:yelp', 'sound:choque'])
      expect(unlockOf(id)?.kind).toBe('achievement');
    expect(unlockOf('paint:van:2')).toEqual({ kind: 'rank', side: 'thief', rank: 4 });
    expect(unlockOf('neon:thief:azul')).toEqual({ kind: 'rank', side: 'thief', rank: 5 });
  });
});

describe('saved career', () => {
  it('parse keeps valid data and drops the rest', () => {
    const c = parseCareer({
      xp: { police: 10, thief: -1 },
      counters: { arrests: 3, escapes: 'x' },
      achieved: ['arrest10', 'nope'],
      daily: { date: 'bad', progress: [1, 2, 3] },
    });
    expect(c.xp).toEqual({ police: 0, thief: 0 });
    expect(c.counters.arrests).toBe(3);
    expect(c.counters.escapes).toBe(0);
    expect(c.achieved).toEqual(['arrest10']);
    expect(c.daily).toEqual(emptyCareer().daily);
    expect(parseCareer(null)).toEqual(emptyCareer());
  });

  it('a profile from before part 5 starts from its stats; achievements already reached come silently', () => {
    const c = careerFromStats({ matches: 60, arrests: 12, escapes: 3, coinsEarned: 4000 });
    expect(c.xp).toEqual({ police: 2000, thief: 2000 });
    expect(c.achieved).toEqual(expect.arrayContaining(['arrest10', 'play10', 'play50']));
    expect(c.achieved).not.toContain('escape10');
  });
});

describe('clock going back (review)', () => {
  it('a match on an earlier date than the last one credited pays no streak and no challenge again', () => {
    let c = emptyCareer();
    for (let i = 0; i < 10; i++)
      c = careerAfterMatch(c, match({ mode: 'survival', rightBoxes: 3, mysteryBoxes: 1, won: true }), '2026-10-09').career;
    const before = { daily: c.daily, streak: c.streak };
    const r = careerAfterMatch(c, match({ mode: 'survival', rightBoxes: 3, mysteryBoxes: 1, won: true }), '2026-10-08');
    expect(r.events.some((e) => e.kind === 'streak' || e.kind === 'daily')).toBe(false);
    expect(r.career.daily).toEqual(before.daily);
    expect(r.career.streak).toEqual(before.streak);
    expect(r.career.xp.police).toBeGreaterThan(c.xp.police); // the match itself still counts (XP, counters)
  });
});

describe('escapes in Sobrevivência (playtest 2026-10-09)', () => {
  it('a thief win there counts as an escape (and as the patrol car destroyed); a pursuit kill does not', () => {
    let c = { ...emptyCareer(), streak: { last: DAY, days: 1 } };
    c = careerAfterMatch(c, match({ role: 'thief', mode: 'survival', won: true, reason: 'policeDown', difficulty: 'hard' }), DAY).career;
    expect(c.counters.escapes).toBe(1);
    expect(c.counters.escapesHard).toBe(1);
    expect(c.counters.kills).toBe(1);
    c = careerAfterMatch(c, match({ role: 'thief', mode: 'pursuit', won: true, reason: 'policeDown' }), DAY).career;
    expect(c.counters.escapes).toBe(1);
    expect(c.counters.kills).toBe(2);
  });
});
