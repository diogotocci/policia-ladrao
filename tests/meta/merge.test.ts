// V3 part 1 (spec §4.3): two copies of one player's progress are merged so nothing earned is lost.
import { describe, expect, it } from 'vitest';
import { emptyCareer } from '../../src/meta/career';
import { mergeProfiles } from '../../src/meta/merge';
import { emptyProfile, type Profile } from '../../src/meta/profile';

const base = (o: Partial<Profile> = {}): Profile => ({ ...emptyProfile(), welcomeGranted: true, ...o });

describe('mergeProfiles', () => {
  it('items and achievements: union; XP, car XP, counters and stats: the most of each', () => {
    const older = base({
      owned: ['car:esportivo', 'paint:esportivo:2'],
      stats: { matches: 10, wins: 8, escapes: 1, arrests: 7, coinsEarned: 900 },
      career: {
        ...emptyCareer(),
        xp: { police: 5000, thief: 100 },
        carXp: { viatura: 300 },
        achieved: ['arrest10'],
        counters: { ...emptyCareer().counters, arrests: 12 },
      },
    });
    const newer = base({
      owned: ['car:blazer'],
      stats: { matches: 4, wins: 1, escapes: 3, arrests: 0, coinsEarned: 200 },
      career: {
        ...emptyCareer(),
        xp: { police: 900, thief: 800 },
        carXp: { viatura: 100, blazer: 50 },
        achieved: ['escape10'],
        counters: { ...emptyCareer().counters, escapes: 3 },
      },
    });
    const m = mergeProfiles(older, newer);
    expect(new Set(m.owned)).toEqual(new Set(['car:esportivo', 'paint:esportivo:2', 'car:blazer']));
    expect(m.career.xp).toEqual({ police: 5000, thief: 800 });
    expect(m.career.carXp).toEqual({ viatura: 300, blazer: 50 });
    expect(new Set(m.career.achieved)).toEqual(new Set(['arrest10', 'escape10']));
    expect(m.career.counters.arrests).toBe(12);
    expect(m.career.counters.escapes).toBe(3);
    expect(m.stats).toEqual({ matches: 10, wins: 8, escapes: 3, arrests: 7, coinsEarned: 900 });
  });

  it('coins, what is in use, the day and the streak come from the newer copy', () => {
    const older = base({ coins: 9000, career: { ...emptyCareer(), streak: { last: '2026-10-01', days: 9 } } });
    const newer = base({ coins: 120, career: { ...emptyCareer(), streak: { last: '2026-10-12', days: 1 } } });
    const m = mergeProfiles(older, newer);
    expect(m.coins).toBe(120);
    expect(m.career.streak).toEqual({ last: '2026-10-12', days: 1 });
    expect(m.equipped).toEqual(newer.equipped);
  });

  it('a reward still owed in the older copy survives; one the newer copy already claimed does not come back', () => {
    const older = base({
      career: {
        ...emptyCareer(),
        xp: { police: 950, thief: 0 },
        achieved: ['arrest10'],
        claims: ['ach:arrest10', 'rank:police:3', 'daily:2026-10-01:0'],
      },
    });
    // the newer copy has the same achievement and rank, already claimed (no longer in its claims)
    const claimed = base({ career: { ...emptyCareer(), xp: { police: 950, thief: 0 }, achieved: ['arrest10'] } });
    expect(mergeProfiles(older, claimed).career.claims).toEqual([]);
    // the newer copy never got there: the older copy's rewards stay to be claimed (the day's challenge does not)
    const behind = base({ career: { ...emptyCareer(), xp: { police: 10, thief: 0 } } });
    expect(new Set(mergeProfiles(older, behind).career.claims)).toEqual(new Set(['ach:arrest10', 'rank:police:3']));
  });

  it('the welcome bonus counts once if either copy had it', () => {
    expect(mergeProfiles(base({ welcomeGranted: true }), base({ welcomeGranted: false })).welcomeGranted).toBe(true);
  });
});
