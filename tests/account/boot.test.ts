// V3 part 1 (spec §4.1-4.3): what the game shows when it opens, against the localhost fake server.
import { describe, expect, it } from 'vitest';
import { OfflineError, type AccountApi } from '../../src/account/api';
import { hasProgress, keepProgress, nextStep } from '../../src/account/boot';
import { devApi } from '../../src/account/devApi';
import { forgetAccount, loadAccountState, saveAccountState } from '../../src/account/store';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { loadProfile } from '../../src/storage/profileStore';
import { memStorage } from './memStorage';

const played = (coins: number): Profile => ({
  ...emptyProfile(),
  coins,
  welcomeGranted: true,
  stats: { ...emptyProfile().stats, matches: 3 },
});
const offline = (): AccountApi => new Proxy({} as AccountApi, { get: () => () => Promise.reject(new OfflineError()) });

describe('opening the game', () => {
  it('signed out: the sign-in screen; offline and never signed in: "Conecte-se"', async () => {
    const s = memStorage();
    expect(await nextStep(devApi(s, { startSignedOut: true }), s, emptyProfile())).toEqual({ kind: 'signin' });
    expect(await nextStep(offline(), memStorage(), emptyProfile())).toEqual({ kind: 'offline-first' });
  });

  it('signed in without a username: asks for one; then a new account takes the phone progress', async () => {
    const s = memStorage();
    const api = devApi(s, { startSignedOut: true });
    await api.signIn('x');
    expect((await nextStep(api, s, played(500))).kind).toBe('username');
    await api.setUsername('Diogo_Fuga');
    const step = await nextStep(api, s, played(500));
    expect(step).toMatchObject({ kind: 'ready', account: { username: 'Diogo_Fuga' } });
    expect((await api.getProfile()).data?.coins).toBe(500);
    expect(loadAccountState(s)).toMatchObject({ rev: 1, dirty: false });
  });

  it('progress on the phone and a different one in the account: the player chooses', async () => {
    const s = memStorage();
    const api = devApi(s, { startSignedOut: false });
    await api.putProfile(played(3120), 0); // another phone
    const step = await nextStep(api, s, played(14379));
    expect(step).toMatchObject({ kind: 'choose', local: { coins: 14379 }, cloud: { coins: 3120 }, rev: 1 });
    if (step.kind !== 'choose') return;
    expect((await keepProgress(api, s, step, 'local')).coins).toBe(14379);
    expect((await api.getProfile()).data?.coins).toBe(14379); // overwritten, not merged
    expect(await nextStep(api, s, played(14379))).toEqual({ kind: 'ready', account: step.account, profile: undefined });
  });

  it('nothing played on this phone: the account progress comes down without asking', async () => {
    const s = memStorage();
    const api = devApi(s, { startSignedOut: false });
    await api.putProfile(played(3120), 0);
    expect(await nextStep(api, s, emptyProfile())).toMatchObject({ kind: 'ready', profile: { coins: 3120 } });
    expect(hasProgress(emptyProfile())).toBe(false);
  });

  it('offline after the first sign-in: plays; back online, what was played offline goes up merged', async () => {
    const s = memStorage();
    const api = devApi(s, { startSignedOut: false });
    const first = await nextStep(api, s, played(100));
    expect(first.kind).toBe('ready');
    expect(await nextStep(offline(), s, played(100))).toMatchObject({ kind: 'ready', offline: true });
    // meanwhile another phone bought a car
    await api.putProfile({ ...played(50), owned: ['car:blazer'] }, 1);
    saveAccountState(s, { ...loadAccountState(s), dirty: true }); // played offline here
    const back = await nextStep(api, s, played(900));
    expect(back).toMatchObject({ kind: 'ready', profile: { coins: 900, owned: ['car:blazer'] } });
  });

  it('a newer copy in the account comes down when the phone has nothing to send', async () => {
    const s = memStorage();
    const api = devApi(s, { startSignedOut: false });
    await nextStep(api, s, played(100));
    await api.putProfile(played(777), 1);
    expect(await nextStep(api, s, played(100))).toMatchObject({ kind: 'ready', profile: { coins: 777 } });
  });

  it('an account deleted elsewhere: the phone forgets it and its progress, so nothing comes back in a new account', async () => {
    const s = memStorage();
    const api = devApi(s, { startSignedOut: false });
    await nextStep(api, s, played(800));
    const gone: AccountApi = { ...api, me: () => Promise.resolve('gone' as const) };
    expect(await nextStep(gone, s, played(800))).toEqual({ kind: 'signin' });
    expect(loadAccountState(s).account).toBeNull();
    expect(hasProgress(loadProfile(s).profile)).toBe(false);
  });

  it("another account's progress on the phone never moves into the account that signs in now", async () => {
    const s = memStorage();
    saveAccountState(s, { account: { id: 'someone-else', email: 'x', name: 'x', picture: '', username: 'Outro' }, rev: 4, dirty: true });
    const api = devApi(s, { startSignedOut: false });
    const step = await nextStep(api, s, played(5000));
    expect(step).toMatchObject({ kind: 'ready', profile: { coins: 0 } });
    expect((await api.getProfile()).data?.coins).toBe(0);
  });

  it('Sair forgets the account and the progress on the phone, marked as already welcomed', () => {
    const s = memStorage();
    saveAccountState(s, { account: { id: 'a', email: 'e', name: 'n', picture: '', username: 'x' }, rev: 3, dirty: false });
    s.setItem('pl.profile.v2', '{}');
    forgetAccount(s);
    expect(loadAccountState(s).account).toBeNull();
    expect(s.getItem('pl.profile.v2')).toBeNull();
    expect(loadProfile(s).profile).toEqual({ ...emptyProfile(), welcomeGranted: true });
  });
});
