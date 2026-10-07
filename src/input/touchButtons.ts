import type { Role } from '../config/balance';
import type { Intents } from '../sim/intents';
import type { SpecialKind } from '../sim/types';
import './touchButtons.css';

type IntentName = keyof Intents;

const svg = (body: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS: Record<IntentName, string> = {
  left: svg('<path d="M29 12 17 24l12 12"/>'),
  right: svg('<path d="M19 12l12 12-12 12"/>'),
  // dashboard brake symbol: disc with calipers on the sides
  brake: svg('<circle cx="24" cy="24" r="10"/><path d="M11 12a17 17 0 0 0 0 24M37 12a17 17 0 0 1 0 24"/>'),
  // crosshair
  fire: svg(
    '<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none"/><path d="M24 4v8M24 36v8M4 24h8M36 24h8"/>',
  ),
  // bomb with fuse
  bomb: svg(
    '<circle cx="20" cy="29" r="11" fill="currentColor" stroke="none"/><path d="M27 21l4-4"/><path d="M33 15c1-3 4-4 6-2" stroke-width="3"/><path d="M39 7v3M43 11h-3M42 8l-2 2" stroke-width="2.5"/>',
  ),
};

/** The special button's icon and name for each kind kept (V2 part 3). */
export const SPECIAL_ICONS: Record<SpecialKind, string> = {
  bomb: ICONS.bomb,
  // oil drop and a puddle
  oil: svg(
    '<path d="M24 6c6 9 10 14 10 19a10 10 0 0 1-20 0c0-5 4-10 10-19z" fill="currentColor" stroke="none"/><path d="M8 41h32" stroke-width="3"/>',
  ),
  // a row of nails
  spikes: svg('<path d="M6 38h36"/><path d="M10 38l4-14 4 14M20 38l4-14 4 14M30 38l4-14 4 14" fill="currentColor" stroke-width="2.5"/>'),
  // cloud of smoke
  smoke: svg(
    '<path d="M14 34a7 7 0 0 1 1-14 9 9 0 0 1 17-2 7 7 0 0 1 3 14z" fill="currentColor" stroke="none"/><path d="M10 40h10M26 40h12" stroke-width="3"/>',
  ),
};
export const SPECIAL_NAMES: Record<SpecialKind, string> = { bomb: 'bomba', oil: 'óleo', spikes: 'miguelito', smoke: 'fumaça' };

const BUTTONS: { name: IntentName; label: string; side: 'left' | 'right' }[] = [
  { name: 'left', label: 'Esquerda', side: 'left' },
  { name: 'right', label: 'Direita', side: 'left' },
  { name: 'bomb', label: 'Especial', side: 'right' },
  { name: 'brake', label: 'Freio', side: 'right' },
  { name: 'fire', label: 'Atirar', side: 'right' },
];

const buzz = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* no vibration */
  }
};

export function createTouchButtons(
  root: HTMLElement,
  opts: { role?: Role } = {},
): {
  read(): Intents;
  /** forgets stored quick taps (made during the countdown/pause); fingers still on the screen remain valid */
  dropTaps(): void;
  dispose(): void;
  setVisible(name: 'fire' | 'bomb', visible: boolean): void;
  /** flashes ATIRAR for 0.3 s when there is no target in the cone */
  flashNoTarget(): void;
  /** the special kept (V2 part 3): icon by kind and charges; hidden when there is none */
  setSpecial(sp: { kind: SpecialKind; charges: number } | null): void;
  /** button visible but locked (thief's weapon below 8 m/s; brake off by the yellow box) */
  setLocked(name: 'fire' | 'bomb' | 'brake', locked: boolean): void;
} {
  const pointers = new Map<IntentName, Set<number>>();
  /** quick taps (pointerdown + pointerup between two reads) count once */
  const tapped = new Set<IntentName>();
  /** fingers that started on a button and have not left the screen yet */
  const active = new Set<number>();
  const release = (e: Event) => {
    const id = (e as PointerEvent).pointerId;
    active.delete(id);
    for (const [name, held] of pointers) {
      if (held.delete(id) && held.size === 0) buttons.get(name)?.classList.remove('is-down');
    }
  };
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);
  const buttons = new Map<IntentName, HTMLButtonElement>();
  const container = document.createElement('div');
  container.className = 'touch-controls';
  if (opts.role) container.dataset.role = opts.role;
  const leftPad = document.createElement('div');
  leftPad.className = 'touch-pad touch-pad--left';
  const rightPad = document.createElement('div');
  rightPad.className = 'touch-pad touch-pad--right';
  container.append(leftPad, rightPad);

  for (const { name, label, side } of BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.intent = name;
    b.className = `touch-btn touch-btn--${name}`;
    b.setAttribute('aria-label', label);
    b.innerHTML = ICONS[name];
    b.hidden = name === 'fire' || name === 'bomb';
    const held = new Set<number>();
    pointers.set(name, held);
    const down = (e: Event) => {
      const id = (e as PointerEvent).pointerId;
      // No implicit capture: the finger may slide to another button (◀ → ▶).
      // implicit capture goes to the touch target (may be the icon's <svg>): release it from whoever has it
      try {
        for (const el of [e.target as Element | null, b]) if (el?.hasPointerCapture?.(id)) el.releasePointerCapture(id);
      } catch {
        /* jsdom / browser without capture */
      }
      if (held.size === 0) buzz();
      tapped.add(name);
      active.add(id);
      held.add(id);
      b.classList.add('is-down');
      e.preventDefault();
    };
    const enter = (e: Event) => {
      const id = (e as PointerEvent).pointerId;
      if (!active.has(id)) return;
      held.add(id);
      b.classList.add('is-down');
    };
    const leave = (e: Event) => {
      held.delete((e as PointerEvent).pointerId);
      if (held.size === 0) b.classList.remove('is-down');
    };
    // cancelled by the system or finger slid out: does not count as a tap
    // (on touch, the browser fires pointerleave right after pointerup: then the tap counts)
    b.addEventListener('pointercancel', () => tapped.delete(name));
    b.addEventListener('pointerleave', (e) => {
      if (held.has((e as PointerEvent).pointerId)) tapped.delete(name);
    });
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerenter', enter);
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(t, leave);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    buttons.set(name, b);
    (side === 'left' ? leftPad : rightPad).append(b);
  }
  root.append(container);
  let noTargetTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    read() {
      const out: Intents = { left: false, right: false, brake: false, fire: false, bomb: false };
      for (const [name, held] of pointers) out[name] = held.size > 0 || tapped.has(name);
      tapped.clear();
      return out;
    },
    dropTaps() {
      tapped.clear();
    },
    setVisible(name, visible) {
      const b = buttons.get(name);
      if (!b) return;
      b.hidden = !visible;
      if (!visible) pointers.get(name)?.clear();
    },
    setSpecial(sp) {
      const b = buttons.get('bomb');
      if (!b) return;
      b.hidden = !sp;
      if (!sp) {
        pointers.get('bomb')?.clear();
        return;
      }
      if (b.dataset.kind !== sp.kind) {
        b.dataset.kind = sp.kind;
        b.innerHTML = SPECIAL_ICONS[sp.kind];
      }
      b.setAttribute('aria-label', `Especial: ${SPECIAL_NAMES[sp.kind]} (${sp.charges})`);
      let c = b.querySelector<HTMLElement>('.touch-count');
      if (!c) {
        c = document.createElement('span');
        c.className = 'touch-count';
        b.append(c);
      }
      c.textContent = String(sp.charges);
    },
    setLocked(name, locked) {
      buttons.get(name)?.classList.toggle('locked', locked);
    },
    flashNoTarget() {
      const b = buttons.get('fire');
      if (!b) return;
      b.classList.add('no-target');
      clearTimeout(noTargetTimer);
      noTargetTimer = setTimeout(() => b.classList.remove('no-target'), 300);
    },
    dispose() {
      clearTimeout(noTargetTimer);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
      active.clear();
      container.remove();
      for (const held of pointers.values()) held.clear();
    },
  };
}
