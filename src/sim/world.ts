import { BALANCE, type Role } from '../config/balance';
import { aiStep } from './ai';
import { createCar, stepCar, type CarState } from './car';
import { resolveCollisions } from './collisions';
import type { Intents } from './intents';
import { fireWeapons, stepProjectiles } from './projectiles';
import { enforceNoOvertake, pursuitBonus } from './pursuit';
import { createRngFromState } from './rng';
import { levelAt } from './rules';
import type { WorldState } from './types';

export type { GameEvent, MatchState, Projectile, WorldState } from './types';

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
}): WorldState {
  const police: CarState = { ...createCar('police', 1, 0), hasGun: true, hp: opts.debugHp?.police ?? BALANCE.hp };
  const thief: CarState = { ...createCar('thief', 2, 40), hp: opts.debugHp?.thief ?? BALANCE.hp };
  const player = opts.playerRole === 'police' ? police : thief;
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
    ai: {
      police: { targetX: police.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1 },
      thief: { targetX: thief.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1 },
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
  out = withCar(out, 'thief', stepCar(thiefOf(out), intents.thief, dt));
  out = withCar(out, 'police', stepCar(policeOf(out), intents.police, dt, { speedBonus: bonus }));
  out = resolveCollisions(out, dt);
  out = enforceNoOvertake(out);
  out = fireWeapons(out, intents, dt);
  out = stepProjectiles(out, dt);
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
