// Ranking local (spec §8): top 10 por lado, validado ao carregar, nunca quebra o jogo.
import type { Role } from '../config/balance';

export const RANKING_KEY = 'pl.ranking.v1';
const MAX = 10;

export interface Entry {
  initials: string;
  time: number; // s
  date: string; // ISO (yyyy-mm-dd ou completo)
}
export interface Board {
  police: Entry[];
  thief: Entry[];
}

export const emptyBoard = (): Board => ({ police: [], thief: [] });

/** polícia: menor tempo primeiro; ladrão: maior tempo primeiro */
const better = (role: Role, a: number, b: number) => (role === 'police' ? a < b : a > b);

const valid = (x: unknown): x is Entry =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as Entry).initials === 'string' &&
  /^[A-Z]{3}$/.test((x as Entry).initials) &&
  typeof (x as Entry).time === 'number' &&
  Number.isFinite((x as Entry).time) &&
  (x as Entry).time >= 0 &&
  typeof (x as Entry).date === 'string';

/** Ordena mantendo a ordem original nos empates (o mais antigo foi inserido antes) e corta em 10. */
function normalize(role: Role, list: Entry[]): Entry[] {
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.time === b.e.time ? a.i - b.i : better(role, a.e.time, b.e.time) ? -1 : 1))
    .slice(0, MAX)
    .map((x) => x.e);
}

export function qualifies(board: Board, role: Role, time: number, won: boolean): boolean {
  if (role === 'police' && !won) return false;
  const list = board[role];
  if (list.length < MAX) return true;
  return better(role, time, list[list.length - 1]!.time);
}

/** Insere e devolve a posição (1 = primeiro; 0 = não entrou). Empate: o novo fica depois dos antigos. */
export function insert(board: Board, role: Role, entry: Entry): { board: Board; rank: number } {
  const list = board[role];
  let at = list.findIndex((e) => better(role, entry.time, e.time));
  if (at < 0) at = list.length;
  if (at >= MAX) return { board, rank: 0 };
  const next = [...list.slice(0, at), entry, ...list.slice(at)].slice(0, MAX);
  return { board: { ...board, [role]: next }, rank: at + 1 };
}

export function loadBoard(storage: Storage | undefined): Board {
  try {
    const raw = storage?.getItem(RANKING_KEY);
    if (!raw) return emptyBoard();
    const data = JSON.parse(raw) as Partial<Record<Role, unknown>>;
    if (typeof data !== 'object' || data === null) return emptyBoard();
    const pick = (role: Role) => (Array.isArray(data[role]) ? normalize(role, (data[role] as unknown[]).filter(valid)) : []);
    return { police: pick('police'), thief: pick('thief') };
  } catch {
    return emptyBoard();
  }
}

export function saveBoard(storage: Storage | undefined, board: Board): void {
  try {
    storage?.setItem(RANKING_KEY, JSON.stringify(board));
  } catch {
    /* sem storage: o ranking vale só nesta sessão */
  }
}

export function sanitizeInitials(s: string): string {
  return (s.toUpperCase().replace(/[^A-Z]/g, '') + 'AAA').slice(0, 3);
}
