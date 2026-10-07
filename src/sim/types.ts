import type { Difficulty, Mode, Role } from '../config/balance';
import type { Works } from './works';
import type { AiMemory } from './ai';
import type { CarState } from './car';

export interface Projectile {
  from: Role;
  s: number;
  x: number;
  /** speed along the road (m/s) */
  vs: number;
  /** lateral speed (m/s) */
  vx: number;
  /** meters traveled */
  travelled: number;
  damage: number;
  /** passes through traffic (Piercing Shot) */
  piercing?: boolean;
  /** came from the helicopter: distance to the target at firing (the tracer descends from above to it) */
  air?: number;
}

export interface TrafficCar {
  id: number;
  s: number;
  x: number;
  speed: number;
  targetX: number;
  /** visual model 0..3 */
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
  | { type: 'crash'; a: Role | 'scenery'; b: Role | 'scenery' | 'traffic' | 'works'; s: number; x: number }
  | { type: 'blocked'; s: number; x: number }
  | { type: 'pickup'; role: Role; item: ItemId | 'wrong' | 'none' }
  | { type: 'bombDropped'; s: number; x: number }
  | { type: 'explosion'; s: number; x: number }
  | { type: 'shot'; from: Role; s: number; x: number; /** from the helicopter */ air?: true }
  | { type: 'noTarget'; from: Role }
  | { type: 'skid'; role: Role; s: number; x: number }
  | { type: 'end'; winner: Role }
  | { type: 'escape' }
  | { type: 'arrest' };

export interface MatchState {
  over: boolean;
  winner?: Role;
  endTime?: number;
  /** how it ended: escape (1:30), police destroyed, thief destroyed */
  reason?: 'escape' | 'policeDown' | 'thiefDown';
  /** instant the escape scene started (1:30) */
  escapeAt?: number;
  /** instant the thief was destroyed (arrest scene) */
  arrestAt?: number;
}

export interface WorldState {
  seed: number;
  /** simulation seconds */
  time: number;
  level: number;
  difficulty: Difficulty;
  /** V2 part 3: Perseguição or Sobrevivência */
  mode: Mode;
  /** Sobrevivência chaos level (1 in Perseguição) */
  chaos: number;
  /** seconds per chaos level (debug can shorten it) */
  chaosEvery: number;
  /** roadworks start here (set when chaos first reaches 3); null = none yet */
  worksFrom: Record<number, number>;
  /** roadworks near the cars */
  works: Works[];
  playerRole: Role;
  player: CarState;
  opponent: CarState;
  projectiles: Projectile[];
  /** seconds of immunity left per key (e.g. 'cars', 'edge:police') */
  immunity: Record<string, number>;
  /** events from the last step (render, audio, HUD) */
  events: GameEvent[];
  match: MatchState;
  /** serializable state of the AI's RNG */
  aiRng: number;
  traffic: TrafficCar[];
  /** off only in tests/debug (?traffic=0) */
  trafficOn: boolean;
  /** curves enabled (Delivery 6) */
  curvesOn: boolean;
  /** reaching this time alive the thief escapes (BALANCE.match.escapeTime; lower only in debug) */
  escapeTime: number;
  boxes: Box[];
  bombs: Bomb[];
  nextBombId: number;
  /** the thief's bomb button was pressed in the previous step (rising edge) */
  bombHeld: boolean;
  /** after hitting the thief, the police has no catch-up turbo until this instant */
  policeTurboOffUntil: number;
  nextBoxId: number;
  /** s of the next item-box spawn */
  nextBoxAt: number;
  itemRng: number;
  nextTrafficId: number;
  /** serializable state of the traffic RNG */
  trafficRng: number;
  /** AI memory per role (the opponent; the player too, in AI × AI matches) */
  ai: Record<Role, AiMemory>;
}
