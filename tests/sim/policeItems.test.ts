import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { applyItem } from '../../src/sim/items';
import { fireWeapons } from '../../src/sim/projectiles';
import { placeRoadblock, roadblockLanes, stepWingman, usePoliceSpecial } from '../../src/sim/policeItems';
import { stepHazards } from '../../src/sim/specials';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const I = BALANCE.items;
const PRESS = { ...NO_INTENTS, bomb: true };
const LANES = BALANCE.road.laneCenters;

const base = (opts: Partial<WorldState> = {}): WorldState => {
  const w = { ...createWorld({ seed: 1, playerRole: 'police', traffic: false, curves: false }), nextBoxAt: 1e9, ...opts };
  return withCar(w, 'thief', { ...thiefOf(w), s: 1000, x: LANES[1], speed: 34 });
};
const armed = (opts: Partial<WorldState> = {}, charges = 1) => {
  const w = base(opts);
  return withCar(w, 'police', { ...policeOf(w), s: 950, upgrades: { ...policeOf(w).upgrades, special: { kind: 'roadblock', charges } } });
};

describe('roadblock (police special)', () => {
  it('a patrol car on the thief lane and spikes next to it: 2 free lanes in Perseguição, 1 from chaos 2', () => {
    // 2 blocked: the thief lane and the one next to it towards the center
    expect(roadblockLanes(0, 2)).toEqual({ car: 0, spikes: [1] });
    expect(roadblockLanes(1, 2)).toEqual({ car: 1, spikes: [2] });
    expect(roadblockLanes(2, 2)).toEqual({ car: 2, spikes: [1] });
    expect(roadblockLanes(3, 2)).toEqual({ car: 3, spikes: [2] });
    expect(roadblockLanes(0, 1)).toEqual({ car: 0, spikes: [1, 2] });
    expect(roadblockLanes(2, 1)).toEqual({ car: 2, spikes: [1, 3] });
    const w = usePoliceSpecial(armed(), PRESS);
    const block = w.hazards.find((h) => h.kind === 'roadblock')!;
    expect(block.target).toBe('thief');
    expect(block.s).toBeGreaterThanOrEqual(1000 + I.roadblock.ahead);
    expect(block.s).toBeLessThanOrEqual(1000 + I.roadblock.ahead + I.roadblock.search);
    expect(w.hazards.filter((h) => h.kind === 'spikes')).toHaveLength(1);
    expect(policeOf(w).upgrades.special).toBeNull();
    const hard = usePoliceSpecial(armed({ mode: 'survival', chaos: 2 }), PRESS);
    expect(hard.hazards.filter((h) => h.kind === 'spikes')).toHaveLength(2);
    expect(w.events.some((e) => e.type === 'special' && e.kind === 'roadblock')).toBe(true);
  });

  it('no free spot within 60 m (a box everywhere): nothing placed and the charge stays', () => {
    const boxes = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, s: 1100 + i * 4, x: 0, color: 'blue' as const }));
    const w = usePoliceSpecial(armed({ boxes }), PRESS);
    expect(w.hazards).toEqual([]);
    expect(policeOf(w).upgrades.special).toEqual({ kind: 'roadblock', charges: 1 });
    expect(placeRoadblock(armed({ boxes }))).toBeNull();
  });

  it('crashing into it: −15 and speed loss like the curb, driving through; spikes: flat tire; the police is never hit', () => {
    let w = usePoliceSpecial(armed(), PRESS);
    const block = w.hazards.find((h) => h.kind === 'roadblock')!;
    w = withCar(w, 'thief', { ...thiefOf(w), s: block.s + 0.5, x: (block.xFrom + block.xTo) / 2, speed: 30 });
    const hit = stepHazards(w);
    const t = thiefOf(hit);
    expect(t.maxHp - t.hp).toBeCloseTo(I.roadblock.damage);
    expect(t.speed).toBeCloseTo(30 * (1 - BALANCE.collision.speedLoss));
    expect(t.s).toBeCloseTo(block.s + 0.5); // not held: drives on
    expect(hit.events.some((e) => e.type === 'roadblockHit')).toBe(true);
    const spikes = w.hazards.find((h) => h.kind === 'spikes')!;
    const flat = stepHazards(withCar(w, 'thief', { ...thiefOf(w), s: spikes.s + 0.5, x: (spikes.xFrom + spikes.xTo) / 2 }));
    expect(thiefOf(flat).effects.flatUntil).toBeGreaterThan(flat.time);
    const cop = stepHazards(withCar(w, 'police', { ...policeOf(w), s: block.s + 0.5, x: (block.xFrom + block.xTo) / 2 }));
    expect(policeOf(cop).hp).toBe(policeOf(cop).maxHp);
  });

  it('removed with its spikes once the thief passed it', () => {
    let w = usePoliceSpecial(armed(), PRESS);
    const block = w.hazards.find((h) => h.kind === 'roadblock')!;
    w = withCar(w, 'thief', { ...thiefOf(w), s: block.s + block.length + I.roadblock.gone + 1, x: 4.5 });
    expect(stepHazards(w).hazards).toEqual([]);
  });

  it('the police AI uses it with the thief ahead (up to 150 m), even close; the thief AI goes around it more at level 10', () => {
    let w = armed();
    w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 20, x: thiefOf(w).x }); // close behind too (playtest)
    let used = false;
    for (let i = 0; i < 60 && !used; i++) {
      w = stepWorld(w, 'ai', DT);
      used = w.hazards.some((h) => h.kind === 'roadblock');
    }
    expect(used).toBe(true);
    const hits = (level: number) => {
      let n = 0;
      for (let k = 0; k < 30; k++) {
        let x = {
          ...createWorld({ seed: 400 + k, playerRole: 'police', traffic: false, curves: false }),
          level,
          time: (level - 1) * 45 + 0.01,
          nextBoxAt: 1e9,
        };
        x = withCar(x, 'thief', { ...thiefOf(x), s: 500, speed: 34 });
        x = withCar(x, 'police', { ...policeOf(x), s: 200 });
        const placed = placeRoadblock(x);
        if (!placed) continue;
        x = placed;
        for (let i = 0; i < 6 * 60; i++) x = stepWorld(x, NO_INTENTS, DT);
        if (thiefOf(x).hp < thiefOf(x).maxHp || thiefOf(x).effects.flatUntil > 0) n++;
      }
      return n;
    };
    expect(hits(10)).toBeLessThan(hits(1));
  });
});

describe('instant police items', () => {
  it('machine gun: a shot every 0.2 s at 40% damage for 4 s (6 s strong)', () => {
    const w = base();
    const p = applyItem(policeOf(w), 'machineGun', 0);
    expect(p.upgrades.mgUntil).toBe(I.machineGun.time);
    expect(applyItem(policeOf(w), 'machineGun', 0, { mode: 'survival', chaos: 3 }).upgrades.mgUntil).toBe(I.machineGun.timeStrong);
    let x = withCar(w, 'police', { ...p, s: 980, x: LANES[1] });
    let shots = 0;
    for (let i = 0; i < 60; i++) {
      x = fireWeapons({ ...x, time: i * DT, events: [] }, { police: { ...NO_INTENTS, fire: true }, thief: NO_INTENTS }, DT);
      shots += x.events.filter((e) => e.type === 'shot' && e.rapid).length;
    }
    expect(shots).toBeGreaterThanOrEqual(5);
    expect(x.projectiles[0]!.damage).toBeCloseTo(BALANCE.combat.policeDamage * I.machineGun.damageFactor, 5);
  });

  it('backup car: comes from behind next to the thief, hits its side (−6, pushed) at most once every 2 s, then leaves', () => {
    let w = base();
    w = withCar(w, 'police', applyItem({ ...policeOf(w), s: 900 }, 'wingman', 0));
    expect(policeOf(w).upgrades.wingmanUntil).toBe(I.wingman.time);
    let hits = 0;
    let seen = false;
    for (let i = 0; i < 12 * 60; i++) {
      w = stepWingman({ ...w, time: i * DT, events: [] }, DT);
      w = withCar(w, 'thief', { ...thiefOf(w), s: thiefOf(w).s + 34 * DT });
      seen ||= w.wingman !== null;
      hits += w.events.filter((e) => e.type === 'wingmanHit').length;
    }
    expect(seen).toBe(true);
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(hits).toBeLessThanOrEqual(Math.ceil(I.wingman.time / I.wingman.every));
    expect(thiefOf(w).maxHp - thiefOf(w).hp).toBeCloseTo(hits * I.wingman.damage);
    for (let i = 0; i < 40 * 60 && w.wingman; i++) {
      w = stepWingman({ ...w, time: 12 + i * DT, events: [] }, DT);
      w = withCar(w, 'thief', { ...thiefOf(w), s: thiefOf(w).s + 34 * DT });
      w = withCar(w, 'police', { ...policeOf(w), s: policeOf(w).s + 34 * DT });
    }
    expect(w.wingman).toBeNull();
    expect(applyItem(policeOf(base()), 'wingman', 0, { mode: 'survival', chaos: 4 }).upgrades.wingmanUntil).toBe(I.wingman.timeStrong);
  });

  it('end scenes clear the backup car and the roadblocks', () => {
    let w = usePoliceSpecial(armed(), PRESS);
    w = { ...w, wingman: { s: 990, x: 0, speed: 30, until: 99, nextHitAt: 99 } };
    w = withCar(w, 'thief', { ...thiefOf(w), hp: 0 });
    w = stepWorld(w, NO_INTENTS, DT);
    expect(w.match.arrestAt).toBeDefined();
    expect(w.wingman).toBeNull();
    expect(w.hazards).toEqual([]);
  });
});

describe('police items: edge cases (review)', () => {
  it('driving through the roadblock (playtest: it got stuck): one hit, then out the other side, never held', () => {
    let w = usePoliceSpecial(armed(), PRESS);
    const block = w.hazards.find((h) => h.kind === 'roadblock')!;
    const cx = (block.xFrom + block.xTo) / 2;
    w = withCar(w, 'thief', { ...thiefOf(w), s: block.s - 10, x: cx, speed: 30 });
    w = withCar(w, 'police', { ...policeOf(w), s: block.s - 300 });
    let hits = 0;
    for (let i = 0; i < 90; i++) {
      w = stepWorld(withCar(w, 'thief', { ...thiefOf(w), x: cx }), NO_INTENTS, DT);
      hits += w.events.filter((e) => e.type === 'roadblockHit').length;
    }
    expect(hits).toBe(1);
    expect(thiefOf(w).s).toBeGreaterThan(block.s + block.length + 10);
  });

  it('every lane and free count leaves exactly the free lanes open, with the car on the thief lane', () => {
    for (const free of [1, 2])
      for (let i = 0; i < 4; i++) {
        const { car, spikes } = roadblockLanes(i, free);
        expect(car).toBe(i);
        const blocked = new Set([car, ...spikes]);
        expect(blocked.size).toBe(4 - free);
        expect([...blocked].every((l) => l >= 0 && l < 4)).toBe(true);
        expect(Math.max(...blocked) - Math.min(...blocked)).toBe(blocked.size - 1); // next to each other
      }
  });

  const alongside = (thiefPatch: object) => {
    let w = base();
    w = withCar(w, 'police', applyItem({ ...policeOf(w), s: 900 }, 'wingman', 0));
    w = withCar(w, 'thief', { ...thiefOf(w), ...thiefPatch });
    const t = thiefOf(w);
    return { ...w, wingman: { s: t.s, x: t.x - 2 * BALANCE.car.halfWidth + 0.05, speed: t.speed, until: 8, nextHitAt: 0 } };
  };

  it('the backup car never hits a thief in the air, and never pushes it onto the curb', () => {
    const air = stepWingman(alongside({ airTime: 0.3 }), DT);
    expect(air.events.some((e) => e.type === 'wingmanHit')).toBe(false);
    const edge = stepWingman(alongside({ x: LANES[3] }), DT);
    expect(edge.events.some((e) => e.type === 'wingmanHit')).toBe(true);
    expect(thiefOf(edge).x).toBeLessThan(BALANCE.road.halfWidth - BALANCE.car.halfWidth - 0.3);
  });

  it('a second backup car picked while one is out keeps it longer; end scenes stop the police item timers', () => {
    let w: WorldState = alongside({});
    w = stepWingman(w, DT);
    w = withCar(w, 'police', { ...policeOf(w), upgrades: { ...policeOf(w).upgrades, wingmanUntil: 15 } });
    w = stepWingman(w, DT);
    expect(w.wingman!.until).toBe(15);
    let end = withCar(w, 'police', applyItem(applyItem(policeOf(w), 'machineGun', 0), 'wingman', 0));
    end = withCar(end, 'thief', { ...thiefOf(end), hp: 0 });
    end = stepWorld(end, NO_INTENTS, DT);
    expect(policeOf(end).upgrades).toMatchObject({ mgUntil: 0, wingmanUntil: 0 });
  });
});
