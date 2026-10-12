// Keeps the account's copy of the progress up to date while playing (V3 part 1, spec §4.3): every saved change marks
// the profile dirty and goes up a moment later; offline it waits for the connection. When another phone saved meanwhile,
// the server merges both and the game takes the merged copy.
import type { Profile } from '../meta/profile';
import { SignedOutError, type AccountApi } from './api';
import { loadAccountState, saveAccountState } from './store';

export interface Sync {
  /** the profile changed and is already saved on the phone */
  changed(): void;
  /** sends now (before signing out); resolves when done or failed */
  flush(): Promise<void>;
  /** changes the account has not received yet */
  pending(): boolean;
  dispose(): void;
}

export function createSync(o: {
  api: AccountApi;
  storage: Storage | undefined;
  get(): Profile;
  /** a merged copy from the account replaces the phone's */
  adopt(p: Profile): void;
  /** the session ended on the server; `gone` when the account was deleted elsewhere */
  signedOut?(gone: boolean): void;
  delayMs?: number;
  /** how long to wait after a failed send */
  retryMs?: number;
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}): Sync {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chain: Promise<void> = Promise.resolve();
  const push = async () => {
    const st = loadAccountState(o.storage);
    if (!st.account || !st.dirty) return;
    const sent = o.get();
    try {
      const saved = await o.api.putProfile(sent, st.rev);
      if (o.get() !== sent) {
        // played on while it was sending: keep the old base so the next send merges again instead of overwriting
        schedule();
        return;
      }
      saveAccountState(o.storage, { account: st.account, rev: saved.rev, dirty: false });
      if (saved.data && JSON.stringify(saved.data) !== JSON.stringify(sent)) o.adopt(saved.data);
    } catch (e) {
      if (e instanceof SignedOutError) return o.signedOut?.(e.gone);
      // offline or server trouble: stays dirty and tries again in a while, on the next change or when the connection is back
      retry();
    }
  };
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    chain = chain.then(push);
    return chain;
  };
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), o.delayMs ?? 1500);
  }
  function retry() {
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), o.retryMs ?? 30_000);
  }
  const onOnline = () => void flush();
  const target = o.target ?? (typeof window !== 'undefined' ? window : undefined);
  target?.addEventListener('online', onOnline);
  return {
    changed() {
      const st = loadAccountState(o.storage);
      if (!st.account) return;
      if (!st.dirty) saveAccountState(o.storage, { ...st, dirty: true });
      schedule();
    },
    flush,
    pending: () => loadAccountState(o.storage).dirty,
    dispose() {
      clearTimeout(timer);
      target?.removeEventListener('online', onOnline);
    },
  };
}
