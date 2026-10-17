// App screens (spec §7). Thin DOM components: they only draw and call callbacks; the flow lives in flow.ts.
import type { Difficulty, Mode, Role } from '../../config/balance';
import type { ModeBoards } from '../../storage/ranking';
import { difficultyPicker, modePicker } from './difficultyPicker';
import { formatTime } from '../hud';
import { btn, h, mount, type Disposable } from './dom';
import { openHowTo } from './howto';
import { SCREEN_ICONS } from './icons';
import { fillGlobal, markReported, openReport, type LoadGlobal, type OnReport, type ReportAnswer } from './rankingGlobal';
import './screens.css';

export { trapFocus } from './dom';
export { renderChoose } from './choose';
export { renderEnd } from './end';
export { renderShop } from './shop';
export { renderCareer } from './careerScreen';

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

const walletChip = (coins: number) => {
  const chip = h('p', 'title-wallet');
  chip.setAttribute('aria-label', `${coins.toLocaleString('pt-BR')} moedas`);
  chip.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
  chip.append(coins.toLocaleString('pt-BR'));
  return chip;
};

export function renderTitle(
  root: HTMLElement,
  p: {
    onPlay(): void;
    onRanking(): void;
    onHowToSeen?(): void;
    /** opens the profile dialog (account and stats) */
    onProgress?(): void;
    /** V2 part 4: opens the shop */
    onShop?(): void;
    /** V2 part 5: opens Carreira; `careerBadge` = things to see there; `streak` = days in a row */
    onCareer?(): void;
    /** opens Opções (how the car is steered) */
    onOptions?(): void;
    careerBadge?: number;
    streak?: number;
    coins?: number;
    mountToggle(parent: HTMLElement): Disposable;
    version?: string;
  },
): Disposable & { previews: Record<Role, HTMLElement> } {
  const s = h('section', 'screen screen-title');
  s.setAttribute('aria-label', 'Polícia × Ladrão');
  const { hero, previews } = titleHero();
  const play = btn('Jogar', 'is-primary title-play', p.onPlay, SCREEN_ICONS.play);
  const help = btn('Como jogar', '', () => openHowTo(s, () => (p.onHowToSeen?.(), help.focus())), SCREEN_ICONS.help);
  const menu = h('div', 'title-menu');
  menu.append(play);
  if (p.onCareer) {
    const career = btn('Carreira', 'title-career', p.onCareer, SCREEN_ICONS.medal);
    if (p.careerBadge) {
      const dot = h('span', 'title-badge', String(Math.min(99, p.careerBadge)));
      career.setAttribute('aria-label', `Carreira, ${p.careerBadge} novidades`);
      career.append(dot);
    }
    menu.append(career);
  }
  if (p.onShop) menu.append(btn('Loja', 'title-shop', p.onShop, SCREEN_ICONS.shop));
  menu.append(help, btn('Ranking', '', p.onRanking, SCREEN_ICONS.trophy));
  const sound = h('div', 'title-sound');
  if (p.onOptions) {
    const options = btn('', 'title-progress title-options', p.onOptions, SCREEN_ICONS.gear);
    options.setAttribute('aria-label', 'Opções');
    sound.append(options);
  }
  if (p.onProgress) {
    const progress = btn('', 'title-progress', p.onProgress, SCREEN_ICONS.profile);
    progress.setAttribute('aria-label', 'Perfil');
    sound.append(progress);
  }
  const toggle = p.mountToggle(sound);
  s.append(hero, menu, sound);
  if (p.coins !== undefined) {
    const chip = walletChip(p.coins);
    if (p.streak) {
      const st = h('span', 'title-streak', `${p.streak} ${p.streak === 1 ? 'dia' : 'dias'}`);
      st.insertAdjacentHTML('afterbegin', SCREEN_ICONS.flame);
      chip.append(st);
      chip.setAttribute(
        'aria-label',
        `${p.coins.toLocaleString('pt-BR')} moedas, sequência de ${p.streak} ${p.streak === 1 ? 'dia' : 'dias'}`,
      );
    }
    s.append(chip);
  }
  if (p.version) s.append(h('p', 'title-version', `v${p.version}`));
  const m = mount(root, s, play);
  return { dispose: () => (toggle.dispose(), m.dispose()), previews };
}

// ---------- loading (mockup approved 2026-10-16) ----------
/** "Preparando a partida…" over the darkened track, with a bar and a tip, until the match is set up. */
export function renderLoading(
  root: HTMLElement,
  p: { tip: { title: string; text: string } },
): Disposable & { set(progress: number): void } {
  const s = h('section', 'screen screen-loading');
  s.setAttribute('aria-live', 'polite');
  s.setAttribute('aria-busy', 'true');
  const title = h('div', 'loading-title', 'Preparando a partida…');
  const bar = h('div', 'loading-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Preparando a partida');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = h('div', 'loading-fill');
  bar.append(fill);
  const tip = h('p', 'loading-tip');
  tip.append(h('b', '', 'Dica:'), ` ${p.tip.title}. ${p.tip.text}`);
  s.append(title, bar, tip);
  const m = mount(root, s);
  let shown = -1;
  const set = (progress: number) => {
    const v = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    if (v === shown) return;
    shown = v;
    fill.style.width = `${v}%`;
    bar.setAttribute('aria-valuenow', String(v));
  };
  set(0);
  return { ...m, set };
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
const TAB_LABEL: Record<Role, string> = { police: 'Polícia', thief: 'Ladrão' };
/** the line above the list: what this board ranks (layout B, mockup approved 2026-10-16) */
const boardHint = (side: Role, mode: Mode) =>
  side === 'police'
    ? mode === 'survival'
      ? 'Ranking da polícia: os mais rápidos a vencer'
      : 'Ranking da polícia: os mais rápidos a prender'
    : mode === 'survival'
      ? 'Ranking do ladrão: quem ficou mais tempo vivo'
      : 'Ranking do ladrão: os mais rápidos a vencer';

const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function renderRanking(
  root: HTMLElement,
  p: {
    boards: ModeBoards;
    mode: Mode;
    onMode(m: Mode): void;
    difficulty: Difficulty;
    onDifficulty(d: Difficulty): void;
    tab: Role;
    highlight?: { mode: Mode; difficulty: Difficulty; role: Role; rank: number };
    focusTab?: boolean;
    /** redrawn after a difficulty or mode switch: keep the keyboard on that picker */
    focusDifficulty?: boolean;
    focusMode?: boolean;
    onTab(tab: Role): void;
    onBack(): void;
    /** V3 delivery 2: "Global" (the default) or "Neste aparelho"; without `loadGlobal` only the phone's ranking shows */
    scope?: 'global' | 'local';
    onScope?(scope: 'global' | 'local'): void;
    focusScope?: boolean;
    loadGlobal?: LoadGlobal;
    /** reports a name seen on the Global ranking; without it (no account) the lines have no report button */
    reportName?: (username: string) => Promise<ReportAnswer>;
  },
): Disposable {
  // layout B (mockup approved 2026-10-16): one bar of filters on top, the list fills the rest of the screen
  const s = h('section', 'screen screen-ranking');
  s.setAttribute('aria-label', 'Ranking');
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
  const global = p.loadGlobal && p.scope !== 'local' ? p.loadGlobal : undefined;
  const entries = global ? [] : p.boards[p.mode][p.difficulty][p.tab];
  if (entries.length === 0 && !global) list.append(h('li', 'ranking-empty', 'Nenhum recorde ainda — jogue uma partida!'));
  entries.forEach((e, i) => {
    const row = h('li', 'ranking-row');
    const hl = p.highlight;
    if (hl && hl.mode === p.mode && hl.difficulty === p.difficulty && hl.role === p.tab && hl.rank === i + 1) row.classList.add('is-new');
    const life = `♥${Math.round(e.hp ?? 0)}`;
    // Sobrevivência thief: the life left also when he destroyed the police (spec §6)
    const kill = p.mode === 'survival' ? `💥 ${life}` : '💥';
    const how = e.how === 'kill' ? kill : e.how === 'escape' ? `🏁 ${life}` : e.how === 'caught' ? 'preso' : '';
    const time = h('span', 'ranking-time', formatTime(e.time));
    if (how) {
      const tag = h('span', 'ranking-how', ` ${how}`);
      const said = { kill: 'destruiu a viatura', escape: `fugiu, vida ${Math.round(e.hp ?? 0)}`, caught: 'foi preso' };
      tag.setAttribute('aria-label', said[e.how!]);
      time.append(tag);
    }
    const initials = h('span', 'ranking-initials', e.initials);
    if (e.rank === 7) initials.append(h('span', 'ranking-rank', p.tab === 'police' ? 'Delegado' : 'Chefão')); // V2 part 5: top rank
    if (e.plate) {
      const plate = h('span', 'ranking-plate', e.plate); // V2 part 4: the shop plate in use at the time
      plate.setAttribute('aria-label', `placa ${e.plate}`);
      initials.append(plate);
    }
    row.append(h('span', 'ranking-pos', String(i + 1)), initials, time, h('span', 'ranking-date', shortDate(e.date)));
    list.append(row);
  });
  const back = btn('', 'ranking-back', p.onBack, SCREEN_ICONS.back);
  back.setAttribute('aria-label', 'Voltar');
  const picker = difficultyPicker(p.difficulty, p.onDifficulty);
  const modes = modePicker(p.mode, p.onMode);
  const head = h('div', 'ranking-bar');
  head.append(back, h('h2', 'sr-only', 'Ranking'));
  let scopeTab: HTMLElement | undefined;
  if (p.loadGlobal) {
    const scopes = h('div', 'ranking-scopes');
    scopes.setAttribute('role', 'radiogroup');
    scopes.setAttribute('aria-label', 'Qual ranking');
    for (const [id, label, name] of [
      ['global', 'Global', 'Global'],
      ['local', 'Aparelho', 'Neste aparelho'],
    ] as const) {
      const on = (p.scope ?? 'global') === id;
      const b = btn(label, 'ranking-scope', () => p.onScope?.(id));
      if (name !== label) b.setAttribute('aria-label', name);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(on));
      if (on) scopeTab = b;
      scopes.append(b);
    }
    head.append(scopes);
  }
  head.append(h('span', 'ranking-bar-gap'), modes, picker, tabs);
  const panel = h('div', 'ranking-panel');
  const hint = h('p', 'ranking-hint', boardHint(p.tab, p.mode));
  hint.id = 'ranking-hint';
  list.setAttribute('aria-describedby', hint.id); // the short tab labels lose the context the hint gives
  panel.append(hint, list);
  s.append(head, panel);
  // Play user-generated content policy: usernames are public, so each line of the Global ranking can be reported
  const send = p.reportName;
  const onReport: OnReport | undefined = send
    ? (r, flag) =>
        openReport(s, {
          username: r.username,
          send: () => send(r.username),
          onSent: () => markReported(flag, r.username),
          onClose: () => flag.focus(),
        })
    : undefined;
  const stop = global ? fillGlobal(list, global, { mode: p.mode, side: p.tab, difficulty: p.difficulty }, onReport) : () => {};
  const checkedIn = (g: HTMLElement) => g.querySelector<HTMLElement>('[aria-checked="true"]') ?? undefined;
  const focus = p.focusScope
    ? scopeTab
    : p.focusMode
      ? checkedIn(modes)
      : p.focusDifficulty
        ? checkedIn(picker)
        : p.focusTab
          ? selected
          : back;
  const m = mount(root, s, focus);
  return { dispose: () => (stop(), m.dispose()) };
}
