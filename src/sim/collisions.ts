// Collisions with the scenery (road edges) and between police and thief, with 1 s immunity per pair.
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

  // scenery
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

  // game cars × traffic
  const Lh = BALANCE.car.length;
  const Wh = BALANCE.car.halfWidth;
  const traffic = [...out.traffic];
  for (const role of ['police', 'thief'] as Role[]) {
    let car = role === 'police' ? policeOf(out) : thiefOf(out);
    for (let i = 0; i < traffic.length; i++) {
      const t = traffic[i]!;
      const ds = t.s - car.s;
      const dx = t.x - car.x;
      if (Math.abs(ds) >= Lh || Math.abs(dx) >= 2 * Wh) continue;
      const key = `traffic:${role}`;
      if ((immunity[key] ?? 0) <= EPS) {
        car = slow(hurt(car, BALANCE.collision.scenery));
        immunity[key] = BALANCE.collision.immunity;
        events.push({ type: 'crash', a: role, b: 'traffic', s: (car.s + t.s) / 2, x: (car.x + t.x) / 2 });
        events.push({ type: 'hit', target: role, amount: BALANCE.collision.scenery, s: car.s, x: car.x });
        traffic[i] = { ...t, speed: t.speed * 0.9 };
      }
      if (Math.abs(dx) < Wh) {
        // head-on/rear: the game car ends up behind (or ahead of) the traffic
        car = { ...car, s: ds > 0 ? t.s - Lh : t.s + Lh };
      } else {
        const dir = Math.sign(dx) || 1;
        const x = t.x - dir * (2 * Wh + SEPARATION_SLACK);
        car = { ...car, x: Math.max(-(EDGE - 0.01), Math.min(EDGE - 0.01, x)) };
      }
    }
    out = withCar(out, role, car);
  }
  out = { ...out, traffic };

  // police × thief
  let police = policeOf(out);
  let thief = thiefOf(out);
  const L = BALANCE.car.length;
  const W = BALANCE.car.halfWidth;
  const ds = thief.s - police.s;
  const dx = thief.x - police.x;
  if (Math.abs(ds) < L && Math.abs(dx) < 2 * W) {
    if ((immunity.cars ?? 0) <= EPS) {
      const ram = police.upgrades.ramCharges > 0;
      const thiefDmg = (ram ? BALANCE.items.police.ramThief : BALANCE.collision.carCarThief) * armorFactor(thief.upgrades.plates);
      const policeDmg = ram ? BALANCE.items.police.ramPolice : BALANCE.collision.carCarPolice;
      if (ram) police = { ...police, upgrades: { ...police.upgrades, ramCharges: police.upgrades.ramCharges - 1 } };
      const C = BALANCE.collision;
      thief = { ...hurt(thief, thiefDmg), speed: thief.speed * (1 - C.carCarThiefSpeedLoss) };
      police = { ...hurt(police, policeDmg), speed: police.speed * (1 - C.carCarPoliceSpeedLoss) };
      out = { ...out, policeTurboOffUntil: w.time + C.policeTurboOff };
      immunity.cars = C.immunity;
      const s = (thief.s + police.s) / 2;
      const x = (thief.x + police.x) / 2;
      events.push({ type: 'crash', a: 'police', b: 'thief', s, x });
      events.push({ type: 'hit', target: 'thief', amount: thiefDmg, s, x });
      events.push({ type: 'hit', target: 'police', amount: policeDmg, s, x });
    }
    if (Math.abs(dx) < W) {
      // same lane: the police ends up 1 car length behind
      police = { ...police, s: thief.s - L };
    } else {
      // side by side: pushes apart laterally until they no longer overlap
      // separates slightly beyond 2W: with exactly 2W rounding leaves 1.7999… and the
      // no-overtake rule (which uses < 2W) would think they are in the same lane
      const push = (2 * W + SEPARATION_SLACK - Math.abs(dx)) / 2;
      const dir = Math.sign(dx) || 1;
      let tx = thief.x + dir * push;
      let px = police.x - dir * push;
      // if one hits the edge, the other absorbs the rest
      // 1 cm before the edge: a push doesn't become wall damage
      const LIM = EDGE - 0.01;
      if (Math.abs(tx) > LIM) {
        px -= dir * (Math.abs(tx) - LIM);
        tx = Math.sign(tx) * LIM;
      }
      if (Math.abs(px) > LIM) {
        tx += dir * (Math.abs(px) - LIM);
        px = Math.sign(px) * LIM;
      }
      thief = { ...thief, x: tx };
      police = { ...police, x: px };
    }
    out = withCar(withCar(out, 'police', police), 'thief', thief);
  }
  return out;
}
