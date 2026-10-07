// Coins earned in a finished match (V2 part 1): time played, damage dealt to the opponent and boxes of the player's color.
import { BALANCE, type Difficulty, type Mode, type Role } from '../config/balance';
import type { GameEvent } from '../sim/types';

export interface MatchStats {
  damageDealt: number;
  rightBoxes: number;
}

export interface Reward {
  time: number;
  damage: number;
  boxes: number;
  won: boolean;
  /** coins multiplier comes from it (Médio x1) */
  difficulty: Difficulty;
  total: number;
}

export const emptyStats = (): MatchStats => ({ damageDealt: 0, rightBoxes: 0 });

/** Adds one simulation step's events to the running stats of the player's car. */
export function addEvents(stats: MatchStats, events: readonly GameEvent[], player: Role): MatchStats {
  let { damageDealt, rightBoxes } = stats;
  for (const e of events) {
    if (e.type === 'hit' && e.target !== player) damageDealt += e.amount;
    else if (e.type === 'pickup' && e.role === player && e.item !== 'wrong' && e.item !== 'none') rightBoxes++;
  }
  return { damageDealt, rightBoxes };
}

export function rewardFor(
  r: { time: number; won: boolean },
  stats: MatchStats,
  difficulty: Difficulty = 'normal',
  mode: Mode = 'pursuit',
): Reward {
  const R = BALANCE.rewards;
  const timeMax = mode === 'survival' ? BALANCE.survival.timeCoinsMax : R.timeMax; // longer matches in Sobrevivência
  const time = Math.min(timeMax, Math.floor(r.time / R.secondsPerCoin));
  const damage = Math.min(R.damageMax, Math.floor(stats.damageDealt / R.damagePerCoin));
  const boxes = stats.rightBoxes * R.perBox;
  const total = Math.floor((time + damage + boxes) * (r.won ? R.winMultiplier : 1) * BALANCE.difficulties[difficulty].coins);
  return { time, damage, boxes, won: r.won, difficulty, total };
}
