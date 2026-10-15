// What the game shows when it opens (V3 part 1, spec §4.1-4.3): the title, or first one of the account screens.
// Pure decisions over the API and the phone's storage; gate.ts draws the screens.
import { emptyProfile, type Profile } from '../meta/profile';
import { OfflineError, SignedOutError, type Account, type AccountApi } from './api';
import { forgetAccount, loadAccountState, saveAccountState } from './store';

export type Step =
  /** play; `profile` replaces the phone's when the account has a newer one */
  | { kind: 'ready'; account: Account; profile?: Profile; offline?: boolean }
  | { kind: 'signin' }
  /** no internet and never signed in on this phone */
  | { kind: 'offline-first' }
  | { kind: 'username'; account: Account }
  /** suspended from /admin: only "Entrar com outra conta" and deleting the account */
  | { kind: 'banned'; account: Account }
  /** the phone and the account both have progress, and they differ: the player picks one */
  | { kind: 'choose'; account: Account; local: Profile; cloud: Profile; rev: number };

/** anything worth keeping: a match played, coins or something bought */
export function hasProgress(p: Profile): boolean {
  return p.stats.matches > 0 || p.coins > 0 || p.owned.length > emptyProfile().owned.length;
}

const same = (a: Profile, b: Profile) => JSON.stringify(a) === JSON.stringify(b);

export async function nextStep(api: AccountApi, storage: Storage | undefined, local: Profile): Promise<Step> {
  const st = loadAccountState(storage);
  let account: Account | null | 'gone';
  try {
    account = await api.me();
  } catch (e) {
    if (!(e instanceof OfflineError)) throw e;
    // offline: whoever already signed in on this phone plays, and everything syncs later
    return st.account?.username ? { kind: 'ready', account: st.account, offline: true } : { kind: 'offline-first' };
  }
  if (account === 'gone') {
    // deleted on another phone or on the web: this phone's copy goes too (it must not come back in a new account)
    forgetAccount(storage);
    return { kind: 'signin' };
  }
  if (!account) return { kind: 'signin' };
  if (account.banned) return { kind: 'banned', account };
  if (!account.username) return { kind: 'username', account };
  const keep = (rev: number, dirty = false) => saveAccountState(storage, { account, rev, dirty });
  try {
    if (st.account?.id === account.id) {
      // same account as last time: send what was played offline (the server merges it), or bring a newer copy
      if (st.dirty) {
        const saved = await api.putProfile(local, st.rev);
        keep(saved.rev);
        return { kind: 'ready', account, profile: saved.data ?? undefined };
      }
      const cloud = await api.getProfile();
      keep(cloud.rev);
      return { kind: 'ready', account, profile: cloud.data && cloud.rev !== st.rev ? cloud.data : undefined };
    }
    // first time this account on this phone. The phone's progress joins it only when it belongs to nobody yet (played
    // before accounts existed); progress of another account that signed out here never moves into this one.
    const mine = st.account === null;
    const phone = mine ? local : { ...emptyProfile(), welcomeGranted: true };
    const cloud = await api.getProfile();
    if (!cloud.data) {
      const saved = await api.putProfile(phone, cloud.rev); // a new account takes the phone's progress
      keep(saved.rev);
      return { kind: 'ready', account, profile: saved.data ?? phone };
    }
    if (!hasProgress(phone) || same(phone, cloud.data)) {
      keep(cloud.rev);
      return { kind: 'ready', account, profile: cloud.data };
    }
    return { kind: 'choose', account, local: phone, cloud: cloud.data, rev: cloud.rev };
  } catch (e) {
    if (e instanceof SignedOutError) return { kind: 'signin' };
    if (!(e instanceof OfflineError)) throw e;
    // the connection dropped halfway: play on the phone's copy and merge with the account later
    if (st.account?.id === account.id) keep(st.rev, true);
    else if (st.account === null)
      keep(0, true); // the phone's progress merges into the account later
    else {
      // another account's progress is on the phone: start this one clean; its own copy comes down next time
      keep(0);
      return { kind: 'ready', account, profile: { ...emptyProfile(), welcomeGranted: true }, offline: true };
    }
    return { kind: 'ready', account, offline: true };
  }
}

/** The answer to "Qual progresso manter": the phone's copy overwrites the account's, or the account's comes down. */
export async function keepProgress(
  api: AccountApi,
  storage: Storage | undefined,
  step: Extract<Step, { kind: 'choose' }>,
  which: 'local' | 'cloud',
): Promise<Profile> {
  if (which === 'cloud') {
    saveAccountState(storage, { account: step.account, rev: step.rev, dirty: false });
    return step.cloud;
  }
  try {
    const saved = await api.putProfile(step.local, step.rev);
    saveAccountState(storage, { account: step.account, rev: saved.rev, dirty: false });
    return saved.data ?? step.local; // merged when another phone saved in between
  } catch {
    saveAccountState(storage, { account: step.account, rev: step.rev, dirty: true });
    return step.local;
  }
}
