import { describe, expect, it } from 'vitest';
import { BALANCE, type Role } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const isRam = (e: WorldState['events'][number]) =>
  e.type === 'crash' && ((e.a === 'police' && e.b === 'thief') || (e.a === 'thief' && e.b === 'police'));

describe('police AI rams the thief (pressure for whoever plays thief)', () => {
  it('close behind and lined up, a skilled police AI charges and hits within seconds', () => {
    const w0 = createWorld({ seed: 2, playerRole: 'thief', traffic: false, curves: false });
    let w = withCar(w0, 'thief', { ...thiefOf(w0), s: 600, x: 1.5, speed: 34 });
    w = withCar(w, 'police', { ...policeOf(w), s: 580, x: 1.5, speed: 34 });
    w = { ...w, level: 10, time: 30 };
    let hit = false;
    for (let i = 0; i < 60 * 15 && !hit; i++) {
      w = stepWorld(w, NO_INTENTS, DT); // ladrão (jogador) só segue reto
      hit = w.events.some(isRam);
    }
    expect(hit).toBe(true);
  });

  it('after hitting, the usual penalty applies: the police drops back (no charging while the turbo is off)', () => {
    const w0 = createWorld({ seed: 2, playerRole: 'thief', traffic: false, curves: false });
    let w = withCar(w0, 'thief', { ...thiefOf(w0), s: 600, x: 1.5, speed: 34 });
    w = withCar(w, 'police', { ...policeOf(w), s: 580, x: 1.5, speed: 34 });
    w = { ...w, level: 10, time: 30 };
    while (!w.events.some(isRam)) w = stepWorld(w, NO_INTENTS, DT);
    const off = w.policeTurboOffUntil;
    let gapMax = 0;
    while (w.time < off - 0.1) {
      w = stepWorld(w, NO_INTENTS, DT);
      gapMax = Math.max(gapMax, thiefOf(w).s - policeOf(w).s);
    }
    expect(gapMax).toBeGreaterThan(15); // o ladrão escapa
  });

  it('AI vs AI: the police rams more often than before (≥ 1.0 per match on average; before ~0.6) and the thief still wins 30–70%', () => {
    let rams = 0;
    let thief = 0;
    let n = 0;
    for (const role of ['police', 'thief'] as Role[])
      for (let seed = 1; seed <= 20; seed++) {
        let w = createWorld({ seed, playerRole: role });
        for (let i = 0; i < 95 * 60 && !w.match.over; i++) {
          w = stepWorld(w, 'ai', DT);
          if (w.events.some(isRam)) rams++;
        }
        n++;
        if (w.match.winner === 'thief') thief++;
      }
    expect(rams / n).toBeGreaterThanOrEqual(1.0);
    expect(thief / n).toBeGreaterThanOrEqual(0.3);
    expect(thief / n).toBeLessThanOrEqual(0.7);
  }, 120000);

  it('a police played by a person never gets the AI charge', () => {
    expect(BALANCE.ai.ramBoost).toBeGreaterThan(0);
    const w0 = createWorld({ seed: 2, playerRole: 'police', traffic: false, curves: false });
    let w = withCar(w0, 'thief', { ...thiefOf(w0), s: 600, x: 1.5, speed: 34 });
    w = withCar(w, 'police', { ...policeOf(w), s: 580, x: 1.5, speed: 34 });
    w = { ...w, level: 10, time: 30 };
    let maxSpeed = 0;
    for (let i = 0; i < 60 * 3; i++) {
      w = stepWorld(w, NO_INTENTS, DT);
      maxSpeed = Math.max(maxSpeed, policeOf(w).speed);
    }
    expect(maxSpeed).toBeLessThanOrEqual(BALANCE.movement.cruise.police * (1 + BALANCE.catchUp.maxBonus) + 1e-6);
    expect(w.ai.police.ramUntil).toBe(0);
  });
});

import { aiStep, initialAiMemory } from '../../src/sim/ai';
import { createRng } from '../../src/sim/rng';
describe('ram safety', () => {
  it('a charge is called off when a traffic car shows up in the lane ahead (danger beats the ram)', () => {
    const w0 = createWorld({ seed: 2, playerRole: 'thief', traffic: false, curves: false });
    let w = withCar(w0, 'thief', { ...thiefOf(w0), s: 600, x: 1.5, speed: 34 });
    w = withCar(w, 'police', { ...policeOf(w), s: 580, x: 1.5, speed: 34 });
    w = { ...w, level: 10, time: 30, traffic: [{ id: 1, s: 592, x: 1.5, speed: 20, targetX: 1.5, model: 0 }] };
    const mem = { ...initialAiMemory('police', w), ramUntil: 32, nextDecisionAt: 99 };
    const r = aiStep(w, 'police', createRng(1), mem);
    expect(r.memory.ramUntil).toBe(0);
    expect(Math.abs(r.memory.targetX - 1.5)).toBeGreaterThan(1); // sai da faixa bloqueada
  });
});
