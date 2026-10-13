// @vitest-environment jsdom
// V3 delivery 3 (mockup 7, approved 2026-10-12): the /admin panel page.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountApi } from '../../src/account/api';
import { demoStats } from '../../src/account/devStats';
import { niceMax } from '../../src/admin/charts';
import { renderStats, startAdmin } from '../../src/admin/main';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('main');
  document.body.append(root);
});
afterEach(() => root.remove());

const account = { id: '1', email: 'diogotocci@gmail.com', name: 'Diogo', picture: '', username: 'Diogo', admin: true };
const api = (o: Partial<AccountApi>) =>
  ({
    me: async () => account,
    adminStats: async (d: number) => demoStats(d),
    clientId: async () => 'x',
    signIn: async () => account,
    ...o,
  }) as unknown as AccountApi;

describe('admin panel', () => {
  it('shows the tiles, the daily chart with a legend and a table, the bar lists and the wins table', () => {
    renderStats(root, demoStats(30), 'diogotocci@gmail.com', vi.fn());
    const tiles = [...root.querySelectorAll('.tile')].map((t) => t.textContent);
    expect(tiles[0]).toContain('Contas criadas612+38 hoje');
    expect(tiles[1]).toContain('+12% na semana');
    expect(tiles[4]).toContain('41%');
    expect(root.querySelector('.legend')!.textContent).toBe('AtivosContas novas');
    expect(root.querySelectorAll('.plot path.line')).toHaveLength(2);
    expect(root.querySelectorAll('table.sr-only tr')).toHaveLength(31);
    expect(root.textContent).toContain('Perseguição · Polícia');
    expect(root.textContent).toContain('Rodoviária PRF'); // car ids become names
    expect(root.textContent).toContain('Pinturas');
    expect(root.querySelector('.wins')!.textContent).toContain('Polícia71%52%38%');
    expect(root.textContent).toContain('app da Play 78%');
  });

  it('the period chips ask for 7, 30 or 90 days', () => {
    const onDays = vi.fn();
    renderStats(root, demoStats(7), 'x', onDays);
    expect(root.querySelector('[aria-checked="true"]')!.textContent).toBe('7 dias');
    (root.querySelectorAll('.chip')[2] as HTMLButtonElement).click();
    expect(onDays).toHaveBeenCalledWith(90);
  });

  it('any other account sees that the page is only for the admin; signed out it asks to sign in', async () => {
    await startAdmin(root, api({ adminStats: async () => 'forbidden' }), false);
    expect(root.textContent).toContain('Só para a conta admin');
    await startAdmin(root, api({ me: async () => null }), true);
    expect(root.textContent).toContain('Entre com a conta admin');
    expect(root.querySelector('button')!.textContent).toBe('Entrar (conta de teste)');
  });

  it('the axis tops off at a round number', () => {
    expect([1, 7, 138, 612, 9350].map(niceMax)).toEqual([1, 10, 200, 1000, 10000]);
  });
});
