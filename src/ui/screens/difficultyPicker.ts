// Fácil / Médio / Difícil picker (V2 part 2): a radiogroup used on the side choice and on the ranking.
import { BALANCE, DIFFICULTIES, type Difficulty } from '../../config/balance';
import { h } from './dom';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Fácil', normal: 'Médio', hard: 'Difícil' };

/** "moedas ×0,75" (Portuguese decimal comma) */
export const coinsLabel = (d: Difficulty) => `moedas ×${String(BALANCE.difficulties[d].coins).replace('.', ',')}`;

export function difficultyPicker(value: Difficulty, onChange: (d: Difficulty) => void, opts: { showCoins?: boolean } = {}): HTMLElement {
  const group = h('div', 'difficulty-picker');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Dificuldade');
  let current = value;
  const radios = DIFFICULTIES.map((d) => {
    const r = h('button', `difficulty-option is-${d}`);
    r.type = 'button';
    r.setAttribute('role', 'radio');
    r.append(h('span', 'difficulty-name', DIFFICULTY_LABEL[d]));
    if (opts.showCoins) r.append(h('small', 'difficulty-coins', coinsLabel(d)));
    r.addEventListener('click', () => select(d));
    return r;
  });
  const sync = () =>
    radios.forEach((r, i) => {
      const on = DIFFICULTIES[i] === current;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
  function select(d: Difficulty, focus = false) {
    if (d !== current) {
      current = d;
      onChange(d);
    }
    sync();
    if (focus) radios[DIFFICULTIES.indexOf(d)]!.focus();
  }
  group.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation(); // the how-to carousel and the game must not see these arrows
    const i = Math.max(0, Math.min(DIFFICULTIES.length - 1, DIFFICULTIES.indexOf(current) + step));
    select(DIFFICULTIES[i]!, true);
  });
  group.append(...radios);
  sync();
  return group;
}
