// Sobrevivência chaos (V2 part 3): rises with time and scales damage, traffic and boxes. Always 1 in Perseguição.
import { BALANCE, type Mode, type Role } from '../config/balance';
import type { CarState } from './car';
import type { WorldState } from './types';

const S = BALANCE.survival;

export function chaosAt(time: number, mode: Mode, every: number = S.chaosEvery): number {
  if (mode !== 'survival') return 1;
  return Math.min(S.chaosMax, 1 + Math.floor(time / every));
}

/** Multiplier for every point of damage: 1 in Perseguição; +20% per chaos level above 1. */
export const damageScale = (w: Pick<WorldState, 'chaos'>): number => 1 + S.damagePerChaos * (w.chaos - 1);

type Scaling = Pick<WorldState, 'chaos' | 'mode'>;

/**
 * Sobrevivência has no escape at 1:30, so the thief takes less damage there (balance: AI x AI 30-70%).
 * Perseguição: x1.
 */
const takenFactor = (role: Role, w: Scaling): number => (w.mode === 'survival' && role === 'thief' ? S.thiefDamageTaken : 1);

/**
 * Yellow box "dano dobrado": x2 while it lasts. Looked up in the world passed in (every caller passes the world of
 * the current step; a bare {chaos, mode} has no cars and gets x1). Tested in tests/sim/mystery.test.ts.
 */
function doubled(w: Scaling, target: Role): number {
  const full = w as Partial<WorldState>;
  if (!full.player || !full.opponent) return 1;
  const car = full.playerRole === target ? full.player : full.opponent;
  return (full.time ?? 0) < (car.effects?.doubleUntil ?? 0) ? 2 : 1;
}

/** Damage after the chaos scale, the mode factor and "dano dobrado" (what the HUD and the coins count). */
export const scaledDamage = (amount: number, w: Scaling, target: Role): number =>
  amount * damageScale(w) * takenFactor(target, w) * doubled(w, target);

/** The only way to take life from a car: applies the scales and never goes below 0. */
export const hurt = (car: CarState, amount: number, w: Scaling): CarState => ({
  ...car,
  hp: Math.max(0, car.hp - scaledDamage(amount, w, car.role)),
});
