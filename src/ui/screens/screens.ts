// Telas da app (spec §7). Componentes DOM finos: só desenham e chamam callbacks; o fluxo fica em flow.ts.
import type { Role } from '../../config/balance';
import type { Board } from '../../storage/ranking';
import { formatTime } from '../hud';
import type { MatchResult } from './flow';
import './screens.css';

interface Disposable {
  dispose(): void;
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (label: string, cls: string, onClick: () => void) => {
  const b = h('button', `screen-btn ${cls}`, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab/Shift+Tab ficam dentro da tela aberta (não escapam para os botões do jogo atrás dela). */
export function trapFocus(el: HTMLElement): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const visible = (x: HTMLElement) => {
      const cs = getComputedStyle(x);
      return !x.closest('[hidden]') && cs.display !== 'none' && cs.visibility !== 'hidden';
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

const mount = (root: HTMLElement, el: HTMLElement, focus?: HTMLElement): Disposable => {
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

// ---------- título ----------
export function renderTitle(
  root: HTMLElement,
  p: { onPlay(): void; onRanking(): void; mountToggle(parent: HTMLElement): Disposable },
): Disposable {
  const s = h('section', 'screen screen-title');
  s.setAttribute('aria-label', 'Polícia × Ladrão');
  const logo = h('img', 'title-logo');
  logo.src = '/icons/icon-192.png';
  logo.alt = '';
  const name = h('h1', 'title-name');
  name.innerHTML = 'Polícia <span>×</span> Ladrão';
  const play = btn('Jogar', 'is-primary', p.onPlay);
  const ranking = btn('Ranking', '', p.onRanking);
  const row = h('div', 'screen-actions');
  row.append(play, ranking);
  const sound = h('div', 'title-sound');
  const toggle = p.mountToggle(sound);
  s.append(logo, name, row, sound);
  const m = mount(root, s, play);
  return { dispose: () => (toggle.dispose(), m.dispose()) };
}

// ---------- escolha de lado ----------
const RULES: Record<Role, { title: string; lines: string[] }> = {
  police: {
    title: 'Polícia',
    lines: ['Prenda o ladrão antes de 1:30', 'Você nunca passa o ladrão: encoste e atire', 'Caixinhas azuis: cadência, nitro, helicóptero…'],
  },
  thief: {
    title: 'Ladrão',
    lines: ['Aguente 1:30 e suma no horizonte (ou destrua a viatura)', 'Quebra-molas, tráfego e bombas são aliados', 'Caixinhas vermelhas: placas, bombas, arma traseira'],
  },
};

export function renderChoose(root: HTMLElement, p: { onChoose(role: Role): void; onBack(): void }): Disposable & { previews: Record<Role, HTMLElement> } {
  const s = h('section', 'screen screen-choose');
  s.append(h('h2', 'screen-heading', 'Escolha seu lado'));
  const cards = h('div', 'choose-cards');
  const previews = {} as Record<Role, HTMLElement>;
  let first: HTMLButtonElement | undefined;
  for (const role of ['police', 'thief'] as Role[]) {
    const r = RULES[role];
    const card = h('button', `choose-card is-${role}`);
    card.type = 'button';
    card.dataset.role = role;
    card.setAttribute('aria-label', `Jogar de ${r.title.toLowerCase()}`);
    const prev = h('div', 'choose-preview');
    prev.dataset.preview = role;
    previews[role] = prev;
    const ul = h('ul', 'choose-rules');
    for (const line of r.lines) ul.append(h('li', '', line));
    card.append(prev, h('h3', 'choose-title', r.title), ul);
    card.addEventListener('click', () => p.onChoose(role));
    cards.append(card);
    first ??= card;
  }
  const back = btn('Voltar', 'is-quiet', p.onBack);
  s.append(cards, back);
  return { ...mount(root, s, first), previews };
}

// ---------- contagem ----------
export function renderCountdown(root: HTMLElement): Disposable & { set(left: number): void; go(): void } {
  const s = h('section', 'screen screen-countdown');
  s.setAttribute('aria-live', 'assertive');
  const n = h('div', 'countdown-number', '3');
  s.append(n);
  const m = mount(root, s);
  return {
    ...m,
    set(left) {
      const v = String(Math.max(1, Math.ceil(left)));
      if (n.textContent !== v) {
        n.textContent = v;
        n.classList.remove('pop');
        void n.offsetWidth; // reinicia a animação
        n.classList.add('pop');
      }
    },
    go() {
      n.textContent = 'VAI!';
      n.classList.add('is-go');
    },
  };
}

// ---------- pausa ----------
export function renderPause(
  root: HTMLElement,
  p: { onResume(): void; onRestart(): void; onQuit(): void; mountToggle?(parent: HTMLElement): Disposable },
): Disposable {
  const s = h('section', 'screen screen-pause');
  s.setAttribute('role', 'dialog');
  s.setAttribute('aria-label', 'Pausado');
  s.setAttribute('aria-modal', 'true');
  const card = h('div', 'screen-card');
  const resume = btn('Continuar', 'is-primary', p.onResume);
  const actions = h('div', 'screen-actions is-column');
  actions.append(resume, btn('Reiniciar', '', p.onRestart), btn('Sair', 'is-quiet', p.onQuit));
  const sound = h('div', 'pause-sound');
  const toggle = p.mountToggle?.(sound);
  card.append(h('h2', 'screen-heading', 'Pausado'), actions, sound);
  s.append(card);
  const m = mount(root, s, resume);
  return { dispose: () => (toggle?.dispose(), m.dispose()) };
}

// ---------- fim ----------
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function endReason(r: MatchResult, me: Role): string {
  if (r.reason === 'escape') return me === 'thief' ? 'Fugiu! Sumiu no horizonte 🏁' : 'O ladrão fugiu 🏁';
  return r.winner === 'police' ? 'O ladrão foi detido' : 'A viatura foi destruída';
}

export function renderEnd(
  root: HTMLElement,
  p: {
    role: Role;
    result: MatchResult;
    qualifies: boolean;
    /** recorde já salvo (voltando do ranking): mostra "Recorde salvo!" em vez das iniciais */
    saved?: boolean;
    onSave(initials: string): void;
    onAgain(): void;
    onRanking(): void;
    onTitle(): void;
  },
): Disposable {
  const won = p.result.winner === p.role;
  const s = h('section', 'screen screen-end');
  s.setAttribute('role', 'dialog');
  s.setAttribute('aria-modal', 'true');
  const card = h('div', `screen-card is-${won ? 'won' : 'lost'}`);
  card.append(
    h('h2', 'screen-heading', won ? 'Você venceu!' : 'Você perdeu'),
    h('p', 'end-reason', endReason(p.result, p.role)),
    h('p', 'end-time', `Tempo: ${formatTime(p.result.time)}`),
  );
  const again = btn('Jogar de novo', 'is-primary', p.onAgain);
  const actions = h('div', 'screen-actions');
  actions.append(again, btn('Ranking', '', p.onRanking), btn('Título', 'is-quiet', p.onTitle));

  let focus: HTMLElement = again;
  if (p.saved) card.append(h('p', 'end-saved', 'Recorde salvo!'));
  else if (p.qualifies) {
    const letters = [0, 0, 0];
    let cursor = 0;
    let saved = false;
    const box = h('div', 'initials');
    box.tabIndex = 0;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Novo recorde: suas 3 iniciais');
    const slotEls: HTMLElement[] = [];
    const render = () => {
      slotEls.forEach((el, i) => {
        el.textContent = LETTERS[letters[i]!]!;
        el.classList.toggle('is-current', i === cursor);
      });
    };
    for (let i = 0; i < 3; i++) {
      const col = h('div', 'initials-col');
      // roleta de fliperama: ▼ desce para a próxima letra (A → B), ▲ volta (A → Z)
      const up = btn('▲', 'initials-up', () => ((letters[i] = (letters[i]! + 25) % 26), render()));
      up.dataset.i = String(i);
      up.setAttribute('aria-label', `Letra ${i + 1}: anterior`);
      const down = btn('▼', 'initials-down', () => ((letters[i] = (letters[i]! + 1) % 26), render()));
      down.dataset.i = String(i);
      down.setAttribute('aria-label', `Letra ${i + 1}: próxima`);
      const slot = h('div', 'initials-slot');
      slotEls.push(slot);
      col.append(up, slot, down);
      box.append(col);
    }
    const save = () => {
      if (saved) return;
      saved = true;
      p.onSave(letters.map((l) => LETTERS[l]).join(''));
      record.remove();
      card.insertBefore(h('p', 'end-saved', 'Recorde salvo!'), actions);
      again.focus();
    };
    box.addEventListener('keydown', (e) => {
      const k = e.key;
      if (e.repeat) return void e.preventDefault(); // tecla ainda segurada do jogo (ex.: freio) não mexe nas letras
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
      e.stopPropagation(); // letras não viram atalhos do jogo (M, P…)
      render();
    });
    const saveBtn = btn('Salvar', 'is-primary', save);
    const record = h('div', 'end-record');
    record.append(h('p', 'end-record-title', 'Novo recorde! Suas iniciais:'), box, saveBtn);
    card.append(record);
    render();
    focus = box;
  }
  card.append(actions);
  s.append(card);
  return mount(root, s, focus);
}

// ---------- ranking ----------
const TAB_LABEL: Record<Role, string> = { police: 'Polícia — mais rápidos', thief: 'Ladrão — mais rápidos a vencer' };

const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function renderRanking(
  root: HTMLElement,
  p: { board: Board; tab: Role; highlight?: { role: Role; rank: number }; focusTab?: boolean; onTab(tab: Role): void; onBack(): void },
): Disposable {
  const s = h('section', 'screen screen-ranking');
  const card = h('div', 'screen-card is-wide');
  const tabs = h('div', 'ranking-tabs');
  tabs.setAttribute('role', 'tablist');
  let selected: HTMLButtonElement | undefined;
  for (const role of ['police', 'thief'] as Role[]) {
    const t = btn(TAB_LABEL[role], `ranking-tab is-${role}`, () => p.onTab(role));
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', String(role === p.tab));
    t.setAttribute('aria-controls', 'ranking-list');
    if (role === p.tab) selected = t;
    tabs.append(t);
  }
  const list = h('ol', 'ranking-list');
  list.id = 'ranking-list';
  list.setAttribute('role', 'tabpanel');
  const entries = p.board[p.tab];
  if (entries.length === 0) list.append(h('li', 'ranking-empty', 'Nenhum recorde ainda — jogue uma partida!'));
  entries.forEach((e, i) => {
    const row = h('li', 'ranking-row');
    if (p.highlight && p.highlight.role === p.tab && p.highlight.rank === i + 1) row.classList.add('is-new');
    const how = e.how === 'kill' ? '💥' : e.how === 'escape' ? `🏁 ♥${Math.round(e.hp ?? 0)}` : '';
    const time = h('span', 'ranking-time', formatTime(e.time));
    if (how) {
      const tag = h('span', 'ranking-how', ` ${how}`);
      tag.setAttribute('aria-label', e.how === 'kill' ? 'destruiu a viatura' : `fugiu, vida ${Math.round(e.hp ?? 0)}`);
      time.append(tag);
    }
    row.append(h('span', 'ranking-pos', String(i + 1)), h('span', 'ranking-initials', e.initials), time, h('span', 'ranking-date', shortDate(e.date)));
    list.append(row);
  });
  const back = btn('Voltar', 'is-quiet', p.onBack);
  card.append(h('h2', 'screen-heading', 'Ranking'), tabs, list, back);
  s.append(card);
  return mount(root, s, p.focusTab ? selected : back);
}
