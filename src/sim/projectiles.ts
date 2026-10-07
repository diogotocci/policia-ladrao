// Auto-aimed shots: aim at the target's predicted position (forward motion only, not lateral drift) and can miss.
// The police's flies at 150 m/s: a thief zigzagging from afar escapes.
import { BALANCE, type Role } from '../config/balance';
import { hurt, scaledDamage } from './chaos';
import type { CarState } from './car';
import type { Intents } from './intents';
import { armorFactor, distanceFactor, inFireCone } from './rules';
import { createRngFromState } from './rng';
import type { GameEvent, Projectile, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const HIT_MARGIN = 0.2;
const SUBSTEP = 1; // m — avoids passing through a car (4.4 m) in a 5 m step

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
  // the thief's smoke (V2 part 3): police shots spread up to ±12° and the helicopter does not fire
  const smoke = w.time < thiefOf(w).effects.smokeUntil;
  const rng = createRngFromState(w.itemRng);
  const spread = (vs: number, vx: number): [number, number] => {
    if (!smoke) return [vs, vx];
    const a = ((rng.next() * 2 - 1) * BALANCE.items.smoke.spreadDeg * Math.PI) / 180;
    return [vs * Math.cos(a) - vx * Math.sin(a), vs * Math.sin(a) + vx * Math.cos(a)];
  };

  for (const role of ['police', 'thief'] as Role[]) {
    let car = carOf(out, role);
    car = { ...car, fireCooldown: Math.max(0, car.fireCooldown - dt) };
    if (intents[role].fire && canShoot(car) && car.fireCooldown <= 0) {
      const target = carOf(out, other(role));
      const facing = role === 'police' ? 'front' : 'rear';
      if (inFireCone(car, target, facing)) {
        // aims with linear lead
        const dist = Math.hypot(target.s - car.s, target.x - car.x);
        const speed = role === 'police' ? c.policeProjectileSpeed : c.projectileSpeed;
        const tFly = dist / speed;
        const aimS = target.s + target.speed * tFly;
        const aimX = target.x;
        const len = Math.hypot(aimS - car.s, aimX - car.x) || 1;
        const d = Math.abs(target.s - car.s);
        const falloff = distanceFactor(d);
        const damage =
          role === 'police' ? c.policeDamage * car.upgrades.power * falloff * armorFactor(target.upgrades.plates) : c.thiefDamage * falloff;
        const piercing = role === 'police' && w.time < car.upgrades.pierceUntil;
        const [vs, vx] =
          role === 'police'
            ? spread(((aimS - car.s) / len) * speed, ((aimX - car.x) / len) * speed)
            : [((aimS - car.s) / len) * speed, ((aimX - car.x) / len) * speed];
        projectiles.push({
          from: role,
          s: car.s,
          x: car.x,
          vs,
          vx,
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

  // helicopter: extra police weapon, shoots on its own from above (full damage up to 70 m ahead, no cone)
  let police = carOf(out, 'police');
  if (w.time < police.upgrades.heliUntil) {
    police = { ...police, heliCooldown: Math.max(0, police.heliCooldown - dt) };
    const target = carOf(out, 'thief');
    const ahead = target.s - police.s;
    if (police.heliCooldown <= 0 && ahead > 0 && ahead < c.falloffEnd && !smoke) {
      const dist = Math.hypot(ahead, target.x - police.x);
      const speed = c.policeProjectileSpeed;
      const aimS = target.s + target.speed * (dist / speed);
      const len = Math.hypot(aimS - police.s, target.x - police.x) || 1;
      projectiles.push({
        from: 'police',
        s: police.s,
        x: police.x,
        vs: ((aimS - police.s) / len) * speed,
        vx: ((target.x - police.x) / len) * speed,
        travelled: 0,
        damage: c.policeDamage * police.upgrades.power * armorFactor(target.upgrades.plates),
        piercing: w.time < police.upgrades.pierceUntil,
        air: dist,
      });
      events.push({ type: 'shot', from: 'police', s: police.s, x: police.x, air: true });
      const P = BALANCE.items.police;
      police = {
        ...police,
        heliCooldown: w.playerRole === 'police' ? P.heliFireInterval : BALANCE.difficulties[w.difficulty].heliFireIntervalAi,
      };
    }
    out = withCar(out, 'police', police);
  } else if (police.heliCooldown !== 0) out = withCar(out, 'police', { ...police, heliCooldown: 0 });
  return { ...out, projectiles, events, itemRng: smoke ? rng.state() : w.itemRng };
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
      // the target also moves during the step; approximation: current position
      if (Math.abs(s - target.s) <= L2 && Math.abs(x - target.x) <= W) hit = true;
      else if (!p.piercing && out.traffic.some((t) => Math.abs(s - t.s) <= L2 && Math.abs(x - t.x) <= W)) blocked = true;
    }
    if (blocked) {
      events.push({ type: 'blocked', s, x });
      continue;
    }
    if (hit && p.damage <= 0) continue; // fired from 70 m or more: the shot reaches but does no harm (no hit)
    if (hit) {
      out = withCar(out, target.role, hurt(target, p.damage, w));
      events.push({ type: 'hit', target: target.role, amount: scaledDamage(p.damage, w, target.role), s, x });
      continue;
    }
    const travelled = p.travelled + dist;
    if (travelled < BALANCE.combat.range) alive.push({ ...p, s, x, travelled });
  }
  return { ...out, projectiles: alive, events };
}
