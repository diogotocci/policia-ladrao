// What the match draws over the 3D view besides the HUD: the rotate hint, the red damage flash, the rear-view mirror
// frame and the pause button; plus the phone vibration.
import { ICONS } from './icons';
import { onTap } from './mobileShell';

export function createGameChrome(ui: HTMLElement): { hint: HTMLElement; flash(amount: number): void; mirrorFrame: HTMLElement } {
  // upright window on a computer (on phones the game rotates by itself — styles.css): asks to rotate
  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.textContent = 'Deixe a tela deitada';
  hint.hidden = true;
  ui.append(hint);
  const flashEl = document.createElement('div');
  flashEl.className = 'damage-flash';
  ui.append(flashEl);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  /** red border for 0.25 s (weaker with reduced motion) */
  const flash = (amount: number) => {
    const a = reducedMotion ? amount * 0.5 : amount;
    if (typeof flashEl.animate === 'function') flashEl.animate([{ opacity: a }, { opacity: 0 }], { duration: 250, easing: 'ease-out' });
    else {
      flashEl.style.opacity = String(a);
      setTimeout(() => (flashEl.style.opacity = '0'), 250);
    }
  };
  const mirrorFrame = document.createElement('div');
  mirrorFrame.className = 'rearview-frame';
  mirrorFrame.hidden = true;
  ui.append(mirrorFrame);
  return { hint, flash, mirrorFrame };
}

/** The ⏸ button in the HUD; reacts on touch (not click): right after releasing an arrow the click could be swallowed. */
export function createPauseButton(parent: HTMLElement, onPress: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pause-toggle';
  b.innerHTML = ICONS.pause;
  b.setAttribute('aria-label', 'Pausar');
  onTap(b, () => {
    b.blur();
    onPress();
  });
  parent.append(b);
  return b;
}

export function buzz(ms: number): void {
  // the browser blocks vibration (and complains in the console) before the user's first touch/key
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation && !activation.hasBeenActive) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no vibration */
  }
}
