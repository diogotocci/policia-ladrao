// @vitest-environment jsdom
// V3 delivery 2 (mockup 6, approved 2026-10-12): the Ranking screen's Global and "Neste aparelho".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalBoard } from '../../src/meta/records';
import { emptyModeBoards } from '../../src/storage/ranking';
import { renderRanking } from '../../src/ui/screens/screens';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const base = {
  mode: 'pursuit' as const,
  onMode: vi.fn(),
  difficulty: 'normal' as const,
  onDifficulty: vi.fn(),
  tab: 'police' as const,
  onTab: vi.fn(),
  onBack: vi.fn(),
};
const board: GlobalBoard = {
  rows: [
    { pos: 1, username: 'turbo_br', time: 41.2, hp: 90, car: 'caveirao', rank: 7 },
    { pos: 2, username: 'pmdorj', time: 44.9, hp: 70, car: 'prf', rank: 6 },
  ],
  me: { pos: 37, username: 'Diogo_Fuga', time: 62.5, hp: 50, car: 'viatura', rank: 4, me: true },
};

describe('global ranking screen', () => {
  it('opens on Global: top rows with name, time, car and rank, and the player pinned below', async () => {
    const loadGlobal = vi.fn(async () => board);
    renderRanking(root, { ...base, boards: emptyModeBoards(), loadGlobal });
    expect(root.querySelector('[aria-checked="true"].ranking-scope')!.textContent).toBe('Global');
    expect(loadGlobal).toHaveBeenCalledWith('pursuit', 'police', 'normal');
    await vi.waitFor(() => expect(root.querySelectorAll('.ranking-row')).toHaveLength(3));
    const rows = [...root.querySelectorAll('.ranking-row')].map((r) => r.textContent);
    expect(rows[0]).toContain('@turbo_br');
    expect(rows[0]).toContain('Caveirão');
    expect(rows[0]).toContain('Delegado');
    expect(rows[2]).toContain('37');
    expect(rows[2]).toContain('(você)');
    expect(root.querySelector('.ranking-gap')).not.toBeNull();
    expect(root.querySelector('.ranking-row.is-me')).not.toBeNull();
    expect(root.querySelector<HTMLAnchorElement>('.ranking-report')!.href).toContain('mailto:diogotocci@gmail.com');
  });

  it('offline: says the global ranking needs internet; "Neste aparelho" switches scope', async () => {
    const onScope = vi.fn();
    renderRanking(root, { ...base, boards: emptyModeBoards(), loadGlobal: () => Promise.reject(new Error('offline')), onScope });
    await vi.waitFor(() => expect(root.textContent).toContain('Sem conexão. O ranking global precisa de internet'));
    ([...root.querySelectorAll('.ranking-scope')].find((b) => b.textContent === 'Neste aparelho') as HTMLButtonElement).click();
    expect(onScope).toHaveBeenCalledWith('local');
  });

  it('"Neste aparelho" shows the phone ranking with the arcade initials', () => {
    const boards = emptyModeBoards();
    boards.pursuit.normal.police = [{ initials: 'DIO', time: 40, date: '2026-10-12' }];
    const loadGlobal = vi.fn();
    renderRanking(root, { ...base, boards, loadGlobal, scope: 'local' });
    expect(loadGlobal).not.toHaveBeenCalled();
    expect(root.querySelector('.ranking-initials')!.textContent).toContain('DIO');
  });
});
