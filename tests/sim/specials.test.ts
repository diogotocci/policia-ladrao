import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import type { CarState } from '../../src/sim/car';
import { NO_INTENTS } from '../../src/sim/intents';
import { addSpecial, stepHazards, useSpecial } from '../../src/sim/specials';
import type { SpecialKind } from '../../src/sim/types';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const I = BALANCE.items;
const PRESS = { ...NO_INTENTS, bomb: true };

const armed = (kind: SpecialKind, opts: Partial<WorldState> = {}, charges = 2): WorldState => {
  const w = { ...createWorld({ seed: 1, playerRole: 'thief', traffic: false, curves: false }), nextBoxAt: 1e9, ...opts };
  const t = thiefOf(w);
  return withCar(w, 'thief', { ...t, s: 500, upgrades: { ...t.upgrades, special: { kind, charges } } });
};

describe('special button (thief)', () => {
  it('same kind adds a charge (max 3), another kind replaces it', () => {
    let c: CarState = thiefOf(createWorld({ seed: 1, playerRole: 'thief' }));
    c = addSpecial(addSpecial(addSpecial(addSpecial(c, 'oil'), 'oil'), 'oil'), 'oil');
    expect(c.upgrades.special).toEqual({ kind: 'oil', charges: 3 });
    expect(addSpecial(c, 'smoke').upgrades.special).toEqual({ kind: 'smoke', charges: 1 });
  });

  it('pressing without charges does nothing; holding drops only one; the last charge empties the slot', () => {
    const none = withCar(armed('oil'), 'thief', {
      ...thiefOf(armed('oil')),
      upgrades: { ...thiefOf(armed('oil')).upgrades, special: null },
    });
    expect(useSpecial(none, PRESS)).toMatchObject({ hazards: [], bombs: [] });
    let w = armed('oil', {}, 1);
    for (let i = 0; i < 30; i++) w = useSpecial({ ...w, events: [] }, PRESS);
    expect(w.hazards).toHaveLength(1);
    expect(thiefOf(w).upgrades.special).toBeNull();
  });

  it('in the air it still drops behind the thief, as on the ground', () => {
    const w = armed('spikes');
    const air = withCar(w, 'thief', { ...thiefOf(w), airTime: 0.3 });
    const h = useSpecial(air, PRESS).hazards[0]!;
    expect(h.kind).toBe('spikes');
    expect(h.s + h.length).toBeCloseTo(thiefOf(w).s - I.spikes.dropBehind);
  });

  it('oil: one lane in Perseguição, two in Sobrevivência from chaos 3', () => {
    const one = useSpecial(armed('oil'), PRESS).hazards[0]!;
    expect(one.xTo - one.xFrom).toBeCloseTo(3);
    const two = useSpecial(armed('oil', { mode: 'survival', chaos: 3 }), PRESS).hazards[0]!;
    expect(two.xTo - two.xFrom).toBeCloseTo(6);
  });

  it('bomb: one lane in Perseguição; area bomb (2 lanes) in Sobrevivência from chaos 2', () => {
    expect(useSpecial(armed('bomb'), PRESS).bombs[0]!.x2).toBeUndefined();
    const big = useSpecial(armed('bomb', { mode: 'survival', chaos: 2 }), PRESS).bombs[0]!;
    expect(Math.abs(big.x2! - big.x)).toBeCloseTo(3);
    expect(Math.abs(big.x2!)).toBeLessThan(Math.abs(big.x) + 0.01); // the neighbor towards the center
  });

  it('smoke: 3 s (5 s when strong); police shots spread and the helicopter does not fire', () => {
    const w = useSpecial(armed('smoke'), PRESS);
    expect(thiefOf(w).effects.smokeUntil).toBeCloseTo(w.time + I.smoke.time);
    expect(thiefOf(useSpecial(armed('smoke', { mode: 'survival', chaos: 3 }), PRESS)).effects.smokeUntil).toBeCloseTo(I.smoke.timeStrong);
    // helicopter on, thief ahead and smoked: no air shot
    let h = withCar(w, 'police', {
      ...policeOf(w),
      s: thiefOf(w).s - 40,
      x: thiefOf(w).x,
      upgrades: { ...policeOf(w).upgrades, heliUntil: 99 },
    });
    let air = 0;
    for (let i = 0; i < 120; i++) {
      h = stepWorld(h, NO_INTENTS, DT);
      air += h.events.filter((e) => e.type === 'shot' && e.air).length;
    }
    expect(air).toBe(0);
  });
});

describe('oil and spikes on the road', () => {
  const onPolice = (kind: 'oil' | 'spikes', opts: Partial<WorldState> = {}) => {
    let w = useSpecial(armed(kind, opts), PRESS);
    const h = w.hazards[0]!;
    w = withCar(w, 'police', { ...policeOf(w), s: h.s + 1, x: (h.xFrom + h.xTo) / 2, speed: 30 });
    return stepHazards(w);
  };

  it('oil: the police skids for 1.5 s (half steering, a push) and loses speed, no damage', () => {
    const w = onPolice('oil');
    const p = policeOf(w);
    expect(p.effects.skidUntil).toBeCloseTo(w.time + I.oil.skidTime);
    expect(p.speed).toBeCloseTo(30 * (1 - I.oil.speedLoss));
    expect(p.hp).toBe(p.maxHp);
    expect(w.events.some((e) => e.type === 'oilSkid')).toBe(true);
  });

  it('spikes: flat tire for 4 s (6 s when strong), slower and pulled to one side, no damage', () => {
    const w = onPolice('spikes');
    expect(policeOf(w).effects.flatUntil).toBeCloseTo(w.time + I.spikes.flatTime);
    expect(policeOf(onPolice('spikes', { mode: 'survival', chaos: 3 })).effects.flatUntil).toBeCloseTo(I.spikes.flatTimeStrong);
    let f = withCar(w, 'police', { ...policeOf(w), x: 0 }); // middle of the road: room to be pulled either way
    const x0 = 0;
    for (let i = 0; i < 60; i++) f = stepWorld(f, NO_INTENTS, DT);
    expect(Math.abs(policeOf(f).x - x0)).toBeGreaterThan(0.5); // pulled
    expect(policeOf(f).speed).toBeLessThan(BALANCE.movement.cruise.police * I.spikes.speedFactor + 0.5);
  });

  it('the thief is never hit by its own oil or spikes; they expire after 15 s', () => {
    let w = useSpecial(armed('oil'), PRESS);
    const h = w.hazards[0]!;
    w = withCar(w, 'thief', { ...thiefOf(w), s: h.s + 1 });
    expect(thiefOf(stepHazards(w)).effects.skidUntil).toBe(0);
    expect(stepHazards({ ...w, time: w.time + I.oil.lifetime + 0.1 }).hazards).toHaveLength(0);
  });

  it('end scenes clear hazards, bombs and effects', () => {
    let w = onPolice('spikes');
    w = withCar(w, 'thief', { ...thiefOf(w), hp: 0.1 });
    w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 6, x: thiefOf(w).x, speed: 60 });
    for (let i = 0; i < 120 && w.match.arrestAt === undefined && w.match.escapeAt === undefined; i++)
      w = stepWorld(withCar(w, 'thief', { ...thiefOf(w), hp: 0 }), NO_INTENTS, DT);
    expect(w.hazards).toEqual([]);
    expect(w.bombs).toEqual([]);
    expect(policeOf(w).effects.flatUntil).toBe(0);
  });
});

describe('computer', () => {
  it('the police dodges oil and spikes more often at level 10 than at level 1', () => {
    const rate = (level: number) => {
      let hits = 0;
      for (let k = 0; k < 40; k++) {
        let w = {
          ...createWorld({ seed: 300 + k, playerRole: 'thief', traffic: false, curves: false }),
          level,
          time: (level - 1) * 45 + 0.01,
        };
        w = { ...w, boxes: [], nextBoxAt: 1e9 };
        const p = { ...policeOf(w), speed: 33 };
        w = withCar(w, 'police', p);
        w = withCar(w, 'thief', { ...thiefOf(w), s: p.s + 300, x: p.x + 3, speed: 33 });
        w = {
          ...w,
          hazards: [{ id: 1, kind: 'spikes', s: p.s + 70, length: 2, xFrom: p.x - 1.5, xTo: p.x + 1.5, expiresAt: 99 }],
          nextHazardId: 2,
        };
        for (let i = 0; i < 180; i++) w = stepWorld(w, 'ai', DT);
        if (policeOf(w).effects.flatUntil > 0) hits++;
      }
      return hits / 40;
    };
    expect(rate(1)).toBeGreaterThan(rate(10));
  });

  it('the thief uses oil with the police lined up 30-80 m behind, and smoke when it is being hit', () => {
    let w = armed('oil');
    w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 50, x: thiefOf(w).x, speed: 34 });
    let used = false;
    for (let i = 0; i < 120 && !used; i++) {
      w = stepWorld(w, 'ai', DT);
      used = w.events.some((e) => e.type === 'special' && e.kind === 'oil');
    }
    expect(used).toBe(true);
    let s = armed('smoke');
    s = withCar(s, 'police', { ...policeOf(s), s: thiefOf(s).s - 20, x: thiefOf(s).x + 6 });
    s = stepWorld(s, 'ai', DT);
    s = withCar(s, 'thief', { ...thiefOf(s), hp: thiefOf(s).hp - 5 });
    let smoke = false;
    for (let i = 0; i < 30 && !smoke; i++) {
      s = stepWorld(s, 'ai', DT);
      smoke = s.events.some((e) => e.type === 'special' && e.kind === 'smoke');
    }
    expect(smoke).toBe(true);
  });
});
