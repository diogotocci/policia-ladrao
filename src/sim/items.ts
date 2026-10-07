// Item boxes and items (spec §5): spaced spawn, color tending toward whoever is losing, pickup on the ground, effects with caps.
import { BALANCE, type Role } from '../config/balance';
import type { CarState } from './car';
import { hurt, scaledDamage } from './chaos';
import { createRngFromState, type Rng } from './rng';
import { bumpsBetween } from './track';
import type { Box, GameEvent, ItemId, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const I = BALANCE.items;

/** Probability of the box being blue (police): 0.5 with equal lives, up to 0.65/0.35 for whoever has fewer. */
export function colorChance(policeHp: number, thiefHp: number): number {
  const diff = Math.max(-1, Math.min(1, (thiefHp - policeHp) / I.colorTiltAtHpDiff));
  return 0.5 + I.colorTilt * diff;
}

function available(car: CarState): ItemId[] {
  const u = car.upgrades;
  const out: ItemId[] = [];
  if (car.role === 'police') {
    const P = I.police;
    if (u.fireInterval > P.fireIntervalMin + 1e-9) out.push('fireRate');
    if (u.power < P.powerMax - 1e-9) out.push('power');
    if (car.hp < BALANCE.hp) out.push('heal');
    out.push('nitro', 'ram', 'heli', 'pierce');
  } else {
    const T = I.thief;
    if (u.plates < T.platesMax) out.push('plate');
    if (u.bombs < T.bombsMax) out.push('bomb');
    if (car.hp < BALANCE.hp) out.push('heal');
    if (!car.hasGun || u.fireInterval > T.gunIntervalMin + 1e-9) out.push('gun');
  }
  return out;
}

/** Picks an item from the car's group, excluding those already at max. `null` if none fits. */
export function rollItem(car: CarState, rng: Rng): ItemId | null {
  const options = available(car);
  if (options.length === 0) return null;
  const weights = I.weights[car.role] as Record<string, number>;
  const total = options.reduce((a, id) => a + (weights[id] ?? 1), 0);
  let r = rng.next() * total;
  for (const id of options) {
    r -= weights[id] ?? 1;
    if (r < 0) return id;
  }
  return options[options.length - 1]!;
}

const round = (v: number) => Math.round(v * 1000) / 1000;

export function applyItem(car: CarState, item: ItemId, time: number): CarState {
  const u = { ...car.upgrades };
  let hp = car.hp;
  let hasGun = car.hasGun;
  const P = I.police;
  const T = I.thief;
  switch (item) {
    case 'fireRate':
      u.fireInterval = Math.max(P.fireIntervalMin, round(u.fireInterval - P.fireRateStep));
      break;
    case 'power':
      u.power = Math.min(P.powerMax, u.power + P.powerStep);
      break;
    case 'heal':
      hp = Math.min(BALANCE.hp, hp + (car.role === 'police' ? P.heal : T.heal));
      break;
    case 'nitro':
      u.nitroUntil = time + P.nitroTime;
      break;
    case 'ram':
      u.ramCharges = P.ramCharges;
      break;
    case 'heli':
      u.heliUntil = time + P.heliTime;
      break;
    case 'pierce':
      u.pierceUntil = time + P.pierceTime;
      break;
    case 'plate':
      u.plates = Math.min(T.platesMax, u.plates + 1);
      break;
    case 'bomb':
      u.bombs = Math.min(T.bombsMax, u.bombs + 1);
      break;
    case 'gun':
      if (!hasGun) hasGun = true;
      else u.fireInterval = Math.max(T.gunIntervalMin, round(u.fireInterval - T.gunStep));
      break;
  }
  return { ...car, hp, hasGun, upgrades: u };
}

const onBump = (seed: number, s: number) => bumpsBetween(seed, s - 6, s + 6).length > 0;

/** Spawn, cleanup and pickup of item boxes. */
export function stepBoxes(w: WorldState): WorldState {
  const rng = createRngFromState(w.itemRng);
  const events: GameEvent[] = [...w.events];
  let police = policeOf(w);
  let thief = thiefOf(w);
  const back = Math.min(police.s, thief.s);
  const front = Math.max(police.s, thief.s);
  let boxes: Box[] = w.boxes.filter((b) => b.s > back - 20);
  let { nextBoxAt, nextBoxId } = w;

  // spawn: up to 2 visible, ahead, away from speed bumps and traffic
  if (nextBoxAt < front + I.spawnAhead && boxes.length < I.maxVisible) {
    let s = Math.max(nextBoxAt, front + 60);
    while (onBump(w.seed, s)) s += 8;
    const lanes = BALANCE.road.laneCenters;
    let x = lanes[rng.int(0, lanes.length - 1)]!;
    for (let k = 0; k < 4 && w.traffic.some((t) => Math.abs(t.x - x) < 1.5 && Math.abs(t.s - s) < 10); k++) {
      x = lanes[rng.int(0, lanes.length - 1)]!;
    }
    const color = rng.next() < colorChance(police.hp, thief.hp) ? 'blue' : 'red';
    boxes.push({ id: nextBoxId++, s, x, color });
    // Sobrevivência: boxes come closer together as chaos rises
    const every = I.boxEvery * BALANCE.survival.boxEveryPerChaos ** (w.chaos - 1);
    nextBoxAt = s + rng.range(every - I.boxJitter, every + I.boxJitter);
  } else if (nextBoxAt < front + I.spawnAhead) {
    nextBoxAt = front + I.spawnAhead; // 2 on the road: postpone
  }

  // pickup (ground only)
  const reachS = BALANCE.car.length / 2 + 0.6;
  const reachX = BALANCE.car.halfWidth + 0.6;
  const take = (car: CarState): CarState => {
    if (car.airTime > 0) return car;
    const idx = boxes.findIndex((b) => Math.abs(b.s - car.s) < reachS && Math.abs(b.x - car.x) < reachX);
    if (idx < 0) return car;
    const box = boxes[idx]!;
    boxes = boxes.filter((_, i) => i !== idx);
    const own: Role = box.color === 'blue' ? 'police' : 'thief';
    if (own !== car.role) {
      events.push({ type: 'pickup', role: car.role, item: 'wrong' });
      events.push({ type: 'hit', target: car.role, amount: scaledDamage(I.wrongBoxDamage, w, car.role), s: box.s, x: box.x });
      return hurt(car, I.wrongBoxDamage, w);
    }
    const item = rollItem(car, rng);
    events.push({ type: 'pickup', role: car.role, item: item ?? 'none' });
    return item ? applyItem(car, item, w.time) : car;
  };
  police = take(police);
  thief = take(thief);

  return {
    ...withCar(withCar(w, 'police', police), 'thief', thief),
    boxes,
    nextBoxAt,
    nextBoxId,
    itemRng: rng.state(),
    events,
  };
}
