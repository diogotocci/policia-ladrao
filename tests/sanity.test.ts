import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';

describe('BALANCE', () => {
  it('has the 4 lane centers from the spec', () => {
    expect(BALANCE.road.laneCenters).toEqual([-4.5, -1.5, 1.5, 4.5]);
  });

  it('makes the thief cruise faster than the police', () => {
    expect(BALANCE.movement.cruise.thief).toBeGreaterThan(BALANCE.movement.cruise.police);
  });
});
