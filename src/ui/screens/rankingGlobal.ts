// Global ranking list (V3 delivery 2, mockup approved 2026-10-12): the top 30 matches of a board, a player possibly more
// than once (until 0.34: one line per player), with the player's best line pinned below when none made the top. Loads
// by itself; the screen around it is renderRanking.
import type { Difficulty, Mode, Role } from '../../config/balance';
import { RANK_NAMES } from '../../meta/career';
import { CARS } from '../../meta/cars';
import type { GlobalBoard, GlobalRow } from '../../meta/records';
import { formatTime } from '../hud';
import { btn, h, openModal } from './dom';
import { SCREEN_ICONS } from './icons';

export type LoadGlobal = (mode: Mode, side: Role, difficulty: Difficulty) => Promise<GlobalBoard>;
/** the server's answer to a report: saved, too many today, the name is no longer in use, or no connection */
export type ReportAnswer = 'ok' | 'limit' | 'unknown' | 'offline';
/** a line's report button was pressed */
export type OnReport = (row: GlobalRow, flag: HTMLButtonElement) => void;

const carName = (id: string) => (CARS as Record<string, { name: string } | undefined>)[id]?.name ?? '';

/** the report button turns into a mark once that name was reported */
export function markReported(flag: HTMLButtonElement, username: string) {
  flag.classList.add('is-done');
  flag.setAttribute('aria-disabled', 'true'); // still focusable: the focus comes back here after the dialog
  flag.setAttribute('aria-label', `@${username} denunciado`);
  flag.innerHTML = SCREEN_ICONS.reported;
}

function reportButton(r: GlobalRow, onReport: OnReport): HTMLButtonElement {
  const flag = h('button', 'ranking-flag');
  flag.type = 'button';
  flag.innerHTML = SCREEN_ICONS.report;
  flag.setAttribute('aria-label', `Denunciar @${r.username}`);
  flag.addEventListener('click', () => {
    if (!flag.classList.contains('is-done')) onReport(r, flag);
  });
  if (r.reported) markReported(flag, r.username);
  return flag;
}

/** "★2 Delegado": the prestige stars (mockup approved 2026-10-16) before the rank */
function rankName(r: GlobalRow, side: Role): HTMLElement {
  const el = h('span', 'ranking-rankname', RANK_NAMES[side][r.rank - 1] ?? '');
  if (r.prestige) {
    // the star sign is read as text: say what it is
    const star = h('span', 'ranking-star');
    star.append(h('span', '', `★${r.prestige}`), h('span', 'sr-only', ` prestígio ${r.prestige},`));
    star.firstElementChild!.setAttribute('aria-hidden', 'true');
    el.prepend(star, ' ');
  }
  return el;
}

function row(r: GlobalRow, side: Role, mode: Mode, onReport?: OnReport): HTMLElement {
  const li = h('li', 'ranking-row is-global');
  if (r.me) li.classList.add('is-me');
  const name = h('span', 'ranking-name', `@${r.username}`);
  if (r.me) name.append(h('span', 'ranking-you', ' (você)'));
  const time = h('span', 'ranking-time', formatTime(r.time));
  if (side === 'thief' && r.how && r.how !== 'caught') {
    const life = `♥${Math.round(r.hp)}`;
    const tag = h('span', 'ranking-how', r.how === 'escape' ? ` 🏁 ${life}` : mode === 'survival' ? ` 💥 ${life}` : ' 💥');
    tag.setAttribute('aria-label', r.how === 'escape' ? `fugiu, vida ${Math.round(r.hp)}` : 'destruiu a viatura');
    time.append(tag);
  }
  li.append(h('span', 'ranking-pos', String(r.pos)), name, time, h('span', 'ranking-car', carName(r.car)), rankName(r, side));
  if (onReport) {
    li.classList.add('has-report');
    li.append(r.me ? h('span', 'ranking-flag-gap') : reportButton(r, onReport));
  }
  return li;
}

/** Fills `list` with the board; says so while loading, when empty and when offline. Returns a stop for when the screen goes. */
export function fillGlobal(
  list: HTMLElement,
  load: LoadGlobal,
  b: { mode: Mode; side: Role; difficulty: Difficulty },
  onReport?: OnReport,
): () => void {
  let live = true;
  list.classList.add('is-global');
  list.replaceChildren(h('li', 'ranking-empty', 'Carregando o ranking global…'));
  list.setAttribute('aria-busy', 'true');
  load(b.mode, b.side, b.difficulty).then(
    (board) => {
      if (!live) return;
      list.removeAttribute('aria-busy');
      if (board.rows.length === 0) return list.replaceChildren(h('li', 'ranking-empty', 'Ninguém neste quadro ainda. Seja o primeiro!'));
      list.replaceChildren(...board.rows.map((r) => row(r, b.side, b.mode, onReport)));
      if (board.me) list.append(h('li', 'ranking-gap', '…'), row(board.me, b.side, b.mode, onReport));
    },
    () => {
      if (!live) return;
      list.removeAttribute('aria-busy');
      list.replaceChildren(h('li', 'ranking-empty', 'Sem conexão. O ranking global precisa de internet; o do Aparelho funciona offline.'));
    },
  );
  return () => (live = false);
}

/**
 * "Denunciar @nome?" (mockup approved 2026-10-13): asks first, then sends; says when it was sent, or why not.
 * `onSent` runs once the server saved it. Returns `close`.
 */
export function openReport(
  host: HTMLElement,
  p: { username: string; send: () => Promise<ReportAnswer>; onSent: () => void; onClose: () => void },
): () => void {
  const dialog = h('div', 'progress-dialog account-dialog report-dialog');
  const title = `Denunciar @${p.username}?`;
  const heading = h('h2', 'account-heading', title);
  heading.id = 'report-heading';
  const text = h('p', 'account-text', 'Use para nomes ofensivos. A denúncia vai para a revisão; quem você denunciou não fica sabendo.');
  const error = h('p', 'account-error');
  error.setAttribute('role', 'alert');
  const actions = h('div', 'progress-actions');
  const go = btn('Denunciar', 'is-danger', () => {
    go.disabled = true;
    error.textContent = '';
    void p.send().then((a) => {
      go.disabled = false;
      if (a === 'ok') {
        p.onSent();
        return finish('Denúncia enviada', `Obrigado. O nome @${p.username} vai para a revisão.`);
      }
      if (a === 'unknown') return finish('Nome não encontrado', `O nome @${p.username} não está mais em uso.`);
      error.textContent =
        a === 'limit' ? 'Muitas denúncias hoje. Tente de novo amanhã.' : 'Sem conexão. Confira a internet e tente de novo.';
    });
  });
  const cancel = btn('Cancelar', '', () => close());
  actions.append(cancel, go);
  const finish = (head: string, body: string) => {
    heading.textContent = head;
    text.textContent = body;
    const ok = btn('OK', '', () => close());
    actions.replaceChildren(ok);
    ok.focus();
  };
  dialog.append(heading, text, error, actions);
  const close = openModal(host, dialog, title, p.onClose);
  // named by its heading, which changes to "Denúncia enviada" after sending
  dialog.removeAttribute('aria-label');
  dialog.setAttribute('aria-labelledby', heading.id);
  cancel.focus(); // the safe choice first
  return close;
}
