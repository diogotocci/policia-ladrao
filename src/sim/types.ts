import type { Role } from '../config/balance';
import type { AiMemory } from './ai';
import type { CarState } from './car';

export interface Projectile {
  from: Role;
  s: number;
  x: number;
  /** velocidade ao longo da pista (m/s) */
  vs: number;
  /** velocidade lateral (m/s) */
  vx: number;
  /** metros percorridos */
  travelled: number;
  damage: number;
}

export type GameEvent =
  | { type: 'hit'; target: Role; amount: number; s: number; x: number }
  | { type: 'crash'; a: Role | 'scenery'; b: Role | 'scenery'; s: number; x: number }
  | { type: 'shot'; from: Role; s: number; x: number }
  | { type: 'noTarget'; from: Role }
  | { type: 'end'; winner: Role };

export interface MatchState {
  over: boolean;
  winner?: Role;
  endTime?: number;
}

export interface WorldState {
  seed: number;
  /** segundos de simulação */
  time: number;
  level: number;
  playerRole: Role;
  player: CarState;
  opponent: CarState;
  projectiles: Projectile[];
  /** segundos restantes de imunidade por chave (ex.: 'cars', 'edge:police') */
  immunity: Record<string, number>;
  /** eventos do último passo (render, áudio, HUD) */
  events: GameEvent[];
  match: MatchState;
  /** estado serializável do RNG da IA */
  aiRng: number;
  /** memória da IA por papel (o adversário; o jogador também, em partidas IA × IA) */
  ai: Record<Role, AiMemory>;
}
