import { describe, expect, it } from 'vitest';
import { armorFactor, catchUpBonus, distanceFactor, inFireCone, levelAt } from '../../src/sim/rules';

describe('distanceFactor', () => {
  it('is 1 up to 40 m, linear to 0 at 150 m', () => {
    expect(distanceFactor(0)).toBe(1);
    expect(distanceFactor(40)).toBe(1);
    expect(distanceFactor(95)).toBeCloseTo(0.5, 10);
    expect(distanceFactor(150)).toBe(0);
    expect(distanceFactor(300)).toBe(0);
  });
});

describe('catchUpBonus', () => {
  it('is 0 up to 20 m, linear to 0.35 at 150 m, capped', () => {
    expect(catchUpBonus(20)).toBe(0);
    expect(catchUpBonus(85)).toBeCloseTo(0.175, 10);
    expect(catchUpBonus(150)).toBeCloseTo(0.35, 10);
    expect(catchUpBonus(400)).toBeCloseTo(0.35, 10);
  });
});

describe('armorFactor', () => {
  it('removes 15% per plate, max 3 plates', () => {
    expect(armorFactor(0)).toBe(1);
    expect(armorFactor(3)).toBeCloseTo(0.55, 10);
    expect(armorFactor(5)).toBeCloseTo(0.55, 10);
  });
});

describe('inFireCone', () => {
  const me = { s: 100, x: -1.5 };
  it('front: ahead in range and alongside are in; behind and too far are out', () => {
    expect(inFireCone(me, { s: 120, x: -1.5 }, 'front')).toBe(true);
    expect(inFireCone(me, { s: 100, x: 1.5 }, 'front')).toBe(true);
    expect(inFireCone(me, { s: 95, x: -1.5 }, 'front')).toBe(false);
    expect(inFireCone(me, { s: 260, x: -1.5 }, 'front')).toBe(false);
  });
  it('rear: behind is in, ahead is out', () => {
    expect(inFireCone(me, { s: 80, x: -1.5 }, 'rear')).toBe(true);
    expect(inFireCone(me, { s: 120, x: -1.5 }, 'rear')).toBe(false);
  });
});

describe('levelAt', () => {
  it('goes up every 30 s, max 10', () => {
    expect(levelAt(0)).toBe(1);
    expect(levelAt(29.9)).toBe(1);
    expect(levelAt(30)).toBe(2);
    expect(levelAt(1000)).toBe(10);
  });
});
