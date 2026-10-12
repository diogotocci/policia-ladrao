// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { openProgress, type AccountActions } from '../../src/ui/screens/progress';

const mine: Profile = {
  ...emptyProfile(),
  coins: 1240,
  stats: { matches: 37, wins: 21, escapes: 14, arrests: 7, coinsEarned: 2890 },
  welcomeGranted: true,
};

let host: HTMLElement;
let opener: HTMLButtonElement;
beforeEach(() => {
  host = document.createElement('section');
  opener = document.createElement('button');
  opener.textContent = 'Perfil';
  host.append(opener);
  document.body.append(host);
  opener.focus();
});
afterEach(() => {
  host.remove();
  vi.unstubAllGlobals();
});

const button = (label: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const open = (over: Partial<Parameters<typeof openProgress>[1]> = {}) => {
  const cb = { onClose: vi.fn() };
  openProgress(host, { profile: mine, persistent: true, ...cb, ...over });
  return cb;
};

const acct = (over: Partial<AccountActions> = {}): AccountActions => ({
  account: { id: 'u1', email: 'diogo@exemplo.com', name: 'Diogo Tocci', picture: '', username: 'Diogo_Fuga' },
  pending: false,
  rename: vi.fn(),
  signOut: vi.fn(async () => undefined),
  remove: vi.fn(),
  ...over,
});

describe('profile dialog (V3)', () => {
  it('shows the account, the stats and the legal links; the page behind is inert; no backup code any more', () => {
    open({ account: acct(), version: '0.25.0' });
    const d = host.querySelector('[role="dialog"]')!;
    expect(d.getAttribute('aria-label')).toBe('Seu perfil');
    for (const t of [
      '@Diogo_Fuga',
      'Diogo Tocci · diogo@exemplo.com',
      '1.240',
      'moedas',
      '37',
      'partidas',
      '21',
      'vitórias',
      '14',
      'fugas',
    ])
      expect(d.textContent).toContain(t);
    expect(d.textContent).toContain('Seu progresso fica salvo na sua conta.');
    expect(host.querySelector('.profile-avatar')!.textContent).toBe('D');
    const links = [...d.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/privacidade', '/termos']);
    expect(d.textContent).toContain('v0.25.0');
    expect(host.querySelector('.progress-code')).toBeNull();
    expect(button('Restaurar')).toBeUndefined();
    expect(opener.hasAttribute('inert')).toBe(true);
  });

  it('Trocar nome and Excluir minha conta close the dialog and open theirs', () => {
    const a = acct();
    open({ account: a });
    button('Trocar nome').click();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(a.rename).toHaveBeenCalledOnce();
    open({ account: a });
    button('Excluir minha conta').click();
    expect(a.remove).toHaveBeenCalledOnce();
  });

  it('Sair shows why it could not sign out (offline progress not sent yet)', async () => {
    const a = acct({ signOut: vi.fn(async () => 'Sem conexão: conecte-se para sair.') });
    open({ account: a });
    button('Sair').click();
    await vi.waitFor(() =>
      expect(host.querySelector('.profile-account [role="alert"]')!.textContent).toBe('Sem conexão: conecte-se para sair.'),
    );
  });

  it('says when progress is waiting for the internet, and when this browser does not save', () => {
    open({ account: acct({ pending: true }) });
    expect(host.textContent).toContain('o progresso sobe para a sua conta quando a internet voltar');
    button('Fechar').click();
    open({ persistent: false });
    expect(host.textContent).toContain('Este navegador não guarda dados');
  });

  it('Esc and Fechar close it; the page behind comes back', () => {
    const cb = open();
    host.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(opener.hasAttribute('inert')).toBe(false);
    expect(cb.onClose).toHaveBeenCalledOnce();
    const cb2 = open();
    button('Fechar').click();
    expect(cb2.onClose).toHaveBeenCalledOnce();
  });
});

describe('admin (playtest 2026-10-09)', () => {
  it('Admin asks for the password; a wrong one says so, the right one closes the dialog', async () => {
    const enter = vi.fn(async (pw: string) => pw === 'secret123');
    const cb = open({ admin: { on: false, enter, leave: vi.fn() } });
    button('Admin').click();
    const input = host.querySelector<HTMLInputElement>('#progress-admin')!;
    expect(input.type).toBe('password');
    expect(document.activeElement).toBe(input);
    input.value = 'nope';
    input.form!.requestSubmit();
    await vi.waitFor(() =>
      expect(host.querySelector('.progress-admin .progress-error')!.textContent).toBe('Senha errada (ou sem conexão).'),
    );
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    input.value = 'secret123';
    input.form!.requestSubmit();
    await vi.waitFor(() => expect(cb.onClose).toHaveBeenCalled());
    expect(enter).toHaveBeenCalledWith('secret123');
  });

  it('with admin on: "Sair do admin" turns it off; without the admin option there is no button', () => {
    const leave = vi.fn();
    open({ admin: { on: true, enter: vi.fn(), leave } });
    expect(button('Admin')).toBeUndefined();
    button('Sair do admin').click();
    expect(leave).toHaveBeenCalled();
  });

  it('no admin option: no admin button', () => {
    open();
    expect(button('Admin')).toBeUndefined();
    expect(button('Sair do admin')).toBeUndefined();
  });
});
