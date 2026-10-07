// Pure numeric rules from spec §4 (stateless).
import { BALANCE, type Difficulty } from '../config/balance';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Shot damage factor by distance: 1 up to 40 m, linear down to 0 at 70 m. */
export function distanceFactor(d: number): number {
  const { falloffStart, falloffEnd } = BALANCE.combat;
  return 1 - clamp01((Math.abs(d) - falloffStart) / (falloffEnd - falloffStart));
}

/** Police speed bonus: 0 up to 60 m, linear up to +35% at 150 m. */
export function catchUpBonus(d: number): number {
  const { start, end, maxBonus } = BALANCE.catchUp;
  return maxBonus * clamp01((d - start) / (end - start));
}

/** Thief armor (titanium plates): −15% per plate, up to 3. */
export function armorFactor(plates: number): number {
  return 1 - 0.15 * Math.min(Math.max(0, plates), 3);
}

/** Is the target in the firing cone (front or rear, including the sides) and in range? */
export function inFireCone(shooter: { s: number; x: number }, target: { s: number; x: number }, facing: 'front' | 'rear'): boolean {
  const ds = (target.s - shooter.s) * (facing === 'front' ? 1 : -1);
  const dx = target.x - shooter.x;
  if (Math.hypot(ds, dx) > BALANCE.combat.range) return false;
  const angle = (Math.atan2(Math.abs(dx), ds) * 180) / Math.PI;
  return angle <= BALANCE.combat.sideConeDeg;
}

/** Difficulty level: rises every 30 s, up to 10. */
export function levelAt(timeSeconds: number, difficulty: Difficulty = 'normal'): number {
  const { startLevel, levelEvery } = BALANCE.difficulties[difficulty];
  return Math.min(BALANCE.difficulty.maxLevel, startLevel + Math.floor(timeSeconds / levelEvery));
}
