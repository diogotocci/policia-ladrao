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
