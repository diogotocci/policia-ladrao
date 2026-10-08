// AI for both sides. Pure given the rng; memory (lateral target, timers) lives in the world.
// Delivery 3: dodges traffic, speed bumps (with a level-based chance) and bombs; seeks item boxes; thief drops bombs.
import { BALANCE, type Role } from '../config/balance';
import type { Rng } from './rng';
import { NO_INTENTS, type Intents } from './intents';
import { curvesBetween } from './curves';
import { bumpXRange, bumpsBetween } from './track';
import type { WorldState } from './types';
import { policeOf, thiefOf } from './world';

export interface AiMemory {
  /** x the AI is heading to */
  targetX: number;
  /** next time (s) to re-evaluate */
  nextDecisionAt: number;
  /** brakes until this time (s) */
  brakeUntil: number;
  /** since when (s) the police has been lined up behind the thief; -1 = not lined up */
  linedSince: number;
  /** speed bump already evaluated (s) and whether the AI decided to dodge it */
  bumpS: number;
  dodgeBump: boolean;
  /** next time (s) the thief may drop a bomb */
  nextBombAt: number;
  /** bombs already evaluated by the police: id → will dodge? (rolled once per bomb) */
  bombDodge: Record<number, boolean>;
  /** oil and spikes already evaluated by the police: id → will dodge? */
  hazardDodge: Record<number, boolean>;
  /** the thief's life last step and when it last dropped (uses the smoke when being hit) */
  lastHp: number;
  hurtAt: number;
  /** police ramming the thief until this instant (s); 0 = not ramming */
  ramUntil: number;
  /** sharp curve already evaluated (start in s), whether it will brake and how many meters late it starts */
  curveS: number;
  curveBrake: boolean;
  curveLate: number;
}

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
const LANES = BALANCE.road.laneCenters;
const DEADZONE = 0.15;
const W = BALANCE.car.halfWidth;

/** 0 at level 1 → 1 at max level */
const skill = (level: number) => (Math.min(level, BALANCE.difficulty.maxLevel) - 1) / (BALANCE.difficulty.maxLevel - 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initialAiMemory(role: Role, w: WorldState): AiMemory {
  const me = role === 'police' ? policeOf(w) : thiefOf(w);
  return {
    targetX: me.x,
    nextDecisionAt: 0,
    brakeUntil: 0,
    linedSince: -1,
    bumpS: -1,
    dodgeBump: false,
    nextBombAt: 0,
    bombDodge: {},
    hazardDodge: {},
    lastHp: me.hp,
    hurtAt: -1,
    curveS: -1,
    curveBrake: false,
    curveLate: 0,
    ramUntil: 0,
  };
}

function steerTo(x: number, targetX: number): Pick<Intents, 'left' | 'right'> {
  const dx = targetX - x;
  if (Math.abs(dx) < DEADZONE) return { left: false, right: false };
  // never steers further into the edge
  if (dx > 0 && x >= EDGE - 0.6) return { left: false, right: false };
  if (dx < 0 && x <= -EDGE + 0.6) return { left: false, right: false };
  return { left: dx < 0, right: dx > 0 };
}

const nearestLane = (x: number) => LANES.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));

/**
 * Danger ahead in a lane: traffic (35 m), bombs the police decided to avoid (60 m),
 * item box of the other color (40 m).
 */
function laneBlocked(w: WorldState, role: Role, s: number, laneX: number, mem?: AiMemory): boolean {
  const inLane = (x: number) => Math.abs(x - laneX) < 2 * W;
  if (w.traffic.some((t) => inLane(t.x) && t.s > s - 3 && t.s - s < 35)) return true;
  if (
    role === 'police' &&
    w.bombs.some((b) => mem?.bombDodge[b.id] && (inLane(b.x) || (b.x2 !== undefined && inLane(b.x2))) && b.s > s && b.s - s < 60)
  )
    return true;
  // hazards aimed at this car that it decided to avoid (thief's oil and spikes; police roadblock and its spikes)
  if (
    w.hazards.some(
      (h) => h.target === role && mem?.hazardDodge[h.id] && laneX + W > h.xFrom && laneX - W < h.xTo && h.s + h.length > s && h.s - s < 60,
    )
  )
    return true;
  // roadworks: seen earlier the better the computer (20 m at level 1, 60 m at level 10)
  const sees = lerp(20, 60, skill(w.level));
  if (w.works.some((wk) => inLane(BALANCE.road.laneCenters[wk.lane]) && wk.s + wk.length > s && wk.s - s < sees)) return true;
  const wrong = role === 'police' ? 'red' : 'blue';
  if (w.boxes.some((b) => b.color === wrong && inLane(b.x) && b.s > s && b.s - s < 40)) return true;
  return false;
}

/** Does the speed bump the AI decided to avoid (if any) cover this lane? */
function bumpCovers(w: WorldState, s: number, laneX: number, mem: AiMemory): boolean {
  if (!mem.dodgeBump || mem.bumpS < s) return false;
  const b = bumpsBetween(w.seed, mem.bumpS - 0.5, mem.bumpS + 0.5)[0];
  if (!b) return false;
  const [a, z] = bumpXRange(b);
  return laneX + W > a && laneX - W < z;
}

/** Picks a danger-free lane, the closest to the desired one, without crossing lanes with danger on the way. */
function safeLane(w: WorldState, role: Role, s: number, fromX: number, wantX: number, mem: AiMemory): number {
  const free = (x: number) => !laneBlocked(w, role, s, x, mem) && !bumpCovers(w, s, x, mem);
  const pathClear = (to: number) => LANES.filter((x) => x >= Math.min(fromX, to) - 1.4 && x <= Math.max(fromX, to) + 1.4).every(free);
  const ranked = [...LANES].sort((a, b) => Math.abs(a - wantX) - Math.abs(b - wantX));
  return ranked.find((x) => pathClear(x)) ?? ranked.find(free) ?? nearestLane(fromX);
}

/** Evaluates (once) the next speed bump within 60 m: dodges with a level-based chance. */
function considerBump(w: WorldState, s: number, rng: Rng, mem: AiMemory, k: number): AiMemory {
  const next = bumpsBetween(w.seed, s + 1, s + 60)[0];
  if (!next || next.s === mem.bumpS) return mem;
  return { ...mem, bumpS: next.s, dodgeBump: rng.next() < lerp(0.5, 0.97, k) };
}

/** The police evaluates each bomb once when it sees it (60 m): dodges with chance 0.4 (level 1) → 0.92 (level 10). */
function considerBombs(w: WorldState, s: number, rng: Rng, mem: AiMemory, k: number): AiMemory {
  let changed = false;
  const next: Record<number, boolean> = {};
  for (const b of w.bombs) {
    if (b.id in mem.bombDodge) next[b.id] = mem.bombDodge[b.id]!;
    else if (b.s > s && b.s - s < 60) {
      next[b.id] = rng.next() < lerp(0.4, 0.92, k);
      changed = true;
    }
  }
  if (!changed && Object.keys(next).length === Object.keys(mem.bombDodge).length) return mem;
  return { ...mem, bombDodge: next };
}

/**
 * Same for the hazards aimed at this car (V2 part 3): oil and spikes for the police, the roadblock for the thief
 * (a whole patrol car with a sign before it: seen more easily).
 */
function considerHazards(w: WorldState, role: Role, s: number, rng: Rng, mem: AiMemory, k: number): AiMemory {
  let changed = false;
  const next: Record<number, boolean> = {};
  for (const h of w.hazards) {
    if (h.target !== role) continue;
    if (h.id in mem.hazardDodge) next[h.id] = mem.hazardDodge[h.id]!;
    else if (h.s > s && h.s - s < 60) {
      next[h.id] = rng.next() < (h.group !== undefined ? lerp(0.6, 0.97, k) : lerp(0.4, 0.92, k));
      changed = true;
    }
  }
  if (!changed && Object.keys(next).length === Object.keys(mem.hazardDodge).length) return mem;
  return { ...mem, hazardDodge: next };
}

const CURVE_LOOKAHEAD = 70; // m

/**
 * Braking for sharp curves: evaluates each curve once (will it brake? how many meters late does it start?) and
 * brakes when the distance to the curve gets shorter than the braking distance to the safe speed.
 */
function curveBraking(w: WorldState, s: number, speed: number, rng: Rng, mem: AiMemory, k: number): { brake: boolean; memory: AiMemory } {
  if (!w.curvesOn) return { brake: false, memory: mem };
  const c = curvesBetween(w.seed, s, s + CURVE_LOOKAHEAD).find((x) => x.sharp && x.start + x.length * 0.75 > s);
  if (!c) return { brake: false, memory: mem };
  let m = mem;
  if (m.curveS !== c.start) {
    // level 1: sometimes doesn't brake at all and, when it does, starts up to 40 m late; level 10: almost always gets it right
    m = { ...m, curveS: c.start, curveBrake: rng.next() < lerp(0.5, 0.99, k), curveLate: rng.range(0, 1) * lerp(30, 3, k) };
  }
  if (!m.curveBrake) return { brake: false, memory: m };
  const vSafe = Math.sqrt(BALANCE.curves.grip * 0.95 * c.radius);
  if (speed <= vSafe) return { brake: false, memory: m };
  const dist = c.start + c.length * BALANCE.curves.ramp * 0.5 - s; // where the curve already tightens
  const need = (speed * speed - vSafe * vSafe) / (2 * BALANCE.movement.brakeDecel);
  return { brake: dist - m.curveLate <= need + 2 || dist < 0, memory: m };
}

export function aiStep(w: WorldState, role: Role, rng: Rng, memory: AiMemory): { intents: Intents; memory: AiMemory } {
  const me = role === 'police' ? policeOf(w) : thiefOf(w);
  const foe = role === 'police' ? thiefOf(w) : policeOf(w);
  const k = skill(w.level);
  let mem = considerBump(w, me.s, rng, memory, k);
  if (role === 'police') mem = considerBombs(w, me.s, rng, mem, k);
  mem = considerHazards(w, role, me.s, rng, mem, k);

  // danger in the current lane (or the target one): reacts now, without waiting for the next decision
  const myLane = nearestLane(mem.targetX);
  const here = nearestLane(me.x);
  const danger =
    laneBlocked(w, role, me.s, myLane, mem) ||
    bumpCovers(w, me.s, myLane, mem) ||
    (here !== myLane && laneBlocked(w, role, me.s, here, mem));

  if (role === 'police') {
    if (danger || w.time >= mem.nextDecisionAt) {
      // reaction: 0.8 s at level 1 → 0.25 s at level 10; aims at the thief's lane (closes in to hit when near)
      const reaction = lerp(0.8, 0.25, k) * rng.range(0.8, 1.2);
      const box = w.boxes.find((b) => b.color === 'blue' && b.s > me.s + 10 && b.s - me.s < 120);
      const want = box && Math.abs(foe.s - me.s) > 30 ? box.x : Math.max(-EDGE + 0.3, Math.min(EDGE - 0.3, foe.x));
      mem = { ...mem, targetX: safeLane(w, role, me.s, me.x, want, mem), nextDecisionAt: w.time + reaction };
      // ram: close, almost aligned and with turbo released → accelerates to hit
      const gap = foe.s - me.s;
      const A = BALANCE.ai;
      if (
        w.time >= mem.ramUntil &&
        w.time >= w.policeTurboOffUntil &&
        gap > A.ramMinGap &&
        gap < A.ramRange &&
        Math.abs(foe.x - me.x) < 3.2 &&
        !danger &&
        rng.next() < lerp(A.ramChance[0], A.ramChance[1], k)
      )
        mem = { ...mem, ramUntil: w.time + A.ramTime };
    }
    if (w.time < mem.ramUntil) {
      // ramming: aims at the thief's lane the whole time; stops if it hit (penalty) or if he pulled too far ahead
      // danger ahead (traffic, bomb, speed bump) takes priority over the ram
      if (danger || w.time < w.policeTurboOffUntil || foe.s - me.s > BALANCE.ai.ramRange + 10) mem = { ...mem, ramUntil: 0 };
      else mem = { ...mem, targetX: Math.max(-EDGE + 0.3, Math.min(EDGE - 0.3, foe.x)) };
    }
    const cb = curveBraking(w, me.s, me.speed, rng, mem, k);
    // roadblock: with the thief 40-150 m ahead
    let block = false;
    const gapAhead = foe.s - me.s;
    if (me.upgrades.special?.kind === 'roadblock' && gapAhead > 40 && gapAhead < 150 && w.time >= cb.memory.nextBombAt) {
      block = !w.policeSpecialHeld;
      if (block) cb.memory = { ...cb.memory, nextBombAt: w.time + lerp(5, 2, k) };
    }
    return { intents: { ...NO_INTENTS, ...steerTo(me.x, mem.targetX), fire: true, brake: cb.brake, bomb: block }, memory: cb.memory };
  }

  // thief
  const behind = me.s - foe.s;
  const lined = Math.abs(foe.x - me.x) < 1.6 && behind > 0 && behind < 80;
  const linedSince = lined ? (mem.linedSince < 0 ? w.time : mem.linedSince) : -1;
  // time to notice it is being targeted: 1.0 s at level 1 → 0.2 s at level 10
  const reaction = lerp(1.0, 0.2, k);
  const dodge = lined && w.time - linedSince >= reaction;
  mem = { ...mem, linedSince };
  if (danger || dodge || w.time >= mem.nextDecisionAt) {
    const interval = lerp(1.6, 0.6, k) * rng.range(0.7, 1.3);
    let want = mem.targetX;
    const box = w.boxes.find((b) => b.color === 'red' && b.s > me.s + 10 && b.s - me.s < 120);
    const sp = me.upgrades.special;
    // with a bomb: moves into the police's lane to drop it in front of them (oil, spikes and smoke are used
    // only when the police lines up by itself: hunting all the time would keep the thief in the line of fire)
    const hunting = sp?.kind === 'bomb' && behind > 0 && behind < 110;
    if (hunting) want = foe.x;
    else if (box && !dodge) want = box.x;
    else if (dodge || rng.next() < 0.25) {
      // goes to a lane far from the police (with a bit of randomness)
      const options = LANES.filter((x) => Math.abs(x - me.x) > 1);
      const scored = options.map((x) => ({ x, score: Math.abs(x - foe.x) + rng.range(0, 2.5) }));
      scored.sort((a, b) => b.score - a.score);
      want = scored[0]?.x ?? want;
    }
    let brakeUntil = mem.brakeUntil;
    // police right behind in the same lane: sometimes brakes to cause a crash
    if (lined && behind < 12 && rng.next() < lerp(0.05, 0.25, k)) brakeUntil = w.time + 0.4;
    mem = {
      ...mem,
      targetX: safeLane(w, role, me.s, me.x, want, mem),
      nextDecisionAt: w.time + interval,
      brakeUntil,
      linedSince: dodge ? -1 : linedSince,
    };
  }

  // special: bomb with the police lined up behind within 110 m (it lasts 20 s), oil and spikes 30-80 m behind,
  // smoke when it was hit in the last second
  const hurtAt = me.hp < mem.lastHp ? w.time : mem.hurtAt;
  mem = { ...mem, lastHp: me.hp, hurtAt };
  let bomb = false;
  const sp = me.upgrades.special;
  if (sp && w.time >= mem.nextBombAt) {
    const reach = sp.kind === 'bomb' ? 110 : 80;
    const lined = Math.abs(foe.x - me.x) < 1.6;
    // oil and spikes 30-80 m behind: far enough for the police to see them coming (closer, the ram decides)
    const use =
      sp.kind === 'smoke'
        ? (hurtAt >= 0 && w.time - hurtAt < 1 && behind > 0) || (lined && behind > 4 && behind < 50)
        : lined && behind > (sp.kind === 'bomb' ? 4 : 30) && behind < reach;
    if (use) {
      bomb = !w.bombHeld; // rising edge
      if (bomb) mem = { ...mem, nextBombAt: w.time + lerp(4, 1.5, k) };
    }
  }

  const cb = curveBraking(w, me.s, me.speed, rng, mem, k);
  mem = cb.memory;
  return {
    intents: {
      ...NO_INTENTS,
      ...steerTo(me.x, mem.targetX),
      brake: w.time < mem.brakeUntil || cb.brake,
      fire: me.hasGun,
      bomb,
    },
    memory: mem,
  };
}
