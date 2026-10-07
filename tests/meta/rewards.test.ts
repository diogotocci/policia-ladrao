import { describe, expect, it } from 'vitest';
import { addEvents, emptyStats, rewardFor } from '../../src/meta/rewards';
import type { GameEvent } from '../../src/sim/types';

describe('rewardFor', () => {
  it('spec example: win in 1:09.9 with 100 damage and 4 boxes pays (23 + 25 + 8) x 2 = 112', () => {
    expect(rewardFor({ time: 69.9, won: true }, { damageDealt: 100, rightBoxes: 4 })).toEqual({
      time: 23,
      damage: 25,
      boxes: 8,
      won: true,
      difficulty: 'normal',
      total: 112,
    });
  });

  it('time and damage are capped (30 and 25)', () => {
    const r = rewardFor({ time: 300, won: false }, { damageDealt: 400, rightBoxes: 0 });
    expect(r.time).toBe(30);
    expect(r.damage).toBe(25);
    expect(r.total).toBe(55);
  });

  it('a loss still pays, without the multiplier', () => {
    expect(rewardFor({ time: 30, won: false }, { damageDealt: 10, rightBoxes: 0 })).toEqual({
      time: 10,
      damage: 2,
      boxes: 0,
      won: false,
      difficulty: 'normal',
      total: 12,
    });
  });
});

describe('match stats from events', () => {
  const hit = (target: 'police' | 'thief', amount: number): GameEvent => ({ type: 'hit', target, amount, s: 0, x: 0 });
  const pickup = (role: 'police' | 'thief', item: 'nitro' | 'bomb' | 'wrong' | 'none'): GameEvent => ({ type: 'pickup', role, item });

  it('counts damage dealt to the opponent and boxes of the player color, across steps', () => {
    let s = emptyStats();
    s = addEvents(s, [hit('thief', 5), hit('police', 3), pickup('police', 'nitro'), pickup('police', 'wrong')], 'police');
    s = addEvents(s, [hit('thief', 1.5), pickup('police', 'none'), pickup('thief', 'bomb')], 'police');
    expect(s).toEqual({ damageDealt: 6.5, rightBoxes: 1 });
  });

  it('as the thief, hits on the police count', () => {
    expect(addEvents(emptyStats(), [hit('police', 15), pickup('thief', 'bomb')], 'thief')).toEqual({ damageDealt: 15, rightBoxes: 1 });
  });
});

describe('difficulty multiplier', () => {
  it('Difícil x1.5: the spec example pays 168', () => {
    const r = rewardFor({ time: 69.9, won: true }, { damageDealt: 100, rightBoxes: 4 }, 'hard');
    expect(r.total).toBe(168);
    expect(r.difficulty).toBe('hard');
  });

  it('Fácil x0.75 rounds down (12 -> 9); totals are always whole', () => {
    expect(rewardFor({ time: 30, won: false }, { damageDealt: 10, rightBoxes: 0 }, 'easy').total).toBe(9);
    for (let t = 0; t < 100; t += 7)
      expect(Number.isInteger(rewardFor({ time: t, won: t % 2 === 0 }, { damageDealt: t, rightBoxes: 1 }, 'easy').total)).toBe(true);
  });

  it('Médio is the default and unchanged', () => {
    expect(rewardFor({ time: 69.9, won: true }, { damageDealt: 100, rightBoxes: 4 })).toMatchObject({ total: 112, difficulty: 'normal' });
  });
});

describe('Sobrevivência coins', () => {
  it('the time part goes up to 60 (1 per 3 s)', () => {
    expect(rewardFor({ time: 300, won: false }, { damageDealt: 0, rightBoxes: 0 }, 'normal', 'survival').time).toBe(60);
    expect(rewardFor({ time: 300, won: false }, { damageDealt: 0, rightBoxes: 0 }, 'normal', 'pursuit').time).toBe(30);
  });
});
