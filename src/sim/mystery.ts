// The yellow "?" box (V2 part 3, both modes, both sides): good (an item of your side) or bad (a timed effect).
// The chance of good depends on the difficulty. What it gives is drawn at pickup; it applies when the 0.6 s roulette
// stops (the HUD shows it spinning meanwhile).
import { BALANCE } from '../config/balance';
import type { CarState } from './car';
import { applyItem, rollItem } from './items';
import type { Rng } from './rng';
import type { BadEffect, GameEvent, MysteryOutcome, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const M = BALANCE.items.mystery;
export const BAD_EFFECTS: readonly BadEffect[] = ['slow', 'double', 'mud', 'noBrake'];

export function pickMystery(car: CarState, w: Pick<WorldState, 'time' | 'difficulty'>, rng: Rng): CarState {
  const good = rng.next() < M.good[w.difficulty];
  const outcome: MysteryOutcome = good
    ? { good: true, item: rollItem(car, rng) }
    : { good: false, effect: BAD_EFFECTS[rng.int(0, BAD_EFFECTS.length - 1)]! };
  return { ...car, mystery: { at: w.time + M.revealTime, outcome } };
}

export function applyBad(car: CarState, effect: BadEffect, time: number): CarState {
  const fx = { ...car.effects };
  if (effect === 'slow') fx.slowUntil = time + M.slow.time;
  else if (effect === 'double') fx.doubleUntil = time + M.double.time;
  else if (effect === 'mud') fx.mudUntil = time + M.mud.time;
  else fx.noBrakeUntil = time + M.noBrake.time;
  return { ...car, effects: fx };
}

/** The roulette stops: the good item or the bad effect is applied. */
export function stepMystery(w: WorldState): WorldState {
  let out = w;
  const events: GameEvent[] = [...w.events];
  for (const role of ['police', 'thief'] as const) {
    const car = role === 'police' ? policeOf(out) : thiefOf(out);
    if (!car.mystery || w.time < car.mystery.at) continue;
    const { outcome } = car.mystery;
    let next: CarState = { ...car, mystery: null };
    if (outcome.good) {
      if (outcome.item) next = applyItem(next, outcome.item, w.time);
    } else next = applyBad(next, outcome.effect, w.time);
    events.push({ type: 'mysteryReveal', role, outcome });
    out = withCar(out, role, next);
  }
  return out === w ? w : { ...out, events };
}
