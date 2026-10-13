// The /admin panel (V3 delivery 3, spec §6, mockup approved 2026-10-12): only for the admin account. The server checks the
// session on every request; this page only draws what it gets. On localhost it shows example numbers.
import { httpApi, type AccountApi } from '../account/api';
import { devApi, useDevApi } from '../account/devApi';
import { mountGoogleButton } from '../account/google';
import { CARS } from '../meta/cars';
import type { AdminStats } from '../meta/events';
import { openStorage } from '../storage/prefs';
import { bars, dailyChart, n } from './charts';
import './admin.css';

const KIND: Record<string, string> = {
  paint: 'Pinturas',
  neon: 'Neon',
  sound: 'Sirenes e buzinas',
  plate: 'Placa',
  finish: 'Acabamentos',
  sticker: 'Adesivos',
  wheels: 'Rodas',
  smoke: 'Fumaça',
  acc: 'Acessórios',
};
const MODE: Record<string, string> = { pursuit: 'Perseguição', survival: 'Sobrevivência' };
const SIDE: Record<string, string> = { police: 'Polícia', thief: 'Ladrão' };
const DIFF: Record<string, string> = { easy: 'Fácil', normal: 'Médio', hard: 'Difícil' };
const CLIENT: Record<string, string> = { play: 'app da Play', pwa: 'app instalado', web: 'navegador' };
const carName = (id: string) => (CARS as Record<string, { name: string } | undefined>)[id]?.name ?? id;
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function tile(label: string, value: string, note: string): HTMLElement {
  const t = el('div', 'tile');
  t.append(el('span', 'tile-label', label), el('b', 'tile-value', value), el('span', 'tile-note', note));
  return t;
}

function card(title: string, ...body: HTMLElement[]): HTMLElement {
  const c = el('section', 'card');
  c.append(el('h2', '', title), ...body);
  return c;
}

/** The dashboard for one period. */
export function renderStats(root: HTMLElement, s: AdminStats, email: string, onDays: (d: number) => void): void {
  const head = el('header', 'head');
  const chips = el('div', 'chips');
  chips.setAttribute('role', 'radiogroup');
  chips.setAttribute('aria-label', 'Período');
  for (const d of [7, 30, 90]) {
    const b = el('button', 'chip', `${d} dias`);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(d === s.days));
    b.tabIndex = d === s.days ? 0 : -1;
    b.addEventListener('click', () => onDays(d));
    chips.append(b);
  }
  // radio group keys: arrows move between periods
  chips.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const all = [7, 30, 90];
    onDays(all[(all.indexOf(s.days) + step + all.length) % all.length]!);
  });
  head.append(el('h1', '', 'Painel · Polícia × Ladrão'), chips, el('span', 'who', email));
  const growth = s.active.weekBefore > 0 ? Math.round(((s.active.week - s.active.weekBefore) / s.active.weekBefore) * 100) : null;
  const tiles = el('div', 'tiles');
  tiles.append(
    tile('Contas criadas', n(s.accounts.total), `+${n(s.accounts.today)} hoje`),
    tile(
      'Ativos hoje',
      n(s.active.today),
      growth === null ? `${n(s.active.week)} na semana` : `${growth >= 0 ? '+' : ''}${growth}% na semana`,
    ),
    tile('Ativos no mês', n(s.active.month), s.accounts.total ? `${pct(s.active.month / s.accounts.total)} das contas` : '—'),
    tile(
      `Partidas em ${s.days} dias`,
      n(s.matches.total),
      s.matches.players ? `${n(s.matches.total / s.matches.players)} por jogador` : '—',
    ),
    tile('Volta no dia seguinte', pct(s.retention.d1), `D7 ${pct(s.retention.d7)} · D30 ${pct(s.retention.d30)}`),
  );
  const modes = card(
    'Partidas por modo e lado',
    bars(s.byModeSide.map((r) => ({ label: `${MODE[r.mode] ?? r.mode} · ${SIDE[r.side] ?? r.side}`, value: r.matches }))),
    el('h3', '', 'Dificuldade'),
    bars(['easy', 'normal', 'hard'].map((d) => ({ label: DIFF[d]!, value: s.byDifficulty.find((x) => x.difficulty === d)?.matches ?? 0 }))),
  );
  const wins = el('table', 'wins');
  const hr = el('tr');
  hr.append(el('th', '', ''), ...['easy', 'normal', 'hard'].map((d) => el('th', '', DIFF[d])));
  wins.append(hr);
  for (const side of ['police', 'thief']) {
    const tr = el('tr');
    tr.append(el('th', '', SIDE[side]));
    for (const d of ['easy', 'normal', 'hard']) {
      const w = s.wins.find((x) => x.side === side && x.difficulty === d);
      const td = el('td', '', w ? pct(w.rate) : '—');
      if (w) td.title = `${n(w.matches)} partidas`;
      tr.append(td);
    }
    wins.append(tr);
  }
  const total = s.versions.reduce((a, v) => a + v.players, 0);
  const clients = s.clients.reduce((a, v) => a + v.players, 0);
  const versions = s.versions.map((v) => `${v.version} · ${pct(total ? v.players / total : null)}`).join('   ');
  const where = s.clients.map((c) => `${CLIENT[c.client] ?? c.client} ${pct(clients ? c.players / clients : null)}`).join(' / ');
  const grid = el('div', 'grid');
  grid.append(
    card('Contas novas e jogadores ativos por dia', dailyChart(s.daily)),
    modes,
    card('Carros mais usados (partidas)', bars(s.carsUsed.map((c) => ({ label: carName(c.car), value: c.matches })))),
    card(
      'Carros mais comprados',
      bars(s.carsBought.map((c) => ({ label: carName(c.car), value: c.count }))),
      el('h3', '', 'Itens da loja mais comprados'),
      bars(s.itemsBought.map((c) => ({ label: KIND[c.kind] ?? c.kind, value: c.count }))),
    ),
    card(
      'Vitórias por lado e dificuldade',
      wins,
      el('h3', '', 'Duração média'),
      el('p', 'line', s.duration.map((d) => `${MODE[d.mode] ?? d.mode} ${clock(d.seconds)}`).join(' · ') || '—'),
      el('h3', '', 'Versões em uso'),
      el('p', 'line', versions || '—'),
      el('p', 'line muted', where),
    ),
  );
  grid.firstElementChild!.classList.add('is-wide');
  const status = el('p', 'sr-only', `Painel de ${s.days} dias.`);
  status.setAttribute('role', 'status');
  root.replaceChildren(head, tiles, grid, status);
}

function message(root: HTMLElement, title: string, text: string, extra?: HTMLElement): void {
  const box = el('section', 'card message');
  box.append(el('h1', '', title), el('p', '', text));
  if (extra) box.append(extra);
  root.replaceChildren(box);
}

export async function startAdmin(root: HTMLElement, api: AccountApi, dev: boolean): Promise<void> {
  let days = 30;
  /** only the latest request draws (a quick second click on the chips wins over a slow first answer) */
  let ticket = 0;
  let chipFocus = false;
  const load = async (): Promise<void> => {
    const mine = ++ticket;
    let me;
    try {
      me = await api.me();
    } catch {
      return message(root, 'Sem conexão', 'O painel precisa de internet.');
    }
    if (!me || me === 'gone') {
      const slot = el('div', 'google');
      message(root, 'Painel', 'Entre com a conta admin.', slot);
      const done = async (credential: string) => {
        const ok = await api.signIn(credential).catch(() => null);
        return ok ? load() : message(root, 'Painel', 'Não deu para entrar. Confira a internet e tente de novo.');
      };
      if (dev) {
        const b = el('button', 'chip', 'Entrar (conta de teste)');
        b.addEventListener('click', () => void done('dev'));
        slot.append(b);
      } else {
        const id = await api.clientId().catch(() => null);
        if (id) await mountGoogleButton(slot, id, (c) => void done(c)).catch(() => undefined);
      }
      return;
    }
    root.setAttribute('aria-busy', 'true');
    let stats: AdminStats | 'forbidden';
    try {
      stats = await api.adminStats(days);
    } catch {
      root.removeAttribute('aria-busy');
      return message(root, 'Sem conexão', 'O painel precisa de internet.');
    }
    root.removeAttribute('aria-busy');
    if (mine !== ticket) return;
    if (stats === 'forbidden') return message(root, 'Só para a conta admin', `Você entrou como ${me.email}.`);
    renderStats(root, stats, me.email, (d) => ((days = d), (chipFocus = true), void load()));
    // after a period change the keyboard stays on the chips (the page was drawn again)
    if (chipFocus) root.querySelector<HTMLElement>('.chip[aria-checked="true"]')?.focus({ preventScroll: true });
    chipFocus = false;
  };
  await load();
}

const root = document.getElementById('admin');
if (root) {
  const storage = openStorage();
  const dev = useDevApi(location) || (import.meta.env.DEV && !new URLSearchParams(location.search).has('realapi'));
  void startAdmin(root, dev ? devApi(storage, { startSignedOut: false }) : httpApi(), dev);
}
