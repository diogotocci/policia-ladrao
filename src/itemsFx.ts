// Game-side presentation of the V2 part 3 items (kept out of game.ts): the special button, the yellow box roulette,
// screen effects (mud, double damage), warnings, oil and spikes on the road, and particles (smoke screen, engine
// smoke, sparks from a flat tire).
import type * as THREE from 'three';
import type { Role } from './config/balance';
import type { createTouchButtons } from './input/touchButtons';
import type { createCombatFx } from './render/combatFx';
import type { Particles } from './render/particles';
import { createSpecialsView } from './render/specialsView';
import type { CarState } from './sim/car';
import type { GameEvent, WorldState } from './sim/types';
import { createMysteryHud } from './ui/mysteryHud';

/** Warnings (toast) for the new events, from the player's side. Pure. */
export function itemToast(e: GameEvent, me: Role): string | undefined {
  if (e.type === 'oilSkid') return me === 'police' ? 'Óleo!' : 'A viatura derrapou no óleo!';
  if (e.type === 'tirePop') return me === 'police' ? 'Pneu furado!' : 'Pneu furado na viatura!';
  if (e.type === 'special' && e.kind === 'smoke') return 'Fumaça!';
  return undefined;
}

export function createItemsFx(p: {
  ui: HTMLElement;
  scene: THREE.Scene;
  role: Role;
  touch: ReturnType<typeof createTouchButtons>;
  particles: Particles;
  fx: ReturnType<typeof createCombatFx>;
  toast(text: string, big?: boolean): void;
}): {
  frame(w: WorldState, car: CarState, foe: CarState, events: readonly GameEvent[], originS: number, dt: number, frozen: boolean): void;
  dispose(): void;
} {
  const mud = document.createElement('div');
  mud.className = 'fx-mud';
  const double = document.createElement('div');
  double.className = 'fx-double';
  p.ui.prepend(mud, double); // under the HUD and the buttons
  const mystery = createMysteryHud(p.ui);
  const view = createSpecialsView(p.scene);
  let lastSpecial = '';
  let lastNoBrake = false;
  const acc = { smoke: 0, engine: 0, spark: 0, side: 1 };
  return {
    frame(w, car, foe, events, originS, dt, frozen) {
      const me = w.player;
      if (me.role === 'thief') {
        const sp = me.upgrades.special;
        const sig = sp ? `${sp.kind}:${sp.charges}` : '';
        if (sig !== lastSpecial) {
          lastSpecial = sig;
          p.touch.setSpecial(sp);
        }
      }
      const noBrake = w.time < me.effects.noBrakeUntil;
      if (noBrake !== lastNoBrake) {
        lastNoBrake = noBrake;
        p.touch.setLocked('brake', noBrake);
      }
      mud.classList.toggle('is-on', w.time < me.effects.mudUntil);
      double.classList.toggle('is-on', w.time < me.effects.doubleUntil);
      for (const e of events) {
        if (e.type === 'mystery' && e.role === p.role) mystery.spin();
        else if (e.type === 'mysteryReveal' && e.role === p.role) mystery.reveal(e.outcome);
        const t = itemToast(e, p.role);
        if (t) p.toast(t, true);
      }
      // the roulette was dropped without a result (end scene): no "Sorte!" for an item never received
      if (mystery.spinning && !me.mystery && !events.some((e) => e.type === 'mysteryReveal')) mystery.cancel();
      view.update(w.hazards, originS);
      if (frozen) return;
      const k = p.particles.emissionScale();
      for (const c of [car, foe]) {
        // the thief's smoke screen: thick dark cloud behind him
        if (w.time < c.effects.smokeUntil) {
          acc.smoke += dt * 40 * k;
          for (; acc.smoke >= 1; acc.smoke--) p.particles.emitSmoke(c.x + (acc.side = -acc.side) * 1.1, 0.8, c.s - 2.4, 'black');
        }
        // engine failing: gray smoke from the hood
        if (w.time < c.effects.slowUntil) {
          acc.engine += dt * 14 * k;
          for (; acc.engine >= 1; acc.engine--) p.particles.emitSmoke(c.x, 1.0, c.s + 1.9, 'white');
        }
        // flat tire: sparks from a wheel
        if (w.time < c.effects.flatUntil) {
          acc.spark += dt * 10;
          for (; acc.spark >= 1; acc.spark--) p.fx.sparkAt(c.s + 1.2, c.x + c.effects.flatSide * 0.9);
        }
      }
    },
    dispose() {
      mystery.dispose();
      view.dispose();
      mud.remove();
      double.remove();
    },
  };
}
