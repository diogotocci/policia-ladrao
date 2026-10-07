// Sobrevivência HUD (V2 part 3): "Caos N" with 5 marks next to the clock, and what each new level brings.
import { BALANCE } from '../config/balance';

const RISE: Record<number, string> = {
  2: 'Caos 2: mais dano e mais tráfego',
  3: 'Caos 3: obras na pista!',
  4: 'Caos 4: mais obras e tudo mais forte',
  5: 'Caos máximo: obras por todo lado!',
};

/** Returns the meter element; `update` returns the notice text when the chaos level just rose. */
export function createChaosMeter(): { el: HTMLElement; update(mode: 'pursuit' | 'survival', chaos: number): string | undefined } {
  const el = document.createElement('div');
  el.className = 'hud-chaos';
  el.hidden = true;
  const label = document.createElement('span');
  label.className = 'hud-chaos-label';
  const marks = document.createElement('span');
  marks.className = 'hud-chaos-marks';
  marks.setAttribute('aria-hidden', 'true');
  const markEls = Array.from({ length: BALANCE.survival.chaosMax }, () => {
    const m = document.createElement('i');
    m.className = 'hud-chaos-mark';
    marks.append(m);
    return m;
  });
  el.append(label, marks);
  let shown = 0;
  return {
    el,
    update(mode, chaos) {
      el.hidden = mode !== 'survival';
      if (el.hidden || chaos === shown) return undefined;
      shown = chaos;
      label.textContent = `Caos ${chaos}`;
      markEls.forEach((m, i) => m.classList.toggle('is-on', i < chaos));
      return RISE[chaos]; // level 1 has no notice
    },
  };
}
