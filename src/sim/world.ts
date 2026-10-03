import type { Role } from '../config/balance';
import { createCar, stepCar, type CarState } from './car';
import type { Intents } from './intents';

export interface WorldState {
  seed: number;
  /** segundos de simulação */
  time: number;
  player: CarState;
}

export function createWorld(opts: { seed: number; playerRole: Role }): WorldState {
  return { seed: opts.seed, time: 0, player: createCar(opts.playerRole, 1) };
}

export function stepWorld(w: WorldState, playerIntents: Intents, dt: number): WorldState {
  return { seed: w.seed, time: w.time + dt, player: stepCar(w.player, playerIntents, dt) };
}
