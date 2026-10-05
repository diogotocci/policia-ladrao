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

/** Devolve o mundo com o carro do papel `role` substituído. */
export function withCar(w: WorldState, role: Role, car: CarState): WorldState {
  return w.playerRole === role ? { ...w, player: car } : { ...w, opponent: car };
}

export function createWorld(opts: {
  seed: number;
  playerRole: Role;
  debugHp?: { police?: number; thief?: number };
  /** itens dados ao jogador no início (só debug/testes) */
  debugGive?: ItemId[];
  traffic?: boolean;
  /** curvas (Entrega 6); false = rua reta (testes/debug ?curves=0) */
  curves?: boolean;
  /** tempo de fuga (s); padrão BALANCE.match.escapeTime — menor só em debug/e2e (?escape=N) */
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
      police: { targetX: police.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1, bumpS: -1, dodgeBump: false, nextBombAt: 0, bombDodge: {}, curveS: -1, curveBrake: false, curveLate: 0 },
      thief: { targetX: thief.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1, bumpS: -1, dodgeBump: false, nextBombAt: 0, bombDodge: {}, curveS: -1, curveBrake: false, curveLate: 0 },
    },
  };
}

/**
 * Um passo de simulação. `playerIntents = 'ai'` faz a IA dirigir também o carro do jogador (testes IA × IA).
 * Ordem: IA → movimento (turbo na polícia) → colisões → não-ultrapassar → tiros → projéteis → tempo/nível → fim.
 */
export function stepWorld(w: WorldState, playerIntents: Intents | 'ai', dt: number): WorldState {
  // partida encerrada: nada muda; só limpa os eventos do último passo para não serem repetidos
  if (w.match.over) return w.events.length ? { ...w, events: [] } : w;
  if (w.match.escapeAt !== undefined) return stepEscape(w, dt);
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

  const bonus = pursuitBonus(out);
  const t0 = thiefOf(out);
  const p0 = policeOf(out);
  const kT = curvatureAt(w.seed, t0.s, w.curvesOn);
  const kP = curvatureAt(w.seed, p0.s, w.curvesOn);
  out = withCar(out, 'thief', stepJump(stepCar(t0, intents.thief, dt, { curvature: kT }), t0.s, w.seed, dt));
  out = withCar(out, 'police', stepJump(stepCar(p0, intents.police, dt, { speedBonus: bonus, curvature: kP }), p0.s, w.seed, dt));
  // começo de derrapagem: evento (som de pneu, fumaça nas rodas)
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
  // quem zerou a vida neste passo (batida, bomba, caixinha) não atira mais
  if (policeOf(out).hp > 0 && thiefOf(out).hp > 0) {
    out = fireWeapons(out, intents, dt);
    out = stepProjectiles(out, dt);
  }
  const time = out.time + dt;
  out = { ...out, time, level: levelAt(time) };

  const policeDead = policeOf(out).hp <= 0;
  const thiefDead = thiefOf(out).hp <= 0;
  if (policeDead || thiefDead) {
    const winner: Role = thiefDead && !policeDead ? 'police' : 'thief'; // empate → ladrão
    const reason = winner === 'police' ? 'thiefDown' : 'policeDown';
    out = { ...out, match: { over: true, winner, reason, endTime: time }, events: [...out.events, { type: 'end', winner }] };
  } else if (time >= w.escapeTime - 1e-9) {
    // 1:30 com os dois vivos: começa a cena da fuga (tiros no ar somem)
    // instante exato do limite (não o do passo, que pode sair 89,9999…): fugas empatam no ranking
    out = { ...out, projectiles: [], bombs: [], match: { over: false, escapeAt: w.escapeTime }, events: [...out.events, { type: 'escape' }] };
  }
  return out;
}

/** Cena da fuga: sem controles nem combate; o ladrão acelera e some, a polícia freia. Depois, fim. */
function stepEscape(w: WorldState, dt: number): WorldState {
  const M = BALANCE.match;
  const t = thiefOf(w);
  const p = policeOf(w);
  const vMax = BALANCE.movement.cruise.thief * M.escapeBoost;
  const tSpeed = Math.max(t.speed, Math.min(vMax, t.speed + M.escapeAccel * dt));
  const pSpeed = Math.max(0, p.speed - BALANCE.movement.brakeDecel * dt);
  let out: WorldState = { ...w, events: [] };
  // quem estava no ar (quebra-mola) termina o pulo normalmente
  const land = (c: CarState) => Math.max(0, c.airTime - dt);
  out = withCar(out, 'thief', { ...t, speed: tSpeed, s: t.s + tSpeed * dt, steer: 0, skidding: false, airTime: land(t) });
  out = withCar(out, 'police', { ...p, speed: pSpeed, s: p.s + pSpeed * dt, steer: 0, skidding: false, airTime: land(p) });
  out = stepTraffic(out, dt);
  const time = w.time + dt;
  out = { ...out, time };
  const escapeAt = w.match.escapeAt!;
  if (time >= escapeAt + M.escapeScene - 1e-9)
    out = { ...out, match: { over: true, winner: 'thief', reason: 'escape', endTime: escapeAt, escapeAt }, events: [{ type: 'end', winner: 'thief' }] };
  return out;
}
