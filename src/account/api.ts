// The game's side of the account API (V3 part 1): one interface, two implementations. In production it talks to the
// Vercel functions in api/; on localhost the e2e tests and local play use the fake in devApi.ts (no Google, no database).
import type { Profile } from '../meta/profile';

export interface Account {
  id: string;
  email: string;
  name: string;
  picture: string;
  username: string | null;
  /** the shop's admin mode; the server sets it only for the admin account */
  admin?: boolean;
}

export type UsernameIssue = 'format' | 'blocked' | 'taken' | 'cooldown';

export interface Stored {
  data: Profile | null;
  rev: number;
}

/** The server could not be reached (no internet, server down): the game keeps working on the phone. */
export class OfflineError extends Error {
  constructor() {
    super('offline');
  }
}

export interface AccountApi {
  /** the Google Client ID for the sign-in button (null: sign-in not set up on this server) */
  clientId(): Promise<string | null>;
  /** the signed-in account; null when signed out; 'gone' when the account was deleted (on another phone or on the web) */
  me(): Promise<Account | null | 'gone'>;
  /** signs in with the Google credential (ID token); null when Google's token was refused */
  signIn(credential: string): Promise<Account | null>;
  signOut(): Promise<void>;
  checkUsername(name: string): Promise<UsernameIssue | null>;
  setUsername(name: string): Promise<{ account: Account } | { problem: UsernameIssue }>;
  getProfile(): Promise<Stored>;
  /** saves the profile; the answer is the copy the account keeps (merged when another phone saved meanwhile) */
  putProfile(data: Profile, baseRev: number): Promise<Stored>;
  /** false when the confirmation does not match */
  deleteAccount(confirm: string): Promise<boolean>;
}

export function httpApi(fetchFn: typeof fetch = (...a) => fetch(...a)): AccountApi {
  const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
    let res: Response;
    try {
      res = await fetchFn(path, {
        credentials: 'same-origin',
        ...init,
        headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      });
    } catch {
      throw new OfflineError();
    }
    if (res.status >= 500) throw new OfflineError(); // server down or not configured: same as no internet
    return res;
  };
  const read = async <T>(res: Response): Promise<T> => (await res.json()) as T;
  const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
  const isGone = async (res: Response) => ((await res.json().catch(() => ({}))) as { error?: string }).error === 'gone';
  const signedIn = async <T>(res: Response): Promise<T> => {
    if (res.status === 401) throw new SignedOutError(await isGone(res));
    if (!res.ok) throw new OfflineError(); // anything else unexpected: try again later
    return read<T>(res);
  };
  return {
    clientId: async () => (await read<{ googleClientId: string | null }>(await call('/api/config'))).googleClientId,
    async me() {
      const res = await call('/api/me');
      if (res.status === 401) return (await isGone(res)) ? 'gone' : null;
      if (!res.ok) throw new OfflineError();
      return (await read<{ account: Account }>(res)).account;
    },
    async signIn(credential) {
      const res = await call('/api/auth/google', send('POST', { credential }));
      if (!res.ok) return null;
      return (await read<{ account: Account }>(res)).account;
    },
    async signOut() {
      await call('/api/auth/logout', send('POST', {}));
    },
    async checkUsername(name) {
      const r = await read<{ ok: boolean; problem?: UsernameIssue }>(await call(`/api/username?u=${encodeURIComponent(name)}`));
      return r.ok ? null : (r.problem ?? 'format');
    },
    async setUsername(username) {
      const res = await call('/api/username', send('POST', { username }));
      if (res.status === 409) return { problem: (await read<{ problem: UsernameIssue }>(res)).problem };
      return signedIn<{ account: Account }>(res);
    },
    getProfile: async () => signedIn<Stored>(await call('/api/profile')),
    putProfile: async (data, baseRev) => signedIn<Stored>(await call('/api/profile', send('PUT', { data, baseRev }))),
    async deleteAccount(confirm) {
      const res = await call('/api/account', send('DELETE', { confirm }));
      if (res.status === 400) return false;
      return (await signedIn<{ ok: boolean }>(res)).ok;
    },
  };
}

/** The session ended on the server; `gone` when the account itself was deleted (on another phone or on the web). */
export class SignedOutError extends Error {
  constructor(readonly gone = false) {
    super('signed-out');
  }
}
