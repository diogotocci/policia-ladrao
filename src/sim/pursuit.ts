// Perseguição: turbo de compensação da polícia e a regra "a polícia nunca ultrapassa o ladrão" (spec §4.3).
import { BALANCE } from '../config/balance';
import { catchUpBonus } from './rules';
import type { WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

/** Bônus de velocidade da polícia: só quando está atrás do ladrão. */
export function pursuitBonus(w: WorldState): number {
  const d = thiefOf(w).s - policeOf(w).s;
  return d > 0 ? catchUpBonus(d) : 0;
}

/**
 * A dianteira da viatura nunca passa a do ladrão. Com sobreposição lateral (mesma faixa),
 * ela fica no mínimo 1 comprimento atrás. Ao encostar, a velocidade fica limitada à do ladrão.
 */
export function enforceNoOvertake(w: WorldState): WorldState {
  const police = policeOf(w);
  const thief = thiefOf(w);
  const sameLane = Math.abs(thief.x - police.x) < 2 * BALANCE.car.halfWidth;
  const limit = sameLane ? thief.s - BALANCE.car.length : thief.s;
  // encostada (ou passando do limite): trava a posição e a velocidade na do ladrão
  if (police.s < limit - 1e-6) return w;
  return withCar(w, 'police', { ...police, s: Math.min(police.s, limit), speed: Math.min(police.speed, thief.speed) });
}
