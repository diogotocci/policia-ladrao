// What the phone remembers about the account (V3 part 1): who signed in last, the cloud version the local profile
// started from (rev) and whether it has changes the account has not received yet (dirty: offline play waiting to sync).
import { emptyProfile } from '../meta/profile';
import { CORRUPT_KEY, PROFILE_V1_KEY, PROFILE_V2_KEY, saveProfile } from '../storage/profileStore';
import type { Account } from './api';

export const ACCOUNT_KEY = 'pl.account.v1';

export interface AccountState {
  account: Account | null;
  rev: number;
  dirty: boolean;
}

export const noAccount = (): AccountState => ({ account: null, rev: 0, dirty: false });

export function loadAccountState(storage: Storage | undefined): AccountState {
  try {
    const raw = storage?.getItem(ACCOUNT_KEY);
    if (!raw) return noAccount();
    const v = JSON.parse(raw) as Partial<AccountState>;
    const a = v.account;
    const account =
      a && typeof a === 'object' && typeof a.id === 'string' && typeof a.email === 'string'
        ? {
            id: a.id,
            email: a.email,
            name: String(a.name ?? ''),
            picture: String(a.picture ?? ''),
            username: typeof a.username === 'string' ? a.username : null,
          }
        : null;
    return { account, rev: typeof v.rev === 'number' && v.rev >= 0 ? v.rev : 0, dirty: v.dirty === true };
  } catch {
    return noAccount();
  }
}

export function saveAccountState(storage: Storage | undefined, s: AccountState): void {
  try {
    storage?.setItem(ACCOUNT_KEY, JSON.stringify(s));
  } catch {
    // full or blocked storage: the next opening asks the account again
  }
}

/**
 * Sair / Excluir conta: the phone forgets the account and its progress (the account keeps its own copy). The local
 * ranking stays: it is the device's. The empty profile is marked as already welcomed so signing in again does not
 * credit the welcome coins twice.
 */
export function forgetAccount(storage: Storage | undefined): void {
  try {
    for (const k of [ACCOUNT_KEY, PROFILE_V2_KEY, PROFILE_V1_KEY, CORRUPT_KEY]) storage?.removeItem(k);
  } catch {
    // blocked storage: nothing was kept anyway
  }
  saveProfile(storage, { ...emptyProfile(), welcomeGranted: true });
}
