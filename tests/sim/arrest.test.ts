import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const FIRE = { ...NO_INTENTS, fire: true, right: true };

/** polícia a 20 m de um ladrão quase destruído, os dois em cruzeiro, sem tráfego */
const almost = (): WorldState => {
  const w0 = createWorld({ seed: 5, playerRole: 'police', traffic: false, curves: false });
  const w = withCar(w0, 'thief', { ...thiefOf(w0), s: 1000, x: 1.5, speed: 34, hp: 0.5 });
  return withCar(w, 'police', { ...policeOf(w), s: 980, x: 1.5, speed: 34 });
};

describe('arrest scene: when the police wins, the wrecked thief stops, the police pulls up, then the match ends', () => {
  it('the thief at 0 starts the scene (event), the match is not over yet', () => {
    let w = almost();
    for (let i = 0; i < 600 && w.match.arrestAt === undefined; i++) w = stepWorld(w, FIRE, DT);
    expect(w.match.arrestAt).toBeDefined();
    expect(w.match.over).toBe(false);
    expect(w.events.some((e) => e.type === 'arrest')).toBe(true);
    expect(w.projectiles).toHaveLength(0);
  });

  it('during the scene: the thief stops, the police pulls up right behind it in the next lane (the camera sees the wreck), controls and combat off', () => {
    let w = almost();
    while (w.match.arrestAt === undefined) w = stepWorld(w, FIRE, DT);
    const hp = policeOf(w).hp;
    let minGap = Infinity;
    while (!w.match.over) {
      w = stepWorld(w, FIRE, DT);
      expect(w.events.some((e) => e.type === 'shot' || e.type === 'hit' || e.type === 'crash')).toBe(false);
      minGap = Math.min(minGap, thiefOf(w).s - policeOf(w).s);
      const touching = Math.abs(thiefOf(w).x - policeOf(w).x) < 2 * BALANCE.car.halfWidth && thiefOf(w).s - policeOf(w).s < BALANCE.car.length;
      expect(touching).toBe(false);
    }
    expect(thiefOf(w).speed).toBe(0);
    expect(policeOf(w).speed).toBeLessThan(1);
    const gap = thiefOf(w).s - policeOf(w).s;
    expect(gap).toBeGreaterThan(2); // logo atrás…
    expect(gap).toBeLessThan(9);
    expect(Math.abs(Math.abs(policeOf(w).x - thiefOf(w).x) - BALANCE.match.arrestSide)).toBeLessThan(0.3); // …na faixa ao lado
    expect(minGap).toBeGreaterThan(0); // nunca passa à frente
    expect(policeOf(w).hp).toBe(hp);
  });

  it('ends after the scene: police wins, reason thiefDown, the time is when the thief was destroyed', () => {
    let w = almost();
    while (w.match.arrestAt === undefined) w = stepWorld(w, FIRE, DT);
    const at = w.match.arrestAt!;
    while (!w.match.over) w = stepWorld(w, FIRE, DT);
    expect(w.match).toMatchObject({ over: true, winner: 'police', reason: 'thiefDown', endTime: at });
    expect(w.time).toBeGreaterThanOrEqual(at + BALANCE.match.arrestScene - 1e-6);
    expect(w.events).toContainEqual({ type: 'end', winner: 'police' });
  });

  it('the scene does not let the escape time take over (a thief destroyed at 1:29 is still caught)', () => {
    let w = { ...almost(), time: BALANCE.match.escapeTime - 0.3 };
    while (!w.match.over) w = stepWorld(w, FIRE, DT);
    expect(w.match.winner).toBe('police');
    expect(w.match.escapeAt).toBeUndefined();
  });
});
