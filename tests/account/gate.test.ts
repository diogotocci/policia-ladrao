// @vitest-environment jsdom
// V3 part 1: the account gate on screen, with the localhost fake (mockups 1, 2, 3 and 5 approved 2026-10-12).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { devApi } from '../../src/account/devApi';
import { runGate } from '../../src/account/gate';
import { emptyProfile } from '../../src/meta/profile';
import { saveProfile } from '../../src/storage/profileStore';
import { openDeleteAccount } from '../../src/ui/screens/account';

let root: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const type = (input: HTMLInputElement, v: string) => {
  input.value = v;
  input.dispatchEvent(new Event('input'));
};

describe('gate', () => {
  it('sign in, pick a username (taken, then free), and the game starts with the phone progress', async () => {
    saveProfile(localStorage, { ...emptyProfile(), coins: 70, welcomeGranted: true });
    const api = devApi(localStorage, { startSignedOut: true });
    const entered = runGate(root, { api, storage: localStorage, dev: true });
    await vi.waitFor(() => expect(root.textContent).toContain('Entre para jogar'));
    expect([...root.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/termos', '/privacidade']);
    button('Entrar (conta de teste)').click();
    await vi.waitFor(() => expect(root.textContent).toContain('Escolha seu nome de usuário'));
    const input = root.querySelector<HTMLInputElement>('.account-input')!;
    type(input, 'ab');
    expect(root.querySelector('[role="status"]')!.textContent).toBe('Use de 3 a 16 letras, números ou _.');
    type(input, 'policial');
    input.form!.requestSubmit();
    await vi.waitFor(() => expect(root.querySelector('[role="status"]')!.textContent).toBe('Esse nome já está em uso.'));
    type(input, 'Diogo_Fuga');
    input.form!.requestSubmit();
    const r = await entered;
    expect(r.account.username).toBe('Diogo_Fuga');
    expect(r.profile.coins).toBe(70);
    expect(root.querySelector('.screens-root')).toBeNull(); // the gate is gone
  });

  it('two progresses: shows both and keeps the one picked', async () => {
    const api = devApi(localStorage, { startSignedOut: false });
    await api.putProfile({ ...emptyProfile(), coins: 3120, welcomeGranted: true }, 0);
    saveProfile(localStorage, { ...emptyProfile(), coins: 14379, welcomeGranted: true, stats: { ...emptyProfile().stats, matches: 9 } });
    const entered = runGate(root, { api, storage: localStorage, dev: true });
    await vi.waitFor(() => expect(root.textContent).toContain('Você tem progresso em dois lugares'));
    expect(root.textContent).toContain('14.379');
    expect(root.textContent).toContain('3.120');
    expect(button('Manter o deste celular')).toBeDefined();
    root.querySelectorAll<HTMLButtonElement>('.account-choice')[1]!.click();
    button('Manter o da conta').click();
    expect((await entered).profile.coins).toBe(3120);
  });
});

describe('delete account dialog', () => {
  it('Excluir para sempre only after typing the username; a failure says why', async () => {
    const host = document.createElement('section');
    root.append(host);
    const onDelete = vi.fn(async () => 'offline' as const);
    openDeleteAccount(host, { confirmText: 'Diogo_Fuga', onDelete, onClose: vi.fn() });
    const go = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Excluir para sempre')!;
    const input = host.querySelector<HTMLInputElement>('input')!;
    expect(go.disabled).toBe(true);
    type(input, 'Diogo_Fu');
    expect(go.disabled).toBe(true);
    type(input, 'diogo_fuga');
    expect(go.disabled).toBe(false);
    input.form!.requestSubmit();
    await vi.waitFor(() => expect(host.querySelector('[role="alert"]')!.textContent).toContain('Não deu para excluir agora'));
    expect(onDelete).toHaveBeenCalledWith('diogo_fuga');
    expect(host.textContent).toContain('Não dá para desfazer.');
  });
});
