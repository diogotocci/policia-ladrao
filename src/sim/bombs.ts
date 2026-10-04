// Bombas do ladrão: soltas atrás dele ao apertar 💣 (borda de subida), duram 20 s, −10 na polícia no chão.
import { BALANCE } from '../config/balance';
import type { Intents } from './intents';
import type { Bomb, GameEvent, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const B = BALANCE.items.bomb;

/** `intents` = intents do ladrão neste passo. */
export function dropBomb(w: WorldState, intents: Intents): WorldState {
  const pressed = intents.bomb && !w.bombHeld;
  const out: WorldState = { ...w, bombHeld: intents.bomb };
  const thief = thiefOf(out);
  if (!pressed || thief.upgrades.bombs <= 0) return out;
  const bomb: Bomb = { id: w.nextBombId, s: thief.s - B.dropBehind, x: thief.x, expiresAt: w.time + B.lifetime };
  return {
    ...withCar(out, 'thief', { ...thief, upgrades: { ...thief.upgrades, bombs: thief.upgrades.bombs - 1 } }),
    bombs: [...w.bombs, bomb],
    nextBombId: w.nextBombId + 1,
    events: [...w.events, { type: 'bombDropped', s: bomb.s, x: bomb.x }],
  };
}

export function stepBombs(w: WorldState): WorldState {
  let police = policeOf(w);
  const events: GameEvent[] = [...w.events];
  const bombs: Bomb[] = [];
  for (const b of w.bombs) {
    if (w.time >= b.expiresAt) continue;
    const over =
      police.airTime <= 0 &&
      Math.abs(police.s - b.s) < BALANCE.car.length / 2 + B.radiusS &&
      Math.abs(police.x - b.x) < BALANCE.car.halfWidth + B.radiusX;
    if (over) {
      police = { ...police, hp: Math.max(0, police.hp - B.damage) };
      events.push({ type: 'explosion', s: b.s, x: b.x });
      events.push({ type: 'hit', target: 'police', amount: B.damage, s: b.s, x: b.x });
      continue;
    }
    bombs.push(b);
  }
  return { ...withCar(w, 'police', police), bombs, events };
}
