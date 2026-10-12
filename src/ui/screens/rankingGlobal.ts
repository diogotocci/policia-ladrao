// Global ranking list (V3 delivery 2, mockup approved 2026-10-12): top 100 of a board, best per player, with the
// player's own line pinned below when it is outside the top. Loads by itself; the screen around it is renderRanking.
import type { Difficulty, Mode, Role } from '../../config/balance';
import { RANK_NAMES } from '../../meta/career';
import { CARS } from '../../meta/cars';
import type { GlobalBoard, GlobalRow } from '../../meta/records';
import { formatTime } from '../hud';
import { h } from './dom';

export type LoadGlobal = (mode: Mode, side: Role, difficulty: Difficulty) => Promise<GlobalBoard>;

const carName = (id: string) => (CARS as Record<string, { name: string } | undefined>)[id]?.name ?? '';

function row(r: GlobalRow, side: Role, mode: Mode): HTMLElement {
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
  li.append(
    h('span', 'ranking-pos', String(r.pos)),
    name,
    time,
    h('span', 'ranking-car', carName(r.car)),
    h('span', 'ranking-rankname', RANK_NAMES[side][r.rank - 1] ?? ''),
  );
  return li;
}

/** Fills `list` with the board; says so while loading, when empty and when offline. Returns a stop for when the screen goes. */
export function fillGlobal(list: HTMLElement, load: LoadGlobal, b: { mode: Mode; side: Role; difficulty: Difficulty }): () => void {
  let live = true;
  list.classList.add('is-global');
  list.replaceChildren(h('li', 'ranking-empty', 'Carregando o ranking global…'));
  list.setAttribute('aria-busy', 'true');
  load(b.mode, b.side, b.difficulty).then(
    (board) => {
      if (!live) return;
      list.removeAttribute('aria-busy');
      if (board.rows.length === 0) return list.replaceChildren(h('li', 'ranking-empty', 'Ninguém neste quadro ainda. Seja o primeiro!'));
      list.replaceChildren(...board.rows.map((r) => row(r, b.side, b.mode)));
      if (board.me) list.append(h('li', 'ranking-gap', '…'), row(board.me, b.side, b.mode));
    },
    () => {
      if (!live) return;
      list.removeAttribute('aria-busy');
      list.replaceChildren(
        h('li', 'ranking-empty', 'Sem conexão. O ranking global precisa de internet; o "Neste aparelho" funciona offline.'),
      );
    },
  );
  return () => (live = false);
}
