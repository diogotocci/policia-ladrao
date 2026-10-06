// Regras numéricas puras da spec §4 (sem estado).
import { BALANCE } from '../config/balance';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Fator de dano do tiro pela distância: 1 até 40 m, linear até 0 em 150 m. */
export function distanceFactor(d: number): number {
  const { falloffStart, falloffEnd } = BALANCE.combat;
  return 1 - clamp01((Math.abs(d) - falloffStart) / (falloffEnd - falloffStart));
}

/** Bônus de velocidade da polícia: 0 até 60 m, linear até +35% em 150 m. */
export function catchUpBonus(d: number): number {
  const { start, end, maxBonus } = BALANCE.catchUp;
  return maxBonus * clamp01((d - start) / (end - start));
}

/** Armadura do ladrão (placas de titânio): −15% por placa, até 3. */
export function armorFactor(plates: number): number {
  return 1 - 0.15 * Math.min(Math.max(0, plates), 3);
}

/** O alvo está no cone de tiro (frontal ou traseiro, incluindo as laterais) e no alcance? */
export function inFireCone(shooter: { s: number; x: number }, target: { s: number; x: number }, facing: 'front' | 'rear'): boolean {
  const ds = (target.s - shooter.s) * (facing === 'front' ? 1 : -1);
  const dx = target.x - shooter.x;
  if (Math.hypot(ds, dx) > BALANCE.combat.range) return false;
  const angle = (Math.atan2(Math.abs(dx), ds) * 180) / Math.PI;
  return angle <= BALANCE.combat.sideConeDeg;
}

/** Nível de dificuldade: sobe a cada 30 s, até 10. */
export function levelAt(timeSeconds: number): number {
  const { levelEvery, maxLevel } = BALANCE.difficulty;
  return Math.min(maxLevel, 1 + Math.floor(timeSeconds / levelEvery));
}
