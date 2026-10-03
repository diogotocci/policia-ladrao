import { BALANCE, type Role } from '../config/balance';
import type { Intents } from './intents';

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
}

export function createCar(role: Role, laneIndex: 0 | 1 | 2 | 3, s = 0): CarState {
  return { role, s, x: BALANCE.road.laneCenters[laneIndex], speed: 0, steer: 0, touchingEdge: false };
}

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;

export function stepCar(car: CarState, intents: Intents, dt: number): CarState {
  const { accel, brakeDecel, lateralSpeed, cruise } = BALANCE.movement;
  const target = cruise[car.role];

  const speed = intents.brake
    ? Math.max(0, car.speed - brakeDecel * dt)
    : Math.min(target, car.speed + accel * dt);

  const steer: CarState['steer'] = intents.left === intents.right ? 0 : intents.left ? -1 : 1;
  const rawX = car.x + steer * lateralSpeed * dt;
  const x = Math.min(EDGE, Math.max(-EDGE, rawX));

  return {
    role: car.role,
    s: car.s + speed * dt,
    x,
    speed,
    steer,
    touchingEdge: Math.abs(x) >= EDGE,
  };
}
