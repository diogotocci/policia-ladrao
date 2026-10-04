import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { resolveCollisions } from '../../src/sim/collisions';
import { NO_INTENTS } from '../../src/sim/intents';
import { fireWeapons, stepProjectiles } from '../../src/sim/projectiles';
import { stepTraffic, trafficTarget } from '../../src/sim/traffic';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const W = BALANCE.car.halfWidth;

const fill = (w: WorldState, steps = 1) => {
  let s = w;
  for (let i = 0; i < steps; i++) s = stepTraffic(s, DT);
  return s;
};

describe('traffic density', () => {
  it('3 cars at level 1, 5 at level 10', () => {
    expect(trafficTarget(1)).toBe(3);
    expect(trafficTarget(10)).toBe(5);
    expect(fill(createWorld({ seed: 1, playerRole: 'police' })).traffic).toHaveLength(3);
    expect(fill({ ...createWorld({ seed: 1, playerRole: 'police' }), level: 10 }).traffic).toHaveLength(5);
  });

  it('drives at 50–70% of cruise', () => {
    const w = fill(createWorld({ seed: 2, playerRole: 'police' }));
    for (const t of w.traffic) {
      expect(t.speed).toBeGreaterThanOrEqual(BALANCE.movement.cruise.police * 0.5);
      expect(t.speed).toBeLessThanOrEqual(BALANCE.movement.cruise.police * 0.7);
    }
  });
});

describe('traffic spawning', () => {
  it('never spawns within 12 m of another traffic car in the same lane, nor near a game car (200 seeds)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let w = { ...createWorld({ seed, playerRole: 'thief' }), level: 10 };
      w = fill(w);
      const cars = w.traffic;
      for (const a of cars) {
        for (const b of cars) {
          if (a === b) continue;
          if (Math.abs(a.x - b.x) < 2 * W) expect(Math.abs(a.s - b.s)).toBeGreaterThanOrEqual(12);
        }
        for (const g of [policeOf(w), thiefOf(w)]) {
          if (Math.abs(a.x - g.x) < 2 * W) expect(Math.abs(a.s - g.s)).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  it('cars left far behind are removed and replaced ahead', () => {
    let w = fill(createWorld({ seed: 3, playerRole: 'police' }));
    const ids = w.traffic.map((t) => t.id);
    // os carros do jogo saltam 600 m à frente
    w = withCar(withCar(w, 'police', { ...policeOf(w), s: policeOf(w).s + 600 }), 'thief', { ...thiefOf(w), s: thiefOf(w).s + 600 });
    w = fill(w);
    expect(w.traffic).toHaveLength(3);
    expect(w.traffic.some((t) => ids.includes(t.id))).toBe(false);
  });

  it('is deterministic', () => {
    const a = fill(createWorld({ seed: 9, playerRole: 'police' }), 600);
    const b = fill(createWorld({ seed: 9, playerRole: 'police' }), 600);
    expect(a.traffic).toEqual(b.traffic);
  });
});

describe('traffic interactions', () => {
  const withTrafficAt = (w: WorldState, s: number, x: number): WorldState => ({
    ...w,
    traffic: [{ id: 99, s, x, speed: 20, targetX: x, model: 0 }],
  });

  it('crashing into traffic costs 5 hp once per second', () => {
    let w = createWorld({ seed: 1, playerRole: 'police' });
    const p = policeOf(w);
    w = withTrafficAt(withCar(w, 'police', { ...p, speed: 30 }), p.s + 2, p.x);
    for (let i = 0; i < 30; i++) {
      w = resolveCollisions(w, DT);
      w = { ...w, traffic: w.traffic.map((t) => ({ ...t, s: policeOf(w).s + 2, x: policeOf(w).x })) };
    }
    expect(policeOf(w).hp).toBe(95);
    expect(w.events.some((e) => e.type === 'crash' && e.b === 'traffic')).toBe(true);
  });

  it('a traffic car between police and thief blocks the shot', () => {
    let w = createWorld({ seed: 1, playerRole: 'police' });
    w = withCar(withCar(w, 'police', { ...policeOf(w), s: 100, x: 1.5, speed: 0 }), 'thief', { ...thiefOf(w), s: 160, x: 1.5, speed: 0 });
    w = withTrafficAt(w, 130, 1.5);
    w = fireWeapons(w, { police: { ...NO_INTENTS, fire: true }, thief: NO_INTENTS }, DT);
    for (let i = 0; i < 60 && w.projectiles.length; i++) w = stepProjectiles(w, DT);
    expect(thiefOf(w).hp).toBe(100);
    expect(w.events.some((e) => e.type === 'blocked')).toBe(true);
  });
});
