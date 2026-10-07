import { BALANCE, type Role } from '../config/balance';
import type { Intents } from './intents';

/** Upgrades and effects of the item-box items (spec §5). Times in match seconds. */
export interface Upgrades {
  fireInterval: number;
  power: number;
  plates: number;
  bombs: number;
  ramCharges: number;
  nitroUntil: number;
  heliUntil: number;
  pierceUntil: number;
}

export function baseUpgrades(role: Role): Upgrades {
  return {
    fireInterval: role === 'police' ? BALANCE.combat.policeFireInterval : BALANCE.combat.thiefFireInterval,
    power: 1,
    plates: 0,
    bombs: 0,
    ramCharges: 0,
    nitroUntil: 0,
    heliUntil: 0,
    pierceUntil: 0,
  };
}

export interface CarState {
  role: Role;
  /** meters along the road */
  s: number;
  /** lateral position in meters (0 = road center) */
  x: number;
  /** m/s */
  speed: number;
  steer: -1 | 0 | 1;
  touchingEdge: boolean;
  hp: number;
  /** life cap: 100, or 200 in Sobrevivência (V2 part 3) */
  maxHp: number;
  /** weapon: the police always has one; the thief gets one from a box (delivery 3) */
  hasGun: boolean;
  /** seconds until it can shoot again */
  fireCooldown: number;
  /** reload of the helicopter's weapon (police) */
  heliCooldown: number;
  /** seconds left in the air (speed bump jump) */
  airTime: number;
  /** skidding in the curve (above grip) */
  skidding: boolean;
  upgrades: Upgrades;
}

export function createCar(role: Role, laneIndex: 0 | 1 | 2 | 3, s = 0): CarState {
  return {
    role,
    s,
    x: BALANCE.road.laneCenters[laneIndex],
    speed: 0,
    steer: 0,
    touchingEdge: false,
    hp: BALANCE.hp,
    maxHp: BALANCE.hp,
    hasGun: false,
    fireCooldown: 0,
    heliCooldown: 0,
    airTime: 0,
    skidding: false,
    upgrades: baseUpgrades(role),
  };
}

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;

/**
 * Lateral drift in a curve of curvature κ (1/m, positive = right curve): pushes outward (−sign of κ).
 * Up to the grip limit it is easy to hold; above it the car skids and ◀ ▶ gives less (spec Delivery 6).
 */
export function cornering(speed: number, curvature: number): { drift: number; skidding: boolean } {
  if (curvature === 0 || speed <= 0) return { drift: 0, skidding: false };
  const C = BALANCE.curves;
  const a = speed * speed * Math.abs(curvature);
  const skidding = a > C.grip;
  const mag = C.driftGain * a + (skidding ? C.skidGain * (a - C.grip) : 0);
  return { drift: -Math.sign(curvature) * mag, skidding };
}

export function stepCar(car: CarState, intents: Intents, dt: number, opts: { speedBonus?: number; curvature?: number } = {}): CarState {
  const { accel, brakeDecel, lateralSpeed, cruise } = BALANCE.movement;
  const target = cruise[car.role] * (1 + (opts.speedBonus ?? 0));

  let speed: number;
  if (intents.brake) speed = Math.max(0, car.speed - brakeDecel * dt);
  else if (car.airTime > 0)
    speed = car.speed; // in the air: neither accelerates nor decelerates (only the brake acts)
  else if (car.speed < target) speed = Math.min(target, car.speed + accel * dt);
  else speed = Math.max(target, car.speed - accel * dt); // turbo ended: decelerates smoothly

  const steer: CarState['steer'] = intents.left === intents.right ? 0 : intents.left ? -1 : 1;
  const { drift, skidding } = cornering(speed, opts.curvature ?? 0);
  const grip = skidding ? BALANCE.curves.skidSteer : 1;
  const rawX = car.x + (steer * lateralSpeed * grip + drift) * dt;
  const x = Math.min(EDGE, Math.max(-EDGE, rawX));

  return {
    ...car,
    s: car.s + speed * dt,
    x,
    speed,
    steer,
    touchingEdge: Math.abs(x) >= EDGE,
    skidding,
  };
}

/** Life as a percentage of the car's max (bars, damage looks, box colors, music). */
export const hpPct = (car: Pick<CarState, 'hp' | 'maxHp'>): number => (car.hp / car.maxHp) * 100;
