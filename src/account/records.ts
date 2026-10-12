// Records waiting to reach the global ranking (V3 delivery 2): each one is queued on the phone first, so a match played
// offline still goes up when the connection comes back. The server keeps one row per match id, so sending twice is safe.
// Each record remembers whose it is: a record never goes up under another account that signs in on the same phone.
import type { RecordIn } from '../meta/records';
import { OfflineError, ServerError, SignedOutError, type AccountApi, type Submitted } from './api';

export const RECORDS_KEY = 'pl.records.pending.v1';
const MAX_QUEUE = 50;
/** a record the server keeps failing on (not the network) is given up after this many tries, so it never blocks Sair */
const MAX_TRIES = 8;

export interface Queued {
  /** the account the match was played with */
  owner: string;
  record: RecordIn;
  /** server failures so far */
  tries?: number;
}

export function pendingRecords(storage: Storage | undefined): Queued[] {
  try {
    const v = JSON.parse(storage?.getItem(RECORDS_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? (v as Queued[]).filter((q) => typeof q?.owner === 'string' && typeof q.record?.matchId === 'string') : [];
  } catch {
    return [];
  }
}

function save(storage: Storage | undefined, list: Queued[]): void {
  try {
    storage?.setItem(RECORDS_KEY, JSON.stringify(list.slice(-MAX_QUEUE)));
  } catch {
    // full storage: this record only goes up if it is sent right now
  }
}

export const queueRecord = (storage: Storage | undefined, owner: string, record: RecordIn) =>
  save(storage, [...pendingRecords(storage), { owner, record }]);

/** the queue of this account (records of other accounts that signed out here are dropped) */
export const pendingFor = (storage: Storage | undefined, owner: string) => pendingRecords(storage).filter((q) => q.owner === owner);

/**
 * Sends this account's queue in order and returns what the server answered for each match. Stops at the first network
 * failure (everything left waits); a signed-out answer is rethrown so the app goes back to the sign-in.
 */
export async function flushRecords(api: AccountApi, storage: Storage | undefined, owner: string): Promise<Map<string, Submitted>> {
  const answers = new Map<string, Submitted>();
  save(storage, pendingFor(storage, owner));
  for (const q of pendingFor(storage, owner)) {
    let a: Submitted | undefined;
    try {
      // the time since the match ended, measured on the phone: the server places it on its own clock (phone clock skew
      // does not matter, and records sent together after playing offline keep their spacing)
      a = await api.submitRecord({ ...q.record, sentAt: new Date().toISOString() });
    } catch (e) {
      if (e instanceof SignedOutError) throw e;
      if (e instanceof ServerError && (q.tries ?? 0) + 1 < MAX_TRIES)
        save(
          storage,
          pendingRecords(storage).map((x) => (x.record.matchId === q.record.matchId ? { ...x, tries: (x.tries ?? 0) + 1 } : x)),
        );
      else if (!(e instanceof OfflineError) || e instanceof ServerError) drop(storage, q);
      break;
    }
    answers.set(q.record.matchId, a ?? { pos: null, best: false }); // undefined: refused as malformed, dropped
    drop(storage, q);
  }
  return answers;
}

const drop = (storage: Storage | undefined, q: Queued) =>
  save(
    storage,
    pendingRecords(storage).filter((x) => x.record.matchId !== q.record.matchId),
  );
