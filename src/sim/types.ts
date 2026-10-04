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
  /** atravessa o tráfego (Tiro perfurante) */
  piercing?: boolean;
}

export interface TrafficCar {
  id: number;
  s: number;
  x: number;
  speed: number;
  targetX: number;
  /** modelo visual 0..3 */
  model: number;
}

export type ItemId = 'fireRate' | 'power' | 'heal' | 'nitro' | 'ram' | 'heli' | 'pierce' | 'plate' | 'bomb' | 'gun';

export interface Box {
  id: number;
  s: number;
  x: number;
  color: 'blue' | 'red';
}

export interface Bomb {
  id: number;
  s: number;
  x: number;
  expiresAt: number;
}

export type GameEvent =
  | { type: 'hit'; target: Role; amount: number; s: number; x: number }
  | { type: 'crash'; a: Role | 'scenery'; b: Role | 'scenery' | 'traffic'; s: number; x: number }
  | { type: 'blocked'; s: number; x: number }
  | { type: 'pickup'; role: Role; item: ItemId | 'wrong' | 'none' }
  | { type: 'bombDropped'; s: number; x: number }
  | { type: 'explosion'; s: number; x: number }
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
  traffic: TrafficCar[];
  /** desligado só em testes/debug (?traffic=0) */
  trafficOn: boolean;
  boxes: Box[];
  bombs: Bomb[];
  nextBombId: number;
  /** o botão de bomba do ladrão estava apertado no passo anterior (borda de subida) */
  bombHeld: boolean;
  /** depois de bater no ladrão, a polícia fica sem turbo de compensação até este instante */
  policeTurboOffUntil: number;
  nextBoxId: number;
  /** s do próximo spawn de caixinha */
  nextBoxAt: number;
  itemRng: number;
  nextTrafficId: number;
  /** estado serializável do RNG do tráfego */
  trafficRng: number;
  /** memória da IA por papel (o adversário; o jogador também, em partidas IA × IA) */
  ai: Record<Role, AiMemory>;
}
