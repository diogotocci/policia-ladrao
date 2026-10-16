// V3 delivery 2: records for the global ranking queue on the phone and go up when they can.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineError, ServerError } from '../../src/account/api';
import { devApi } from '../../src/account/devApi';
import { pendingRecords } from '../../src/account/records';
import { forgetAccount, saveAccountState } from '../../src/account/store';
import { createSync } from '../../src/account/sync';
import { globalRecord } from '../../src/appMatch';
import { emptyProfile } from '../../src/meta/profile';
import { plausible, type RecordIn } from '../../src/meta/records';
import { memStorage } from './memStorage';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const acc = { id: 'dev-1', email: 'e', name: 'n', picture: '', username: 'Teste' };
const rec = (o: Partial<RecordIn> = {}): RecordIn => ({
  matchId: `match-${Math.random().toString(36).slice(2, 12)}`,
  mode: 'pursuit',
  side: 'police',
  difficulty: 'normal',
  time: 40,
  hp: 70,
  car: 'viatura',
  rank: 1,
  endedAt: new Date().toISOString(),
  ...o,
});

function setup() {
  const storage = memStorage();
  saveAccountState(storage, { account: acc, rev: 0, dirty: false });
  const api = devApi(memStorage(), { startSignedOut: false });
  const events = new EventTarget();
  const sync = createSync({ api, storage, get: () => emptyProfile(), adopt: vi.fn(), target: events as never, retryMs: 30_000 });
  return { storage, api, events, sync };
}

describe('global ranking records', () => {
  it('online: goes up at once and answers the place', async () => {
    const t = setup();
    expect(await t.sync.record(rec())).toEqual({ pos: 1, best: true });
    expect(pendingRecords(t.storage)).toEqual([]);
    expect((await t.api.ranking('pursuit', 'police', 'normal')).rows[0]).toMatchObject({ username: 'Teste', time: 40, me: true });
  });

  it('offline: waits in the queue (Sair waits too) and goes when the connection is back', async () => {
    const t = setup();
    const real = t.api.submitRecord.bind(t.api);
    let online = false;
    t.api.submitRecord = (r) => (online ? real(r) : Promise.reject(new OfflineError()));
    expect(await t.sync.record(rec())).toBeUndefined();
    expect(await t.sync.record(rec({ time: 30 }))).toBeUndefined();
    expect(pendingRecords(t.storage)).toHaveLength(2);
    expect(t.sync.pending()).toBe(true);
    online = true;
    t.events.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(pendingRecords(t.storage)).toEqual([]);
    expect((await t.api.ranking('pursuit', 'police', 'normal')).rows.map((r) => r.time)).toEqual([30, 40]); // both matches
  });

  it("another account's queued records never go up under the account signed in now", async () => {
    const t = setup();
    t.storage.setItem('pl.records.pending.v1', JSON.stringify([{ owner: 'someone-else', record: rec({ time: 10 }) }]));
    expect(await t.sync.record(rec({ time: 50 }))).toEqual({ pos: 1, best: true });
    expect((await t.api.ranking('pursuit', 'police', 'normal')).rows[0]!.time).toBe(50);
    expect(pendingRecords(t.storage)).toEqual([]);
  });

  it('a record the server keeps failing on is given up, so it never blocks Sair', async () => {
    const t = setup();
    t.api.submitRecord = () => Promise.reject(new ServerError());
    await t.sync.record(rec());
    for (let i = 0; i < 10; i++) await t.sync.flush();
    expect(pendingRecords(t.storage)).toEqual([]);
    expect(t.sync.pending()).toBe(false);
  });

  it('Sair and Excluir forget the queue', () => {
    const t = setup();
    t.storage.setItem('pl.records.pending.v1', JSON.stringify([rec()]));
    forgetAccount(t.storage);
    expect(pendingRecords(t.storage)).toEqual([]);
  });

  it('the record of a real match is plausible: thief escape at 1:30 with its life, police with no "how"', () => {
    const p = emptyProfile();
    const thief = globalRecord(
      p,
      { winner: 'thief', time: 90, reason: 'escape', hp: 42.4, level: 3, stats: { damageDealt: 0, rightBoxes: 0 } },
      { role: 'thief', mode: 'pursuit', difficulty: 'hard' },
    );
    expect(thief).toMatchObject({ side: 'thief', how: 'escape', hp: 42, car: p.equipped.thief.car, rank: 1, difficulty: 'hard' });
    expect(plausible(thief)).toBe(true);
    const police = globalRecord(
      p,
      { winner: 'police', time: 33, hp: 80, level: 3, stats: { damageDealt: 0, rightBoxes: 0 } },
      { role: 'police', mode: 'pursuit', difficulty: 'normal' },
    );
    expect('how' in police).toBe(false);
    expect(plausible(police)).toBe(true);
    expect(police.matchId).not.toBe(thief.matchId);
  });
});
