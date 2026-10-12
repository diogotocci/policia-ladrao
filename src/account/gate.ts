// The account gate (V3 part 1, spec §4.1): before the title, the game asks the account what to show and draws the
// sign-in, username and "which progress" screens until the player is in. Resolves with the account, with the phone's
// profile already replaced when the account's copy won.
import type { Profile } from '../meta/profile';
import { loadProfile, saveProfile } from '../storage/profileStore';
import { renderChooseProgress, renderSignIn, renderUsername } from '../ui/screens/account';
import type { Disposable } from '../ui/screens/dom';
import { SignedOutError, type Account, type AccountApi } from './api';
import { keepProgress, nextStep, type Step } from './boot';
import { mountGoogleButton } from './google';

export interface Entered {
  account: Account;
  /** the profile to start with (the account's when it won) */
  profile: Profile;
}

export function runGate(container: HTMLElement, o: { api: AccountApi; storage: Storage | undefined; dev: boolean }): Promise<Entered> {
  const layer = document.createElement('div');
  layer.className = 'screens-root';
  let view: Disposable | undefined;
  const show = (v: Disposable) => {
    view?.dispose();
    if (!layer.isConnected) container.append(layer);
    view = v;
  };
  return new Promise<Entered>((resolve) => {
    const go = async (error?: string): Promise<void> => {
      const local = loadProfile(o.storage).profile;
      let s: Step;
      try {
        s = await nextStep(o.api, o.storage, local);
      } catch {
        s = { kind: 'signin' }; // unexpected answer: back to the start
      }
      switch (s.kind) {
        case 'ready': {
          const profile = s.profile ?? local;
          if (s.profile) saveProfile(o.storage, s.profile);
          view?.dispose();
          layer.remove();
          resolve({ account: s.account, profile });
          return;
        }
        case 'offline-first':
          show(renderSignIn(layer, { offline: true, onRetry: () => void go() }));
          return;
        case 'signin':
          show(
            renderSignIn(layer, {
              error,
              devSignIn: o.dev ? () => void signIn('dev') : undefined,
              mountButton: o.dev
                ? undefined
                : async (slot) => {
                    const id = await o.api.clientId();
                    if (!id) throw new Error('no client id');
                    await mountGoogleButton(slot, id, (credential) => void signIn(credential));
                  },
            }),
          );
          return;
        case 'username':
          show(
            renderUsername(layer, {
              label: 'Continuar',
              check: (name) => o.api.checkUsername(name),
              async submit(name) {
                let r: Awaited<ReturnType<AccountApi['setUsername']>>;
                try {
                  r = await o.api.setUsername(name);
                } catch (e) {
                  if (!(e instanceof SignedOutError)) throw e;
                  void go(); // the session ended meanwhile: back to Entrar
                  return null;
                }
                if ('problem' in r) return r.problem;
                void go();
                return null;
              },
            }),
          );
          return;
        case 'choose': {
          const step = s;
          show(
            renderChooseProgress(layer, {
              local: step.local,
              cloud: step.cloud,
              onKeep: (which) =>
                void keepProgress(o.api, o.storage, step, which).then((p) => {
                  saveProfile(o.storage, p);
                  return go();
                }),
            }),
          );
          return;
        }
      }
    };
    const signIn = async (credential: string) => {
      try {
        if (!(await o.api.signIn(credential))) return go('Não deu para entrar com essa conta. Tente de novo.');
      } catch {
        return go('Sem conexão. Tente de novo.');
      }
      return go();
    };
    void go();
  });
}
