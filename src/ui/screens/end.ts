// End of match: result and time on the left, the record plate on the right, actions below.
import { BALANCE, type Role } from '../../config/balance';
import type { MatchStats, Reward } from '../../meta/rewards';
import { formatTime } from '../hud';
import { btn, h, mount, type Disposable } from './dom';
import type { MatchResult } from './flow';
import { SCREEN_ICONS } from './icons';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function endReason(r: MatchResult, me: Role): string {
  if (r.reason === 'escape') return me === 'thief' ? 'Fugiu! Sumiu no horizonte' : 'O ladrão fugiu';
  return r.winner === 'police' ? 'O ladrão foi detido' : 'A viatura foi destruída';
}

const COUNT_UP_MS = 800;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Coins earned, line by line; the total counts up from 0 (final at once with reduced motion). */
function rewardBox(reward: Reward, stats: MatchStats | undefined, animate: boolean): { box: HTMLElement; stop(): void } {
  const box = h('div', 'end-reward');
  const list = h('dl', 'end-reward-lines');
  const line = (label: string, value: string) => list.append(h('dt', '', label), h('dd', '', value));
  line('Tempo de perseguição', `+${reward.time}`);
  line(`Dano causado (${Math.round(stats?.damageDealt ?? 0)})`, `+${reward.damage}`);
  line(`Caixas da sua cor (${stats?.rightBoxes ?? 0})`, `+${reward.boxes}`);
  if (reward.won) line('Vitória', `×${BALANCE.rewards.winMultiplier}`);
  const total = h('p', 'end-reward-total');
  const label = `+${reward.total} moedas`;
  total.setAttribute('aria-label', label);
  const counting = animate && !reducedMotion();
  const value = h('span', '', counting ? '+0 moedas' : label);
  value.setAttribute('aria-hidden', 'true');
  total.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
  total.append(value);
  box.append(list, total);
  return { box, stop: counting ? countUp(value, reward.total) : () => {} };
}

/** Counts "+N moedas" up from 0 in COUNT_UP_MS; returns a function that stops it early. */
function countUp(el: HTMLElement, total: number): () => void {
  const start = Date.now();
  const tick = setInterval(() => {
    const k = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
    el.textContent = `+${Math.round(total * k)} moedas`;
    if (k >= 1) clearInterval(tick);
  }, 40);
  return () => clearInterval(tick);
}

function resultCard(r: MatchResult, role: Role, coins: { reward?: Reward; animate: boolean }): { card: HTMLElement; stop(): void } {
  const won = r.winner === role;
  const card = h('div', `end-result is-${won ? 'won' : 'lost'}`);
  const reason = r.level === undefined ? endReason(r, role) : `${endReason(r, role)} · Nível ${r.level}`;
  card.append(h('h2', 'screen-heading', won ? 'Você venceu!' : 'Você perdeu'), h('p', 'end-reason', reason));
  const hp = Math.round(r.hp ?? 0);
  if (hp > 0) card.append(h('p', 'end-stats', `Vida restante ${hp}`));
  const time = h('p', 'end-time');
  time.append(h('small', '', 'Tempo'), formatTime(r.time));
  card.append(time);
  let stop = () => {};
  if (coins.reward) {
    card.classList.add('has-reward');
    const rb = rewardBox(coins.reward, r.stats, coins.animate);
    card.append(rb.box);
    stop = rb.stop;
  }
  return { card, stop };
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
    /** coins credited for this match */
    reward?: Reward;
    /** count the total up from 0 (only the first time the screen shows this match) */
    animateReward?: boolean;
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
  const result = resultCard(p.result, p.role, { reward: p.reward, animate: p.animateReward !== false });
  layout.append(result.card);
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
  const m = mount(root, s, focus);
  return { dispose: () => (result.stop(), m.dispose()) };
}
