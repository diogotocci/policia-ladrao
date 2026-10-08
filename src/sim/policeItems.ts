// The police items (V2 part 3, spec §4.2). Roadblock: the police special (button), a patrol car across a lane
// 120 m ahead of the thief with spike strips next to it. Machine gun and backup patrol car act
// at once when picked. "Strong" times in Sobrevivência from chaos 3 (backup car: chaos 4).
import { BALANCE } from '../config/balance';
import type { CarState } from './car';
import { hurt, scaledDamage } from './chaos';
import { curvesBetween } from './curves';
import type { Intents } from './intents';
import { bumpsBetween } from './track';
import type { GameEvent, Hazard, ItemId, WorldState } from './types';
import { policeOf, thiefOf, withCar } from './world';

const I = BALANCE.items;
const R = I.roadblock;
const LANES = BALANCE.road.laneCenters;
const LANE_HALF = 1.5;
const L = BALANCE.car.length;
const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;

const laneIndex = (x: number): number => LANES.reduce((best, c, i) => (Math.abs(c - x) < Math.abs(LANES[best]! - x) ? i : best), 0);
const strongAt = (w: Pick<WorldState, 'mode' | 'chaos'>, from: number) => w.mode === 'survival' && w.chaos >= from;

/** Lanes blocked by a roadblock in front of a thief on lane `i`: the patrol car on `i`, spikes on the rest. */
export function roadblockLanes(i: number, free: number): { car: number; spikes: number[] } {
  const k = LANES.length - free;
  const start = Math.min(Math.max(i - (k === 2 ? (i <= 1 ? 0 : 1) : 1), 0), LANES.length - k);
  const lanes = Array.from({ length: k }, (_, j) => start + j);
  return { car: i, spikes: lanes.filter((l) => l !== i) };
}

/** Is [s, s + length] a free spot? Not on a speed bump (10 m), roadworks, a box or another hazard (6 m), nor in a sharp curve. */
function freeSpot(w: WorldState, s: number): boolean {
  const e = s + R.length;
  const near = (a: number, b: number, m: number) => a < e + m && b > s - m;
  return (
    bumpsBetween(w.seed, s - 10, e + 10).length === 0 &&
    !curvesBetween(w.seed, s, e).some((c) => c.sharp && near(c.start, c.start + c.length, 0)) &&
    !w.works.some((wk) => near(wk.s, wk.s + wk.length, 6)) &&
    !w.boxes.some((x) => near(x.s, x.s, 6)) &&
    !w.hazards.some((h) => near(h.s, h.s + h.length, 6))
  );
}

/** Places the roadblock (and its spikes) ahead of the thief; null when there is no free spot within 60 m. */
export function placeRoadblock(w: WorldState): WorldState | null {
  const thief = thiefOf(w);
  let s = thief.s + R.ahead;
  while (!freeSpot(w, s)) {
    s += 5;
    if (s > thief.s + R.ahead + R.search) return null;
  }
  const free = w.mode === 'survival' && w.chaos >= 2 ? R.freeLanesFromChaos2 : R.freeLanes;
  const { car, spikes } = roadblockLanes(laneIndex(thief.x), free);
  const id = w.nextHazardId;
  const piece = (kind: Hazard['kind'], lane: number, k: number): Hazard => ({
    id: id + k,
    kind,
    target: 'thief',
    group: id,
    s: kind === 'roadblock' ? s : s + (R.length - R.spikesLength) / 2,
    length: kind === 'roadblock' ? R.length : R.spikesLength,
    xFrom: LANES[lane]! - LANE_HALF,
    xTo: LANES[lane]! + LANE_HALF,
    expiresAt: w.time + 120, // removed when the thief passes; this is only a safety net
  });
  const hazards = [piece('roadblock', car, 0), ...spikes.map((l, k) => piece('spikes', l, k + 1))];
  return { ...w, hazards: [...w.hazards, ...hazards], nextHazardId: id + hazards.length };
}

/** The police presses the special button (rising edge): the roadblock (no free spot = the charge stays) or the nitro. */
export function usePoliceSpecial(w: WorldState, intents: Intents): WorldState {
  const pressed = intents.bomb && !w.policeSpecialHeld;
  const out: WorldState = { ...w, policeSpecialHeld: intents.bomb };
  const police = policeOf(out);
  const sp = police.upgrades.special;
  if (!pressed || !sp || sp.charges <= 0) return out;
  if (sp.kind === 'nitro') {
    // kept nitro (playtest 2026-10-09): fired with the button, one charge each time
    const left = sp.charges - 1;
    const boosted: CarState = {
      ...police,
      upgrades: {
        ...police.upgrades,
        nitroUntil: out.time + BALANCE.items.police.nitroTime,
        special: left > 0 ? { ...sp, charges: left } : null,
      },
    };
    return {
      ...withCar(out, 'police', boosted),
      events: [...out.events, { type: 'special', role: 'police', kind: 'nitro', s: police.s, x: police.x }],
    };
  }
  if (sp.kind !== 'roadblock') return out;
  const placed = placeRoadblock(out);
  if (!placed) return { ...out, events: [...out.events, { type: 'roadblockNoRoom' }] };
  const left = sp.charges - 1;
  const spent: CarState = { ...police, upgrades: { ...police.upgrades, special: left > 0 ? { ...sp, charges: left } : null } };
  return {
    ...withCar(placed, 'police', spent),
    events: [...placed.events, { type: 'special', role: 'police', kind: 'roadblock', s: police.s, x: police.x }],
  };
}

/** Crashing into the roadblock patrol car: −15 and loses speed like on the curb, then drives through (1 s immunity). */
export function hitRoadblock(w: WorldState, car: CarState, _h: Hazard): { car: CarState; w: WorldState } {
  // like the curb (playtest 2026-10-07: holding the car before it got it stuck): a real crash (damage, a hard speed
  // loss, sparks) once per immunity window per car, and the car drives on through (playtest 2026-10-08: it felt like
  // passing through nothing). The police crashes into it too if it does not dodge.
  const key = `roadblock:${car.role}`;
  if ((w.immunity[key] ?? 0) > 0) return { car, w };
  const events: GameEvent[] = [
    ...w.events,
    { type: 'roadblockHit', s: car.s, x: car.x },
    { type: 'crash', a: car.role, b: 'works', s: car.s, x: car.x },
    { type: 'hit', target: car.role, amount: scaledDamage(R.damage, w, car.role), s: car.s, x: car.x },
  ];
  const slowed: CarState = { ...car, speed: car.speed * (1 - R.speedLoss) };
  return { car: hurt(slowed, R.damage, w), w: { ...w, events, immunity: { ...w.immunity, [key]: BALANCE.collision.immunity } } };
}

/** Roadblocks both cars already passed are removed (with their spikes): the police can crash into it too. */
export function clearPassedRoadblocks(w: WorldState): WorldState {
  const last = Math.min(thiefOf(w).s, policeOf(w).s);
  const passed = new Set(w.hazards.filter((h) => h.kind === 'roadblock' && last > h.s + h.length + R.gone).map((h) => h.id));
  if (passed.size === 0) return w;
  return { ...w, hazards: w.hazards.filter((h) => !(h.group !== undefined && passed.has(h.group))) };
}

/** Machine gun and backup car act at once when picked (times by chaos). */
export function applyPoliceItem(car: CarState, item: ItemId, time: number, w?: Pick<WorldState, 'mode' | 'chaos'>): CarState {
  const s3 = !!w && strongAt(w, I.strongFromChaos);
  const u = { ...car.upgrades };
  if (item === 'machineGun') u.mgUntil = time + (s3 ? I.machineGun.timeStrong : I.machineGun.time);
  else if (item === 'wingman')
    u.wingmanUntil = time + (w && strongAt(w, I.wingman.timeStrongFromChaos) ? I.wingman.timeStrong : I.wingman.time);
  return { ...car, upgrades: u };
}

/**
 * Backup patrol car: comes from 25 m behind the thief on the lane next to it, keeps alongside and hits its side
 * (−6, pushed 1.5 m), at most once every 2 s; when the time is up it slows down and leaves behind the police.
 */
export function stepWingman(w: WorldState, dt: number): WorldState {
  const police = policeOf(w);
  let thief = thiefOf(w);
  const W = I.wingman;
  const active = w.time < police.upgrades.wingmanUntil;
  let wm = w.wingman;
  const events: GameEvent[] = [...w.events];
  if (!wm && active) {
    const side = thief.x > 0 ? -1 : 1;
    wm = {
      s: thief.s - W.behind,
      x: Math.max(-EDGE, Math.min(EDGE, thief.x + side * 3)),
      speed: thief.speed + W.catchUp,
      until: police.upgrades.wingmanUntil,
      nextHitAt: w.time,
    };
  }
  if (!wm) return w;
  // a second backup car picked while this one is out: it stays longer
  if (active && police.upgrades.wingmanUntil > wm.until) wm = { ...wm, until: police.upgrades.wingmanUntil };
  const staying = w.time < wm.until;
  const gap = thief.s - wm.s;
  const speed = staying ? thief.speed + Math.max(-W.catchUp, Math.min(W.catchUp, gap * 1.5)) : Math.max(0, thief.speed - 20);
  const side = wm.x < thief.x ? -1 : 1;
  const alongside = Math.abs(gap) < L;
  // alongside and allowed to hit: closes in until the sides touch; otherwise keeps a lane away
  const touch = 2 * BALANCE.car.halfWidth - 0.05;
  const want = Math.max(-EDGE, Math.min(EDGE, thief.x + side * (staying && alongside && w.time >= wm.nextHitAt ? touch : 3)));
  const x = wm.x + Math.sign(want - wm.x) * Math.min(Math.abs(want - wm.x), 4 * dt);
  let next = { ...wm, s: wm.s + speed * dt, x, speed };
  let out: WorldState = w;
  if (staying && alongside && thief.airTime <= 0 && w.time >= wm.nextHitAt && Math.abs(x - thief.x) <= touch + 0.02) {
    // pushed away, but never onto the curb nor into closed lanes (works, roadblock): only up to the free room
    let pushed = Math.max(-EDGE + 0.4, Math.min(EDGE - 0.4, thief.x - side * W.push));
    const blocked = (px: number) =>
      w.works.some(
        (wk) => thief.s >= wk.s - L && thief.s <= wk.s + wk.length && Math.abs(px - LANES[wk.lane]!) < LANE_HALF + BALANCE.car.halfWidth,
      ) ||
      w.hazards.some(
        (hz) =>
          hz.kind === 'roadblock' &&
          thief.s + L / 2 > hz.s - 1 &&
          thief.s - L / 2 < hz.s + hz.length &&
          px + BALANCE.car.halfWidth > hz.xFrom &&
          px - BALANCE.car.halfWidth < hz.xTo,
      );
    if (blocked(pushed)) pushed = thief.x;
    thief = hurt({ ...thief, x: pushed }, W.damage, w);
    events.push({ type: 'wingmanHit', s: thief.s, x: thief.x });
    events.push({ type: 'hit', target: 'thief', amount: scaledDamage(W.damage, w, 'thief'), s: thief.s, x: thief.x });
    next = { ...next, nextHitAt: w.time + W.every };
    out = withCar(out, 'thief', thief);
  }
  // leaving: slows down and is gone once the police passed it (or it is far behind the thief)
  const gone = !staying && (next.s < police.s - 30 || next.s < thief.s - 200);
  return { ...out, wingman: gone ? null : next, events };
}
