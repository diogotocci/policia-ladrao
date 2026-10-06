// Pursuit: police catch-up turbo and the rule "the police never overtakes the thief" (spec §4.3).
import { BALANCE } from '../config/balance';
import { catchUpBonus } from './rules';
import type { WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

/** Police speed bonus: only when behind the thief. */
export function pursuitBonus(w: WorldState): number {
  const police = policeOf(w);
  const d = thiefOf(w).s - police.s;
  const nitro = w.time < police.upgrades.nitroUntil ? BALANCE.items.police.nitroBonus : 0;
  const turbo = d > 0 && w.time >= w.policeTurboOffUntil ? catchUpBonus(d) : 0;
  return turbo + nitro;
}

/**
 * The patrol car's front never passes the thief's. With lateral overlap (same lane),
 * it stays at least 1 car length behind. On contact, speed is capped at the thief's.
 */
export function enforceNoOvertake(w: WorldState): WorldState {
  const police = policeOf(w);
  const thief = thiefOf(w);
  const sameLane = Math.abs(thief.x - police.x) < 2 * BALANCE.car.halfWidth;
  const limit = sameLane ? thief.s - BALANCE.car.length : thief.s;
  // touching (or past the limit): locks position and speed to the thief's
  if (police.s < limit - 1e-6) return w;
  return withCar(w, 'police', { ...police, s: Math.min(police.s, limit), speed: Math.min(police.speed, thief.speed) });
}
