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
 * Um passo de simulação. `playerIntents = 'ai'` faz a IA dirigir também o carro do jogador (testes IA × IA).
 * Ordem: IA → movimento (turbo na polícia) → colisões → não-ultrapassar → tiros → projéteis → tempo/nível → fim.
 */
export function stepWorld(w: WorldState, playerIntents: Intents | 'ai', dt: number): WorldState {
  // partida encerrada: nada muda; só limpa os eventos do último passo para não serem repetidos
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

  // investida da IA da polícia (nunca para a polícia jogada por uma pessoa)
  const policeAi = playerIntents === 'ai' || w.playerRole !== 'police';
  const ram = policeAi && out.time < out.ai.police.ramUntil && out.time >= out.policeTurboOffUntil ? BALANCE.ai.ramBoost : 0;
  const bonus = pursuitBonus(out) + ram;
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
  if (thiefDead && !policeDead) {
    // a polícia venceu: cena da prisão (o ladrão para destruído, a viatura encosta atrás) antes do fim
    out = { ...out, projectiles: [], bombs: [], match: { over: false, arrestAt: time }, events: [...out.events, { type: 'arrest' }] };
  } else if (policeDead && !thiefDead) {
    // polícia destruída: ela para (arrebentada) e o ladrão vai embora — mesma cena da fuga, com o motivo da vitória
    out = {
      ...out,
      projectiles: [],
      bombs: [],
      match: { over: false, escapeAt: time, reason: 'policeDown' },
      events: [...out.events, { type: 'escape' }],
    };
  } else if (policeDead || thiefDead) {
    // os dois no mesmo passo → ladrão
    out = {
      ...out,
      match: { over: true, winner: 'thief', reason: 'policeDown', endTime: time },
      events: [...out.events, { type: 'end', winner: 'thief' }],
    };
  } else if (time >= w.escapeTime - 1e-9) {
    // 1:30 com os dois vivos: começa a cena da fuga (tiros no ar somem)
    // instante exato do limite (não o do passo, que pode sair 89,9999…): fugas empatam no ranking
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

/** Cena da prisão: sem controles nem combate; o ladrão freia até parar e a polícia para logo atrás dele. */
function stepArrest(w: WorldState, dt: number): WorldState {
  const M = BALANCE.match;
  const t = thiefOf(w);
  const p = policeOf(w);
  const land = (c: CarState) => Math.max(0, c.airTime - dt);
  const tSpeed = Math.max(0, t.speed - M.thiefStopDecel * dt);
  const ts = t.s + tSpeed * dt;
  // polícia: velocidade para chegar ao ponto de parada atrás do ladrão (sem passar), freando forte se precisar
  const stopAt = ts - M.arrestGap;
  const room = Math.max(0, stopAt - p.s);
  const want = Math.min(BALANCE.movement.cruise.police * 1.2, Math.sqrt(2 * BALANCE.movement.brakeDecel * room));
  const pSpeed =
    want > p.speed
      ? Math.min(want, p.speed + BALANCE.movement.accel * 2 * dt)
      : Math.max(want, p.speed - BALANCE.movement.brakeDecel * 1.5 * dt);
  const ps = Math.min(p.s + pSpeed * dt, stopAt);
  // e para na faixa ao lado (do lado do meio da rua), para a câmera de trás ver o ladrão arrebentado
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

/** Cena da fuga: sem controles nem combate; o ladrão acelera e some, a polícia freia. Depois, fim. */
function stepEscape(w: WorldState, dt: number): WorldState {
  const M = BALANCE.match;
  const t = thiefOf(w);
  const p = policeOf(w);
  const vMax = BALANCE.movement.cruise.thief * M.escapeBoost;
  let tSpeed = Math.max(t.speed, Math.min(vMax, t.speed + M.escapeAccel * dt));
  // desvia do tráfego: vai para a faixa mais livre à frente; se ainda assim tiver um carro colado, segue atrás dele
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
  // não fecha um carro que está do lado
  if (w.traffic.some((c) => Math.abs(c.s - t.s) < L + 0.5 && Math.abs(c.x - tx) < 2 * BALANCE.car.halfWidth)) tx = t.x;
  let block: (typeof w.traffic)[number] | undefined;
  for (const c of w.traffic)
    if (Math.abs(c.x - tx) < 2 * BALANCE.car.halfWidth && c.s > t.s && c.s - t.s < L + 3 && (!block || c.s < block.s)) block = c;
  if (block) tSpeed = Math.min(tSpeed, block.speed);
  const pSpeed = Math.max(0, p.speed - BALANCE.movement.brakeDecel * dt);
  let out: WorldState = { ...w, events: [] };
  // quem estava no ar (quebra-mola) termina o pulo normalmente
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
