import { describe, expect, it } from 'vitest';
import { BALANCE, type Difficulty, type Role } from '../../src/config/balance';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';
import { fireWeapons } from '../../src/sim/projectiles';
import { levelAt } from '../../src/sim/rules';
import { trafficTarget } from '../../src/sim/traffic';
import { createWorld, policeOf, stepWorld, thiefOf, withCar } from '../../src/sim/world';

const DT = 1 / 60;
const both = (police: Intents, thief: Intents): Record<Role, Intents> => ({ police, thief });

describe('difficulty: the computer level', () => {
  it('start level and pace per difficulty (Médio is the default)', () => {
    expect(levelAt(0, 'easy')).toBe(1);
    expect(levelAt(59.9, 'easy')).toBe(1);
    expect(levelAt(60, 'easy')).toBe(2);
    expect(levelAt(44.9)).toBe(1);
    expect(levelAt(45)).toBe(2);
    expect(levelAt(0, 'hard')).toBe(3);
    expect(levelAt(29.9, 'hard')).toBe(3);
    expect(levelAt(30, 'hard')).toBe(4);
    expect(levelAt(9999, 'hard')).toBe(10);
  });

  it('the world starts at the difficulty start level; default is normal', () => {
    expect(createWorld({ seed: 1, playerRole: 'thief', difficulty: 'hard' }).level).toBe(3);
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    expect(w.difficulty).toBe('normal');
    expect(w.level).toBe(1);
    expect(createWorld({ seed: 1, playerRole: 'thief', difficulty: 'insane' as Difficulty }).difficulty).toBe('normal');
  });

  it('keeps the level from the difficulty while the match runs', () => {
    let w = createWorld({ seed: 1, playerRole: 'thief', difficulty: 'hard', traffic: false });
    for (let i = 0; i < 31 * 60; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.level).toBe(4);
  });
});

describe('difficulty: traffic', () => {
  it('fewer cars on easy, more on hard, never below 1', () => {
    expect(trafficTarget(1, 'easy')).toBe(2);
    expect(trafficTarget(1)).toBe(3);
    expect(trafficTarget(1, 'hard')).toBe(4);
    for (const d of ['easy', 'normal', 'hard'] as Difficulty[])
      for (let l = 1; l <= 10; l++) expect(trafficTarget(l, d)).toBeGreaterThanOrEqual(1);
  });
});

describe("difficulty: the computer's helicopter", () => {
  const shots = (playerRole: Role, difficulty: Difficulty) => {
    const base = createWorld({ seed: 1, playerRole, difficulty });
    let w = withCar(withCar(base, 'thief', { ...thiefOf(base), s: 140, x: 1.5, speed: 30 }), 'police', {
      ...policeOf(base),
      s: 100,
      x: 1.5,
      speed: 30,
      upgrades: { ...policeOf(base).upgrades, heliUntil: 5 },
    });
    for (let i = 0; i < 240; i++) w = fireWeapons({ ...w, events: [] }, both(NO_INTENTS, NO_INTENTS), DT);
    return w.projectiles.filter((p) => p.air !== undefined).length;
  };

  it('fires every 1.2 s / 1 s / 0.7 s when the computer is the police', () => {
    expect(shots('thief', 'easy')).toBe(4);
    expect(shots('thief', 'normal')).toBe(4);
    expect(shots('thief', 'hard')).toBe(6);
  });

  it("the player's helicopter keeps 0.7 s on every difficulty", () => {
    for (const d of ['easy', 'normal', 'hard'] as Difficulty[])
      expect(shots('police', d)).toBe(Math.ceil(4 / BALANCE.items.police.heliFireInterval));
  });
});

describe('difficulty: AI vs AI', () => {
  it("the computer's police wins less on easy than on hard (same seeds)", () => {
    const policeWins = (difficulty: Difficulty) => {
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        let w = createWorld({ seed, playerRole: 'thief', difficulty });
        for (let i = 0; i < 95 * 60 && !w.match.over; i++) w = stepWorld(w, 'ai', DT);
        if (w.match.winner === 'police') n++;
      }
      return n;
    };
    expect(policeWins('easy')).toBeLessThan(policeWins('hard'));
  }, 120_000);
});
