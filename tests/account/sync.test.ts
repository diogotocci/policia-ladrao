// V3 part 1 (spec §4.3): every saved change goes up a moment later; offline it waits; merged copies come back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineError, SignedOutError, type AccountApi } from '../../src/account/api';
import { devApi } from '../../src/account/devApi';
import { loadAccountState, saveAccountState } from '../../src/account/store';
import { createSync } from '../../src/account/sync';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { memStorage } from './memStorage';

const acc = { id: 'dev-1', email: 'e', name: 'n', picture: '', username: 'Teste' };
const p = (coins: number, owned: string[] = []): Profile => ({ ...emptyProfile(), coins, owned, welcomeGranted: true });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(api: AccountApi, start: Profile) {
  const storage = memStorage();
  saveAccountState(storage, { account: acc, rev: 0, dirty: false });
  let current = start;
  const adopt = vi.fn((x: Profile) => (current = x));
  const signedOut = vi.fn();
  const events = new EventTarget();
  const sync = createSync({ api, storage, get: () => current, adopt, signedOut, delayMs: 1000, target: events as never });
  return { storage, sync, adopt, signedOut, events, set: (x: Profile) => ((current = x), sync.changed()) };
}

describe('sync', () => {
  it('a change is sent once after a short pause, then nothing is pending', async () => {
    const api = devApi(memStorage(), { startSignedOut: false });
    const put = vi.spyOn(api, 'putProfile');
    const t = setup(api, p(0));
    t.set(p(10));
    t.set(p(20));
    expect(t.sync.pending()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(put).toHaveBeenCalledOnce();
    expect((await api.getProfile()).data?.coins).toBe(20);
    expect(t.sync.pending()).toBe(false);
    expect(loadAccountState(t.storage).rev).toBe(1);
  });

  it('offline: stays pending and goes when the connection comes back', async () => {
    const api = devApi(memStorage(), { startSignedOut: false });
    const real = api.putProfile.bind(api);
    let online = false;
    api.putProfile = (d, r) => (online ? real(d, r) : Promise.reject(new OfflineError()));
    const t = setup(api, p(0));
    t.set(p(30));
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.sync.pending()).toBe(true);
    online = true;
    t.events.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(t.sync.pending()).toBe(false);
    expect((await api.getProfile()).data?.coins).toBe(30);
  });

  it('a failed send tries again by itself a while later', async () => {
    const api = devApi(memStorage(), { startSignedOut: false });
    const real = api.putProfile.bind(api);
    let fails = 1;
    api.putProfile = (d, r) => (fails-- > 0 ? Promise.reject(new OfflineError()) : real(d, r));
    const t = setup(api, p(0));
    t.set(p(12));
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.sync.pending()).toBe(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(t.sync.pending()).toBe(false);
  });

  it('another phone saved meanwhile: the merged copy comes back to the game', async () => {
    const api = devApi(memStorage(), { startSignedOut: false });
    await api.putProfile(p(5, ['car:blazer']), 0); // rev 1, this phone still on rev 0
    const t = setup(api, p(0));
    t.set(p(40));
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.adopt).toHaveBeenCalledWith(expect.objectContaining({ coins: 40, owned: ['car:blazer'] }));
  });

  it('the session ended on the server: tells the app', async () => {
    const api = devApi(memStorage(), { startSignedOut: false });
    api.putProfile = () => Promise.reject(new SignedOutError());
    const t = setup(api, p(0));
    t.set(p(1));
    await t.sync.flush();
    expect(t.signedOut).toHaveBeenCalledWith(false);
  });
});
