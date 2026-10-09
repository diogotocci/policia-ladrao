// "Seu progresso" dialog (V2 part 1): stats, the backup code to copy, and restoring a code from another device.
import { BACKUP_ERROR_TEXT, decodeBackup, encodeBackup } from '../../meta/backup';
import type { Profile } from '../../meta/profile';
import { btn, h, openModal } from './dom';

const n = (v: number) => v.toLocaleString('pt-BR');

function statsGrid(p: Profile): HTMLElement {
  const grid = h('div', 'progress-stats');
  const item = (value: number, label: string) => {
    const cell = h('div', 'progress-stat');
    cell.append(h('b', '', n(value)), h('span', '', label));
    grid.append(cell);
  };
  item(p.coins, 'moedas');
  item(p.stats.matches, 'partidas');
  item(p.stats.wins, 'vitórias');
  item(p.stats.escapes, 'fugas');
  return grid;
}

/** Copies the code; without the Clipboard API (old iOS, plain http) selects it for a manual copy. */
function copyCode(codeEl: HTMLElement, button: HTMLButtonElement): void {
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  const select = () => window.getSelection()?.selectAllChildren(codeEl);
  if (!clip?.writeText) return select();
  clip.writeText(codeEl.textContent ?? '').then(
    () => (button.textContent = 'Copiado'),
    () => select(),
  );
}

function restorePanel(current: Profile, onRestore: (next: Profile) => void): HTMLElement {
  const panel = h('div', 'progress-restore');
  const label = h('label', 'progress-label', 'Cole o código do outro aparelho');
  const input = h('textarea', 'progress-input');
  input.id = 'progress-input';
  label.htmlFor = input.id;
  input.rows = 2;
  input.spellcheck = false;
  const error = h('p', 'progress-error');
  error.setAttribute('role', 'alert');
  const confirm = h('div', 'progress-confirm');
  const check = () => {
    confirm.replaceChildren();
    const r = decodeBackup(input.value);
    if (!r.ok) {
      error.textContent = BACKUP_ERROR_TEXT[r.error];
      error.scrollIntoView?.({ block: 'nearest' }); // short screens: the message may sit below the fold
      return;
    }
    error.textContent = '';
    const text = `Isso substitui o progresso deste aparelho (${n(current.coins)} moedas) pelo do código (${n(r.profile.coins)} moedas).`;
    const row = h('div', 'progress-actions');
    const replace = btn('Substituir', 'is-primary', () => onRestore(r.profile));
    row.append(
      replace,
      btn('Cancelar', 'is-quiet', () => confirm.replaceChildren()),
    );
    confirm.append(h('p', 'progress-note', text), row);
    replace.focus(); // also scrolls the confirmation into view on short screens
  };
  // a confirmation belongs to the code it was made for
  input.addEventListener('input', () => confirm.replaceChildren());
  panel.append(label, input, btn('Conferir', '', check), error, confirm);
  return panel;
}

/** Admin mode (testing): password to turn it on, one button to turn it off. */
function adminPanel(onAdmin: (password: string) => Promise<boolean>): HTMLElement {
  const panel = h('form', 'progress-restore progress-admin');
  const label = h('label', 'progress-label', 'Senha de admin');
  const input = h('input', 'progress-input');
  input.id = 'progress-admin';
  input.type = 'password';
  input.autocomplete = 'off';
  label.htmlFor = input.id;
  const error = h('p', 'progress-error');
  error.setAttribute('role', 'alert');
  const enter = h('button', 'screen-btn', 'Entrar');
  enter.type = 'submit';
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    enter.disabled = true;
    void onAdmin(input.value).then((ok) => {
      enter.disabled = false;
      if (!ok) error.textContent = 'Senha errada (ou sem conexão).';
    });
  });
  panel.append(label, input, enter, error);
  return panel;
}

export function openProgress(
  host: HTMLElement,
  p: {
    profile: Profile;
    persistent: boolean;
    onRestore(next: Profile): void;
    onClose(): void;
    /** admin mode (testing): on now, and how to turn it on (true when the password is right) or off */
    admin?: { on: boolean; enter(password: string): Promise<boolean>; leave(): void };
  },
): void {
  const dialog = h('div', 'progress-dialog');
  const note = p.persistent
    ? 'Seu progresso fica salvo neste aparelho. Para levar a outro celular, copie o código e cole lá em "Restaurar".'
    : 'Seu progresso não está sendo salvo neste navegador.';
  const code = h('p', 'progress-code', encodeBackup(p.profile));
  const copy = btn('Copiar código', 'is-primary', () => copyCode(code, copy));
  const restore = btn('Restaurar', '', () => {
    restore.disabled = true;
    const panel = restorePanel(p.profile, p.onRestore);
    actions.after(panel);
    panel.querySelector('textarea')!.focus();
  });
  const actions = h('div', 'progress-actions');
  actions.append(copy, restore);
  const admin = p.admin;
  if (admin?.on) actions.append(btn('Sair do admin', '', () => (admin.leave(), close())));
  else if (admin) {
    const open = btn('Admin', '', () => {
      open.disabled = true;
      const panel = adminPanel(async (password) => {
        const ok = await admin.enter(password);
        if (ok) close();
        return ok;
      });
      actions.after(panel);
      panel.querySelector('input')!.focus();
    });
    actions.append(open);
  }
  actions.append(btn('Fechar', 'is-quiet', () => close()));
  dialog.append(h('h2', 'screen-heading', 'Seu progresso'), statsGrid(p.profile), h('p', 'progress-note', note), code, actions);
  const close = openModal(host, dialog, 'Seu progresso', p.onClose);
  copy.focus();
}
