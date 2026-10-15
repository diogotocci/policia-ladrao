// @vitest-environment jsdom
// What a player sees after a decision in the /admin "Denúncias" tab (mockups approved 2026-10-15).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignedOutError, httpApi } from '../../src/account/api';
import { DEV_API_KEY, devApi } from '../../src/account/devApi';
import { runGate } from '../../src/account/gate';
import { nextStep } from '../../src/account/boot';
import { emptyProfile } from '../../src/meta/profile';

let root: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const seed = (account: Record<string, unknown>) =>
  localStorage.setItem(
    DEV_API_KEY,
    JSON.stringify({
      signedIn: true,
      account: { id: 'dev-1', email: 'teste@exemplo.com', name: 'Conta de Teste', picture: '', username: null, ...account },
      profile: null,
      rev: 0,
    }),
  );
const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const reply = (status: number, body: unknown = {}) => vi.fn(async () => Response.json(body, { status }));

describe('a decision reaches the player', () => {
  it('forced rename: the username screen says why, and the new name lets the game start', async () => {
    seed({ notice: 'Nome_Feio' });
    const entered = runGate(root, { api: devApi(localStorage, { startSignedOut: false }), storage: localStorage, dev: true });
    await vi.waitFor(() => expect(root.textContent).toContain('Escolha outro nome'));
    expect(root.querySelector('.account-notice')!.textContent).toBe(
      'Seu nome @Nome_Feio foi considerado ofensivo e saiu do ranking. Escolha outro para continuar; seu progresso e seus recordes continuam com você.',
    );
    const input = root.querySelector<HTMLInputElement>('.account-input')!;
    input.value = 'Nome_Bom';
    input.form!.requestSubmit();
    const { account } = await entered;
    expect(account.username).toBe('Nome_Bom');
    expect(account.notice).toBeUndefined();
  });

  it('banned: "Conta suspensa" with the reason, the contact, deleting the account and another account', async () => {
    seed({ username: 'Ladrao_Ruim', banned: true });
    void runGate(root, { api: devApi(localStorage, { startSignedOut: false }), storage: localStorage, dev: true });
    await vi.waitFor(() => expect(root.textContent).toContain('Conta suspensa'));
    expect(root.querySelector('.account-text')!.textContent).toBe(
      'A conta @Ladrao_Ruim foi suspensa por não seguir os Termos (nome ofensivo). Se acha que foi um engano, escreva para diogotocci@gmail.com.',
    );
    expect([...root.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/termos', '/excluir-conta']);
    expect(document.activeElement).toBe(button('Entrar com outra conta'));
    button('Entrar com outra conta').click();
    await vi.waitFor(() => expect(root.textContent).toContain('Entre para jogar'));
  });

  it('the boot step for a banned account comes before the username', async () => {
    const api = devApi(localStorage, { startSignedOut: false });
    seed({ username: null, banned: true });
    expect((await nextStep(api, localStorage, emptyProfile())).kind).toBe('banned');
  });

  it('httpApi: a ban during the session ends it (back to the gate); the admin tab answers', async () => {
    await expect(httpApi(reply(403, { error: 'banned' })).getProfile()).rejects.toBeInstanceOf(SignedOutError);
    expect(await httpApi(reply(403, { error: 'forbidden' })).adminReports()).toBe('forbidden');
    const f = reply(200, { pending: [], decided: [] });
    expect(await httpApi(f).adminAct('12', 'ban')).toEqual({ pending: [], decided: [] });
    expect(f).toHaveBeenCalledWith('/api/admin/stats', expect.objectContaining({ method: 'POST', body: '{"userId":"12","action":"ban"}' }));
    expect(await httpApi(reply(404)).adminAct('12', 'ban')).toBe('unknown');
  });
});
