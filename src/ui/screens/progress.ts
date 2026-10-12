// "Seu perfil" dialog (the corner button of the title): the account (V3 part 1: username, Sair, Excluir minha conta),
// the stats and the admin mode. The V2 backup code is gone: the account keeps the progress now.
import type { Account } from '../../account/api';
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

/** The account block: initial, @username, name and e-mail, and its three actions. */
function accountBlock(a: AccountActions, close: () => void): HTMLElement {
  const box = h('div', 'profile-account');
  const who = a.account.username ?? a.account.name;
  const avatar = h('span', 'profile-avatar', (who.trim()[0] ?? '?').toUpperCase());
  avatar.setAttribute('aria-hidden', 'true');
  const names = h('div', 'profile-names');
  names.append(
    h('b', 'profile-username', a.account.username ? `@${a.account.username}` : a.account.name),
    h('span', 'profile-email', [a.account.name, a.account.email].filter(Boolean).join(' · ')),
  );
  const top = h('div', 'profile-who');
  top.append(
    avatar,
    names,
    btn('Trocar nome', 'profile-rename', () => (close(), a.rename())),
  );
  const error = h('p', 'progress-error');
  error.setAttribute('role', 'alert');
  const out = btn('Sair', '', () => {
    out.disabled = true;
    void a.signOut().then((problem) => {
      out.disabled = false;
      error.textContent = problem ?? '';
    });
  });
  const row = h('div', 'progress-actions');
  row.append(
    out,
    btn('Excluir minha conta', 'is-danger-outline', () => (close(), a.remove())),
  );
  box.append(top, row, error);
  return box;
}

export interface AccountActions {
  account: Account;
  /** progress waiting for the internet to reach the account */
  pending: boolean;
  rename(): void;
  /** resolves with a problem to show, or undefined once signed out */
  signOut(): Promise<string | undefined>;
  remove(): void;
}

export function openProgress(
  host: HTMLElement,
  p: {
    profile: Profile;
    persistent: boolean;
    onClose(): void;
    /** V3: the signed-in account (absent in the unit tests of other screens) */
    account?: AccountActions;
    version?: string;
    /** admin mode (testing): on now, and how to turn it on (true when the password is right) or off */
    admin?: { on: boolean; enter(password: string): Promise<boolean>; leave(): void };
  },
): () => void {
  const dialog = h('div', 'progress-dialog');
  const note = !p.persistent
    ? 'Este navegador não guarda dados: o progresso só fica salvo na sua conta quando há internet.'
    : p.account?.pending
      ? 'Sem conexão agora: o progresso sobe para a sua conta quando a internet voltar.'
      : 'Seu progresso fica salvo na sua conta.';
  const actions = h('div', 'progress-actions');
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
  const done = btn('Fechar', 'is-quiet', () => close());
  actions.append(done);
  const legal = h('p', 'profile-legal');
  for (const [href, text] of [
    ['/privacidade', 'Política de privacidade'],
    ['/termos', 'Termos'],
  ] as const) {
    const a = h('a', 'account-link', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    legal.append(a, ' · ');
  }
  if (p.version) legal.append(`v${p.version}`);
  else legal.lastChild?.remove();
  dialog.append(h('h2', 'screen-heading', 'Seu perfil'));
  if (p.account) dialog.append(accountBlock(p.account, () => close()));
  dialog.append(statsGrid(p.profile), h('p', 'progress-note', note), actions, legal);
  const close = openModal(host, dialog, 'Seu perfil', p.onClose);
  done.focus();
  return close;
}
