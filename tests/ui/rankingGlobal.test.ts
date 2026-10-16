// @vitest-environment jsdom
// V3 delivery 2 (mockup 6, approved 2026-10-12): the Ranking screen's Global and "Neste aparelho".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalBoard } from '../../src/meta/records';
import { emptyModeBoards } from '../../src/storage/ranking';
import { renderRanking } from '../../src/ui/screens/screens';
import type { ReportAnswer } from '../../src/ui/screens/rankingGlobal';

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
    expect(root.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('offline: says the global ranking needs internet; "Neste aparelho" switches scope', async () => {
    const onScope = vi.fn();
    renderRanking(root, { ...base, boards: emptyModeBoards(), loadGlobal: () => Promise.reject(new Error('offline')), onScope });
    await vi.waitFor(() => expect(root.textContent).toContain('Sem conexão. O ranking global precisa de internet'));
    (
      [...root.querySelectorAll('.ranking-scope')].find((b) => b.getAttribute('aria-label') === 'Neste aparelho') as HTMLButtonElement
    ).click();
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

  describe('reporting a name', () => {
    const open = async (reportName: (u: string) => Promise<ReportAnswer>, b: GlobalBoard = board) => {
      renderRanking(root, { ...base, boards: emptyModeBoards(), loadGlobal: async () => b, reportName });
      await vi.waitFor(() => expect(root.querySelectorAll('.ranking-row')).toHaveLength(3));
    };
    const flags = () => [...root.querySelectorAll<HTMLButtonElement>('.ranking-flag')];
    const dialog = () => root.querySelector<HTMLElement>('[role="dialog"]');
    const press = (label: string) =>
      [...dialog()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === label)!.click();

    it('every line but the player own has a report button named after the player', async () => {
      await open(vi.fn());
      expect(flags().map((f) => f.getAttribute('aria-label'))).toEqual(['Denunciar @turbo_br', 'Denunciar @pmdorj']);
      expect(root.querySelector('.ranking-row.is-me .ranking-flag')).toBeNull();
    });

    it('asks first; Cancelar sends nothing and gives the focus back to the button', async () => {
      const reportName = vi.fn();
      await open(reportName);
      flags()[1]!.click();
      expect(dialog()!.textContent).toContain('Denunciar @pmdorj?');
      expect(document.activeElement!.textContent).toBe('Cancelar');
      press('Cancelar');
      expect(dialog()).toBeNull();
      expect(reportName).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(flags()[1]);
    });

    it('confirmed: sends the name of that line, says it was sent and marks the line', async () => {
      const reportName = vi.fn(async () => 'ok' as const);
      await open(reportName);
      flags()[0]!.click();
      press('Denunciar');
      expect(reportName).toHaveBeenCalledWith('turbo_br');
      await vi.waitFor(() => expect(dialog()!.textContent).toContain('Denúncia enviada'));
      expect(root.querySelector(`#${dialog()!.getAttribute('aria-labelledby')}`)!.textContent).toBe('Denúncia enviada');
      press('OK');
      expect(dialog()).toBeNull();
      expect(flags()[0]!.classList.contains('is-done')).toBe(true);
      expect(flags()[0]!.getAttribute('aria-disabled')).toBe('true');
      expect(flags()[0]!.getAttribute('aria-label')).toBe('@turbo_br denunciado');
      expect(document.activeElement).toBe(flags()[0]);
      flags()[0]!.click();
      expect(dialog()).toBeNull();
    });

    it('a line already reported shows marked', async () => {
      await open(vi.fn(), { rows: [{ ...board.rows[0]!, reported: true }, board.rows[1]!], me: board.me });
      expect(flags()[0]!.classList.contains('is-done')).toBe(true);
      expect(flags()[1]!.classList.contains('is-done')).toBe(false);
    });

    it('offline: says so and keeps the dialog to try again', async () => {
      const reportName = vi.fn<(u: string) => Promise<ReportAnswer>>().mockResolvedValueOnce('offline').mockResolvedValueOnce('ok');
      await open(reportName);
      flags()[0]!.click();
      press('Denunciar');
      await vi.waitFor(() => expect(dialog()!.textContent).toContain('Sem conexão'));
      press('Denunciar');
      await vi.waitFor(() => expect(dialog()!.textContent).toContain('Denúncia enviada'));
    });

    it('too many today, or a name no longer in use: says why and marks nothing', async () => {
      await open(vi.fn(async () => 'limit' as const));
      flags()[0]!.click();
      press('Denunciar');
      await vi.waitFor(() => expect(dialog()!.textContent).toContain('Muitas denúncias hoje'));
      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      root.replaceChildren();
      await open(vi.fn(async () => 'unknown' as const));
      flags()[0]!.click();
      press('Denunciar');
      await vi.waitFor(() => expect(dialog()!.textContent).toContain('não está mais em uso'));
      press('OK');
      expect(flags()[0]!.classList.contains('is-done')).toBe(false);
    });

    it('without reportName (no account) there are no report buttons', async () => {
      renderRanking(root, { ...base, boards: emptyModeBoards(), loadGlobal: async () => board });
      await vi.waitFor(() => expect(root.querySelectorAll('.ranking-row')).toHaveLength(3));
      expect(flags()).toEqual([]);
    });
  });
});
