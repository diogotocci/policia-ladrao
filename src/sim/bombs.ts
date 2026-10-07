// Thief bombs (dropped with the special button, see specials.ts): last 20 s, damage to the police on the ground.
// The area bomb (Sobrevivência chaos 2+) also covers a second lane (x2).
import { BALANCE } from '../config/balance';
import { hurt, scaledDamage } from './chaos';
import type { Bomb, GameEvent, WorldState } from './types';
import { policeOf, withCar } from './world';

const B = BALANCE.items.bomb;

export function stepBombs(w: WorldState): WorldState {
  let police = policeOf(w);
  const events: GameEvent[] = [...w.events];
  const bombs: Bomb[] = [];
  for (const b of w.bombs) {
    if (w.time >= b.expiresAt) continue;
    const over =
      police.airTime <= 0 &&
      Math.abs(police.s - b.s) < BALANCE.car.length / 2 + B.radiusS &&
      [b.x, b.x2].some((x) => x !== undefined && Math.abs(police.x - x) < BALANCE.car.halfWidth + B.radiusX);
    if (over) {
      police = hurt(police, B.damage, w);
      events.push({ type: 'explosion', s: b.s, x: b.x });
      events.push({ type: 'hit', target: 'police', amount: scaledDamage(B.damage, w, 'police'), s: b.s, x: b.x });
      continue;
    }
    bombs.push(b);
  }
  return { ...withCar(w, 'police', police), bombs, events };
}
