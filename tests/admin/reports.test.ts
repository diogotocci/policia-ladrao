// @vitest-environment jsdom
// The /admin "Denúncias" tab (mockup approved 2026-10-15).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountApi } from '../../src/account/api';
import { demoAct, demoModeration, demoStats } from '../../src/account/devStats';
import { renderReports, when } from '../../src/admin/reports';
import { startAdmin } from '../../src/admin/main';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('main');
  document.body.append(root);
});
afterEach(() => root.remove());

const now = new Date('2026-10-15T15:00:00Z'); // 12:00 in Brasília
const view = () => demoModeration(now);
const buttons = (scope: ParentNode) => [...scope.querySelectorAll<HTMLButtonElement>('button')];
const press = (scope: ParentNode, label: string) =>
  buttons(scope)
    .find((b) => b.textContent === label)!
    .click();

describe('reports tab', () => {
  it('one line per reported account: name, reported-as name, count, dates and up to 3 reporters', () => {
    renderReports(root, view(), vi.fn(), now);
    expect(root.querySelector('.sec')!.textContent).toBe('Para revisar (3)');
    const rows = [...root.querySelectorAll('.rep')].map((r) => r.textContent);
    expect(rows[0]).toContain('@xX_Policial_Xx');
    expect(rows[0]).toContain('5 denúncias · primeira 13/10 00:00 · última hoje 09:00 · por @turbo_br, @pmdorj, @Sirene_BR e mais 2');
    expect(rows[1]).toContain('denunciado como @Nitr0_Xyz');
    expect(rows[2]).toContain('1 denúncia · hoje 08:00 · por @PegaLadrao');
  });

  it('rename and dismiss go straight to the server; ban asks first on the line', async () => {
    const act = vi.fn(() => Promise.resolve());
    renderReports(root, view(), act, now);
    const [first, second] = [...root.querySelectorAll<HTMLElement>('.rep')];
    press(first!, 'Forçar troca de nome');
    expect(act).toHaveBeenLastCalledWith('101', 'rename');
    press(second!, 'Descartar');
    expect(act).toHaveBeenLastCalledWith('102', 'dismiss');
    expect(buttons(second!).every((b) => b.disabled)).toBe(true); // no second click while the server answers
    await vi.waitFor(() => expect(buttons(second!).some((b) => b.disabled)).toBe(false));
    act.mockClear();
    press(second!, 'Banir');
    expect(second!.querySelector('.confirm')!.textContent).toContain('Banir @NitroMax? A conta não entra mais no jogo');
    expect(document.activeElement!.textContent).toBe('Cancelar');
    press(second!.querySelector('.confirm')!, 'Cancelar');
    expect(second!.querySelector('.confirm')).toBeNull();
    expect(act).not.toHaveBeenCalled();
    press(second!, 'Banir');
    press(second!.querySelector('.confirm')!, 'Banir');
    expect(act).toHaveBeenCalledWith('102', 'ban');
  });

  it('decided: date, name, action and reports; only a ban still in force can be undone', () => {
    const act = vi.fn(() => Promise.resolve());
    renderReports(root, view(), act, now);
    const rows = [...root.querySelectorAll('.hist tr')].slice(1).map((r) => r.textContent);
    expect(rows[0]).toBe('14/10 10:00@Ladrao_RuimBanido4Desfazer');
    expect(rows[1]).toContain('Nome trocado agora @Vel0z');
    expect(rows[2]).toContain('Descartado');
    expect(buttons(root.querySelector('.hist')!).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Desfazer o banimento de @Ladrao_Ruim',
    ]);
    press(root.querySelector('.hist')!, 'Desfazer');
    expect(act).toHaveBeenCalledWith('104', 'unban');
  });

  it('empty: says there is nothing to review', () => {
    renderReports(root, { pending: [], decided: [] }, vi.fn(), now);
    expect(root.textContent).toContain('Nenhuma denúncia para revisar.');
    expect(root.textContent).toContain('Nenhuma decisão ainda.');
  });

  it('dates are in Brasília time', () => {
    expect(when('2026-10-15T02:30:00Z', now)).toBe('14/10 23:30');
    expect(when('2026-10-15T14:05:00Z', now)).toBe('hoje 11:05');
  });

  it('the fake applies the same rules: a decision leaves the queue, a ban can be undone', () => {
    const v = demoAct(view(), '102', 'ban', now);
    if (v === 'unknown') throw new Error('unknown');
    expect(v.pending.map((p) => p.userId)).toEqual(['101', '103']);
    expect(v.decided[0]).toMatchObject({ userId: '102', action: 'ban', reports: 2, banned: true });
    const back = demoAct(v, '102', 'unban', now);
    if (back === 'unknown') throw new Error('unknown');
    expect(back.decided.slice(0, 2).map((d) => [d.action, d.banned])).toEqual([
      ['unban', false],
      ['ban', false],
    ]);
    expect(demoAct(view(), '999', 'dismiss', now)).toBe('unknown');
  });
});

describe('panel tabs', () => {
  const account = { id: '1', email: 'diogotocci@gmail.com', name: 'Diogo', picture: '', username: 'Diogo', admin: true };
  const api = (o: Partial<AccountApi> = {}) =>
    ({
      me: async () => account,
      adminStats: async (d: number) => demoStats(d),
      adminReports: async () => demoModeration(now),
      adminAct: async (id: string, a: 'ban') => demoAct(demoModeration(now), id, a, now),
      ...o,
    }) as unknown as AccountApi;

  it('Números first; Denúncias shows the count and the queue; a decision draws the tab again', async () => {
    await startAdmin(root, api(), false);
    const tabs = () => [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs().map((t) => [t.textContent, t.getAttribute('aria-selected')])).toEqual([
      ['Números', 'true'],
      ['Denúncias3', 'false'],
    ]);
    expect(root.querySelector('.tile')).not.toBeNull();
    tabs()[1]!.click();
    expect(root.querySelector('.tile')).toBeNull();
    expect(root.querySelectorAll('.rep')).toHaveLength(3);
    expect(document.activeElement).toBe(tabs()[1]);
    press(root.querySelector('.rep')!, 'Descartar');
    await vi.waitFor(() => expect(root.querySelectorAll('.rep')).toHaveLength(2));
    expect(tabs()[1]!.textContent).toBe('Denúncias2');
    await vi.waitFor(() => expect(root.querySelector('.act-status')!.textContent).toBe('Feito.'));
    expect(document.activeElement!.textContent).toBe('Para revisar (2)');
    tabs()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(root.querySelector('.tile')).not.toBeNull();
  });

  it('a failed decision says so and keeps the line', async () => {
    await startAdmin(root, api({ adminAct: () => Promise.reject(new Error('offline')) }), false);
    root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    press(root.querySelector('.rep')!, 'Descartar');
    await vi.waitFor(() => expect(root.querySelector('.act-status')!.textContent).toContain('Não deu para salvar'));
    expect(root.querySelectorAll('.rep')).toHaveLength(3);
  });

  it('when the queue did not load with the numbers, the tab tries again and says so if it fails again', async () => {
    let fail = true;
    await startAdmin(
      root,
      api({ adminReports: () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve(demoModeration(now))) }),
      false,
    );
    const tab = () => root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!;
    tab().click();
    await vi.waitFor(() => expect(root.querySelector('.act-status')!.textContent).toContain('Não deu para carregar as denúncias'));
    fail = false;
    tab().click();
    await vi.waitFor(() => expect(root.querySelectorAll('.rep')).toHaveLength(3));
  });
});
