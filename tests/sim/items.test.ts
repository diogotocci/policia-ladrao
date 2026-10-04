import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { createCar, type CarState } from '../../src/sim/car';
import { resolveCollisions } from '../../src/sim/collisions';
import { NO_INTENTS } from '../../src/sim/intents';
import { applyItem, colorChance, rollItem, stepBoxes } from '../../src/sim/items';
import { fireWeapons, stepProjectiles } from '../../src/sim/projectiles';
import { pursuitBonus } from '../../src/sim/pursuit';
import { createRng } from '../../src/sim/rng';
import { bumpsBetween } from '../../src/sim/track';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const police = (): CarState => ({ ...createCar('police', 1), hasGun: true });
const thief = (): CarState => createCar('thief', 2, 40);

describe('colorChance (probability of blue)', () => {
  it('50/50 when even, tilts up to 65/35 towards whoever has less hp', () => {
    expect(colorChance(100, 100)).toBeCloseTo(0.5, 10);
    expect(colorChance(50, 100)).toBeCloseTo(0.65, 10);
    expect(colorChance(100, 50)).toBeCloseTo(0.35, 10);
    expect(colorChance(10, 100)).toBeCloseTo(0.65, 10);
  });
});

describe('applyItem — police', () => {
  it('fire rate: 0.8 → 0.3 in 5 pickups and never below', () => {
    let c = police();
    for (let i = 0; i < 7; i++) c = applyItem(c, 'fireRate', 0);
    expect(c.upgrades.fireInterval).toBeCloseTo(0.3, 10);
  });
  it('power +0.5 up to 3', () => {
    let c = police();
    for (let i = 0; i < 6; i++) c = applyItem(c, 'power', 0);
    expect(c.upgrades.power).toBe(3);
  });
  it('heal +3, never above 100', () => {
    expect(applyItem({ ...police(), hp: 50 }, 'heal', 0).hp).toBe(53);
    expect(applyItem({ ...police(), hp: 99 }, 'heal', 0).hp).toBe(100);
  });
  it('timed items expire independently and re-picking renews (no stacking)', () => {
    let c = police();
    c = applyItem(c, 'nitro', 0);
    c = applyItem(c, 'heli', 1);
    c = applyItem(c, 'pierce', 2);
    expect(c.upgrades.nitroUntil).toBe(3);
    expect(c.upgrades.heliUntil).toBe(9);
    expect(c.upgrades.pierceUntil).toBe(12);
    c = applyItem(c, 'nitro', 2.5);
    expect(c.upgrades.nitroUntil).toBe(5.5);
  });
  it('ram gives 3 charges', () => {
    expect(applyItem(police(), 'ram', 0).upgrades.ramCharges).toBe(3);
  });
});

describe('applyItem — thief', () => {
  it('plates up to 3, bombs up to 3', () => {
    let c = thief();
    for (let i = 0; i < 5; i++) c = applyItem(applyItem(c, 'plate', 0), 'bomb', 0);
    expect(c.upgrades.plates).toBe(3);
    expect(c.upgrades.bombs).toBe(3);
  });
  it('gun: first unlocks at 1.2 s, then −0.15 s down to 0.6', () => {
    let c = applyItem(thief(), 'gun', 0);
    expect(c.hasGun).toBe(true);
    expect(c.upgrades.fireInterval).toBeCloseTo(1.2, 10);
    for (let i = 0; i < 10; i++) c = applyItem(c, 'gun', 0);
    expect(c.upgrades.fireInterval).toBeCloseTo(0.6, 10);
  });
});

describe('rollItem', () => {
  it('never rolls a maxed permanent item nor heal at full hp (1000 rolls)', () => {
    const rng = createRng(4);
    const maxed: CarState = { ...police(), upgrades: { ...police().upgrades, fireInterval: 0.3, power: 3 } };
    for (let i = 0; i < 1000; i++) expect(['fireRate', 'power', 'heal']).not.toContain(rollItem(maxed, rng));
    const t: CarState = { ...thief(), hasGun: true, upgrades: { ...thief().upgrades, plates: 3, bombs: 3, fireInterval: 0.6 } };
    for (let i = 0; i < 100; i++) expect(rollItem(t, rng)).toBeNull();
  });
});

describe('effects in combat', () => {
  const duel = (pol: Partial<CarState>, thf: Partial<CarState>, d = 20, time = 0): WorldState => {
    const w = { ...createWorld({ seed: 1, playerRole: 'police' }), time };
    return withCar(
      withCar(w, 'police', { ...policeOf(w), s: 100, x: 1.5, speed: 0, ...pol }),
      'thief',
      { ...thiefOf(w), s: 100 + d, x: 1.5, speed: 0, ...thf },
    );
  };
  const shoot = (w: WorldState) => {
    let s = fireWeapons(w, { police: { ...NO_INTENTS, fire: true }, thief: NO_INTENTS }, DT);
    for (let i = 0; i < 60 && s.projectiles.length; i++) s = stepProjectiles(s, DT);
    return 100 - thiefOf(s).hp;
  };

  it('power multiplies the shot; 3 plates make it ×0.55', () => {
    expect(shoot(duel({ upgrades: { ...police().upgrades, power: 2 } }, {}))).toBeCloseTo(2, 10);
    expect(shoot(duel({}, { upgrades: { ...thief().upgrades, plates: 3 } }))).toBeCloseTo(0.55, 10);
  });

  it('helicopter ignores the distance falloff while active', () => {
    expect(shoot(duel({ upgrades: { ...police().upgrades, heliUntil: 5 } }, {}, 95, 1))).toBeCloseTo(1, 10);
    expect(shoot(duel({ upgrades: { ...police().upgrades, heliUntil: 5 } }, {}, 95, 6))).toBeCloseTo(0.5, 10);
  });

  it('nitro adds +40% to the police speed bonus while active', () => {
    expect(pursuitBonus(duel({ upgrades: { ...police().upgrades, nitroUntil: 3 } }, {}, 20, 1))).toBeCloseTo(0.4, 10);
  });

  it('ram: 3 crashes at −8/−1, the 4th back to −5/−3; plates reduce the thief damage', () => {
    let w = duel({ upgrades: { ...police().upgrades, ramCharges: 3 } }, {}, 2);
    const hits: [number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const before: [number, number] = [policeOf(w).hp, thiefOf(w).hp];
      w = { ...w, immunity: {} };
      w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 2, x: thiefOf(w).x });
      w = resolveCollisions(w, DT);
      hits.push([before[0] - policeOf(w).hp, before[1] - thiefOf(w).hp]);
    }
    expect(hits).toEqual([[1, 8], [1, 8], [1, 8], [3, 5]]);
    const plated = resolveCollisions(duel({}, { upgrades: { ...thief().upgrades, plates: 3 } }, 2), DT);
    expect(100 - thiefOf(plated).hp).toBeCloseTo(5 * 0.55, 10);
  });

  it('plates do not reduce scenery damage', () => {
    const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
    const w = duel({}, { x: EDGE, touchingEdge: true, upgrades: { ...thief().upgrades, plates: 3 } }, 60);
    expect(thiefOf(resolveCollisions(w, DT)).hp).toBe(95);
  });
});

describe('boxes', () => {
  const run = (w: WorldState, steps: number, move = true) => {
    let s = w;
    for (let i = 0; i < steps; i++) {
      if (move) {
        s = withCar(s, 'police', { ...policeOf(s), s: policeOf(s).s + 33 * DT });
        s = withCar(s, 'thief', { ...thiefOf(s), s: thiefOf(s).s + 33 * DT });
      }
      s = stepBoxes({ ...s, time: s.time + DT, events: [] });
    }
    return s;
  };

  it('never more than 2 boxes, never on a speed bump (±6 m)', () => {
    let w = createWorld({ seed: 5, playerRole: 'police' });
    // empurra os carros para longe das caixinhas: só observa o spawn
    w = withCar(w, 'police', { ...policeOf(w), x: -10 });
    w = withCar(w, 'thief', { ...thiefOf(w), x: -10 });
    for (let k = 0; k < 40; k++) {
      w = run(w, 60);
      expect(w.boxes.length).toBeLessThanOrEqual(2);
      for (const b of w.boxes) {
        for (const bump of bumpsBetween(w.seed, b.s - 10, b.s + 10)) expect(Math.abs(bump.s - b.s)).toBeGreaterThan(6);
      }
    }
  });

  const boxWorld = (color: 'blue' | 'red', airTime = 0) => {
    const w = createWorld({ seed: 1, playerRole: 'police' });
    const p = policeOf(w);
    return { ...withCar(w, 'police', { ...p, airTime }), boxes: [{ id: 1, s: p.s, x: p.x, color }], nextBoxAt: 1e9 };
  };

  it('own colour gives an item, the other costs 2 hp, both consume the box', () => {
    const own = stepBoxes(boxWorld('blue'));
    expect(own.boxes).toEqual([]);
    expect(own.events.some((e) => e.type === 'pickup' && e.role === 'police' && e.item !== 'wrong')).toBe(true);
    const wrong = stepBoxes(boxWorld('red'));
    expect(policeOf(wrong).hp).toBe(98);
    expect(wrong.events).toContainEqual({ type: 'pickup', role: 'police', item: 'wrong' });
  });

  it('airborne cars do not pick boxes up', () => {
    const w = stepBoxes(boxWorld('red', 0.3));
    expect(w.boxes).toHaveLength(1);
    expect(policeOf(w).hp).toBe(100);
  });
});
