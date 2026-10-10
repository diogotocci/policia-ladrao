// V2 part 6 delivery 2 (spec §3.3-3.5): wheels, coloured smoke and the thief's accessories.
import { describe, expect, it } from 'vitest';
import { decodeBackup, encodeBackup } from '../../src/meta/backup';
import { ACHIEVEMENTS, careerAfterMatch, emptyCareer, unlockOf, type MatchSummary } from '../../src/meta/career';
import { emptyProfile, parseProfile, type Profile } from '../../src/meta/profile';
import { SMOKES } from '../../src/meta/parts';
import { buy, canBuy, inUse, lookFor, owns, use } from '../../src/meta/shop';
import { addEvents, emptyStats } from '../../src/meta/rewards';

const unlocked = () => ({ ...emptyCareer(), xp: { police: 99_999, thief: 99_999 }, achieved: ACHIEVEMENTS.map((a) => a.id) });
const rich = (): Profile => ({ ...emptyProfile(), coins: 100_000, career: unlocked() });

const match = (o: Partial<MatchSummary> = {}): MatchSummary => ({
  role: 'thief',
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

describe('prices and unlocks', () => {
  it('wheels 1.500 by rank 2/4/6 of the side; smoke 1.000 by "Derrape 100 vezes"; accessories 1.200 by thief achievements', () => {
    const p: Profile = { ...emptyProfile(), coins: 100_000 };
    expect(canBuy(p, 'wheels:police:cromadas')).toEqual({ ok: false, reason: 'locked', need: 'Patente Soldado' });
    expect(canBuy(p, 'wheels:thief:esportivas')).toMatchObject({ reason: 'locked' });
    expect(unlockOf('wheels:thief:rodao')).toEqual({ kind: 'rank', side: 'thief', rank: 6 });
    expect(unlockOf('smoke:police:rosa')).toMatchObject({ kind: 'achievement', achievement: { id: 'skid100' } });
    expect(unlockOf('smoke:thief:azul')).toMatchObject({ kind: 'achievement', achievement: { id: 'skid100' } });
    const acc = ['aerofolio', 'rack', 'antena', 'escapamento'].map(
      (a) => (unlockOf(`acc:${a}`) as { achievement: { id: string } }).achievement.id,
    );
    expect(acc).toEqual(['escape30', 'boxes100', 'kill25', 'survive5']);
    const q = rich();
    expect(canBuy(q, 'wheels:police:cromadas')).toEqual({ ok: true, price: 1500 });
    expect(canBuy(q, 'smoke:thief:verde')).toEqual({ ok: true, price: 1000 });
    expect(canBuy(q, 'acc:antena')).toEqual({ ok: true, price: 1200 });
  });

  it('"Pegue 100 caixas" is the thief\'s: boxes picked as the police do not count', () => {
    const c = careerAfterMatch(emptyCareer(), match({ role: 'police', boxes: 120 }), '2026-10-09').career;
    expect(c.counters.boxes).toBe(0);
    expect(ACHIEVEMENTS.find((a) => a.id === 'boxes100')!.side).toBe('thief');
  });

  it('the new counters: skids, boxes and 5 min in Sobrevivência', () => {
    let c = emptyCareer();
    c = careerAfterMatch(c, match({ skids: 60, boxes: 40 }), '2026-10-09').career;
    c = careerAfterMatch(c, match({ skids: 40, boxes: 60, mode: 'survival', time: 300 }), '2026-10-09').career;
    expect(c.counters.skids).toBe(100);
    expect(c.counters.boxes).toBe(100);
    expect(c.counters.survival5min).toBe(1);
    expect(c.achieved).toEqual(expect.arrayContaining(['skid100', 'boxes100', 'survive5']));
  });

  it("a skid of the player counts; the opponent's does not", () => {
    const s = addEvents(
      emptyStats(),
      [
        { type: 'skid', role: 'police', s: 0, x: 0 },
        { type: 'skid', role: 'thief', s: 0, x: 0 },
      ],
      'police',
    );
    expect(s.skids).toBe(1);
  });
});

describe('use and in use', () => {
  it('wheels and smoke per side; standard wheels and white smoke are free', () => {
    let p = buy(rich(), 'wheels:thief:rodao').profile;
    expect(inUse(p, 'wheels:thief:rodao')).toBe(true);
    expect(inUse(p, 'wheels:police:padrao')).toBe(true);
    expect(lookFor(p, 'thief').wheels).toBe('rodao');
    expect(lookFor(p, 'police').wheels).toBeNull();
    p = use(p, 'wheels:thief:padrao');
    expect(inUse(p, 'wheels:thief:padrao')).toBe(true);
    expect(owns(p, 'smoke:police:branca')).toBe(true);
    expect(use(p, 'smoke:police:rosa')).toBe(p); // not bought
    p = buy(p, 'smoke:police:rosa').profile;
    expect(lookFor(p, 'police').smoke).toBe(SMOKES.rosa.color);
    expect(lookFor(p, 'thief').smoke).toBeNull();
  });

  it('accessories go together and come off one by one; only the thief shows them', () => {
    let p = buy(rich(), 'acc:escapamento').profile;
    p = buy(p, 'acc:aerofolio').profile;
    expect(p.equipped.acc).toEqual(['aerofolio', 'escapamento']);
    expect(inUse(p, 'acc:aerofolio')).toBe(true);
    expect(inUse(p, 'acc:rack')).toBe(false);
    expect(lookFor(p, 'thief').acc).toEqual(['aerofolio', 'escapamento']);
    expect(lookFor(p, 'police').acc).toEqual([]);
    p = use(p, 'acc:aerofolio:off');
    expect(inUse(p, 'acc:aerofolio:off')).toBe(true);
    p = use(p, 'acc:escapamento:off');
    expect(p.equipped.acc).toBeUndefined();
    expect(use(p, 'acc:rack')).toBe(p); // not bought
  });

  it('a tampered profile keeps only what was bought', () => {
    const raw = {
      ...rich(),
      owned: ['wheels:police:cromadas'],
      equipped: {
        ...emptyProfile().equipped,
        wheels: { police: 'cromadas', thief: 'rodao' },
        smoke: { police: 'azul' },
        acc: ['rack', 'x'],
      },
    };
    const p = parseProfile(JSON.parse(JSON.stringify(raw)))!;
    expect(p.equipped.wheels).toEqual({ police: 'cromadas' });
    expect(p.equipped.smoke).toBeUndefined();
    expect(p.equipped.acc).toBeUndefined();
  });
});

describe('backup code', () => {
  it('round-trips wheels, smoke and accessories', () => {
    let p = rich();
    for (const id of ['wheels:police:esportivas', 'wheels:thief:rodao', 'smoke:thief:amarela', 'acc:rack', 'acc:antena'])
      p = buy(p, id).profile;
    const back = decodeBackup(encodeBackup(p));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.profile.equipped.wheels).toEqual({ police: 'esportivas', thief: 'rodao' });
    expect(back.profile.equipped.smoke).toEqual({ thief: 'amarela' });
    expect(back.profile.equipped.acc).toEqual(['rack', 'antena']);
    expect(back.profile.career.counters.skids).toBe(p.career.counters.skids);
  });
});
