// Coins earned in a finished match (V2 part 1): time played, damage dealt to the opponent and boxes of the player's color.
import { BALANCE, type Difficulty, type Mode, type Role } from '../config/balance';
import type { GameEvent } from '../sim/types';

export interface MatchStats {
  damageDealt: number;
  rightBoxes: number;
  /** V2 part 5 (career): yellow boxes opened, roadblocks used, bombs that hit the police */
  mysteryBoxes?: number;
  roadblocks?: number;
  bombHits?: number;
  /** daily challenges (playtest 2026-10-08): opponent's boxes picked, shots fired, every box picked */
  wrongBoxes?: number;
  shots?: number;
  boxes?: number;
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

export const emptyStats = (): Required<MatchStats> => ({
  damageDealt: 0,
  rightBoxes: 0,
  mysteryBoxes: 0,
  roadblocks: 0,
  bombHits: 0,
  wrongBoxes: 0,
  shots: 0,
  boxes: 0,
});

/** Adds one simulation step's events to the running stats of the player's car. */
export function addEvents(stats: MatchStats, events: readonly GameEvent[], player: Role): Required<MatchStats> {
  const out: Required<MatchStats> = { ...emptyStats(), ...stats };
  for (const e of events) {
    if (e.type === 'hit' && e.target !== player) out.damageDealt += e.amount;
    else if (e.type === 'pickup' && e.role === player) {
      out.boxes++;
      if (e.item === 'wrong') out.wrongBoxes++;
      else if (e.item !== 'none') out.rightBoxes++;
    } else if (e.type === 'mystery' && e.role === player) {
      out.mysteryBoxes++;
      out.boxes++;
    } else if (e.type === 'shot' && e.from === player && !e.air) out.shots++;
    else if (e.type === 'special' && e.role === 'police' && e.kind === 'roadblock' && player === 'police') out.roadblocks++;
    else if (e.type === 'explosion' && player === 'thief') out.bombHits++; // a bomb only explodes when it hits the police
  }
  return out;
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
