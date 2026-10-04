// Colisões com o cenário (bordas da pista) e entre polícia e ladrão, com imunidade de 1 s por par.
import { BALANCE, type Role } from '../config/balance';
import type { CarState } from './car';
import { armorFactor } from './rules';
import type { GameEvent, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
const EPS = 1e-9;
const SEPARATION_SLACK = 0.02; // m

const hurt = (car: CarState, amount: number): CarState => ({ ...car, hp: Math.max(0, car.hp - amount) });
const slow = (car: CarState): CarState => ({ ...car, speed: car.speed * (1 - BALANCE.collision.speedLoss) });

export function resolveCollisions(w: WorldState, dt: number): WorldState {
  const immunity: Record<string, number> = {};
  for (const [k, v] of Object.entries(w.immunity)) if (v - dt > EPS) immunity[k] = v - dt;
  const events: GameEvent[] = [...w.events];
  let out: WorldState = { ...w, immunity, events };

  // cenário
  for (const role of ['police', 'thief'] as Role[]) {
    const car = role === 'police' ? policeOf(out) : thiefOf(out);
    const key = `edge:${role}`;
    if (!car.touchingEdge || (immunity[key] ?? 0) > EPS) continue;
    const side = Math.sign(car.x) || 1;
    const hit = slow(hurt({ ...car, x: side * (EDGE - BALANCE.collision.pushBack), touchingEdge: false }, BALANCE.collision.scenery));
    immunity[key] = BALANCE.collision.immunity;
    events.push({ type: 'crash', a: role, b: 'scenery', s: car.s, x: side * BALANCE.road.halfWidth });
    events.push({ type: 'hit', target: role, amount: BALANCE.collision.scenery, s: car.s, x: car.x });
    out = withCar(out, role, hit);
  }

  // polícia × ladrão
  let police = policeOf(out);
  let thief = thiefOf(out);
  const L = BALANCE.car.length;
  const W = BALANCE.car.halfWidth;
  const ds = thief.s - police.s;
  const dx = thief.x - police.x;
  if (Math.abs(ds) < L && Math.abs(dx) < 2 * W) {
    if ((immunity.cars ?? 0) <= EPS) {
      const thiefDmg = BALANCE.collision.carCarThief * armorFactor(0);
      const policeDmg = BALANCE.collision.carCarPolice;
      thief = slow(hurt(thief, thiefDmg));
      police = slow(hurt(police, policeDmg));
      immunity.cars = BALANCE.collision.immunity;
      const s = (thief.s + police.s) / 2;
      const x = (thief.x + police.x) / 2;
      events.push({ type: 'crash', a: 'police', b: 'thief', s, x });
      events.push({ type: 'hit', target: 'thief', amount: thiefDmg, s, x });
      events.push({ type: 'hit', target: 'police', amount: policeDmg, s, x });
    }
    if (Math.abs(dx) < W) {
      // mesma faixa: a polícia fica 1 comprimento atrás
      police = { ...police, s: thief.s - L };
    } else {
      // lado a lado: afasta lateralmente até não sobrepor
      // separa um pouco além de 2W: com exatamente 2W o arredondamento deixa 1,7999… e a regra de
      // não-ultrapassar (que usa < 2W) acharia que estão na mesma faixa
      const push = (2 * W + SEPARATION_SLACK - Math.abs(dx)) / 2;
      const dir = Math.sign(dx) || 1;
      let tx = thief.x + dir * push;
      let px = police.x - dir * push;
      // se um bater na borda, o outro absorve o resto
      if (Math.abs(tx) > EDGE) {
        px -= dir * (Math.abs(tx) - EDGE);
        tx = Math.sign(tx) * EDGE;
      }
      if (Math.abs(px) > EDGE) {
        tx += dir * (Math.abs(px) - EDGE);
        px = Math.sign(px) * EDGE;
      }
      thief = { ...thief, x: tx };
      police = { ...police, x: px };
    }
    out = withCar(withCar(out, 'police', police), 'thief', thief);
  }
  return out;
}
