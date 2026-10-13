// Usage events waiting to reach the server (V3 delivery 3): queued on the phone first, so what is played offline is
// counted when the connection comes back. Like the records, each event belongs to the account it was recorded with.
import type { ClientEvent, ClientEventType, EventContext } from '../meta/events';
import { newMatchId } from '../meta/ids';
import { OfflineError, ServerError, SignedOutError, type AccountApi } from './api';

export const EVENTS_KEY = 'pl.events.pending.v1';
const MAX_QUEUE = 300;
const BATCH = 50;
const MAX_TRIES = 8;

interface Queued {
  owner: string;
  event: ClientEvent;
}
interface Stored {
  list: Queued[];
  /** server failures in a row (a batch the server keeps refusing is given up) */
  tries?: number;
}

function load(storage: Storage | undefined): Stored {
  try {
    const v = JSON.parse(storage?.getItem(EVENTS_KEY) ?? '{}') as Partial<Stored>;
    return {
      list: Array.isArray(v.list) ? v.list.filter((q) => typeof q?.owner === 'string' && typeof q.event?.id === 'string') : [],
      tries: v.tries,
    };
  } catch {
    return { list: [] };
  }
}
function save(storage: Storage | undefined, s: Stored): void {
  try {
    storage?.setItem(EVENTS_KEY, JSON.stringify({ ...s, list: s.list.slice(-MAX_QUEUE) }));
  } catch {
    // full storage: these events are lost (they are only statistics)
  }
}

export function queueEvent(
  storage: Storage | undefined,
  owner: string,
  type: ClientEventType,
  data: Record<string, unknown>,
  at = new Date(),
) {
  const s = load(storage);
  save(storage, { ...s, list: [...s.list, { owner, event: { id: newMatchId(), type, at: at.toISOString(), data } }] });
}

export const pendingEvents = (storage: Storage | undefined, owner: string) => load(storage).list.filter((q) => q.owner === owner);

/** Sends this account's events in batches (other accounts' are dropped). Offline: everything waits. */
export async function flushEvents(api: AccountApi, storage: Storage | undefined, owner: string, ctx: EventContext): Promise<void> {
  save(storage, { ...load(storage), list: pendingEvents(storage, owner) });
  for (;;) {
    const batch = pendingEvents(storage, owner).slice(0, BATCH);
    if (batch.length === 0) return;
    try {
      await api.sendEvents(
        batch.map((q) => q.event),
        ctx,
      );
    } catch (e) {
      if (e instanceof SignedOutError) throw e;
      const s = load(storage);
      const tries = (s.tries ?? 0) + 1;
      if (e instanceof ServerError && tries >= MAX_TRIES) save(storage, { list: s.list.slice(batch.length) });
      else if (e instanceof OfflineError) save(storage, { ...s, tries: e instanceof ServerError ? tries : s.tries });
      else save(storage, { list: s.list.slice(batch.length) }); // anything else: these events cannot be sent
      return;
    }
    const sent = new Set(batch.map((q) => q.event.id));
    save(storage, { list: load(storage).list.filter((q) => !sent.has(q.event.id)) });
  }
}
