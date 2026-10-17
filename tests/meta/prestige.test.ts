// Prestige (mockup approved 2026-10-16): at the top rank a side can go back to rank 1 for a star and coins.
import { describe, expect, it } from 'vitest';
import {
  PRESTIGE_COINS,
  PRESTIGE_MAX,
  canPrestige,
  careerAfterMatch,
  emptyCareer,
  meets,
  parseCareer,
  prestige,
  unlockOf,
  type Career,
  type MatchSummary,
} from '../../src/meta/career';
import { decodeBackup, encodeBackup } from '../../src/meta/backup';
import { mergeProfiles } from '../../src/meta/merge';
import { emptyProfile, type Profile } from '../../src/meta/profile';

const DAY = '2026-10-16';
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
const top = (o: Partial<Career> = {}): Career => ({ ...emptyCareer(), xp: { police: 12_500, thief: 4100 }, ...o });

describe('prestige', () => {
  it('only at the top rank, up to 10 stars per side', () => {
    expect(canPrestige(top(), 'police')).toBe(true);
    expect(canPrestige(top(), 'thief')).toBe(false); // Fugitivo
    expect(canPrestige(top({ prestige: { police: PRESTIGE_MAX, thief: 0 } }), 'police')).toBe(false);
    const nothing = top({ xp: { police: 11_999, thief: 0 } });
    expect(prestige(nothing, 'police')).toEqual({ career: nothing, coins: 0 });
  });

  it('back to rank 1 with one more star and 3.000 coins; the other side and everything else stay', () => {
    const c = top({ achieved: ['arrest10'], carXp: { viatura: 900 } });
    const r = prestige(c, 'police');
    expect(r.coins).toBe(PRESTIGE_COINS);
    expect(PRESTIGE_COINS).toBe(3000);
    expect(r.career.xp).toEqual({ police: 0, thief: 4100 });
    expect(r.career.prestige).toEqual({ police: 1, thief: 0 });
    expect(r.career.achieved).toEqual(['arrest10']);
    expect(r.career.carXp).toEqual({ viatura: 900 });
  });

  it('rank rewards still waiting on that side are paid along (they could not be claimed later)', () => {
    const r = prestige(
      top({ claims: ['rank:police:6', 'rank:police:7', 'rank:thief:2', 'ach:arrest10'], achieved: ['arrest10'] }),
      'police',
    );
    expect(r.coins).toBe(PRESTIGE_COINS + 1500 + 2000);
    expect(r.career.claims).toEqual(['rank:thief:2', 'ach:arrest10']);
  });

  it('climbing again pays nothing and waits for nothing; the rank items stay unlocked', () => {
    const c = prestige(top(), 'police').career;
    const r = careerAfterMatch({ ...c, streak: { last: DAY, days: 1 } }, match({ coins: 1000 }), DAY);
    expect(r.events).toContainEqual({ kind: 'rank', side: 'police', rank: 3, coins: 0, again: true });
    expect(r.career.claims.filter((x) => x.startsWith('rank:'))).toEqual([]);
    expect(r.career.prestige).toEqual({ police: 1, thief: 0 });
    // the rodão wheels (rank 6): still usable back at Cabo
    const wheels = unlockOf('wheels:police:rodao');
    expect(wheels && meets(r.career, wheels)).toBe(true);
  });

  it('kept in the profile and in the backup code; tampered values are dropped', () => {
    expect(parseCareer({ ...emptyCareer(), prestige: { police: 3, thief: 1 } }).prestige).toEqual({ police: 3, thief: 1 });
    expect(parseCareer({ ...emptyCareer(), prestige: { police: 99, thief: 1 } }).prestige).toEqual({ police: 0, thief: 0 });
    expect(parseCareer({ ...emptyCareer(), prestige: undefined }).prestige).toEqual({ police: 0, thief: 0 });
    // a rank reward on a side with a star would pay twice: dropped
    const tampered = parseCareer({
      ...emptyCareer(),
      xp: { police: 900, thief: 900 },
      prestige: { police: 1, thief: 0 },
      claims: ['rank:police:3', 'rank:thief:3'],
    });
    expect(tampered.claims).toEqual(['rank:thief:3']);
    const p: Profile = { ...emptyProfile(), welcomeGranted: true, career: { ...emptyCareer(), prestige: { police: 2, thief: 5 } } };
    const r = decodeBackup(encodeBackup(p));
    expect(r.ok && r.profile.career.prestige).toEqual({ police: 2, thief: 5 });
  });

  it('merging two copies: the side with more stars wins with its own XP (the old XP does not come back)', () => {
    const before: Profile = { ...emptyProfile(), welcomeGranted: true, career: top({ claims: ['rank:police:7'] }) };
    const after: Profile = { ...before, career: { ...prestige(before.career, 'police').career, xp: { police: 400, thief: 4000 } } };
    for (const [older, newer] of [
      [before, after],
      [after, before],
    ] as const) {
      const m = mergeProfiles(older, newer).career;
      expect(m.prestige).toEqual({ police: 1, thief: 0 });
      expect(m.xp).toEqual({ police: 400, thief: 4100 });
      expect(m.claims.filter((x) => x.startsWith('rank:police'))).toEqual([]); // paid by the prestige
    }
  });
});
