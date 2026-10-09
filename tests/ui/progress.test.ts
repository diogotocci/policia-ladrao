// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeBackup } from '../../src/meta/backup';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { openProgress } from '../../src/ui/screens/progress';

const mine: Profile = {
  ...emptyProfile(),
  coins: 1240,
  stats: { matches: 37, wins: 21, escapes: 14, arrests: 7, coinsEarned: 2890 },
  welcomeGranted: true,
};
const other: Profile = { ...emptyProfile(), coins: 500, welcomeGranted: true };

let host: HTMLElement;
let opener: HTMLButtonElement;
beforeEach(() => {
  host = document.createElement('section');
  opener = document.createElement('button');
  opener.textContent = 'Progresso';
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
  const cb = { onRestore: vi.fn(), onClose: vi.fn() };
  openProgress(host, { profile: mine, persistent: true, ...cb, ...over });
  return cb;
};

describe('progress dialog', () => {
  it('shows coins, matches, wins, escapes and the backup code; the page behind is inert', () => {
    open();
    const d = host.querySelector('[role="dialog"]')!;
    expect(d.getAttribute('aria-label')).toBe('Seu progresso');
    for (const t of ['1.240', 'moedas', '37', 'partidas', '21', 'vitórias', '14', 'fugas']) expect(d.textContent).toContain(t);
    expect(host.querySelector('.progress-code')!.textContent).toBe(encodeBackup(mine));
    expect(opener.hasAttribute('inert')).toBe(true);
    expect(d.textContent).toContain('Seu progresso fica salvo neste aparelho');
  });

  it('copy uses the clipboard and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    open();
    button('Copiar código').click();
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(encodeBackup(mine));
    expect(host.textContent).toContain('Copiado');
  });

  it('without a clipboard, copy selects the code instead of throwing', () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    open();
    expect(() => button('Copiar código').click()).not.toThrow();
    expect(window.getSelection()!.toString()).toBe(encodeBackup(mine));
  });

  it('restore: a valid code asks for confirmation, then replaces the progress', () => {
    const cb = open();
    button('Restaurar').click();
    (host.querySelector('textarea') as HTMLTextAreaElement).value = encodeBackup(other);
    button('Conferir').click();
    expect(host.textContent).toContain('Isso substitui o progresso deste aparelho (1.240 moedas) pelo do código (500 moedas).');
    button('Cancelar').click();
    expect(cb.onRestore).not.toHaveBeenCalled();
    button('Conferir').click();
    expect(document.activeElement).toBe(button('Substituir')); // brings the confirmation into view on short screens
    button('Substituir').click();
    expect(cb.onRestore).toHaveBeenCalledWith(other);
  });

  it('editing the code after Conferir drops the pending confirmation', () => {
    const cb = open();
    button('Restaurar').click();
    const input = host.querySelector('textarea') as HTMLTextAreaElement;
    input.value = encodeBackup(other);
    button('Conferir').click();
    input.value = 'PL1-';
    input.dispatchEvent(new Event('input'));
    expect(host.textContent).not.toContain('Isso substitui');
    expect(cb.onRestore).not.toHaveBeenCalled();
  });

  it('an invalid code shows what to do and changes nothing', () => {
    const cb = open();
    button('Restaurar').click();
    (host.querySelector('textarea') as HTMLTextAreaElement).value = 'PL1-ABCD-1234';
    button('Conferir').click();
    expect(host.querySelector('[role="alert"]')!.textContent).toBe('Código incompleto ou com erro. Copie de novo no outro aparelho.');
    expect(host.textContent).not.toContain('Isso substitui');
    expect(cb.onRestore).not.toHaveBeenCalled();
  });

  it('warns when nothing is being saved on this browser', () => {
    open({ persistent: false });
    expect(host.textContent).toContain('Seu progresso não está sendo salvo neste navegador');
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
