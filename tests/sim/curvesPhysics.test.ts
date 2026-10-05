import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { createCar, stepCar, type CarState } from '../../src/sim/car';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';

const DT = 1 / 60;
const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
/** dirige `seconds` numa curva de raio r (dir 1 = direita) com as intenções dadas */
const drive = (car: CarState, r: number, dir: 1 | -1, intents: Partial<Intents>, seconds: number) => {
  let c = car;
  let touched = false;
  let skid = false;
  for (let i = 0; i < seconds * 60; i++) {
    c = stepCar(c, { ...NO_INTENTS, ...intents }, DT, { curvature: dir / r });
    touched ||= c.touchingEdge;
    skid ||= c.skidding;
  }
  return { c, touched, skid };
};
const atSpeed = (v: number, lane: 0 | 1 | 2 | 3 = 1) => ({ ...createCar('thief', lane, 500), speed: v });

describe('cornering', () => {
  it('straight road: curvature 0 changes nothing', () => {
    const a = stepCar(atSpeed(34), NO_INTENTS, DT);
    const b = stepCar(atSpeed(34), NO_INTENTS, DT, { curvature: 0 });
    expect(b).toEqual(a);
    expect(b.skidding).toBe(false);
  });

  it('the car drifts to the outside of the curve (right curve → towards −x)', () => {
    const { c } = drive(atSpeed(34, 2), 400, 1, {}, 1);
    expect(c.x).toBeLessThan(atSpeed(34, 2).x);
    const { c: l } = drive(atSpeed(34, 1), 400, -1, {}, 1);
    expect(l.x).toBeGreaterThan(atSpeed(34, 1).x);
  });

  it('gentle curve (r 400) at cruise: holding ◀/▶ to the inside keeps the car off the curb, no skid', () => {
    const r = drive(atSpeed(34, 2), 400, 1, { right: true }, 6);
    expect(r.touched && r.c.x < 0).toBe(false); // nunca encosta no meio-fio de fora
    expect(r.skid).toBe(false);
  });

  it('sharp curve (r 120) at 34 m/s: skids out to the curb even steering inside', () => {
    const r = drive(atSpeed(34, 2), 120, 1, { right: true }, 3);
    expect(r.skid).toBe(true);
    expect(r.touched).toBe(true);
    expect(r.c.x).toBeCloseTo(-EDGE, 5); // borda de fora
  });

  it('the same sharp curve braking to ~25 m/s first: clean, no skid, no curb', () => {
    let c = atSpeed(34, 2);
    for (let i = 0; i < 30 && c.speed > 25; i++) c = stepCar(c, { ...NO_INTENTS, brake: true }, DT);
    // segura a velocidade (soltar o freio volta a acelerar; aqui alterna como um jogador faria)
    let touched = false;
    let skid = false;
    for (let i = 0; i < 180; i++) {
      c = stepCar(c, { ...NO_INTENTS, right: true, brake: c.speed > 25 }, DT, { curvature: 1 / 120 });
      touched ||= c.touchingEdge && c.x < 0;
      skid ||= c.skidding;
    }
    expect(skid).toBe(false);
    expect(touched).toBe(false);
  });

  it('skidding: steering is worth only half', () => {
    const grip = BALANCE.curves.grip;
    const v = Math.sqrt(((grip + 2) * 120)); // acima da aderência
    const base = { ...atSpeed(v, 1), x: 0 };
    const none = stepCar(base, NO_INTENTS, DT, { curvature: 1 / 120 });
    const steer = stepCar(base, { ...NO_INTENTS, right: true }, DT, { curvature: 1 / 120 });
    expect(steer.x - none.x).toBeCloseTo(BALANCE.movement.lateralSpeed * BALANCE.curves.skidSteer * DT, 6);
    expect(none.skidding).toBe(true);
  });
});

import { curvesBetween } from '../../src/sim/curves';
import { createWorld, stepWorld, thiefOf, policeOf, withCar } from '../../src/sim/world';

describe('cornering in the world', () => {
  it('a thief entering a sharp curve at full speed skids (event) and hits the curb (−5); with curves=0 nothing happens', () => {
    const seed = 3;
    const sharp = curvesBetween(seed, 0, 30000).find((c) => c.sharp)!;
    const setup = (curves: boolean) => {
      const w0 = createWorld({ seed, playerRole: 'thief', traffic: false, curves });
      const t = { ...thiefOf(w0), s: sharp.start + sharp.length * 0.3, speed: 34 };
      return withCar(withCar(w0, 'thief', t), 'police', { ...policeOf(w0), s: t.s - 200 });
    };
    let w = setup(true);
    const events: string[] = [];
    for (let i = 0; i < 120; i++) {
      w = stepWorld(w, { left: false, right: false, brake: false, fire: false, bomb: false }, DT);
      events.push(...w.events.filter((e) => e.type === 'skid' || (e.type === 'crash' && e.b === 'scenery')).map((e) => e.type));
    }
    expect(events).toContain('skid');
    expect(events).toContain('crash');
    expect(thiefOf(w).hp).toBeLessThanOrEqual(95);
    let flat = setup(false);
    for (let i = 0; i < 120; i++) flat = stepWorld(flat, { left: false, right: false, brake: false, fire: false, bomb: false }, DT);
    expect(thiefOf(flat).hp).toBe(100);
    expect(flat.curvesOn).toBe(false);
  });
});
