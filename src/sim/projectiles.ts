// Tiros com mira automática: nascem mirando a posição prevista do alvo, voam a 300 m/s e podem errar.
import { BALANCE, type Role } from '../config/balance';
import type { CarState } from './car';
import type { Intents } from './intents';
import { armorFactor, distanceFactor, inFireCone } from './rules';
import type { GameEvent, Projectile, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const HIT_MARGIN = 0.2;
const SUBSTEP = 1; // m — evita atravessar um carro (4,4 m) em um passo de 5 m

const other = (r: Role): Role => (r === 'police' ? 'thief' : 'police');
const carOf = (w: WorldState, r: Role) => (r === 'police' ? policeOf(w) : thiefOf(w));

function canShoot(car: CarState): boolean {
  if (!car.hasGun) return false;
  return car.role === 'police' || car.speed >= BALANCE.combat.thiefMinSpeedToFire;
}

export function fireWeapons(w: WorldState, intents: Record<Role, Intents>, dt: number): WorldState {
  let out = w;
  const events: GameEvent[] = [...w.events];
  const projectiles: Projectile[] = [...w.projectiles];
  const c = BALANCE.combat;

  for (const role of ['police', 'thief'] as Role[]) {
    let car = carOf(out, role);
    car = { ...car, fireCooldown: Math.max(0, car.fireCooldown - dt) };
    if (intents[role].fire && canShoot(car) && car.fireCooldown <= 0) {
      const target = carOf(out, other(role));
      const facing = role === 'police' ? 'front' : 'rear';
      if (inFireCone(car, target, facing)) {
        // mira com antecipação linear
        const dist = Math.hypot(target.s - car.s, target.x - car.x);
        const tFly = dist / c.projectileSpeed;
        const aimS = target.s + target.speed * tFly;
        const aimX = target.x;
        const len = Math.hypot(aimS - car.s, aimX - car.x) || 1;
        const d = Math.abs(target.s - car.s);
        const heli = role === 'police' && w.time < car.upgrades.heliUntil;
        const falloff = heli ? 1 : distanceFactor(d);
        const damage =
          role === 'police'
            ? c.policeDamage * car.upgrades.power * falloff * armorFactor(target.upgrades.plates)
            : c.thiefDamage * falloff;
        const piercing = role === 'police' && w.time < car.upgrades.pierceUntil;
        projectiles.push({
          from: role,
          s: car.s,
          x: car.x,
          vs: ((aimS - car.s) / len) * c.projectileSpeed,
          vx: ((aimX - car.x) / len) * c.projectileSpeed,
          travelled: 0,
          damage,
          piercing,
        });
        events.push({ type: 'shot', from: role, s: car.s, x: car.x });
        car = { ...car, fireCooldown: car.upgrades.fireInterval };
      } else {
        events.push({ type: 'noTarget', from: role });
      }
    }
    out = withCar(out, role, car);
  }
  return { ...out, projectiles, events };
}

export function stepProjectiles(w: WorldState, dt: number): WorldState {
  let out = w;
  const events: GameEvent[] = [...w.events];
  const alive: Projectile[] = [];
  const L2 = BALANCE.car.length / 2 + HIT_MARGIN;
  const W = BALANCE.car.halfWidth + HIT_MARGIN;

  for (const p of w.projectiles) {
    const target = carOf(out, other(p.from));
    const dist = Math.hypot(p.vs, p.vx) * dt;
    const n = Math.max(1, Math.ceil(dist / SUBSTEP));
    let { s, x } = p;
    let hit = false;
    let blocked = false;
    for (let i = 1; i <= n && !hit && !blocked; i++) {
      s = p.s + (p.vs * dt * i) / n;
      x = p.x + (p.vx * dt * i) / n;
      // o alvo também se move durante o passo; aproximação: posição atual
      if (Math.abs(s - target.s) <= L2 && Math.abs(x - target.x) <= W) hit = true;
      else if (!p.piercing && out.traffic.some((t) => Math.abs(s - t.s) <= L2 && Math.abs(x - t.x) <= W)) blocked = true;
    }
    if (blocked) {
      events.push({ type: 'blocked', s, x });
      continue;
    }
    if (hit) {
      out = withCar(out, target.role, { ...target, hp: Math.max(0, target.hp - p.damage) });
      events.push({ type: 'hit', target: target.role, amount: p.damage, s, x });
      continue;
    }
    const travelled = p.travelled + dist;
    if (travelled < BALANCE.combat.range) alive.push({ ...p, s, x, travelled });
  }
  return { ...out, projectiles: alive, events };
}
