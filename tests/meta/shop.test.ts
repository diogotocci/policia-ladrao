import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, emptyCareer } from '../../src/meta/career';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { CATALOG, CARS, buy, canBuy, inUse, lookFor, normalizePlate, owns, randomLook, setPlate, use } from '../../src/meta/shop';

/** everything unlocked by the career (part 5), so these tests only look at coins and ownership */
const unlockedCareer = () => ({ ...emptyCareer(), xp: { police: 99_999, thief: 99_999 }, achieved: ACHIEVEMENTS.map((a) => a.id) });
const rich = (coins = 100_000): Profile => ({ ...emptyProfile(), coins, career: unlockedCareer() });

describe('catalog (spec §2)', () => {
  it('prices (part 5, ~3x): cars 2500 / 5000 / 10000, paint 900, neon 1800, sound 1500, plate 1200', () => {
    const price = (id: string) => CATALOG.find((i) => i.id === id)?.price;
    expect([price('car:esportivo'), price('car:blazer'), price('car:caveirao')]).toEqual([2500, 5000, 10000]);
    expect([price('car:picape'), price('car:moto'), price('car:van')]).toEqual([2500, 5000, 10000]);
    expect(price('paint:viatura:1')).toBe(900);
    expect(price('neon:thief:rosa')).toBe(1800);
    expect(price('sound:dupla')).toBe(1500);
    expect(price('plate')).toBe(1200);
  });

  it('ids are unique and the order is stable (the backup code stores positions)', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    // the first and last positions never move; new items only go at the end
    expect(ids.slice(0, 6)).toEqual(['car:esportivo', 'car:blazer', 'car:caveirao', 'car:picape', 'car:moto', 'car:van']);
    expect(ids.length).toBe(6 + 24 + 8 + 5 + 1);
    expect(ids[ids.length - 1]).toBe('plate');
  });

  it('the whole order is pinned: changing it would make old backup codes restore the wrong items', () => {
    const cars = ['viatura', 'esportivo', 'blazer', 'caveirao', 'seda', 'picape', 'moto', 'van'];
    const expected = [
      ...['esportivo', 'blazer', 'caveirao', 'picape', 'moto', 'van'].map((c) => `car:${c}`),
      ...cars.flatMap((c) => [1, 2, 3].map((i) => `paint:${c}:${i}`)),
      ...['police', 'thief'].flatMap((r) => ['azul', 'roxo', 'verde', 'rosa'].map((n) => `neon:${r}:${n}`)),
      ...['yelp', 'choque', 'corneta', 'grave', 'dupla'].map((x) => `sound:${x}`),
      'plate',
    ];
    expect(CATALOG.map((i) => i.id)).toEqual(expected);
  });

  it('police cars: always white, silver, navy and black (playtest 2026-10-08)', () => {
    const palette = new Set([0xf4f5f7, 0xf1f2f4, 0xf3f4f6, 0xb8bec6, 0x1b2a4a, 0x16181c, 0x111316, 0x1e2126]);
    for (const c of ['viatura', 'esportivo', 'blazer', 'caveirao'] as const) {
      expect(CARS[c].colors.every((x) => palette.has(x))).toBe(true);
      expect(CARS[c].colorNames.map((n) => n.replace(/[ao]$/, '').toLowerCase()).sort()).toEqual(['azul-marinh', 'branc', 'prat', 'pret']);
    }
  });

  it('every car has 4 colours (original + 3 paints) with names', () => {
    for (const c of Object.values(CARS)) {
      expect(c.colors).toHaveLength(4);
      expect(c.colorNames).toHaveLength(4);
    }
  });
});

describe('buying (spec §3)', () => {
  it('takes the coins, keeps the item and puts it in use', () => {
    const r = buy(rich(3000), 'car:esportivo');
    expect(r.ok).toBe(true);
    expect(r.profile.coins).toBe(500);
    expect(r.profile.owned).toEqual(['car:esportivo']);
    expect(r.profile.equipped.police.car).toBe('esportivo');
  });

  it('not enough coins: tells how many are missing and changes nothing', () => {
    const p = rich(2000);
    expect(canBuy(p, 'car:esportivo')).toEqual({ ok: false, reason: 'coins', missing: 500 });
    expect(buy(p, 'car:esportivo')).toEqual({ ok: false, profile: p });
  });

  it('cannot buy twice, an unknown item, or a paint for a car not owned', () => {
    const p = buy(rich(), 'car:blazer').profile;
    expect(canBuy(p, 'car:blazer')).toEqual({ ok: false, reason: 'owned' });
    expect(canBuy(p, 'car:ferrari')).toEqual({ ok: false, reason: 'unknown' });
    expect(canBuy(p, 'paint:caveirao:1')).toEqual({ ok: false, reason: 'locked', need: 'Compre o carro primeiro' });
    expect(canBuy(p, 'paint:blazer:1').ok).toBe(true);
    expect(canBuy(p, 'paint:viatura:2').ok).toBe(true); // the free car counts as owned
  });

  it('paint, neon and sound go in use on the right side', () => {
    let p = rich();
    p = buy(p, 'paint:viatura:3').profile;
    p = buy(p, 'neon:thief:verde').profile;
    p = buy(p, 'sound:yelp').profile;
    p = buy(p, 'sound:grave').profile;
    expect(p.equipped.paint.viatura).toBe(3);
    expect(p.equipped.thief.neon).toBe('verde');
    expect(p.equipped.police).toEqual({ car: 'viatura', neon: null, sound: 'yelp' });
    expect(p.equipped.thief.sound).toBe('grave');
  });
});

describe('using (spec §3)', () => {
  it('only owned items; free choices always work', () => {
    let p = rich();
    expect(use(p, 'car:caveirao')).toBe(p);
    expect(use(p, 'neon:police:azul')).toBe(p);
    p = buy(p, 'neon:police:azul').profile;
    p = use(p, 'neon:police:off');
    expect(p.equipped.police.neon).toBeNull();
    expect(inUse(p, 'neon:police:off')).toBe(true);
    p = use(p, 'neon:police:azul');
    expect(inUse(p, 'neon:police:azul')).toBe(true);
    p = buy(p, 'sound:choque').profile;
    p = use(p, 'sound:police:padrao');
    expect(p.equipped.police.sound).toBeNull();
    expect(inUse(p, 'sound:police:padrao')).toBe(true);
    expect(owns(p, 'paint:viatura:0')).toBe(true);
    expect(owns(p, 'paint:moto:0')).toBe(false); // original colour of a car not owned: nothing to use
    expect(owns(p, 'car:seda')).toBe(true);
    expect(owns(p, 'car:van')).toBe(false);
  });

  it('each car remembers its paint', () => {
    let p = rich();
    p = buy(p, 'car:esportivo').profile;
    p = buy(p, 'paint:esportivo:1').profile;
    p = use(p, 'car:viatura');
    expect(lookFor(p, 'police').paint).toBe(CARS.viatura.colors[0]);
    p = use(p, 'car:esportivo');
    expect(lookFor(p, 'police').paint).toBe(CARS.esportivo.colors[1]);
    p = use(p, 'paint:esportivo:0');
    expect(lookFor(p, 'police').paint).toBe(CARS.esportivo.colors[0]);
  });
});

describe('plate (spec §3)', () => {
  it('uppercase A-Z 0-9, at most 7', () => {
    expect(normalizePlate('dio-2026!')).toBe('DIO2026');
    expect(normalizePlate('abcdefghij')).toBe('ABCDEFG');
    expect(normalizePlate('çã ')).toBe('');
  });

  it('needs the plate bought; then changes for free; empty removes it', () => {
    let p = rich(3000);
    expect(setPlate(p, 'ABC')).toBe(p);
    p = buy(p, 'plate').profile;
    expect(p.coins).toBe(1800);
    p = setPlate(p, 'pl4ca');
    expect(lookFor(p, 'thief').plate).toBe('PL4CA');
    expect(lookFor(p, 'police').plate).toBe('PL4CA'); // one plate for both sides
    p = setPlate(p, '');
    expect(lookFor(p, 'police').plate).toBeNull();
    expect(p.coins).toBe(1800);
  });
});

describe('lookFor', () => {
  it('defaults: patrol car and sedan, original colours, no neon, plate or sound', () => {
    expect(lookFor(emptyProfile(), 'police')).toEqual({
      car: 'viatura',
      paint: CARS.viatura.colors[0],
      neon: null,
      plate: null,
      sound: null,
    });
    expect(lookFor(emptyProfile(), 'thief').car).toBe('seda');
  });
});

describe('unlocking (part 5, spec §4)', () => {
  it('cars and sounds need their achievement; paints, neon and plate a rank; then coins', () => {
    const p: Profile = { ...emptyProfile(), coins: 100_000 };
    expect(canBuy(p, 'car:esportivo')).toEqual({ ok: false, reason: 'locked', need: 'Prenda 10 ladrões (0/10)' });
    expect(canBuy(p, 'sound:yelp')).toEqual({ ok: false, reason: 'locked', need: 'Prenda um ladrão em menos de 40 s' });
    expect(canBuy(p, 'paint:viatura:1')).toEqual({ ok: false, reason: 'locked', need: 'Patente Soldado' });
    expect(canBuy(p, 'paint:seda:3')).toEqual({ ok: false, reason: 'locked', need: 'Patente Procurado' });
    expect(canBuy(p, 'neon:police:azul')).toEqual({ ok: false, reason: 'locked', need: 'Patente Cabo' });
    expect(canBuy(p, 'neon:police:rosa')).toEqual({ ok: false, reason: 'locked', need: 'Patente Tenente' });
    expect(canBuy(p, 'neon:thief:rosa')).toEqual({ ok: false, reason: 'locked', need: 'Patente Batedor' });
    expect(canBuy(p, 'plate')).toEqual({ ok: false, reason: 'locked', need: 'Patente Soldado ou Trombadinha' });
    const career = { ...emptyCareer(), achieved: ['arrest10'], xp: { police: 0, thief: 300 } };
    const q: Profile = { ...p, career };
    expect(canBuy(q, 'car:esportivo').ok).toBe(true);
    expect(canBuy(q, 'plate').ok).toBe(true); // rank 2 on either side
    expect(canBuy(q, 'paint:viatura:1').ok).toBe(false); // police rank still 1
    expect(canBuy(q, 'paint:seda:1').ok).toBe(true);
  });

  it('items bought in 0.16 stay owned and usable without the unlock', () => {
    const p: Profile = { ...emptyProfile(), owned: ['car:caveirao'] };
    expect(canBuy(p, 'car:caveirao')).toEqual({ ok: false, reason: 'owned' });
    expect(use(p, 'car:caveirao').equipped.police.car).toBe('caveirao');
  });
});

describe('random computer car (playtest 2026-10-08)', () => {
  it('any car of the side, one of its 4 colours, a side sound or none, and a Mercosul plate when there is one', () => {
    const seen = new Set<string>();
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 300; i++) {
      const l = randomLook('thief', rand);
      seen.add(l.car);
      expect(CARS[l.car].role).toBe('thief');
      expect(CARS[l.car].colors).toContain(l.paint);
      if (l.sound) expect(['corneta', 'grave', 'dupla']).toContain(l.sound);
      if (l.plate) expect(l.plate).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
    }
    expect(seen).toEqual(new Set(['seda', 'picape', 'moto', 'van']));
    expect(CARS[randomLook('police').car].role).toBe('police');
  });
});
