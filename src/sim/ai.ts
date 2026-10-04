// IA dos dois lados. Pura dado o rng; a memória (alvo lateral, temporizadores) fica no mundo.
import { BALANCE, type Role } from '../config/balance';
import type { Rng } from './rng';
import { NO_INTENTS, type Intents } from './intents';
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
}

const EDGE = BALANCE.road.halfWidth - BALANCE.car.halfWidth;
const LANES = BALANCE.road.laneCenters;
const DEADZONE = 0.15;

/** 0 no nível 1 → 1 no nível máximo */
const skill = (level: number) => (Math.min(level, BALANCE.difficulty.maxLevel) - 1) / (BALANCE.difficulty.maxLevel - 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initialAiMemory(role: Role, w: WorldState): AiMemory {
  const me = role === 'police' ? policeOf(w) : thiefOf(w);
  return { targetX: me.x, nextDecisionAt: 0, brakeUntil: 0, linedSince: -1 };
}

function steerTo(x: number, targetX: number): Pick<Intents, 'left' | 'right'> {
  const dx = targetX - x;
  if (Math.abs(dx) < DEADZONE) return { left: false, right: false };
  // nunca esterça mais para dentro da borda
  if (dx > 0 && x >= EDGE - 0.6) return { left: false, right: false };
  if (dx < 0 && x <= -EDGE + 0.6) return { left: false, right: false };
  return { left: dx < 0, right: dx > 0 };
}

export function aiStep(w: WorldState, role: Role, rng: Rng, memory: AiMemory): { intents: Intents; memory: AiMemory } {
  const me = role === 'police' ? policeOf(w) : thiefOf(w);
  const foe = role === 'police' ? thiefOf(w) : policeOf(w);
  const k = skill(w.level);
  let mem = memory;

  if (role === 'police') {
    if (w.time >= mem.nextDecisionAt) {
      // reação: 0,8 s no nível 1 → 0,25 s no nível 10; mira a faixa do ladrão (encosta para bater quando perto)
      const reaction = lerp(0.8, 0.25, k) * rng.range(0.8, 1.2);
      mem = { ...mem, targetX: Math.max(-EDGE + 0.3, Math.min(EDGE - 0.3, foe.x)), nextDecisionAt: w.time + reaction };
    }
    return { intents: { ...NO_INTENTS, ...steerTo(me.x, mem.targetX), fire: true }, memory: mem };
  }

  // ladrão
  const behind = me.s - foe.s;
  const lined = Math.abs(foe.x - me.x) < 1.6 && behind > 0 && behind < 80;
  const linedSince = lined ? (mem.linedSince < 0 ? w.time : mem.linedSince) : -1;
  // tempo para perceber que está na mira: 1,0 s no nível 1 → 0,2 s no nível 10
  const reaction = lerp(1.0, 0.2, k);
  const dodge = lined && w.time - linedSince >= reaction;
  mem = { ...mem, linedSince };
  if (dodge || w.time >= mem.nextDecisionAt) {
    const interval = lerp(1.6, 0.6, k) * rng.range(0.7, 1.3);
    let targetX = mem.targetX;
    if (dodge || rng.next() < 0.25) {
      // vai para uma faixa longe da polícia (com um pouco de acaso)
      const options = LANES.filter((x) => Math.abs(x - me.x) > 1);
      const scored = options.map((x) => ({ x, score: Math.abs(x - foe.x) + rng.range(0, 2.5) }));
      scored.sort((a, b) => b.score - a.score);
      targetX = scored[0]?.x ?? targetX;
    }
    let brakeUntil = mem.brakeUntil;
    // polícia colada atrás na mesma faixa: às vezes freia para provocar batida
    if (lined && behind < 12 && rng.next() < lerp(0.05, 0.25, k)) brakeUntil = w.time + 0.4;
    mem = { ...mem, targetX, nextDecisionAt: w.time + interval, brakeUntil, linedSince: dodge ? -1 : linedSince };
  }
  return {
    intents: {
      ...NO_INTENTS,
      ...steerTo(me.x, mem.targetX),
      brake: w.time < mem.brakeUntil,
      fire: me.hasGun,
    },
    memory: mem,
  };
}
