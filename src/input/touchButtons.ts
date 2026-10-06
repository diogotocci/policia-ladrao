import type { Role } from '../config/balance';
import type { Intents } from '../sim/intents';
import './touchButtons.css';

type IntentName = keyof Intents;

const svg = (body: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS: Record<IntentName, string> = {
  left: svg('<path d="M29 12 17 24l12 12"/>'),
  right: svg('<path d="M19 12l12 12-12 12"/>'),
  // símbolo de freio do painel: disco com pinças dos lados
  brake: svg('<circle cx="24" cy="24" r="10"/><path d="M11 12a17 17 0 0 0 0 24M37 12a17 17 0 0 1 0 24"/>'),
  // mira
  fire: svg(
    '<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none"/><path d="M24 4v8M24 36v8M4 24h8M36 24h8"/>',
  ),
  // bomba com pavio
  bomb: svg(
    '<circle cx="20" cy="29" r="11" fill="currentColor" stroke="none"/><path d="M27 21l4-4"/><path d="M33 15c1-3 4-4 6-2" stroke-width="3"/><path d="M39 7v3M43 11h-3M42 8l-2 2" stroke-width="2.5"/>',
  ),
};

const BUTTONS: { name: IntentName; label: string; side: 'left' | 'right' }[] = [
  { name: 'left', label: 'Esquerda', side: 'left' },
  { name: 'right', label: 'Direita', side: 'left' },
  { name: 'bomb', label: 'Bomba', side: 'right' },
  { name: 'brake', label: 'Freio', side: 'right' },
  { name: 'fire', label: 'Atirar', side: 'right' },
];

const buzz = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* sem vibração */
  }
};

export function createTouchButtons(
  root: HTMLElement,
  opts: { role?: Role } = {},
): {
  read(): Intents;
  /** esquece toques rápidos guardados (feitos na contagem/pausa); dedos ainda na tela continuam valendo */
  dropTaps(): void;
  dispose(): void;
  setVisible(name: 'fire' | 'bomb', visible: boolean): void;
  /** pisca o ATIRAR por 0,3 s quando não há alvo no cone */
  flashNoTarget(): void;
  /** estoque de bombas: o botão só aparece com 1 ou mais */
  setBombs(n: number): void;
  /** botão visível mas bloqueado (ex.: arma do ladrão abaixo de 8 m/s) */
  setLocked(name: 'fire' | 'bomb', locked: boolean): void;
} {
  const pointers = new Map<IntentName, Set<number>>();
  /** toques rápidos (pointerdown + pointerup entre duas leituras) contam uma vez */
  const tapped = new Set<IntentName>();
  /** dedos que começaram num botão e ainda não saíram da tela */
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
      // Sem captura implícita: o dedo pode deslizar para outro botão (◀ → ▶).
      // a captura implícita vai para o alvo do toque (pode ser o <svg> do ícone): solta de quem tiver
      try {
        for (const el of [e.target as Element | null, b]) if (el?.hasPointerCapture?.(id)) el.releasePointerCapture(id);
      } catch {
        /* jsdom / navegador sem captura */
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
    // cancelado pelo sistema ou dedo deslizou para fora: não vale como toque
    // (no toque, o navegador dispara pointerleave logo depois do pointerup: aí o toque vale)
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
    setBombs(n) {
      const b = buttons.get('bomb');
      if (!b) return;
      b.hidden = n <= 0;
      if (n <= 0) pointers.get('bomb')?.clear();
      let c = b.querySelector<HTMLElement>('.touch-count');
      if (!c) {
        c = document.createElement('span');
        c.className = 'touch-count';
        b.append(c);
      }
      c.textContent = String(n);
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
