// V3 delivery 3: usage events queue on the phone, go up before the records, and never under another account.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineError, ServerError, type AccountApi } from '../../src/account/api';
import { eventContext } from '../../src/account/context';
import { devApi } from '../../src/account/devApi';
import { pendingEvents, queueEvent } from '../../src/account/events';
import { forgetAccount, saveAccountState } from '../../src/account/store';
import { createSync } from '../../src/account/sync';
import { reportMatch } from '../../src/appMatch';
import { emptyProfile } from '../../src/meta/profile';
import { memStorage } from './memStorage';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const acc = { id: 'dev-1', email: 'e', name: 'n', picture: '', username: 'Teste' };
function setup(api: AccountApi = devApi(memStorage(), { startSignedOut: false })) {
  const storage = memStorage();
  saveAccountState(storage, { account: acc, rev: 0, dirty: false });
  const sync = createSync({
    api,
    storage,
    get: () => emptyProfile(),
    adopt: vi.fn(),
    target: new EventTarget() as never,
    context: { version: '0.28.0', client: 'play' },
  });
  return { storage, api, sync };
}

describe('usage events', () => {
  it('a match sends its match_end event before its record, with the same match id and the app context', async () => {
    const calls: string[] = [];
    const api = devApi(memStorage(), { startSignedOut: false });
    const send = vi.spyOn(api, 'sendEvents').mockImplementation(async () => void calls.push('events'));
    const sub = api.submitRecord.bind(api);
    api.submitRecord = (r) => (calls.push('record'), sub(r));
    const t = setup(api);
    const answer = reportMatch(
      emptyProfile(),
      { winner: 'police', time: 33, hp: 80, level: 4, stats: { damageDealt: 0, rightBoxes: 0 } },
      { role: 'police', mode: 'pursuit', difficulty: 'normal', coins: 60 },
      { record: (r) => t.sync.record(r), track: (type, data) => t.sync.track(type, data) },
    );
    await answer;
    expect(calls).toEqual(['events', 'record']);
    const [events, ctx] = send.mock.calls[0]!;
    expect(events[0]).toMatchObject({
      type: 'match_end',
      data: { mode: 'pursuit', side: 'police', won: true, time: 33, level: 4, coins: 60, car: 'viatura' },
    });
    expect(ctx).toEqual({ version: '0.28.0', client: 'play' });
    expect(pendingEvents(t.storage, 'dev-1')).toEqual([]);
  });

  it('a loss sends only the event (no record); a tracked event goes up a moment later', async () => {
    const t = setup();
    const send = vi.spyOn(t.api, 'sendEvents');
    const answer = reportMatch(
      emptyProfile(),
      { winner: 'thief', time: 90, reason: 'escape', hp: 0, level: 4, stats: { damageDealt: 0, rightBoxes: 0 } },
      { role: 'police', mode: 'pursuit', difficulty: 'normal', coins: 10 },
      { record: (r) => t.sync.record(r), track: (type, data) => t.sync.track(type, data) },
    );
    expect(answer).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2000);
    expect(send).toHaveBeenCalledOnce();
  });

  it('offline: waits; a batch the server keeps refusing is given up; other accounts are dropped; Sair forgets them', async () => {
    const t = setup();
    let fail: Error | undefined = new OfflineError();
    vi.spyOn(t.api, 'sendEvents').mockImplementation(async () => {
      if (fail) throw fail;
    });
    queueEvent(t.storage, 'someone-else', 'claim', {});
    t.sync.track('purchase', { item: 'car:blazer', price: 9000 });
    await t.sync.flush();
    expect(pendingEvents(t.storage, 'dev-1')).toHaveLength(1);
    expect(pendingEvents(t.storage, 'someone-else')).toEqual([]);
    fail = new ServerError();
    for (let i = 0; i < 9; i++) await t.sync.flush();
    expect(pendingEvents(t.storage, 'dev-1')).toEqual([]);
    t.sync.track('claim', {});
    forgetAccount(t.storage);
    expect(pendingEvents(t.storage, 'dev-1')).toEqual([]);
  });

  it('where it runs: the Play app, the installed web app or a browser tab', () => {
    expect(eventContext('0.28.0', { referrer: 'android-app://br.com.diogotocci.policialadrao/', standalone: true })).toEqual({
      version: '0.28.0',
      client: 'play',
    });
    expect(eventContext('0.28.0', { referrer: '', standalone: true }).client).toBe('pwa');
    expect(eventContext(undefined, { referrer: 'https://google.com', standalone: false })).toEqual({ version: 'dev', client: 'web' });
  });
});
