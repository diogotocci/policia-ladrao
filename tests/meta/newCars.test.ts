// V2 part 6 delivery 3 (spec §4): the four new cars.
import { describe, expect, it } from 'vitest';
import { decodeBackup, encodeBackup } from '../../src/meta/backup';
import { ACHIEVEMENTS, careerAfterMatch, emptyCareer, unlockOf, type MatchSummary } from '../../src/meta/career';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { CARS, CAR_IDS, buy, canBuy, carsOf, lookFor } from '../../src/meta/shop';
import { MASTERY_CARS } from '../../src/meta/mastery';
import { addEvents, emptyStats } from '../../src/meta/rewards';

const unlocked = () => ({ ...emptyCareer(), xp: { police: 99_999, thief: 99_999 }, achieved: ACHIEVEMENTS.map((a) => a.id) });
const rich = (): Profile => ({ ...emptyProfile(), coins: 200_000, career: unlocked() });
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

describe('new cars', () => {
  it('every car has mastery, the backup slots and its catalog group (no car left out)', () => {
    expect([...MASTERY_CARS]).toEqual(CAR_IDS);
  });

  it('two per side, 7.500 and 12.500, police in the patrol colours', () => {
    expect(carsOf('police').slice(-2)).toEqual(['rocam', 'descaracterizada']);
    expect(carsOf('thief').slice(-2)).toEqual(['kombi', 'fusca']);
    expect([CARS.rocam.price, CARS.descaracterizada.price, CARS.kombi.price, CARS.fusca.price]).toEqual([7500, 12500, 7500, 12500]);
    for (const c of ['rocam', 'descaracterizada'] as const)
      expect([...CARS[c].colorNames].sort()).toEqual(['Azul-marinho', 'Branca', 'Prata', 'Preta']);
  });

  it('each one is unlocked by its new achievement', () => {
    const ach = (id: string) => (unlockOf(id) as { achievement: { id: string; title: string } }).achievement;
    expect(['car:rocam', 'car:descaracterizada', 'car:kombi', 'car:fusca'].map((id) => ach(id).title)).toEqual([
      'Use o nitro 30 vezes',
      'Prenda 50 ladrões',
      'Abra 40 caixas ?',
      'Fuja 50 vezes',
    ]);
    expect(canBuy({ ...emptyProfile(), coins: 99_999 }, 'car:kombi')).toMatchObject({
      ok: false,
      reason: 'locked',
      need: 'Abra 40 caixas ? (0/40)',
    });
    expect(canBuy(rich(), 'car:fusca')).toEqual({ ok: true, price: 12500 });
    // paints, finishes and stickers wait for the car, then follow the usual rules
    expect(canBuy(rich(), 'paint:fusca:2')).toMatchObject({ ok: false, need: 'Compre o carro primeiro' });
  });

  it('nitro used as the police and yellow boxes opened as the thief count', () => {
    const s = addEvents(emptyStats(), [{ type: 'special', role: 'police', kind: 'nitro', s: 0, x: 0 }], 'police');
    expect(s.nitros).toBe(1);
    // the computer's nitro does not count for a thief player
    expect(addEvents(emptyStats(), [{ type: 'special', role: 'police', kind: 'nitro', s: 0, x: 0 }], 'thief').nitros).toBe(0);
    let c = emptyCareer();
    c = careerAfterMatch(c, match({ nitros: 30 }), '2026-10-10').career;
    c = careerAfterMatch(c, match({ role: 'thief', mysteryBoxes: 40 }), '2026-10-10').career;
    c = careerAfterMatch(c, match({ role: 'police', mysteryBoxes: 9 }), '2026-10-10').career;
    expect(c.counters.nitros).toBe(30);
    expect(c.counters.mysteries).toBe(40);
    expect(c.achieved).toEqual(expect.arrayContaining(['nitro30', 'mystery40']));
  });

  it('backup code keeps a new car in use, its paint and its mastery', () => {
    let p = rich();
    p = buy(p, 'car:fusca').profile;
    p = buy(p, 'paint:fusca:2').profile;
    p = buy(p, 'car:rocam').profile;
    p = { ...p, career: { ...p.career, carXp: { ...p.career.carXp, fusca: 1600, rocam: 300 } } };
    const back = decodeBackup(encodeBackup(p));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.profile.equipped.thief.car).toBe('fusca');
    expect(back.profile.equipped.police.car).toBe('rocam');
    expect(back.profile.equipped.paint.fusca).toBe(2);
    expect(back.profile.career.carXp).toMatchObject({ fusca: 1600, rocam: 300 });
    expect(lookFor(back.profile, 'thief').paint).toBe(CARS.fusca.colors[2]);
  });
});
