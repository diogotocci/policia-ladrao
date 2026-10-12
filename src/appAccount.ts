// The account inside the running app (V3 part 1): keeps the cloud copy of the progress in sync and gives the profile
// dialog its actions (Trocar nome, Sair, Excluir minha conta). Kept out of app.ts, which only calls bind() and actions().
import type { Account, AccountApi } from './account/api';
import { forgetAccount, loadAccountState, saveAccountState } from './account/store';
import { createSync, type Sync } from './account/sync';
import type { Profile } from './meta/profile';
import { openDeleteAccount, openRename } from './ui/screens/account';
import type { AccountActions } from './ui/screens/progress';

export interface AppAccount {
  /** the profile the gate settled on */
  profile: Profile;
  /** the shop's admin mode: the server says so only for the admin account */
  admin: boolean;
  bind(o: { get(): Profile; adopt(p: Profile): void }): Pick<Sync, 'changed' | 'dispose'>;
  /** the profile dialog's account block; `reopen` draws the dialog again after a rename */
  actions(host: HTMLElement, reopen: () => void): AccountActions;
}

export function createAppAccount(o: {
  api: AccountApi;
  storage: Storage | undefined;
  account: Account;
  profile: Profile;
  /** back to the start (the gate): after Sair, Excluir, or a session that ended on the server */
  restart(): void;
}): AppAccount {
  let account = o.account;
  let sync: Sync | undefined;
  let left = false;
  /** back to the gate; `forget` drops the account and its progress from the phone (Sair, Excluir, deleted elsewhere) */
  const leave = (forget: boolean) => {
    if (left) return;
    left = true;
    sync?.dispose();
    if (forget) forgetAccount(o.storage);
    o.restart();
  };
  return {
    profile: o.profile,
    admin: o.account.admin === true,
    bind(b) {
      sync = createSync({ api: o.api, storage: o.storage, get: b.get, adopt: b.adopt, signedOut: (gone) => leave(gone) });
      return sync;
    },
    actions(host, reopen) {
      const focusBack = () => host.querySelector<HTMLElement>('.title-progress')?.focus();
      return {
        account,
        pending: sync?.pending() ?? false,
        rename() {
          const close = openRename(host, {
            label: 'Salvar',
            initial: account.username ?? '',
            check: (name) => o.api.checkUsername(name),
            async submit(name) {
              if (name === account.username) return (close(), null);
              const r = await o.api.setUsername(name);
              if ('problem' in r) return r.problem;
              account = r.account;
              const st = loadAccountState(o.storage);
              saveAccountState(o.storage, { ...st, account });
              close();
              reopen();
              return null;
            },
            onClose: focusBack,
          });
        },
        async signOut() {
          // whatever was played offline goes up first; without internet, Sair would lose it
          await sync?.flush();
          if (left) return undefined; // the session had already ended: back at the gate
          if (sync?.pending()) return 'Sem conexão: conecte-se para sair sem perder o progresso que ainda não subiu.';
          try {
            await o.api.signOut();
          } catch {
            // the session cookie stays until it expires; the phone forgets the account anyway
          }
          leave(true);
          return undefined;
        },
        remove() {
          openDeleteAccount(host, {
            confirmText: account.username ?? account.email,
            async onDelete(typed) {
              try {
                if (!(await o.api.deleteAccount(typed))) return 'wrong';
              } catch {
                return 'offline';
              }
              leave(true);
              return 'ok';
            },
            onClose: focusBack,
          });
        },
      };
    },
  };
}
