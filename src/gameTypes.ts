// Options and handle of one match (startGame in game.ts).
import type { Difficulty, Mode, Role } from './config/balance';
import type { AudioSession } from './audio/session';
import type { CarLook } from './meta/shop';
import type { MatchStats } from './meta/rewards';
import type { QualityTier } from './render/renderer';
import type { ItemId } from './sim/world';

export interface GameHandle {
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  stop(): void;
}

/** What the app hears when a match ends. */
export interface MatchEnd {
  winner: Role;
  time: number;
  reason?: 'escape' | 'policeDown' | 'thiefDown';
  hp: number;
  /** player's life left, 0..1 (career: escape with more than 80%) */
  hpFrac?: number;
  level: number;
  stats: MatchStats;
}

export interface GameOptions {
  role: Role;
  seed: number;
  debug: boolean;
  quality?: QualityTier;
  debugHp?: { police?: number; thief?: number };
  debugGive?: ItemId[];
  traffic?: boolean;
  /** curves (Delivery 6); false = straight road (?curves=0) */
  curves?: boolean;
  /** shorter escape time (debug/e2e only: ?escape=N) */
  escapeTime?: number;
  /** V2 part 2: Fácil / Médio / Difícil (default Médio) */
  difficulty?: Difficulty;
  /** V2 part 3: Perseguição (default) / Sobrevivência; chaosEvery only in debug */
  mode?: Mode;
  chaosEvery?: number;
  /** V2 part 4: the player's car from the shop (visual and sound only); default car without it */
  look?: CarLook;
  /** the computer's car (random in the app); default car without it (debug/e2e) */
  opponentLook?: CarLook;
  /** debug/e2e only: share of yellow boxes (?mystery=1) */
  mysteryShare?: number;
  /** starts muted (?mute), without touching the saved preference */
  mute?: boolean;
  /** app audio session (without it the game creates its own) */
  audio?: AudioSession;
  /** starts frozen (3-2-1 countdown); the app calls resume() at the start */
  startPaused?: boolean;
  /** the app decides what the pause shows; without it the game pauses/resumes by itself (Esc/P/⏸) */
  onPauseRequest?: () => void;
  /** match end (the app shows the end screen; without it the HUD shows the end card) */
  onEnd?: (result: MatchEnd) => void;
}
