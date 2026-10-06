import { BALANCE, type Role } from '../config/balance';
import { aiStep } from './ai';
import { createCar, stepCar, type CarState } from './car';
import { resolveCollisions } from './collisions';
import type { Intents } from './intents';
import { fireWeapons, stepProjectiles } from './projectiles';
import { enforceNoOvertake, pursuitBonus } from './pursuit';
import { createRngFromState } from './rng';
import { levelAt } from './rules';
import { curvatureAt } from './curves';
import { stepJump } from './track';
import { stepTraffic } from './traffic';
import { applyItem, stepBoxes } from './items';
import { dropBomb, stepBombs } from './bombs';
import type { ItemId, WorldState } from './types';

export type { Bomb, Box, GameEvent, ItemId, MatchState, Projectile, TrafficCar, WorldState } from './types';

export const policeOf = (w: WorldState): CarState => (w.playerRole === 'police' ? w.player : w.opponent);
export const thiefOf = (w: WorldState): CarState => (w.playerRole === 'thief' ? w.player : w.opponent);

/** Returns the world with the car of role `role` replaced. */
export function withCar(w: WorldState, role: Role, car: CarState): WorldState {
  return w.playerRole === role ? { ...w, player: car } : { ...w, opponent: car };
}

export function createWorld(opts: {
  seed: number;
  playerRole: Role;
  debugHp?: { police?: number; thief?: number };
  /** items given to the player at the start (debug/tests only) */
  debugGive?: ItemId[];
  traffic?: boolean;
  /** curves (Delivery 6); false = straight road (tests/debug ?curves=0) */
  curves?: boolean;
  /** escape time (s); default BALANCE.match.escapeTime — lower only in debug/e2e (?escape=N) */
  escapeTime?: number;
}): WorldState {
  const police: CarState = { ...createCar('police', 1, 0), hasGun: true, hp: opts.debugHp?.police ?? BALANCE.hp };
  const thief: CarState = { ...createCar('thief', 2, 40), hp: opts.debugHp?.thief ?? BALANCE.hp };
  let player = opts.playerRole === 'police' ? police : thief;
  for (const item of opts.debugGive ?? []) player = applyItem(player, item, 0);
  const opponent = opts.playerRole === 'police' ? thief : police;
  return {
    seed: opts.seed,
    time: 0,
    level: 1,
    playerRole: opts.playerRole,
    player,
    opponent,
    projectiles: [],
    immunity: {},
    events: [],
    match: { over: false },
    aiRng: (opts.seed ^ 0x9e3779b9) >>> 0,
    traffic: [],
    trafficOn: opts.traffic ?? true,
    curvesOn: opts.curves ?? true,
    escapeTime: opts.escapeTime ?? BALANCE.match.escapeTime,
    boxes: [],
    bombs: [],
    nextBombId: 1,
    bombHeld: false,
    policeTurboOffUntil: 0,
    nextBoxId: 1,
    nextBoxAt: BALANCE.items.firstBoxAt,
    itemRng: (opts.seed ^ 0xc2b2ae35) >>> 0,
    nextTrafficId: 1,
    trafficRng: (opts.seed ^ 0x85ebca6b) >>> 0,
    ai: {
      police: {
        ramUntil: 0,
        targetX: police.x,
        nextDecisionAt: 0,
        brakeUntil: 0,
        linedSince: -1,
        bumpS: -1,
        dodgeBump: false,
        nextBombAt: 0,
        bombDodge: {},
        curveS: -1,
        curveBrake: false,
        curveLate: 0,
      },
      thief: {
        ramUntil: 0,
        targetX: thief.x,
        nextDecisionAt: 0,
        brakeUntil: 0,
        linedSince: -1,
        bumpS: -1,
        dodgeBump: false,
        nextBombAt: 0,
        bombDodge: {},
        curveS: -1,
        curveBrake: false,
        curveLate: 0,
      },
    },
  };
}

/**
 * One simulation step. `playerIntents = 'ai'` makes the AI drive the player's car too (AI × AI tests).
 * Order: AI → movement (police turbo) → collisions → no-overtake → shots → projectiles → time/level → end.
 */
export function stepWorld(w: WorldState, playerIntents: Intents | 'ai', dt: number): WorldState {
  // match over: nothing changes; only clears the last step's events so they are not repeated
  if (w.match.over) return w.events.length ? { ...w, events: [] } : w;
  if (w.match.escapeAt !== undefined) return stepEscape(w, dt);
  if (w.match.arrestAt !== undefined) return stepArrest(w, dt);
  const opponentRole: Role = w.playerRole === 'police' ? 'thief' : 'police';
  let out: WorldState = { ...w, events: [] };

  const rng = createRngFromState(w.aiRng);
  const ai = { ...w.ai };
  const opp = aiStep(out, opponentRole, rng, ai[opponentRole]);
  ai[opponentRole] = opp.memory;
  let mine: Intents;
  if (playerIntents === 'ai') {
    const me = aiStep(out, w.playerRole, rng, ai[w.playerRole]);
    ai[w.playerRole] = me.memory;
    mine = me.intents;
  } else {
    mine = playerIntents;
  }
  out = { ...out, ai, aiRng: rng.state() };
  const intents: Record<Role, Intents> = {
    police: w.playerRole === 'police' ? mine : opp.intents,
    thief: w.playerRole === 'thief' ? mine : opp.intents,
  };

  // police AI ram (never for a police car played by a human)
  const policeAi = playerIntents === 'ai' || w.playerRole !== 'police';
  const ram = policeAi && out.time < out.ai.police.ramUntil && out.time >= out.policeTurboOffUntil ? BALANCE.ai.ramBoost : 0;
  const bonus = pursuitBonus(out) + ram;
  const t0 = thiefOf(out);
  const p0 = policeOf(out);
  const kT = curvatureAt(w.seed, t0.s, w.curvesOn);
  const kP = curvatureAt(w.seed, p0.s, w.curvesOn);
  out = withCar(out, 'thief', stepJump(stepCar(t0, intents.thief, dt, { curvature: kT }), t0.s, w.seed, dt));
  out = withCar(out, 'police', stepJump(stepCar(p0, intents.police, dt, { speedBonus: bonus, curvature: kP }), p0.s, w.seed, dt));
  // skid start: event (tire sound, smoke from the wheels)
  for (const [before, now] of [
    [t0, thiefOf(out)],
    [p0, policeOf(out)],
  ] as const)
    if (now.skidding && !before.skidding) out = { ...out, events: [...out.events, { type: 'skid', role: now.role, s: now.s, x: now.x }] };
  out = stepTraffic(out, dt);
  out = resolveCollisions(out, dt);
  out = enforceNoOvertake(out);
  out = stepBoxes(out);
  out = dropBomb(out, intents.thief);
  out = stepBombs(out);
  // whoever reached zero life this step (crash, bomb, item box) no longer shoots
  if (policeOf(out).hp > 0 && thiefOf(out).hp > 0) {
    out = fireWeapons(out, intents, dt);
    out = stepProjectiles(out, dt);
  }
  const time = out.time + dt;
  out = { ...out, time, level: levelAt(time) };

  const policeDead = policeOf(out).hp <= 0;
  const thiefDead = thiefOf(out).hp <= 0;
  if (thiefDead && !policeDead) {
    // police won: arrest scene (the thief stops destroyed, the patrol car pulls up behind) before the end
    out = { ...out, projectiles: [], bombs: [], match: { over: false, arrestAt: time }, events: [...out.events, { type: 'arrest' }] };
  } else if (policeDead && !thiefDead) {
    // police destroyed: it stops (wrecked) and the thief drives away — same scene as the escape, with the win reason
    out = {
      ...out,
      projectiles: [],
      bombs: [],
      match: { over: false, escapeAt: time, reason: 'policeDown' },
      events: [...out.events, { type: 'escape' }],
    };
  } else if (policeDead || thiefDead) {
    // both in the same step → thief
    out = {
      ...out,
      match: { over: true, winner: 'thief', reason: 'policeDown', endTime: time },
      events: [...out.events, { type: 'end', winner: 'thief' }],
    };
  } else if (time >= w.escapeTime - 1e-9) {
    // 1:30 with both alive: the escape scene starts (shots in the air vanish)
    // exact instant of the limit (not the step's, which may come out as 89.9999…): escapes tie in the ranking
    out = {
      ...out,
      projectiles: [],
      bombs: [],
      match: { over: false, escapeAt: w.escapeTime },
      events: [...out.events, { type: 'escape' }],
    };
  }
  return out;
}

/** Arrest scene: no controls or combat; the thief brakes to a stop and the police stops right behind him. */
function stepArrest(w: WorldState, dt: number): WorldState {
  const M = BALANCE.match;
  const t = thiefOf(w);
  const p = policeOf(w);
  const land = (c: CarState) => Math.max(0, c.airTime - dt);
  const tSpeed = Math.max(0, t.speed - M.thiefStopDecel * dt);
  const ts = t.s + tSpeed * dt;
  // police: speed to reach the stopping point behind the thief (without passing), braking hard if needed
  const stopAt = ts - M.arrestGap;
  const room = Math.max(0, stopAt - p.s);
  const want = Math.min(BALANCE.movement.cruise.police * 1.2, Math.sqrt(2 * BALANCE.movement.brakeDecel * room));
  const pSpeed =
    want > p.speed
      ? Math.min(want, p.speed + BALANCE.movement.accel * 2 * dt)
      : Math.max(want, p.speed - BALANCE.movement.brakeDecel * 1.5 * dt);
  const ps = Math.min(p.s + pSpeed * dt, stopAt);
  // and stops in the lane beside (on the middle-of-the-road side), so the rear camera can see the wrecked thief
  const side = t.x > 0 ? -M.arrestSide : M.arrestSide;
  const dx = t.x + side - p.x;
  const px = p.x + Math.sign(dx) * Math.min(Math.abs(dx), 3 * dt);
  let out: WorldState = { ...w, events: [] };
  out = withCar(out, 'thief', { ...t, speed: tSpeed, s: ts, steer: 0, skidding: false, airTime: land(t) });
  out = withCar(out, 'police', {
    ...p,
    speed: ps > p.s ? pSpeed : 0,
    s: Math.max(p.s, ps),
    x: px,
    steer: 0,
    skidding: false,
    airTime: land(p),
  });
  out = stepTraffic(out, dt);
  const time = w.time + dt;
  out = { ...out, time };
  const arrestAt = w.match.arrestAt!;
  if (time >= arrestAt + M.arrestScene - 1e-9)
    out = {
      ...out,
      match: { over: true, winner: 'police', reason: 'thiefDown', endTime: arrestAt, arrestAt },
      events: [{ type: 'end', winner: 'police' }],
    };
  return out;
}

/** Escape scene: no controls or combat; the thief accelerates and vanishes, the police brakes. Then, the end. */
function stepEscape(w: WorldState, dt: number): WorldState {
  const M = BALANCE.match;
  const t = thiefOf(w);
  const p = policeOf(w);
  const vMax = BALANCE.movement.cruise.thief * M.escapeBoost;
  let tSpeed = Math.max(t.speed, Math.min(vMax, t.speed + M.escapeAccel * dt));
  // dodges traffic: goes to the clearest lane ahead; if a car is still right in front, follows behind it
  const L = BALANCE.car.length;
  const lanes = BALANCE.road.laneCenters;
  const freeAhead = (x: number) => {
    let d = 120;
    for (const c of w.traffic) if (Math.abs(c.x - x) < 2 * BALANCE.car.halfWidth + 0.4 && c.s > t.s - L) d = Math.min(d, c.s - t.s);
    return d;
  };
  const lane = lanes.reduce(
    (best, x) => {
      const db = freeAhead(best) - Math.abs(best - t.x) * 2;
      const dx = freeAhead(x) - Math.abs(x - t.x) * 2;
      return dx > db + 1 ? x : best;
    },
    lanes.reduce((a, x) => (Math.abs(x - t.x) < Math.abs(a - t.x) ? x : a)),
  );
  let tx = t.x + Math.sign(lane - t.x) * Math.min(Math.abs(lane - t.x), BALANCE.movement.lateralSpeed * dt);
  // doesn't cut off a car alongside
  if (w.traffic.some((c) => Math.abs(c.s - t.s) < L + 0.5 && Math.abs(c.x - tx) < 2 * BALANCE.car.halfWidth)) tx = t.x;
  let block: (typeof w.traffic)[number] | undefined;
  for (const c of w.traffic)
    if (Math.abs(c.x - tx) < 2 * BALANCE.car.halfWidth && c.s > t.s && c.s - t.s < L + 3 && (!block || c.s < block.s)) block = c;
  if (block) tSpeed = Math.min(tSpeed, block.speed);
  const pSpeed = Math.max(0, p.speed - BALANCE.movement.brakeDecel * dt);
  let out: WorldState = { ...w, events: [] };
  // whoever was airborne (speed bump) finishes the jump normally
  const land = (c: CarState) => Math.max(0, c.airTime - dt);
  out = withCar(out, 'thief', {
    ...t,
    speed: tSpeed,
    s: t.s + tSpeed * dt,
    x: tx,
    steer: Math.sign(tx - t.x) as -1 | 0 | 1,
    skidding: false,
    airTime: land(t),
  });
  out = withCar(out, 'police', { ...p, speed: pSpeed, s: p.s + pSpeed * dt, steer: 0, skidding: false, airTime: land(p) });
  out = stepTraffic(out, dt);
  const time = w.time + dt;
  out = { ...out, time };
  const escapeAt = w.match.escapeAt!;
  if (time >= escapeAt + M.escapeScene - 1e-9)
    out = {
      ...out,
      match: { over: true, winner: 'thief', reason: w.match.reason ?? 'escape', endTime: escapeAt, escapeAt },
      events: [{ type: 'end', winner: 'thief' }],
    };
  return out;
}
