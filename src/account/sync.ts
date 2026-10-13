// Keeps the account's copy of the progress up to date while playing (V3 part 1, spec §4.3): every saved change marks
// the profile dirty and goes up a moment later; offline it waits for the connection. When another phone saved meanwhile,
// the server merges both and the game takes the merged copy.
import type { Profile } from '../meta/profile';
import { SignedOutError, type AccountApi, type Submitted } from './api';
import type { RecordIn } from '../meta/records';
import { flushRecords, pendingFor, queueRecord } from './records';
import { flushEvents, pendingEvents, queueEvent } from './events';
import type { ClientEventType, EventContext } from '../meta/events';
import { loadAccountState, saveAccountState } from './store';

export interface Sync {
  /** the profile changed and is already saved on the phone */
  changed(): void;
  /** sends now (before signing out); resolves when done or failed */
  flush(): Promise<void>;
  /** changes the account has not received yet (the profile or records for the global ranking) */
  pending(): boolean;
  /** V3 delivery 2: queues a finished match for the global ranking and sends it; resolves with the server's answer, or
   * undefined when it stays queued (offline) or was refused */
  record(r: RecordIn): Promise<Submitted | undefined>;
  /** V3 delivery 3: a usage event for the /admin panel; queued, it goes up with the next send */
  track(type: ClientEventType, data: Record<string, unknown>): void;
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
  /** the app version and where it runs, sent with the usage events */
  context?: EventContext;
  delayMs?: number;
  /** how long to wait after a failed send */
  retryMs?: number;
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}): Sync {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chain: Promise<void> = Promise.resolve();
  let answers = new Map<string, Submitted>();
  /** the records waiting for the global ranking, after the profile */
  const sendRecords = async () => {
    const owner = loadAccountState(o.storage).account?.id;
    if (!owner || pendingFor(o.storage, owner).length === 0) return;
    try {
      answers = await flushRecords(o.api, o.storage, owner);
    } catch (e) {
      if (e instanceof SignedOutError) o.signedOut?.(e.gone);
      return;
    }
    if (pendingFor(o.storage, owner).length > 0) retry();
  };
  /** the usage events go before the records: the server checks each record against its match_end event */
  const sendEvents = async () => {
    const owner = loadAccountState(o.storage).account?.id;
    if (!owner || pendingEvents(o.storage, owner).length === 0) return;
    try {
      await flushEvents(o.api, o.storage, owner, o.context ?? { version: 'unknown', client: 'web' });
    } catch (e) {
      if (e instanceof SignedOutError) o.signedOut?.(e.gone);
      return;
    }
    if (pendingEvents(o.storage, owner).length > 0) retry();
  };
  const push = async () => {
    await pushProfile();
    await sendEvents();
    // a record waits for its match_end event: sent alone, the server would not show it
    const owner = loadAccountState(o.storage).account?.id;
    if (owner && pendingEvents(o.storage, owner).length === 0) await sendRecords();
  };
  const pushProfile = async () => {
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
    pending: () => {
      const st = loadAccountState(o.storage);
      if (st.dirty) return true;
      return st.account !== null && (pendingFor(o.storage, st.account.id).length > 0 || pendingEvents(o.storage, st.account.id).length > 0);
    },
    track(type, data) {
      const owner = loadAccountState(o.storage).account?.id;
      if (!owner) return;
      queueEvent(o.storage, owner, type, data);
      if (timer === undefined) schedule();
    },
    async record(r) {
      const owner = loadAccountState(o.storage).account?.id;
      if (!owner) return undefined;
      queueRecord(o.storage, owner, r);
      await flush();
      return answers.get(r.matchId);
    },
    dispose() {
      clearTimeout(timer);
      target?.removeEventListener('online', onOnline);
    },
  };
}
