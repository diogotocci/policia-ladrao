// Segmented pickers: Fácil / Médio / Difícil (V2 part 2) and Perseguição / Sobrevivência (V2 part 3).
import { BALANCE, DIFFICULTIES, MODES, type Difficulty, type Mode } from '../../config/balance';
import { h } from './dom';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Fácil', normal: 'Médio', hard: 'Difícil' };

/** "moedas ×0,75" (Portuguese decimal comma) */
export const coinsLabel = (d: Difficulty) => `moedas ×${String(BALANCE.difficulties[d].coins).replace('.', ',')}`;

/** Segmented radiogroup over a fixed list of options (arrow keys move, no wrap). */
function choicePicker<T extends string>(
  options: readonly T[],
  label: Record<T, string>,
  value: T,
  onChange: (v: T) => void,
  opts: { ariaLabel: string; className: string; sub?: (v: T) => string },
): HTMLElement {
  const group = h('div', `difficulty-picker ${opts.className}`);
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', opts.ariaLabel);
  let current = value;
  const radios = options.map((v) => {
    const r = h('button', `difficulty-option is-${v}`);
    r.type = 'button';
    r.setAttribute('role', 'radio');
    r.append(h('span', 'difficulty-name', label[v]));
    if (opts.sub) r.append(h('small', 'difficulty-coins', opts.sub(v)));
    r.addEventListener('click', () => select(v));
    return r;
  });
  const sync = () =>
    radios.forEach((r, i) => {
      const on = options[i] === current;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
  function select(v: T, focus = false) {
    if (v !== current) {
      current = v;
      onChange(v);
    }
    sync();
    if (focus) radios[options.indexOf(v)]!.focus();
  }
  group.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation(); // the how-to carousel and the game must not see these arrows
    const i = Math.max(0, Math.min(options.length - 1, options.indexOf(current) + step));
    select(options[i]!, true);
  });
  group.append(...radios);
  sync();
  return group;
}

export function difficultyPicker(value: Difficulty, onChange: (d: Difficulty) => void, opts: { showCoins?: boolean } = {}): HTMLElement {
  return choicePicker(DIFFICULTIES, DIFFICULTY_LABEL, value, onChange, {
    ariaLabel: 'Dificuldade',
    className: 'is-difficulty',
    sub: opts.showCoins ? coinsLabel : undefined,
  });
}

export const MODE_LABEL: Record<Mode, string> = { pursuit: 'Perseguição', survival: 'Sobrevivência' };

/** Perseguição / Sobrevivência (V2 part 3), on the ranking */
export const modePicker = (value: Mode, onChange: (m: Mode) => void): HTMLElement =>
  choicePicker(MODES, MODE_LABEL, value, onChange, { ariaLabel: 'Modo', className: 'is-mode' });
