// Yellow box roulette (V2 part 3, mockup 2B + 2C): a small row of icons spins just below the time pill (it never
// covers the road) until the game says the roulette stopped (game time, so a pause keeps it spinning), then shows
// the result, green when good and red when bad. A yellow flash comes from the car at the pickup.
// Labels are pure functions (tested); the DOM part is driven by the game.
import type { MysteryOutcome } from '../sim/types';
import { ITEM_ICON, ITEM_LABEL } from './hud';
import './itemsFx.css';

const BAD_TEXT = { slow: 'Motor falhando', double: 'Dano dobrado', mud: 'Para-brisa sujo', noBrake: 'Sem freio' } as const;
const BAD_ICON = { slow: 'fxSlow', double: 'fxDouble', mud: 'fxMud', noBrake: 'fxNoBrake' } as const;
const SPIN = ['🔥', '🔧', '🛡️', '💥', '🟫', '💔', '🎯', '🚫'];

export function mysteryText(o: MysteryOutcome): string {
  if (o.good) return o.item ? `Sorte! + ${ITEM_LABEL[o.item] ?? o.item}` : 'Sorte! Itens no máximo';
  return `Azar! ${BAD_TEXT[o.effect]}`;
}

export function mysteryIcon(o: MysteryOutcome): string {
  if (o.good) return (o.item && ITEM_ICON[o.item]) || '⭐';
  return ITEM_ICON[BAD_ICON[o.effect]] ?? '⚠️';
}

export function createMysteryHud(root: HTMLElement): {
  /** pickup: starts spinning */
  spin(): void;
  /** the roulette stopped (game time): shows the result for a moment */
  reveal(o: MysteryOutcome): void;
  /** the roulette was cancelled (end scene): hides without a result */
  cancel(): void;
  readonly spinning: boolean;
  dispose(): void;
} {
  const box = document.createElement('div');
  box.className = 'hud-roulette';
  box.hidden = true;
  box.setAttribute('role', 'status');
  const flash = document.createElement('div');
  flash.className = 'mystery-flash';
  root.append(box, flash);
  let timers: ReturnType<typeof setTimeout>[] = [];
  const clear = () => {
    for (const t of timers) clearTimeout(t); // also clears intervals
    timers = [];
  };
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slots: HTMLElement[] = [];
  let label: HTMLElement | undefined;
  let spinning = false;
  return {
    get spinning() {
      return spinning;
    },
    spin() {
      clear();
      spinning = true;
      box.hidden = false;
      box.className = 'hud-roulette is-spinning';
      box.textContent = '';
      slots = [0, 1, 2].map(() => {
        const s = document.createElement('span');
        s.className = 'hud-roulette-slot';
        box.append(s);
        return s;
      });
      label = document.createElement('span');
      label.className = 'hud-roulette-label';
      box.append(label);
      box.setAttribute('aria-label', 'Caixa surpresa...');
      flash.classList.remove('is-on');
      void flash.offsetWidth;
      flash.classList.add('is-on');
      let k = 0;
      const tick = () => {
        slots.forEach((s, i) => (s.textContent = SPIN[(k + i * 3) % SPIN.length]!));
        k++;
      };
      tick();
      if (!reduced()) timers.push(setInterval(tick, 80));
    },
    reveal(o) {
      clear();
      spinning = false;
      if (!label) return;
      box.hidden = false;
      box.className = `hud-roulette ${o.good ? 'is-good' : 'is-bad'}`;
      slots.forEach((s, i) => {
        s.textContent = i === 1 ? mysteryIcon(o) : '';
        s.hidden = i !== 1;
      });
      label.textContent = mysteryText(o);
      box.setAttribute('aria-label', mysteryText(o));
      timers.push(setTimeout(() => (box.hidden = true), 1600));
    },
    cancel() {
      clear();
      spinning = false;
      box.hidden = true;
    },
    dispose() {
      clear();
      box.remove();
      flash.remove();
    },
  };
}
