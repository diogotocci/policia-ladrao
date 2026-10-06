import { BALANCE, type Role } from '../config/balance';
import type { Intents } from './intents';

/** Melhorias e efeitos dos itens das caixinhas (spec §5). Tempos em segundos de partida. */
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
  /** metros ao longo da pista */
  s: number;
  /** posição lateral em metros (0 = centro da pista) */
  x: number;
  /** m/s */
  speed: number;
  steer: -1 | 0 | 1;
  touchingEdge: boolean;
  hp: number;
  /** arma: a polícia sempre tem; o ladrão ganha numa caixinha (entrega 3) */
  hasGun: boolean;
  /** segundos até poder atirar de novo */
  fireCooldown: number;
  /** recarga da arma do helicóptero (polícia) */
  heliCooldown: number;
  /** segundos restantes no ar (pulo do quebra-molas) */
  airTime: number;
  /** derrapando na curva (acima da aderência) */
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
 * Deriva lateral numa curva de curvatura κ (1/m, positiva = curva à direita): empurra para fora (−sinal de κ).
 * Até a aderência é fácil de segurar; acima dela o carro derrapa e o ◀ ▶ rende menos (spec Entrega 6).
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
    speed = car.speed; // no ar: não acelera nem desacelera (só o freio age)
  else if (car.speed < target) speed = Math.min(target, car.speed + accel * dt);
  else speed = Math.max(target, car.speed - accel * dt); // turbo acabou: desacelera suave

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
