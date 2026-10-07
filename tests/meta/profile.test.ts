import { describe, expect, it } from 'vitest';
import { applyMatch, emptyProfile, grantWelcome, parseProfile, settleMatch, type Profile } from '../../src/meta/profile';
import type { Reward } from '../../src/meta/rewards';

const reward = (total: number, won = true): Reward => ({ time: 0, damage: 0, boxes: 0, won, difficulty: 'normal', total });

describe('parseProfile', () => {
  it('round-trips an empty profile', () => {
    const p = emptyProfile();
    expect(parseProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('rejects other versions, bad numbers, missing fields and non-objects', () => {
    const ok = emptyProfile() as unknown as Record<string, unknown>;
    for (const bad of [
      { ...ok, v: 2 },
      { ...ok, coins: -1 },
      { ...ok, coins: 1.5 },
      { ...ok, coins: 2e9 },
      { ...ok, coins: '10' },
      { ...ok, stats: undefined },
      { ...ok, stats: { ...(ok.stats as object), wins: -3 } },
      { ...ok, welcomeGranted: 'yes' },
      null,
      'x',
      42,
    ])
      expect(parseProfile(bad)).toBeUndefined();
  });
});

describe('applyMatch', () => {
  it('a thief escape adds coins, earned total, matches, wins and escapes', () => {
    const p = applyMatch(emptyProfile(), { winner: 'thief', reason: 'escape' }, 'thief', reward(112));
    expect(p.coins).toBe(112);
    expect(p.stats).toEqual({ matches: 1, wins: 1, escapes: 1, arrests: 0, coinsEarned: 112 });
  });

  it('a police win counts as an arrest; a loss only adds the match and the coins', () => {
    let p: Profile = applyMatch(emptyProfile(), { winner: 'police', reason: 'thiefDown' }, 'police', reward(40));
    expect(p.stats).toMatchObject({ matches: 1, wins: 1, arrests: 1, escapes: 0 });
    p = applyMatch(p, { winner: 'police', reason: 'escape' }, 'thief', reward(12, false));
    expect(p.coins).toBe(52);
    expect(p.stats).toMatchObject({ matches: 2, wins: 1, arrests: 1, escapes: 0, coinsEarned: 52 });
  });

  it('does not mutate the input profile', () => {
    const p = emptyProfile();
    applyMatch(p, { winner: 'thief' }, 'thief', reward(10));
    expect(p).toEqual(emptyProfile());
  });
});

describe('grantWelcome', () => {
  it('50 coins per record already in the rankings, only once', () => {
    const p = grantWelcome(emptyProfile(), 3);
    expect(p.coins).toBe(150);
    expect(p.welcomeGranted).toBe(true);
    expect(grantWelcome(p, 3).coins).toBe(150);
  });

  it('an empty ranking grants 0 and is still marked as granted', () => {
    const p = grantWelcome(emptyProfile(), 0);
    expect(p).toMatchObject({ coins: 0, welcomeGranted: true });
  });
});

describe('settleMatch', () => {
  it('computes the reward from the result and credits it', () => {
    const r = settleMatch(
      emptyProfile(),
      { winner: 'thief', time: 69.9, reason: 'policeDown', stats: { damageDealt: 100, rightBoxes: 4 } },
      'thief',
    );
    expect(r.reward.total).toBe(112);
    expect(r.profile.coins).toBe(112);
    expect(r.profile.stats.wins).toBe(1);
  });

  it('a result without stats still pays for the time', () => {
    const r = settleMatch(emptyProfile(), { winner: 'police', time: 30 }, 'thief');
    expect(r.reward).toEqual({ time: 10, damage: 0, boxes: 0, won: false, difficulty: 'normal', total: 10 });
  });
});

describe('settleMatch with a difficulty', () => {
  it('credits the multiplied coins', () => {
    const r = settleMatch(
      emptyProfile(),
      { winner: 'thief', time: 69.9, reason: 'policeDown', stats: { damageDealt: 100, rightBoxes: 4 } },
      'thief',
      'hard',
    );
    expect(r.profile.coins).toBe(168);
  });
});
