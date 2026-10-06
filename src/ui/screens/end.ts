// End of match: result and time on the left, the record plate on the right, actions below.
import type { Role } from '../../config/balance';
import { formatTime } from '../hud';
import { btn, h, mount, type Disposable } from './dom';
import type { MatchResult } from './flow';
import { SCREEN_ICONS } from './icons';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function endReason(r: MatchResult, me: Role): string {
  if (r.reason === 'escape') return me === 'thief' ? 'Fugiu! Sumiu no horizonte' : 'O ladrão fugiu';
  return r.winner === 'police' ? 'O ladrão foi detido' : 'A viatura foi destruída';
}

function resultCard(r: MatchResult, won: boolean, role: Role): HTMLElement {
  const card = h('div', `end-result is-${won ? 'won' : 'lost'}`);
  const stats = h('p', 'end-stats');
  const hp = Math.round(r.hp ?? 0);
  if (hp > 0) stats.append(h('span', '', `Vida restante ${hp}`));
  if (r.level !== undefined) stats.append(h('span', '', `Nível ${r.level}`));
  const time = h('p', 'end-time');
  time.append(h('small', '', 'Tempo'), formatTime(r.time));
  card.append(h('h2', 'screen-heading', won ? 'Você venceu!' : 'Você perdeu'), h('p', 'end-reason', endReason(r, role)), stats, time);
  return card;
}

const savedNote = () => {
  const box = h('div', 'end-record is-saved');
  box.append(h('p', 'end-saved', 'Recorde salvo!'), h('p', 'end-record-hint', 'Veja sua placa no ranking'));
  return box;
};

const padBtn = (label: string, icon: string, fn: () => void) => {
  const b = btn('', 'initials-btn', fn, icon);
  b.setAttribute('aria-label', label);
  return b;
};

/** arcade dial: ▼ goes down to the next letter (A -> B), ▲ goes back (A -> Z); ◀ ▶ move between slots */
function initialsPad(step: (d: number) => void, move: (d: number) => void): HTMLElement {
  const pad = h('div', 'initials-pad');
  pad.append(
    padBtn('Espaço anterior', SCREEN_ICONS.back, () => move(-1)),
    padBtn('Letra anterior', SCREEN_ICONS.up, () => step(-1)),
    padBtn('Próxima letra', SCREEN_ICONS.down, () => step(1)),
    padBtn('Próximo espaço', SCREEN_ICONS.forward, () => move(1)),
  );
  return pad;
}

/** Mercosul-style plate with 3 initials. Tap a slot to pick it; ▲▼ change the letter, ◀ ▶ move; the keyboard types. */
function recordPanel(onSave: (initials: string) => void, onSaved: (note: HTMLElement) => void): { panel: HTMLElement; focus: HTMLElement } {
  const letters = [0, 0, 0];
  let cursor = 0;
  let saved = false;
  const panel = h('div', 'end-record');
  const plate = h('div', 'initials plate');
  plate.tabIndex = 0;
  plate.setAttribute('role', 'group');
  plate.setAttribute('aria-label', 'Novo recorde: suas 3 iniciais');
  const row = h('div', 'plate-letters');
  const slots = [0, 1, 2].map((i) => {
    const slot = h('span', 'initials-slot');
    slot.addEventListener('click', () => ((cursor = i), render()));
    return slot;
  });
  row.append(...slots);
  plate.append(h('span', 'plate-band', 'BRASIL'), row);
  const render = () => {
    slots.forEach((el, i) => {
      el.textContent = LETTERS[letters[i]!]!;
      el.classList.toggle('is-current', i === cursor);
    });
  };
  const step = (d: number) => ((letters[cursor] = (letters[cursor]! + d + 26) % 26), render());
  const move = (d: number) => ((cursor = Math.min(2, Math.max(0, cursor + d))), render());
  const pad = initialsPad(step, move);
  const save = () => {
    if (saved) return;
    saved = true;
    onSave(letters.map((l) => LETTERS[l]).join(''));
    const note = savedNote();
    panel.replaceWith(note);
    onSaved(note);
  };
  plate.addEventListener('keydown', (e) => {
    const k = e.key;
    if (e.repeat) return void e.preventDefault(); // a key still held from the game (e.g. brake) does not change the letters
    if (/^[a-zA-Z]$/.test(k)) {
      letters[cursor] = LETTERS.indexOf(k.toUpperCase());
      cursor = Math.min(2, cursor + 1);
    } else if (k === 'ArrowDown') letters[cursor] = (letters[cursor]! + 1) % 26;
    else if (k === 'ArrowUp') letters[cursor] = (letters[cursor]! + 25) % 26;
    else if (k === 'ArrowLeft' || k === 'Backspace') cursor = Math.max(0, cursor - 1);
    else if (k === 'ArrowRight') cursor = Math.min(2, cursor + 1);
    else if (k === 'Enter') return void (e.preventDefault(), save());
    else return;
    e.preventDefault();
    e.stopPropagation(); // letters do not become game shortcuts (M, P...)
    render();
  });
  panel.append(h('p', 'end-record-title', 'Novo recorde!'), h('p', 'end-record-hint', 'Escreva sua placa para o ranking'), plate, pad);
  panel.append(btn('Salvar', 'is-primary end-save', save));
  render();
  return { panel, focus: plate };
}

export function renderEnd(
  root: HTMLElement,
  p: {
    role: Role;
    result: MatchResult;
    qualifies: boolean;
    /** record already saved (coming back from the ranking): shows "Recorde salvo!" instead of the initials */
    saved?: boolean;
    onSave(initials: string): void;
    onAgain(): void;
    onChangeSide(): void;
    onRanking(): void;
    onHome(): void;
  },
): Disposable {
  const won = p.result.winner === p.role;
  const s = h('section', 'screen screen-end');
  s.setAttribute('role', 'dialog');
  s.setAttribute('aria-modal', 'true');
  s.setAttribute('aria-label', won ? 'Você venceu!' : 'Você perdeu');
  const layout = h('div', 'end-layout');
  layout.append(resultCard(p.result, won, p.role));
  const again = btn('Jogar de novo', 'is-primary', p.onAgain, SCREEN_ICONS.replay);
  const actions = h('div', 'end-actions');
  actions.append(
    again,
    btn('Trocar de lado', '', p.onChangeSide, SCREEN_ICONS.swap),
    btn('Ranking', '', p.onRanking, SCREEN_ICONS.trophy),
    btn('Início', 'is-quiet', p.onHome, SCREEN_ICONS.home),
  );
  let focus: HTMLElement = again;
  if (p.saved) layout.append(savedNote());
  else if (p.qualifies) {
    const rec = recordPanel(p.onSave, () => again.focus());
    layout.append(rec.panel);
    focus = rec.focus;
  }
  layout.classList.toggle('has-record', p.saved === true || p.qualifies);
  s.append(layout, actions);
  return mount(root, s, focus);
}
