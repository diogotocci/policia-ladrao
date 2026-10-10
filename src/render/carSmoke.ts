// Smoke and sparks the cars give off during a match: damage, a wreck at the end, tire squeal. Per-car accumulators
// turn a rate (puffs per second) into whole particles frame by frame.
import type { Role } from '../config/balance';
import { hpPct, type CarState } from '../sim/car';
import type { WorldState } from '../sim/types';
import type { createCombatFx } from './combatFx';
import { damageLook } from './damageView';
import type { createParticles } from './particles';

export function createCarSmoke(particles: ReturnType<typeof createParticles>, fx: ReturnType<typeof createCombatFx>) {
  const acc: Record<Role, { smoke: number; spark: number; skid: number; side: number; wreck: number; trail: number }> = {
    police: { smoke: 0, spark: 0, skid: 0, side: 1, wreck: 0, trail: 0 },
    thief: { smoke: 0, spark: 0, skid: 0, side: 1, wreck: 0, trail: 0 },
  };
  // V2 part 6 delivery 2: tire smoke and nitro trail in each side's colour (null = white)
  const tint: Record<Role, number | null> = { police: null, thief: null };
  return {
    /** white or black smoke and sparks by damage; returns the damage look to apply to the model */
    damage(c: CarState, dt: number) {
      const look = damageLook(hpPct(c));
      const a = acc[c.role];
      if (look.whiteSmoke || look.blackSmoke) {
        a.smoke += dt * (look.blackSmoke ? 20 : 12) * particles.emissionScale();
        for (; a.smoke >= 1; a.smoke--) particles.emitSmoke(c.x, 1.0, c.s + 1.9, look.blackSmoke ? 'black' : 'white');
      }
      if (look.sparks) {
        a.spark += dt * 3;
        for (; a.spark >= 1; a.spark--) fx.sparkAt(c.s + 1.6, c.x);
      }
      return look;
    },
    /** thick black smoke from the destroyed car while the end scene runs */
    wreck(c: CarState, dt: number) {
      const a = acc[c.role];
      a.wreck += dt * 28 * particles.emissionScale();
      for (; a.wreck >= 1; a.wreck--) particles.emitSmoke(c.x + (a.side = -a.side) * 0.5, 1.1, c.s + 1.6, 'black');
    },
    /** the shop's smoke colour of each side (null = white) */
    setColors(colors: Partial<Record<Role, number | null>>) {
      Object.assign(tint, colors);
    },
    /** smoke from the rear wheels while skidding, in the side's colour */
    skid(c: CarState, dt: number) {
      const a = acc[c.role];
      a.skid += dt * 26 * particles.emissionScale();
      for (; a.skid >= 1; a.skid--) particles.emitSmoke(c.x + (a.side = -a.side) * 0.8, 0.25, c.s - 1.5, tint[c.role] ?? 'white');
    },
    /** per frame: skid smoke, and the trail while the nitro is on (police) or the thief runs off at the escape */
    tires(cars: readonly CarState[], w: Pick<WorldState, 'time' | 'match'>, dt: number) {
      // the escape scene (1:30) runs with no reason until it ends; 'policeDown' is the police wreck, no trail
      const escaping = w.match.escapeAt !== undefined && w.match.reason !== 'policeDown';
      for (const c of cars) {
        if (c.skidding) this.skid(c, dt);
        if (w.time < c.upgrades.nitroUntil || (c.role === 'thief' && escaping)) this.trail(c, dt);
      }
    },
    /** nitro (police) and the thief's escape: a trail of puffs from the rear, in the side's colour */
    trail(c: CarState, dt: number) {
      const a = acc[c.role];
      a.trail += dt * 30 * particles.emissionScale();
      for (; a.trail >= 1; a.trail--) particles.emitSmoke(c.x + (a.side = -a.side) * 0.35, 0.45, c.s - 2.1, tint[c.role] ?? 'white');
    },
  };
}
