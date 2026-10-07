// The thief's specials (V2 part 3, spec §4.1): one button, the kind kept in upgrades.special (up to 3 charges).
// Bomb (2 lanes in Sobrevivência from chaos 2), oil, spikes and smoke. Oil and spikes stay on the road and hit only
// the police: oil makes it skid, spikes give it a flat tire.
import { BALANCE, type Role } from '../config/balance';
import { NO_EFFECTS, type CarState } from './car';
import type { Intents } from './intents';
import { createRngFromState } from './rng';
import type { Bomb, GameEvent, Hazard, SpecialKind, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const I = BALANCE.items;
const LANES = BALANCE.road.laneCenters;
const LANE_HALF = 1.5;

const nearestLane = (x: number): number => LANES.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
/** the lane next to x, on the side of the road center */
const innerNeighbor = (lane: number): number => (lane < 0 ? lane + 2 * LANE_HALF : lane - 2 * LANE_HALF);

/** "strong" items: Sobrevivência from chaos 3 */
export const strong = (w: Pick<WorldState, 'mode' | 'chaos'>): boolean => w.mode === 'survival' && w.chaos >= I.strongFromChaos;

/** Picking a special: the same kind adds a charge (max 3), another kind replaces the one kept. */
export function addSpecial(car: CarState, kind: SpecialKind): CarState {
  const sp = car.upgrades.special;
  const charges = sp?.kind === kind ? Math.min(I.thief.specialMax, sp.charges + 1) : 1;
  return { ...car, upgrades: { ...car.upgrades, special: { kind, charges } } };
}

/** Is there still room for this kind (false only when it is the kept kind at 3 charges)? */
export const specialRoom = (car: CarState, kind: SpecialKind): boolean =>
  !(car.upgrades.special?.kind === kind && car.upgrades.special.charges >= I.thief.specialMax);

/**
 * The thief presses the special button (rising edge; `intents` = the thief's intents this step).
 * Without charges nothing happens; in the air it still drops behind him normally.
 */
export function useSpecial(w: WorldState, intents: Intents): WorldState {
  const pressed = intents.bomb && !w.bombHeld;
  const out: WorldState = { ...w, bombHeld: intents.bomb };
  const thief = thiefOf(out);
  const sp = thief.upgrades.special;
  if (!pressed || !sp || sp.charges <= 0) return out;
  const left = sp.charges - 1;
  const spent: CarState = { ...thief, upgrades: { ...thief.upgrades, special: left > 0 ? { ...sp, charges: left } : null } };
  const event: GameEvent = { type: 'special', role: 'thief', kind: sp.kind, s: thief.s, x: thief.x };
  const lane = nearestLane(thief.x);
  switch (sp.kind) {
    case 'bomb': {
      const big = w.mode === 'survival' && w.chaos >= I.bigBombFromChaos;
      const bomb: Bomb = { id: w.nextBombId, s: thief.s - I.bomb.dropBehind, x: big ? lane : thief.x, expiresAt: w.time + I.bomb.lifetime };
      if (big) bomb.x2 = innerNeighbor(lane);
      return {
        ...withCar(out, 'thief', spent),
        bombs: [...w.bombs, bomb],
        nextBombId: w.nextBombId + 1,
        events: [...w.events, event, { type: 'bombDropped', s: bomb.s, x: bomb.x }],
      };
    }
    case 'oil':
    case 'spikes': {
      const cfg = sp.kind === 'oil' ? I.oil : I.spikes;
      // oil covers 2 lanes when strong (the thief's and the one next to it, towards the center)
      const other = sp.kind === 'oil' && strong(w) ? innerNeighbor(lane) : lane;
      const h: Hazard = {
        id: w.nextHazardId,
        kind: sp.kind,
        s: thief.s - cfg.dropBehind - cfg.length,
        length: cfg.length,
        xFrom: Math.min(lane, other) - LANE_HALF,
        xTo: Math.max(lane, other) + LANE_HALF,
        expiresAt: w.time + cfg.lifetime,
      };
      return {
        ...withCar(out, 'thief', spent),
        hazards: [...w.hazards, h],
        nextHazardId: w.nextHazardId + 1,
        events: [...w.events, event],
      };
    }
    case 'smoke': {
      const time = strong(w) ? I.smoke.timeStrong : I.smoke.time;
      const smoked: CarState = { ...spent, effects: { ...spent.effects, smokeUntil: w.time + time } };
      return { ...withCar(out, 'thief', smoked), events: [...w.events, event] };
    }
  }
}

const over = (car: CarState, h: Hazard) =>
  car.airTime <= 0 &&
  car.s + BALANCE.car.length / 2 > h.s &&
  car.s - BALANCE.car.length / 2 < h.s + h.length &&
  car.x + BALANCE.car.halfWidth > h.xFrom &&
  car.x - BALANCE.car.halfWidth < h.xTo;

/** Oil and spikes: expire; the police driving over them skids or gets a flat tire (once per effect, no damage). */
export function stepHazards(w: WorldState): WorldState {
  const hazards = w.hazards.filter((h) => w.time < h.expiresAt);
  if (hazards.length === 0) return hazards.length === w.hazards.length ? w : { ...w, hazards };
  const rng = createRngFromState(w.itemRng);
  let police = policeOf(w);
  const events: GameEvent[] = [...w.events];
  for (const h of hazards) {
    const fx = police.effects; // current: two overlapping pools never hit twice in the same step
    if (!over(police, h)) continue;
    const side: -1 | 1 = rng.next() < 0.5 ? -1 : 1;
    if (h.kind === 'oil' && w.time >= fx.skidUntil) {
      // skids (no damage) and loses grip: 30% of its speed, like hitting the curb
      police = {
        ...police,
        speed: police.speed * (1 - I.oil.speedLoss),
        effects: { ...police.effects, skidUntil: w.time + I.oil.skidTime, skidSide: side },
      };
      events.push({ type: 'oilSkid', role: 'police', s: police.s, x: police.x });
    } else if (h.kind === 'spikes' && w.time >= fx.flatUntil) {
      const time = strong(w) ? I.spikes.flatTimeStrong : I.spikes.flatTime;
      police = { ...police, effects: { ...police.effects, flatUntil: w.time + time, flatSide: side } };
      events.push({ type: 'tirePop', role: 'police', s: police.s, x: police.x });
    }
  }
  return { ...withCar(w, 'police', police), hazards, events, itemRng: rng.state() };
}

/**
 * Skidding on oil, a flat tire or a failing engine: no catch-up turbo for the police while it lasts
 * (otherwise the turbo cancels the effect and the police never really falls behind). The ram is not affected.
 */
export const policeSlowed = (w: WorldState): boolean => {
  const fx = policeOf(w).effects;
  return w.time < Math.max(fx.skidUntil, fx.flatUntil, fx.slowUntil);
};

/** End scenes: no hazards, bombs or effects left (nothing can hurt or steer the cars any more). */
export function clearForScene(w: WorldState): WorldState {
  const clean = (r: Role) => {
    const c = r === 'police' ? policeOf(w) : thiefOf(w);
    return { ...c, effects: NO_EFFECTS, mystery: null };
  };
  return { ...withCar(withCar(w, 'police', clean('police')), 'thief', clean('thief')), hazards: [], bombs: [], projectiles: [] };
}
