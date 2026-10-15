// The /admin "Denúncias" tab (spec docs/superpowers/specs/2026-10-15-denuncias-admin-design.md, mockup approved
// 2026-10-15): the reported accounts waiting for a decision, and the decisions taken. The server applies every action.
import type { Decision, ModerationAction, ModerationView, PendingReport } from '../meta/moderation';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const button = (label: string, cls: string, onClick: () => void) => {
  const b = el('button', `act ${cls}`.trim(), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};

/** 15/10 09:02 in Brasília time; "hoje 09:02" for today */
export function when(iso: string, now = new Date()): string {
  const f = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...o });
  const d = new Date(iso);
  const time = f(d, { hour: '2-digit', minute: '2-digit' });
  const day = f(d, { day: '2-digit', month: '2-digit' });
  return day === f(now, { day: '2-digit', month: '2-digit' }) ? `hoje ${time}` : `${day} ${time}`;
}

const at = (name: string | null) => (name ? `@${name}` : '(sem nome)');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "por @a, @b, @c e mais 2" */
function reporters(p: PendingReport): string {
  if (p.by.length === 0) return '';
  const more = p.count - p.by.length;
  return ` · por ${p.by.map((b) => `@${b}`).join(', ')}${more > 0 ? ` e mais ${more}` : ''}`;
}

export type Act = (userId: string, action: ModerationAction) => Promise<void>;

function pendingRow(p: PendingReport, act: Act, now: Date): HTMLElement {
  const row = el('div', 'rep');
  const who = el('div');
  who.append(el('span', 'rep-name', at(p.username)));
  if (p.reportedAs) who.append(el('span', 'rep-was', ` · denunciado como @${p.reportedAs}`));
  const dates = p.count === 1 ? when(p.last, now) : `primeira ${when(p.first, now)} · última ${when(p.last, now)}`;
  const meta = el('div', 'rep-meta', `${plural(p.count, 'denúncia', 'denúncias')} · ${dates}${reporters(p)}`);
  const acts = el('div', 'rep-acts');
  let confirm: HTMLElement | undefined;
  const busy = (on: boolean) => row.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.disabled = on));
  const run = (action: ModerationAction) => {
    busy(true);
    void act(p.userId, action).finally(() => row.isConnected && busy(false));
  };
  const ban = button('Banir', 'danger', () => {
    if (confirm) return;
    confirm = el('div', 'confirm');
    const text = el('span', '', 'Banir ');
    text.append(el('b', '', at(p.username)), '? A conta não entra mais no jogo e some do ranking. Dá para desfazer em Decididos.');
    const cancel = button('Cancelar', 'quiet', () => {
      confirm?.remove();
      confirm = undefined;
      ban.focus();
    });
    confirm.append(
      text,
      cancel,
      button('Banir', 'danger', () => run('ban')),
    );
    row.append(confirm);
    cancel.focus();
  });
  acts.append(
    button('Forçar troca de nome', '', () => run('rename')),
    ban,
    button('Descartar', 'quiet', () => run('dismiss')),
  );
  row.append(who, meta, acts);
  return row;
}

const LABEL: Record<ModerationAction, [string, string]> = {
  ban: ['Banido', 'ban'],
  unban: ['Banimento desfeito', ''],
  rename: ['Nome trocado', 'ren'],
  dismiss: ['Descartado', ''],
};

function decidedRow(d: Decision, act: Act, now: Date): HTMLElement {
  const tr = el('tr');
  const action = el('td');
  const [label, tone] = LABEL[d.action];
  action.append(el('span', `tag ${tone}`.trim(), label));
  if (d.action === 'rename' && d.nowName) action.append(` agora @${d.nowName}`);
  const undo = el('td');
  if (d.action === 'ban' && d.banned && d.userId) {
    const id = d.userId;
    const b = button('Desfazer', 'quiet', () => {
      b.disabled = true;
      void act(id, 'unban').finally(() => b.isConnected && (b.disabled = false));
    });
    b.setAttribute('aria-label', `Desfazer o banimento de ${at(d.username)}`);
    undo.append(b);
  }
  tr.append(el('td', '', when(d.at, now)), el('td', 'mono', at(d.username)), action, el('td', '', String(d.reports)), undo);
  return tr;
}

/** Draws the tab into `panel`. `act` sends a decision; the caller draws the tab again with the server's answer. */
export function renderReports(panel: HTMLElement, v: ModerationView, act: Act, now = new Date()): void {
  const list = el('div', 'rep-list');
  if (v.pending.length === 0) list.append(el('p', 'muted', 'Nenhuma denúncia para revisar.'));
  list.append(...v.pending.map((p) => pendingRow(p, act, now)));
  const table = el('table', 'hist');
  const head = el('tr');
  head.append(...['Quando', 'Nome', 'Ação', 'Denúncias', ''].map((t) => el('th', '', t)));
  table.append(head, ...v.decided.map((d) => decidedRow(d, act, now)));
  const history = el('section', 'card');
  history.append(v.decided.length ? table : el('p', 'muted', 'Nenhuma decisão ainda.'));
  const title = el('h2', 'sec', `Para revisar (${v.pending.length})`);
  title.tabIndex = -1; // the keyboard comes back here after a decision
  panel.replaceChildren(title, list, el('h2', 'sec', 'Decididos'), history);
}
