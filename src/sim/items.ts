// Item boxes and items (spec §5): spaced spawn, color tending toward whoever is losing, pickup on the ground, effects with caps.
import { BALANCE, type Role } from '../config/balance';
import { hpPct, type CarState } from './car';
import { hurt, scaledDamage } from './chaos';
import { createRngFromState, type Rng } from './rng';
import { bumpsBetween } from './track';
import { pickMystery } from './mystery';
import { applyPoliceItem } from './policeItems';
import { addSpecial, specialRoom } from './specials';
import { SPECIALS, type Box, type GameEvent, type ItemId, type SpecialKind, type WorldState } from './types';
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
    if (car.hp < car.maxHp) out.push('heal');
    out.push('nitro', 'ram', 'heli', 'pierce', 'machineGun', 'wingman', 'spotlight');
    if (specialRoom(car, 'roadblock')) out.push('roadblock');
  } else {
    const T = I.thief;
    if (u.plates < T.platesMax) out.push('plate');
    for (const k of SPECIALS) if (specialRoom(car, k)) out.push(k);
    if (car.hp < car.maxHp) out.push('heal');
    if (!car.hasGun || u.fireInterval > T.gunIntervalMin + 1e-9) out.push('gun');
  }
  return out;
}

/** Weighted pick among `options`. */
function pick<T extends string>(options: readonly T[], weights: Record<string, number>, rng: Rng): T {
  const total = options.reduce((a, id) => a + (weights[id] ?? 1), 0);
  let r = rng.next() * total;
  for (const id of options) {
    r -= weights[id] ?? 1;
    if (r < 0) return id;
  }
  return options[options.length - 1]!;
}

/**
 * Picks an item from the car's group, excluding those already at max. `null` if none fits.
 * The thief's specials count as one option (weight `special`) and then the kind is drawn by `specials`.
 */
export function rollItem(car: CarState, rng: Rng): ItemId | null {
  const options = available(car);
  if (options.length === 0) return null;
  const specials = options.filter((id): id is SpecialKind => (SPECIALS as readonly string[]).includes(id));
  const groups = [...options.filter((id) => !specials.includes(id as SpecialKind)), ...(specials.length ? ['special' as const] : [])];
  const got = pick(groups, I.weights[car.role] as Record<string, number>, rng);
  return got === 'special' ? pick(specials, I.weights.specials, rng) : got;
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** `w` (mode and chaos) gives the "strong" times of the V2 part 3 items; without it, the normal ones. */
export function applyItem(car: CarState, item: ItemId, time: number, w?: Pick<WorldState, 'mode' | 'chaos'>): CarState {
  if (item === 'machineGun' || item === 'wingman' || item === 'spotlight') return applyPoliceItem(car, item, time, w);
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
      hp = Math.min(car.maxHp, hp + (car.role === 'police' ? P.heal : T.heal));
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
    case 'oil':
    case 'spikes':
    case 'smoke':
    case 'roadblock':
      return addSpecial({ ...car, hp, hasGun, upgrades: u }, item);
    case 'gun':
      if (!hasGun) hasGun = true;
      else u.fireInterval = Math.max(T.gunIntervalMin, round(u.fireInterval - T.gunStep));
      break;
  }
  return { ...car, hp, hasGun, upgrades: u };
}

/** m after a speed bump where a car is still in the air (jump at top speed, plus margin) */
const AIR_REACH = 45;
const BEFORE_BUMP = 12;

/**
 * Where a box planned at s goes: never on a speed bump nor where the cars are still in the air after it
 * (playtest 2026-10-07: boxes right after a bump could not be picked up). It moves to just before the bump,
 * or past the jump when that would put it too close to the cars.
 */
export function boxSpot(seed: number, s: number, minS: number): number {
  const bump = bumpsBetween(seed, s - AIR_REACH, s + BEFORE_BUMP)[0];
  if (!bump) return s;
  const before = bump.s - BEFORE_BUMP;
  return before >= minS ? before : bump.s + AIR_REACH;
}

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

  // spawn: up to 2 visible, ahead, away from speed bumps, roadworks and traffic
  if (nextBoxAt < front + I.spawnAhead && boxes.length < I.maxVisible) {
    const s = boxSpot(w.seed, Math.max(nextBoxAt, front + 60), front + 60);
    // never in a lane closed by roadworks (works never overlap, so at least 3 lanes are open)
    const lanes = BALANCE.road.laneCenters.filter(
      (_, i) => !w.works.some((wk) => wk.lane === i && s > wk.s - 12 && s < wk.s + wk.length + 2),
    );
    let x = lanes[rng.int(0, lanes.length - 1)]!;
    for (let k = 0; k < 4 && w.traffic.some((t) => Math.abs(t.x - x) < 1.5 && Math.abs(t.s - s) < 10); k++) {
      x = lanes[rng.int(0, lanes.length - 1)]!;
    }
    // the yellow "?" box (V2 part 3, both modes); otherwise the color tends to whoever is losing
    const color: Box['color'] =
      rng.next() < w.mysteryShare ? 'yellow' : rng.next() < colorChance(hpPct(police), hpPct(thief)) ? 'blue' : 'red';
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
    if (box.color === 'yellow') {
      if (car.mystery) return car; // one roulette at a time: the box is gone, nothing more
      const picked = pickMystery(car, w, rng);
      events.push({ type: 'mystery', role: car.role, outcome: picked.mystery!.outcome, s: box.s, x: box.x });
      return picked;
    }
    const own: Role = box.color === 'blue' ? 'police' : 'thief';
    if (own !== car.role) {
      events.push({ type: 'pickup', role: car.role, item: 'wrong' });
      events.push({ type: 'hit', target: car.role, amount: scaledDamage(I.wrongBoxDamage, w, car.role), s: box.s, x: box.x });
      return hurt(car, I.wrongBoxDamage, w);
    }
    const item = rollItem(car, rng);
    events.push({ type: 'pickup', role: car.role, item: item ?? 'none' });
    if (item === 'machineGun' || item === 'wingman' || item === 'spotlight') events.push({ type: 'policeItem', item });
    return item ? applyItem(car, item, w.time, w) : car;
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
