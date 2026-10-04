import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';

describe('BALANCE', () => {
  it('has the 4 lane centers from the spec', () => {
    expect(BALANCE.road.laneCenters).toEqual([-4.5, -1.5, 1.5, 4.5]);
  });

  it('police and thief cruise at the same speed (police only closes in on thief mistakes)', () => {
    expect(BALANCE.movement.cruise.thief).toBe(BALANCE.movement.cruise.police);
  });

  it('balance test A + C: thief gun 1.5 per hit, bomb 15', () => {
    expect(BALANCE.combat.thiefDamage).toBe(1.5);
    expect(BALANCE.items.bomb.damage).toBe(15);
  });
});
