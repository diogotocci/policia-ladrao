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

export type ItemId =
  | 'fireRate'
  | 'power'
  | 'heal'
  | 'nitro'
  | 'ram'
  | 'heli'
  | 'pierce'
  | 'plate'
  | 'bomb'
  | 'gun'
  | 'oil'
  | 'spikes'
  | 'smoke'
  | 'roadblock'
  | 'machineGun'
  | 'wingman';

/** specials (V2 part 3), used with the special button: the thief's four and the police roadblock */
export type SpecialKind = 'bomb' | 'oil' | 'spikes' | 'smoke' | 'roadblock';
/** the thief's specials (they share one weight in the box mix) */
export const SPECIALS: readonly SpecialKind[] = ['bomb', 'oil', 'spikes', 'smoke'];

/** bad outcomes of the yellow box */
export type BadEffect = 'slow' | 'double' | 'mud' | 'noBrake';

/** what a yellow box gives, known at pickup and applied when the roulette stops */
export type MysteryOutcome = { good: true; item: ItemId | null } | { good: false; effect: BadEffect };

export interface Box {
  id: number;
  s: number;
  x: number;
  /** yellow: the "?" box (good or bad, for anyone) */
  color: 'blue' | 'red' | 'yellow';
}

export interface Bomb {
  id: number;
  s: number;
  x: number;
  /** area bomb (Sobrevivência chaos 2+): also covers this lane center */
  x2?: number;
  expiresAt: number;
}

/**
 * Things on the road from the specials. Thief: oil (skid) and spikes (flat tire), they hit only the police.
 * Police roadblock: a patrol car across a lane (crash) and spike strips, they hit only the thief.
 */
export interface Hazard {
  id: number;
  kind: 'oil' | 'spikes' | 'roadblock';
  /** the only car it hits */
  target: Role;
  /** roadblock pieces share the id of the patrol car (removed together) */
  group?: number;
  s: number;
  length: number;
  xFrom: number;
  xTo: number;
  expiresAt: number;
}

/** Backup patrol car (V2 part 3): comes from behind on a lane next to the thief and hits its side. */
export interface Wingman {
  s: number;
  x: number;
  speed: number;
  /** leaves after this */
  until: number;
  /** next side hit allowed */
  nextHitAt: number;
}

export type GameEvent =
  | { type: 'hit'; target: Role; amount: number; s: number; x: number }
  | { type: 'crash'; a: Role | 'scenery'; b: Role | 'scenery' | 'traffic' | 'works'; s: number; x: number }
  | { type: 'blocked'; s: number; x: number }
  | { type: 'pickup'; role: Role; item: ItemId | 'wrong' | 'none' }
  | { type: 'bombDropped'; s: number; x: number }
  | { type: 'explosion'; s: number; x: number }
  | { type: 'shot'; from: Role; s: number; x: number; /** from the helicopter */ air?: true; /** machine gun */ rapid?: true }
  | { type: 'noTarget'; from: Role }
  | { type: 'skid'; role: Role; s: number; x: number }
  | { type: 'special'; role: Role; kind: SpecialKind; s: number; x: number }
  | { type: 'oilSkid'; role: Role; s: number; x: number }
  | { type: 'tirePop'; role: Role; s: number; x: number }
  | { type: 'mystery'; role: Role; outcome: MysteryOutcome; s: number; x: number }
  | { type: 'mysteryReveal'; role: Role; outcome: MysteryOutcome }
  | { type: 'roadblockHit'; s: number; x: number }
  | { type: 'roadblockNoRoom' }
  | { type: 'policeItem'; item: 'machineGun' | 'wingman' }
  | { type: 'wingmanHit'; s: number; x: number }
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
  /** share of yellow "?" boxes (debug can change it) */
  mysteryShare: number;
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
  /** oil and spikes on the road (V2 part 3) */
  hazards: Hazard[];
  nextHazardId: number;
  /** the thief's special button was pressed in the previous step (rising edge) */
  bombHeld: boolean;
  /** same for the police (roadblock) */
  policeSpecialHeld: boolean;
  /** the backup patrol car (police item), null when not on the road */
  wingman: Wingman | null;
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
