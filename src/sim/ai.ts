// IA dos dois lados. Pura dado o rng; a memória (alvo lateral, temporizadores) fica no mundo.
// Entrega 3: desvia de tráfego, quebra-molas (com chance pelo nível) e bombas; busca caixinhas; ladrão solta bombas.
import { BALANCE, type Role } from '../config/balance';
import type { Rng } from './rng';
import { NO_INTENTS, type Intents } from './intents';
import { curvesBetween } from './curves';
import { bumpXRange, bumpsBetween } from './track';
import type { WorldState } from './types';
import { policeOf, thiefOf } from './world';

export interface AiMemory {
  /** x para onde a IA está indo */
  targetX: number;
  /** próximo momento (s) de reavaliar */
  nextDecisionAt: number;
  /** freia até este momento (s) */
  brakeUntil: number;
  /** desde quando (s) a polícia está alinhada atrás do ladrão; -1 = não está */
  linedSince: number;
  /** quebra-molas já avaliado (s) e se a IA decidiu desviar dele */
  bumpS: number;
  dodgeBump: boolean;
  /** próximo momento (s) em que o ladrão pode soltar bomba */
  nextBombAt: number;
  /** bombas já avaliadas pela polícia: id → vai desviar? (sorteado uma vez por bomba) */
  bombDodge: Record<number, boolean>;
  /** polícia investindo contra o ladrão até este instante (s); 0 = não */
  ramUntil: number;
  /** curva fechada já avaliada (início em s), se vai frear e quantos metros atrasada começa */
  curveS: number;
  curveBrake: boolean;
  curveLate: number;
}

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
const LANES = BALANCE.road.laneCenters;
const DEADZONE = 0.15;
const W = BALANCE.car.halfWidth;

/** 0 no nível 1 → 1 no nível máximo */
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
    curveS: -1,
    curveBrake: false,
    curveLate: 0,
    ramUntil: 0,
  };
}

function steerTo(x: number, targetX: number): Pick<Intents, 'left' | 'right'> {
  const dx = targetX - x;
  if (Math.abs(dx) < DEADZONE) return { left: false, right: false };
  // nunca esterça mais para dentro da borda
  if (dx > 0 && x >= EDGE - 0.6) return { left: false, right: false };
  if (dx < 0 && x <= -EDGE + 0.6) return { left: false, right: false };
  return { left: dx < 0, right: dx > 0 };
}

const nearestLane = (x: number) => LANES.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));

/**
 * Perigo à frente numa faixa: tráfego (35 m), bombas que a polícia decidiu evitar (60 m),
 * caixinha da outra cor (40 m).
 */
function laneBlocked(w: WorldState, role: Role, s: number, laneX: number, mem?: AiMemory): boolean {
  const inLane = (x: number) => Math.abs(x - laneX) < 2 * W;
  if (w.traffic.some((t) => inLane(t.x) && t.s > s - 3 && t.s - s < 35)) return true;
  if (role === 'police' && w.bombs.some((b) => mem?.bombDodge[b.id] && inLane(b.x) && b.s > s && b.s - s < 60)) return true;
  const wrong = role === 'police' ? 'red' : 'blue';
  if (w.boxes.some((b) => b.color === wrong && inLane(b.x) && b.s > s && b.s - s < 40)) return true;
  return false;
}

/** Faixa do quebra-molas que a IA decidiu evitar (se houver) cobre esta faixa? */
function bumpCovers(w: WorldState, s: number, laneX: number, mem: AiMemory): boolean {
  if (!mem.dodgeBump || mem.bumpS < s) return false;
  const b = bumpsBetween(w.seed, mem.bumpS - 0.5, mem.bumpS + 0.5)[0];
  if (!b) return false;
  const [a, z] = bumpXRange(b);
  return laneX + W > a && laneX - W < z;
}

/** Escolhe uma faixa sem perigo, a mais próxima da desejada, sem cruzar faixas com perigo no caminho. */
function safeLane(w: WorldState, role: Role, s: number, fromX: number, wantX: number, mem: AiMemory): number {
  const free = (x: number) => !laneBlocked(w, role, s, x, mem) && !bumpCovers(w, s, x, mem);
  const pathClear = (to: number) => LANES.filter((x) => x >= Math.min(fromX, to) - 1.4 && x <= Math.max(fromX, to) + 1.4).every(free);
  const ranked = [...LANES].sort((a, b) => Math.abs(a - wantX) - Math.abs(b - wantX));
  return ranked.find((x) => pathClear(x)) ?? ranked.find(free) ?? nearestLane(fromX);
}

/** Avalia (uma vez) o próximo quebra-molas a até 60 m: desvia com chance pelo nível. */
function considerBump(w: WorldState, s: number, rng: Rng, mem: AiMemory, k: number): AiMemory {
  const next = bumpsBetween(w.seed, s + 1, s + 60)[0];
  if (!next || next.s === mem.bumpS) return mem;
  return { ...mem, bumpS: next.s, dodgeBump: rng.next() < lerp(0.5, 0.97, k) };
}

/** A polícia avalia cada bomba uma vez ao vê-la (60 m): desvia com chance 0,4 (nível 1) → 0,92 (nível 10). */
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

const CURVE_LOOKAHEAD = 70; // m

/**
 * Freio para curva fechada: avalia cada curva uma vez (vai frear? começa atrasada quantos metros?) e
 * freia quando a distância até a curva fica menor que a de frenagem até a velocidade segura.
 */
function curveBraking(w: WorldState, s: number, speed: number, rng: Rng, mem: AiMemory, k: number): { brake: boolean; memory: AiMemory } {
  if (!w.curvesOn) return { brake: false, memory: mem };
  const c = curvesBetween(w.seed, s, s + CURVE_LOOKAHEAD).find((x) => x.sharp && x.start + x.length * 0.75 > s);
  if (!c) return { brake: false, memory: mem };
  let m = mem;
  if (m.curveS !== c.start) {
    // nível 1: às vezes nem freia e, quando freia, começa até 40 m atrasada; nível 10: quase sempre acerta
    m = { ...m, curveS: c.start, curveBrake: rng.next() < lerp(0.5, 0.99, k), curveLate: rng.range(0, 1) * lerp(30, 3, k) };
  }
  if (!m.curveBrake) return { brake: false, memory: m };
  const vSafe = Math.sqrt(BALANCE.curves.grip * 0.95 * c.radius);
  if (speed <= vSafe) return { brake: false, memory: m };
  const dist = c.start + c.length * BALANCE.curves.ramp * 0.5 - s; // até onde a curva já aperta
  const need = (speed * speed - vSafe * vSafe) / (2 * BALANCE.movement.brakeDecel);
  return { brake: dist - m.curveLate <= need + 2 || dist < 0, memory: m };
}

export function aiStep(w: WorldState, role: Role, rng: Rng, memory: AiMemory): { intents: Intents; memory: AiMemory } {
  const me = role === 'police' ? policeOf(w) : thiefOf(w);
  const foe = role === 'police' ? thiefOf(w) : policeOf(w);
  const k = skill(w.level);
  let mem = considerBump(w, me.s, rng, memory, k);
  if (role === 'police') mem = considerBombs(w, me.s, rng, mem, k);

  // perigo na faixa atual (ou na de destino): reage já, sem esperar a próxima decisão
  const myLane = nearestLane(mem.targetX);
  const here = nearestLane(me.x);
  const danger =
    laneBlocked(w, role, me.s, myLane, mem) ||
    bumpCovers(w, me.s, myLane, mem) ||
    (here !== myLane && laneBlocked(w, role, me.s, here, mem));

  if (role === 'police') {
    if (danger || w.time >= mem.nextDecisionAt) {
      // reação: 0,8 s no nível 1 → 0,25 s no nível 10; mira a faixa do ladrão (encosta para bater quando perto)
      const reaction = lerp(0.8, 0.25, k) * rng.range(0.8, 1.2);
      const box = w.boxes.find((b) => b.color === 'blue' && b.s > me.s + 10 && b.s - me.s < 120);
      const want = box && Math.abs(foe.s - me.s) > 30 ? box.x : Math.max(-EDGE + 0.3, Math.min(EDGE - 0.3, foe.x));
      mem = { ...mem, targetX: safeLane(w, role, me.s, me.x, want, mem), nextDecisionAt: w.time + reaction };
      // investida: perto, quase alinhado e com o turbo liberado → acelera para bater
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
      // investindo: mira a faixa do ladrão o tempo todo; para se bateu (penalidade) ou se ele abriu demais
      // perigo na frente (tráfego, bomba, quebra-molas) manda mais que a investida
      if (danger || w.time < w.policeTurboOffUntil || foe.s - me.s > BALANCE.ai.ramRange + 10) mem = { ...mem, ramUntil: 0 };
      else mem = { ...mem, targetX: Math.max(-EDGE + 0.3, Math.min(EDGE - 0.3, foe.x)) };
    }
    const cb = curveBraking(w, me.s, me.speed, rng, mem, k);
    return { intents: { ...NO_INTENTS, ...steerTo(me.x, mem.targetX), fire: true, brake: cb.brake }, memory: cb.memory };
  }

  // ladrão
  const behind = me.s - foe.s;
  const lined = Math.abs(foe.x - me.x) < 1.6 && behind > 0 && behind < 80;
  const linedSince = lined ? (mem.linedSince < 0 ? w.time : mem.linedSince) : -1;
  // tempo para perceber que está na mira: 1,0 s no nível 1 → 0,2 s no nível 10
  const reaction = lerp(1.0, 0.2, k);
  const dodge = lined && w.time - linedSince >= reaction;
  mem = { ...mem, linedSince };
  if (danger || dodge || w.time >= mem.nextDecisionAt) {
    const interval = lerp(1.6, 0.6, k) * rng.range(0.7, 1.3);
    let want = mem.targetX;
    const box = w.boxes.find((b) => b.color === 'red' && b.s > me.s + 10 && b.s - me.s < 120);
    const hunting = me.upgrades.bombs > 0 && behind > 0 && behind < 110;
    if (hunting)
      want = foe.x; // com bomba: entra na faixa da polícia para soltar na frente dela
    else if (box && !dodge) want = box.x;
    else if (dodge || rng.next() < 0.25) {
      // vai para uma faixa longe da polícia (com um pouco de acaso)
      const options = LANES.filter((x) => Math.abs(x - me.x) > 1);
      const scored = options.map((x) => ({ x, score: Math.abs(x - foe.x) + rng.range(0, 2.5) }));
      scored.sort((a, b) => b.score - a.score);
      want = scored[0]?.x ?? want;
    }
    let brakeUntil = mem.brakeUntil;
    // polícia colada atrás na mesma faixa: às vezes freia para provocar batida
    if (lined && behind < 12 && rng.next() < lerp(0.05, 0.25, k)) brakeUntil = w.time + 0.4;
    mem = {
      ...mem,
      targetX: safeLane(w, role, me.s, me.x, want, mem),
      nextDecisionAt: w.time + interval,
      brakeUntil,
      linedSince: dodge ? -1 : linedSince,
    };
  }

  // bomba: polícia alinhada atrás a menos de 110 m (a bomba dura 20 s)
  let bomb = false;
  if (me.upgrades.bombs > 0 && Math.abs(foe.x - me.x) < 1.6 && behind > 4 && behind < 110 && w.time >= mem.nextBombAt) {
    bomb = !w.bombHeld; // borda de subida
    if (bomb) mem = { ...mem, nextBombAt: w.time + lerp(4, 1.5, k) };
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
