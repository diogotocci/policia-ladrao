// App screens (spec §7). Thin DOM components: they only draw and call callbacks; the flow lives in flow.ts.
import type { Role } from '../../config/balance';
import type { Board } from '../../storage/ranking';
import { formatTime } from '../hud';
import { btn, h, mount, type Disposable } from './dom';
import { openHowTo } from './howto';
import { SCREEN_ICONS } from './icons';
import './screens.css';

export { trapFocus } from './dom';
export { renderChoose } from './choose';
export { renderEnd } from './end';

// ---------- title ----------
/** Logo (a blue street-name plate) over the two spinning 3D cars. */
function titleHero(): { hero: HTMLElement; previews: Record<Role, HTMLElement> } {
  const plate = h('h1', 'title-plate');
  plate.append('Polícia ', h('span', 'title-x', '×'), ' ', h('span', 'title-line', 'Ladrão'));
  const cars = h('div', 'title-cars');
  const previews = {} as Record<Role, HTMLElement>;
  for (const role of ['police', 'thief'] as Role[]) {
    const slot = h('div', 'title-car');
    slot.dataset.preview = role; // 3D car (carPreview)
    previews[role] = slot;
    cars.append(slot);
  }
  const hero = h('div', 'title-hero');
  hero.append(plate, cars);
  return { hero, previews };
}

export function renderTitle(
  root: HTMLElement,
  p: { onPlay(): void; onRanking(): void; onHowToSeen?(): void; mountToggle(parent: HTMLElement): Disposable; version?: string },
): Disposable & { previews: Record<Role, HTMLElement> } {
  const s = h('section', 'screen screen-title');
  s.setAttribute('aria-label', 'Polícia × Ladrão');
  const { hero, previews } = titleHero();
  const play = btn('Jogar', 'is-primary title-play', p.onPlay, SCREEN_ICONS.play);
  const help = btn('Como jogar', '', () => openHowTo(s, () => (p.onHowToSeen?.(), help.focus())), SCREEN_ICONS.help);
  const menu = h('div', 'title-menu');
  menu.append(play, help, btn('Ranking', '', p.onRanking, SCREEN_ICONS.trophy));
  const sound = h('div', 'title-sound');
  const toggle = p.mountToggle(sound);
  s.append(hero, menu, sound);
  if (p.version) s.append(h('p', 'title-version', `v${p.version}`));
  const m = mount(root, s, play);
  return { dispose: () => (toggle.dispose(), m.dispose()), previews };
}

// ---------- countdown ----------
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
        void n.offsetWidth; // restarts the animation
        n.classList.add('pop');
      }
    },
    go() {
      n.textContent = 'VAI!';
      n.classList.add('is-go');
    },
  };
}

// ---------- pause ----------
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
    row.append(
      h('span', 'ranking-pos', String(i + 1)),
      h('span', 'ranking-initials', e.initials),
      time,
      h('span', 'ranking-date', shortDate(e.date)),
    );
    list.append(row);
  });
  const back = btn('Voltar', 'is-quiet', p.onBack);
  card.append(h('h2', 'screen-heading', 'Ranking'), tabs, list, back);
  s.append(card);
  return mount(root, s, p.focusTab ? selected : back);
}
