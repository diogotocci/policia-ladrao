// Traffic: a few slow cars (50–70% of cruise) that sometimes change lanes, recycled ahead.
import { BALANCE, type Difficulty, type Mode } from '../config/balance';
import { createRngFromState } from './rng';
import type { TrafficCar, WorldState } from './types';
import { policeOf, thiefOf } from './world';

const LANES = BALANCE.road.laneCenters;

/** How many traffic cars to keep at the level: 3 at level 1, +8% per level. */
export function trafficTarget(level: number, difficulty: Difficulty = 'normal', chaos = 1, mode: Mode = 'pursuit'): number {
  const t = BALANCE.traffic;
  const n = Math.max(
    1,
    Math.round(
      t.baseCount *
        (1 + t.perLevel * (level - 1)) *
        BALANCE.difficulties[difficulty].traffic *
        (mode === 'survival' ? BALANCE.survival.trafficBase : 1) *
        (1 + BALANCE.survival.trafficPerChaos * (chaos - 1)),
    ),
  );
  return Math.min(t.maxCount, n);
}

const sameLane = (ax: number, bx: number) => Math.abs(ax - bx) < 2 * BALANCE.car.halfWidth;

/** Roadworks closing lane `x` between s - 20 and s + `ahead` (V2 part 3). */
const closedAhead = (w: WorldState, x: number, s: number, ahead: number) =>
  w.works.find((wk) => sameLane(BALANCE.road.laneCenters[wk.lane], x) && wk.s + wk.length > s - 20 && wk.s - s < ahead);

/** Is a traffic car at (s, x) touching a closed lane? */
const besideWorks = (w: WorldState, s: number, x: number) =>
  w.works.some(
    (wk) =>
      s > wk.s - BALANCE.car.length / 2 &&
      s < wk.s + wk.length + BALANCE.car.length / 2 &&
      Math.abs(x - BALANCE.road.laneCenters[wk.lane]) < 1.45,
  );

export function stepTraffic(w: WorldState, dt: number): WorldState {
  const T = BALANCE.traffic;
  const rng = createRngFromState(w.trafficRng);
  const police = policeOf(w);
  const thief = thiefOf(w);
  const back = Math.min(police.s, thief.s);
  const front = Math.max(police.s, thief.s);

  // move and change lanes — front to back: each car already knows the new position of the one ahead.
  // Never passes through another (follows the one ahead in the same lane) and only changes lanes with free space.
  const L = BALANCE.car.length;
  const overlapsLane = (o: TrafficCar, x: number) => sameLane(o.x, x) || sameLane(o.targetX, x);
  const order = [...w.traffic].sort((a, b) => b.s - a.s || a.id - b.id);
  const moved: TrafficCar[] = [];
  for (const t of order) {
    let targetX = t.targetX;
    // roadworks ahead in its lane: moves over (towards the center) in time
    const closed = closedAhead(w, targetX, t.s, 70);
    if (closed) {
      // the next lane towards the center, or the other side when that one is closed too (works close together)
      const lane = LANES.indexOf(targetX as (typeof LANES)[number]);
      const sides = (lane <= 1 ? [lane + 1, lane - 1] : [lane - 1, lane + 1]).filter((l) => l >= 0 && l < LANES.length);
      targetX = LANES[sides.find((l) => !closedAhead(w, LANES[l]!, t.s, 70)) ?? sides[0]!]!;
    }
    if (Math.abs(t.x - targetX) < 0.01 && rng.next() < T.laneChangePerSecond * dt) {
      const lane = LANES.indexOf(targetX as (typeof LANES)[number]);
      const options = [lane - 1, lane + 1].filter((l) => l >= 0 && l < LANES.length);
      const pick = LANES[options[rng.int(0, options.length - 1)]!]!;
      const free =
        ![...moved, ...order].some((o) => o.id !== t.id && overlapsLane(o, pick) && Math.abs(o.s - t.s) < T.minGap) &&
        ![police, thief].some((g) => sameLane(g.x, pick) && Math.abs(g.s - t.s) < T.minGap);
      if (free && !closedAhead(w, pick, t.s, 90)) targetX = pick;
    }
    const dx = targetX - t.x;
    let x = t.x + Math.sign(dx) * Math.min(Math.abs(dx), T.laneChangeSpeed * dt);
    // doesn't cut off anyone alongside (another car, police or thief)
    const L0 = BALANCE.car.length + 0.5;
    if (
      dx !== 0 &&
      (
        [...moved, ...order.filter((o) => o.id !== t.id && !moved.some((m) => m.id === o.id)), police, thief] as { s: number; x: number }[]
      ).some((o) => Math.abs(o.s - t.s) < L0 && Math.abs(o.x - x) < 2 * BALANCE.car.halfWidth && Math.abs(o.x - t.x) >= Math.abs(o.x - x))
    )
      x = t.x;
    // never slides sideways into a closed lane alongside (cones of works next to it)
    if (dx !== 0 && besideWorks(w, t.s, x) && !besideWorks(w, t.s, t.x)) x = t.x;
    // the one ahead in the same lane (already moved this step) — including stopped/braking police and thief (end scenes)
    let leader: { s: number; speed: number } | undefined;
    for (const o of moved) if ((overlapsLane(o, x) || overlapsLane(o, targetX)) && o.s >= t.s && (!leader || o.s < leader.s)) leader = o;
    for (const g of [police, thief])
      if ((sameLane(g.x, x) || sameLane(g.x, targetX)) && g.s >= t.s && (!leader || g.s < leader.s)) leader = g;
    let s = t.s + t.speed * dt;
    // could not move over yet: waits before the cones instead of driving into them
    const blockedBy = w.works.find((wk) => sameLane(BALANCE.road.laneCenters[wk.lane], x) && wk.s + wk.length > t.s && wk.s >= t.s - 1);
    if (blockedBy) s = Math.max(t.s, Math.min(s, blockedBy.s - L / 2 - 1));
    if (leader) {
      const gap = leader.s - t.s;
      if (gap < T.minGap) s = Math.min(s, t.s + Math.min(t.speed, leader.speed) * dt); // keeps pace with the one ahead
      s = Math.min(s, leader.s - (L + 1)); // never touches
      s = Math.max(t.s - 0.0, s); // doesn't move backward
    }
    moved.push({ ...t, s, x, targetX });
  }
  let cars: TrafficCar[] = moved.sort((a, b) => a.id - b.id);

  // recycle those left behind (or too far ahead)
  cars = cars.filter((t) => t.s > back - T.despawnBehind && t.s < front + T.spawnAheadMax + 200);

  // fill up to the level's density
  let nextId = w.nextTrafficId;
  const target = w.trafficOn ? trafficTarget(w.level, w.difficulty, w.chaos, w.mode) : 0;
  let attempts = 0;
  while (cars.length < target && attempts < 20) {
    attempts++;
    const s = front + rng.range(T.spawnAheadMin, T.spawnAheadMax);
    const x = LANES[rng.int(0, LANES.length - 1)]!;
    const tooClose =
      cars.some((o) => sameLane(o.x, x) && Math.abs(o.s - s) < T.minGap) ||
      [police, thief].some((g) => sameLane(g.x, x) && Math.abs(g.s - s) < T.minGapToGameCar) ||
      [...w.boxes, ...w.bombs].some((o) => sameLane(o.x, x) && Math.abs(o.s - s) < T.minGapToItem) ||
      closedAhead(w, x, s, 120) !== undefined;
    if (tooClose) continue;
    const speed = BALANCE.movement.cruise.police * rng.range(T.speedMin, T.speedMax);
    cars.push({ id: nextId++, s, x, speed, targetX: x, model: rng.int(0, 3) });
  }

  return { ...w, traffic: cars, nextTrafficId: nextId, trafficRng: rng.state() };
}
