import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { createCar, type CarState } from '../../src/sim/car';
import { resolveCollisions } from '../../src/sim/collisions';
import { NO_INTENTS } from '../../src/sim/intents';
import { applyItem, boxSpot, colorChance, rollItem, stepBoxes } from '../../src/sim/items';
import { fireWeapons, stepProjectiles } from '../../src/sim/projectiles';
import { pursuitBonus } from '../../src/sim/pursuit';
import { createRng } from '../../src/sim/rng';
import { bumpsBetween } from '../../src/sim/track';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

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
    c = applyItem(c, 'heli', 1);
    c = applyItem(c, 'pierce', 2);
    expect(c.upgrades.heliUntil).toBe(9);
    expect(c.upgrades.pierceUntil).toBe(12);
  });

  it('nitro is kept for the button and stacks up to 3 (playtest 2026-10-09)', () => {
    let c = applyItem(police(), 'nitro', 0);
    expect(c.upgrades.nitroUntil).toBe(0); // not fired on pickup
    expect(c.upgrades.special).toEqual({ kind: 'nitro', charges: 1 });
    c = applyItem(applyItem(applyItem(c, 'nitro', 1), 'nitro', 2), 'nitro', 3);
    expect(c.upgrades.special).toEqual({ kind: 'nitro', charges: 3 });
  });

  it('ram gives 3 charges', () => {
    expect(applyItem(police(), 'ram', 0).upgrades.ramCharges).toBe(3);
  });
});

describe('applyItem — thief', () => {
  it('plates up to 3; a special of the same kind adds a charge up to 3, another kind replaces it', () => {
    let c = thief();
    for (let i = 0; i < 5; i++) c = applyItem(applyItem(c, 'plate', 0), 'bomb', 0);
    expect(c.upgrades.plates).toBe(3);
    expect(c.upgrades.special).toEqual({ kind: 'bomb', charges: 3 });
    c = applyItem(c, 'oil', 0);
    expect(c.upgrades.special).toEqual({ kind: 'oil', charges: 1 });
    c = applyItem(c, 'oil', 0);
    expect(c.upgrades.special).toEqual({ kind: 'oil', charges: 2 });
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
    // a thief at the max: only specials of another kind are left (they replace the one kept)
    const t: CarState = {
      ...thief(),
      hp: thief().maxHp,
      hasGun: true,
      upgrades: { ...thief().upgrades, plates: 3, special: { kind: 'bomb', charges: 3 }, fireInterval: 0.6 },
    };
    for (let i = 0; i < 100; i++) expect(['oil', 'spikes', 'smoke']).toContain(rollItem(t, rng));
  });
});

describe('effects in combat', () => {
  const duel = (pol: Partial<CarState>, thf: Partial<CarState>, d = 20, time = 0): WorldState => {
    const w = { ...createWorld({ seed: 1, playerRole: 'police' }), time };
    return withCar(withCar(w, 'police', { ...policeOf(w), s: 100, x: 1.5, speed: 0, ...pol }), 'thief', {
      ...thiefOf(w),
      s: 100 + d,
      x: 1.5,
      speed: 0,
      ...thf,
    });
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

  it('helicopter adds its own full-damage shot (no distance falloff) to the officer’s, while active', () => {
    expect(shoot(duel({ upgrades: { ...police().upgrades, heliUntil: 5 } }, {}, 55, 1))).toBeCloseTo(0.5 + 1, 10);
    expect(shoot(duel({ upgrades: { ...police().upgrades, heliUntil: 5 } }, {}, 55, 6))).toBeCloseTo(0.5, 10);
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
    expect(hits).toEqual([
      [1, 8],
      [1, 8],
      [1, 8],
      [3, 5],
    ]);
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

  it('playtest 2026-10-04: about one box every 6 s at cruise (≥ 9 per minute), so each side sees ~5 of its colour', () => {
    let total = 0;
    for (let seed = 1; seed <= 5; seed++) {
      let w = createWorld({ seed, playerRole: 'thief' });
      const ids = new Set<number>();
      for (let i = 0; i < 60 * 60; i++) {
        w = run(w, 1);
        for (const b of w.boxes) ids.add(b.id);
      }
      total += ids.size;
    }
    expect(total / 5).toBeGreaterThanOrEqual(9);
  });

  it('never more than 2 boxes, never on a speed bump (±6 m)', () => {
    let w = createWorld({ seed: 5, playerRole: 'police' });
    // pushes the cars away from the item boxes: only observes the spawn
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

describe('boxes and speed bumps (playtest 2026-10-07: boxes right after a bump could not be picked up)', () => {
  it('a box planned on a bump or where the cars are still in the air goes just before the bump, or past the jump', () => {
    for (const seed of [1, 7, 42]) {
      for (const b of bumpsBetween(seed, 500, 6000)) {
        for (const d of [-10, 0, 5, 15, 30, 44]) {
          const s = boxSpot(seed, b.s + d, b.s - 200);
          expect(s).toBe(b.s - 12);
        }
        // too close to the cars to move back: past the jump
        expect(boxSpot(seed, b.s + 10, b.s)).toBe(b.s + 45);
        // far from bumps: unchanged
        expect(boxSpot(seed, b.s + 100, 0)).toBe(b.s + 100);
      }
    }
  });

  it('no box in a lane closed by roadworks (Sobrevivência chaos 5, AI x AI)', () => {
    for (let seed = 1; seed <= 5; seed++) {
      let w = createWorld({ seed, playerRole: 'thief', mode: 'survival', chaosEvery: 2 });
      w = withCar(withCar(w, 'thief', { ...thiefOf(w), hp: 1e6 }), 'police', { ...policeOf(w), hp: 1e6 });
      const seen = new Set<number>();
      for (let i = 0; i < 90 * 60; i++) {
        w = stepWorld(w, 'ai', 1 / 60);
        for (const box of w.boxes) {
          if (seen.has(box.id)) continue;
          seen.add(box.id);
          const closed = w.works.some((wk) => BALANCE.road.laneCenters[wk.lane] === box.x && box.s > wk.s - 12 && box.s < wk.s + wk.length);
          expect(closed, `seed ${seed} box ${box.id}`).toBe(false);
        }
      }
    }
  }, 120_000);

  it('no box is ever spawned in the air zone after a bump (AI x AI, 10 seeds)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      let w = createWorld({ seed, playerRole: 'thief', traffic: false });
      for (let i = 0; i < 60 * 60 && !w.match.over; i++) {
        w = stepWorld(w, 'ai', 1 / 60);
        for (const box of w.boxes) expect(bumpsBetween(seed, box.s - 44, box.s + 11)).toHaveLength(0);
      }
    }
  }, 120_000);
});
