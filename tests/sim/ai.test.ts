import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { aiStep, initialAiMemory, type AiMemory } from '../../src/sim/ai';
import { stepCar } from '../../src/sim/car';
import { createRng } from '../../src/sim/rng';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;

const setup = (thief: Partial<ReturnType<typeof thiefOf>>, police: Partial<ReturnType<typeof policeOf>>, level = 1) => {
  const w = createWorld({ seed: 1, playerRole: 'police' });
  return { ...withCar(withCar(w, 'thief', { ...thiefOf(w), ...thief }), 'police', { ...policeOf(w), ...police }), level };
};

/** só o ladrão IA dirige; a polícia anda junto, alinhada atrás */
function timeToFirstLaneChange(seed: number, level: number): number {
  let w: WorldState = setup({ s: 40, x: 1.5, speed: 33 }, { s: 20, x: 1.5, speed: 33 }, level);
  const rng = createRng(seed);
  let mem: AiMemory = initialAiMemory('thief', w);
  for (let i = 0; i < 600; i++) {
    const r = aiStep(w, 'thief', rng, mem);
    mem = r.memory;
    const thief = stepCar(thiefOf(w), r.intents, DT);
    w = withCar(withCar(w, 'thief', thief), 'police', { ...policeOf(w), s: thief.s - 20, x: 1.5 });
    w = { ...w, time: w.time + DT };
    if (Math.abs(thiefOf(w).x - 1.5) > 2) return w.time;
  }
  return Infinity;
}

describe('police AI', () => {
  it('fires when the thief is ahead', () => {
    const w = setup({ s: 60, x: 1.5 }, { s: 20, x: 1.5 });
    const r = aiStep(w, 'police', createRng(1), initialAiMemory('police', w));
    expect(r.intents.fire).toBe(true);
  });

  it('never steers further into the edge', () => {
    const w = setup({ s: 60, x: EDGE }, { s: 20, x: 5.5 });
    let mem = initialAiMemory('police', w);
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const r = aiStep({ ...w, time: i * DT }, 'police', rng, mem);
      mem = r.memory;
      expect(r.intents.right).toBe(false);
    }
  });
});

describe('thief AI', () => {
  it('changes lane within 3 s when the police is lined up behind', () => {
    for (const seed of [1, 2, 3, 4, 5]) expect(timeToFirstLaneChange(seed, 1)).toBeLessThan(3);
  });

  it('is deterministic for the same seed', () => {
    const w = setup({ s: 40, x: 1.5 }, { s: 20, x: 1.5 });
    const run = () => {
      const rng = createRng(9);
      let mem = initialAiMemory('thief', w);
      const out: string[] = [];
      for (let i = 0; i < 300; i++) {
        const r = aiStep({ ...w, time: i * DT }, 'thief', rng, mem);
        mem = r.memory;
        out.push(JSON.stringify(r.intents));
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('reacts faster at level 10 than at level 1 (mean of 20 seeds)', () => {
    const mean = (level: number) => {
      let sum = 0;
      for (let seed = 1; seed <= 20; seed++) sum += timeToFirstLaneChange(seed, level);
      return sum / 20;
    };
    expect(mean(10)).toBeLessThan(mean(1));
  });
});

// ---------- entrega 3: o mundo ----------
import { NO_INTENTS as NONE } from '../../src/sim/intents';
import { stepWorld } from '../../src/sim/world';
import { bumpXRange, bumpsBetween, stepJump } from '../../src/sim/track';

describe('AI uses the world', () => {
  it('steers around a stopped traffic car ahead (no crash in 5 s)', () => {
    let w = createWorld({ seed: 2, playerRole: 'police' });
    const t = thiefOf(w);
    w = { ...w, traffic: [{ id: 500, s: t.s + 60, x: t.x, speed: 0, targetX: t.x, model: 0 }], nextTrafficId: 501 };
    let crashes = 0;
    for (let i = 0; i < 300; i++) {
      w = stepWorld(w, NONE, DT);
      crashes += w.events.filter((e) => e.type === 'crash' && e.a === 'thief' && e.b === 'traffic').length;
    }
    expect(crashes).toBe(0);
  });

  /** fração dos quebra-molas (na faixa do ladrão 60 m antes) que ele evitou */
  function bumpDodgeRate(level: number): number {
    const seed = 11;
    let w = { ...createWorld({ seed, playerRole: 'police' }), level };
    // polícia longe, em outra faixa: o ladrão não está fugindo de ninguém
    w = withCar(w, 'police', { ...policeOf(w), s: -1e6, x: -4.5 });
    let mem = w.ai.thief;
    const rng = createRng(77);
    const bumps = bumpsBetween(seed, 150, 40000);
    let judged = 0;
    let dodged = 0;
    let bi = 0;
    let decided: { s: number; inLane: boolean; jumped: boolean } | null = null;
    while (bi < bumps.length && judged < 100) {
      const b = bumps[bi]!;
      const thief = thiefOf(w);
      if (!decided && b.s - thief.s <= 60) {
        const [a, z] = bumpXRange(b);
        decided = { s: b.s, inLane: thief.x + 0.9 > a && thief.x - 0.9 < z, jumped: false };
      }
      const r = aiStep(w, 'thief', rng, mem);
      mem = r.memory;
      const next = stepJump(stepCar(thief, r.intents, DT), thief.s, seed, DT);
      if (decided && next.airTime > 0 && thief.airTime === 0) decided.jumped = true;
      w = { ...withCar(w, 'thief', next), time: w.time + DT };
      if (thiefOf(w).s > b.s + 5) {
        if (decided?.inLane) {
          judged++;
          if (!decided.jumped) dodged++;
        }
        decided = null;
        bi++;
      }
    }
    return dodged / judged;
  }

  it('dodges ≥ 90% of bumps at level 10 and 30–70% at level 1', () => {
    expect(bumpDodgeRate(10)).toBeGreaterThanOrEqual(0.9);
    const easy = bumpDodgeRate(1);
    expect(easy).toBeGreaterThanOrEqual(0.3);
    expect(easy).toBeLessThanOrEqual(0.7);
  });

  it('police AI (level 10) steers around a bomb in its lane', () => {
    let w = { ...createWorld({ seed: 3, playerRole: 'thief' }), time: 270.01, level: 10 };
    const p = policeOf(w);
    const t = thiefOf(w);
    w = withCar(w, 'thief', { ...t, x: p.x, s: p.s + 120 });
    w = { ...w, bombs: [{ id: 1, s: p.s + 45, x: p.x, expiresAt: w.time + 20 }], traffic: [] };
    for (let i = 0; i < 240; i++) w = stepWorld(w, NONE, DT);
    expect(policeOf(w).hp).toBe(100);
  });

  it('thief AI goes for a red box in the next lane', () => {
    let w = createWorld({ seed: 4, playerRole: 'police' });
    const t = thiefOf(w);
    w = withCar(w, 'thief', { ...t, speed: 33 });
    w = withCar(w, 'police', { ...policeOf(w), s: t.s - 200, x: -4.5 });
    w = { ...w, boxes: [{ id: 1, s: t.s + 80, x: t.x - 3, color: 'red' }], nextBoxAt: 1e9, traffic: [] };
    let got = false;
    for (let i = 0; i < 240 && !got; i++) {
      w = stepWorld(w, NONE, DT);
      got = w.events.some((e) => e.type === 'pickup' && e.role === 'thief');
    }
    expect(got).toBe(true);
  });

  it('thief AI with a bomb drops it within 3 s when the police is lined up behind', () => {
    let w = createWorld({ seed: 5, playerRole: 'police' });
    const t = thiefOf(w);
    w = withCar(w, 'thief', { ...t, upgrades: { ...t.upgrades, bombs: 1 } });
    w = withCar(w, 'police', { ...policeOf(w), s: t.s - 30, x: t.x });
    let dropped = false;
    for (let i = 0; i < 180 && !dropped; i++) {
      w = stepWorld(w, NONE, DT);
      dropped = w.events.some((e) => e.type === 'bombDropped');
    }
    expect(dropped).toBe(true);
  });
});

describe('bombs vs AI (review fixes)', () => {
  /** fração de bombas na faixa da polícia IA que ela atropela */
  function bombHitRate(level: number): number {
    let hits = 0;
    const N = 60;
    for (let k = 0; k < N; k++) {
      // stepWorld recalcula o nível pelo tempo: começa no tempo daquele nível
      let w = { ...createWorld({ seed: 100 + k, playerRole: 'thief', traffic: false }), level, time: (level - 1) * 30 + 0.01 };
      const p = { ...policeOf(w), speed: 33 };
      w = withCar(w, 'police', p);
      w = withCar(w, 'thief', { ...thiefOf(w), s: p.s + 300, x: p.x, speed: 33 });
      w = { ...w, bombs: [{ id: 1, s: p.s + 70, x: p.x, expiresAt: w.time + 20 }], boxes: [], nextBoxAt: 1e9 };
      for (let i = 0; i < 180; i++) w = stepWorld(w, NONE, DT);
      if (w.events.length >= 0 && policeOf(w).hp <= 90) hits++;
    }
    return hits / N;
  }

  it('police AI runs over a fair share of bombs at level 1 and few at level 10', () => {
    expect(bombHitRate(1)).toBeGreaterThanOrEqual(0.3);
    expect(bombHitRate(10)).toBeLessThanOrEqual(0.2);
  });

  it('thief AI drops a bomb when the police is lined up 90 m behind', () => {
    let w = createWorld({ seed: 5, playerRole: 'police', traffic: false });
    const t = { ...thiefOf(w), speed: 34 };
    w = withCar(w, 'thief', { ...t, upgrades: { ...t.upgrades, bombs: 1 } });
    w = withCar(w, 'police', { ...policeOf(w), s: t.s - 90, x: t.x, speed: 33 });
    let dropped = false;
    for (let i = 0; i < 180 && !dropped; i++) {
      w = stepWorld(w, NONE, DT);
      dropped = w.events.some((e) => e.type === 'bombDropped');
    }
    expect(dropped).toBe(true);
  });
});
