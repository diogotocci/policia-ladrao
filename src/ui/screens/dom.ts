// Shared DOM helpers for the app screens: element factory, buttons, focus trap and mounting.

export interface Disposable {
  dispose(): void;
}

export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
/** Button; `icon` is an SVG string from ICONS shown before the label. */
export const btn = (label: string, cls: string, onClick: () => void, icon?: string) => {
  const b = h('button', `screen-btn ${cls}`, label);
  b.type = 'button';
  if (icon) b.insertAdjacentHTML('afterbegin', icon);
  b.addEventListener('click', onClick);
  return b;
};
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab/Shift+Tab stay inside the open screen (they do not escape to the game buttons behind it). */
export function trapFocus(el: HTMLElement): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const visible = (x: HTMLElement) => {
      const cs = getComputedStyle(x);
      return !x.closest('[hidden]') && !x.closest('[inert]') && cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && el.contains(active);
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}

export const mount = (root: HTMLElement, el: HTMLElement, focus?: HTMLElement): Disposable => {
  root.append(el);
  focus?.focus();
  const untrap = el.classList.contains('screen-countdown') ? () => {} : trapFocus(el);
  return {
    dispose: () => {
      untrap();
      el.remove();
    },
  };
};

/**
 * Shows `dialog` over `host`: everything already in `host` turns inert and Esc closes it.
 * Returns `close`, which removes the dialog, restores the page behind and calls `onClose`.
 */
export function openModal(host: HTMLElement, dialog: HTMLElement, label: string, onClose: () => void): () => void {
  const behind = [...host.children] as HTMLElement[];
  for (const el of behind) el.setAttribute('inert', '');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', label);
  let open = true;
  const close = () => {
    if (!open) return;
    open = false;
    dialog.remove();
    for (const el of behind) el.removeAttribute('inert');
    onClose();
  };
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  });
  host.append(dialog);
  return close;
}
