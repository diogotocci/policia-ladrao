import { BALANCE, type Role } from '../config/balance';
import { aiStep } from './ai';
import { createCar, stepCar, type CarState } from './car';
import { resolveCollisions } from './collisions';
import type { Intents } from './intents';
import { fireWeapons, stepProjectiles } from './projectiles';
import { enforceNoOvertake, pursuitBonus } from './pursuit';
import { createRngFromState } from './rng';
import { levelAt } from './rules';
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
    boxes: [],
    bombs: [],
    nextBombId: 1,
    bombHeld: false,
    nextBoxId: 1,
    nextBoxAt: BALANCE.items.firstBoxAt,
    itemRng: (opts.seed ^ 0xc2b2ae35) >>> 0,
    nextTrafficId: 1,
    trafficRng: (opts.seed ^ 0x85ebca6b) >>> 0,
    ai: {
      police: { targetX: police.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1, bumpS: -1, dodgeBump: false, nextBombAt: 0, bombDodge: {} },
      thief: { targetX: thief.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1, bumpS: -1, dodgeBump: false, nextBombAt: 0, bombDodge: {} },
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
  out = withCar(out, 'thief', stepJump(stepCar(t0, intents.thief, dt), t0.s, w.seed, dt));
  out = withCar(out, 'police', stepJump(stepCar(p0, intents.police, dt, { speedBonus: bonus }), p0.s, w.seed, dt));
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
    out = { ...out, match: { over: true, winner, endTime: time }, events: [...out.events, { type: 'end', winner }] };
  }
  return out;
}
