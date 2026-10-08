import { describe, expect, it } from 'vitest';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { CATALOG, CARS, buy, canBuy, inUse, lookFor, normalizePlate, owns, setPlate, use } from '../../src/meta/shop';

const rich = (coins = 10_000): Profile => ({ ...emptyProfile(), coins });

describe('catalog (spec §2)', () => {
  it('prices: cars 800 / 1500 / 3000, paint 300, neon 600, sound 500, plate 400', () => {
    const price = (id: string) => CATALOG.find((i) => i.id === id)?.price;
    expect([price('car:esportivo'), price('car:blazer'), price('car:caveirao')]).toEqual([800, 1500, 3000]);
    expect([price('car:picape'), price('car:moto'), price('car:van')]).toEqual([800, 1500, 3000]);
    expect(price('paint:viatura:1')).toBe(300);
    expect(price('neon:thief:rosa')).toBe(600);
    expect(price('sound:dupla')).toBe(500);
    expect(price('plate')).toBe(400);
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

  it('every car has 4 colours (original + 3 paints) with names', () => {
    for (const c of Object.values(CARS)) {
      expect(c.colors).toHaveLength(4);
      expect(c.colorNames).toHaveLength(4);
    }
  });
});

describe('buying (spec §3)', () => {
  it('takes the coins, keeps the item and puts it in use', () => {
    const r = buy(rich(1000), 'car:esportivo');
    expect(r.ok).toBe(true);
    expect(r.profile.coins).toBe(200);
    expect(r.profile.owned).toEqual(['car:esportivo']);
    expect(r.profile.equipped.police.car).toBe('esportivo');
  });

  it('not enough coins: tells how many are missing and changes nothing', () => {
    const p = rich(500);
    expect(canBuy(p, 'car:esportivo')).toEqual({ ok: false, reason: 'coins', missing: 300 });
    expect(buy(p, 'car:esportivo')).toEqual({ ok: false, profile: p });
  });

  it('cannot buy twice, an unknown item, or a paint for a car not owned', () => {
    const p = buy(rich(), 'car:blazer').profile;
    expect(canBuy(p, 'car:blazer')).toEqual({ ok: false, reason: 'owned' });
    expect(canBuy(p, 'car:ferrari')).toEqual({ ok: false, reason: 'unknown' });
    expect(canBuy(p, 'paint:caveirao:1')).toEqual({ ok: false, reason: 'locked' });
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
    let p = rich(1000);
    expect(setPlate(p, 'ABC')).toBe(p);
    p = buy(p, 'plate').profile;
    expect(p.coins).toBe(600);
    p = setPlate(p, 'pl4ca');
    expect(lookFor(p, 'thief').plate).toBe('PL4CA');
    expect(lookFor(p, 'police').plate).toBe('PL4CA'); // one plate for both sides
    p = setPlate(p, '');
    expect(lookFor(p, 'police').plate).toBeNull();
    expect(p.coins).toBe(600);
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
