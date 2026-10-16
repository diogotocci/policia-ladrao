// The game's side of the account API (V3 part 1): one interface, two implementations. In production it talks to the
// Vercel functions in api/; on localhost the e2e tests and local play use the fake in devApi.ts (no Google, no database).
import type { Profile } from '../meta/profile';
import type { GlobalBoard, RecordIn } from '../meta/records';
import type { AdminStats, ClientEvent, EventContext } from '../meta/events';
import type { ModerationAction, ModerationView } from '../meta/moderation';
import type { Difficulty, Mode, Role } from '../config/balance';

export interface Account {
  id: string;
  email: string;
  name: string;
  picture: string;
  username: string | null;
  /** the shop's admin mode; the server sets it only for the admin account */
  admin?: boolean;
  /** suspended from /admin: the game shows "Conta suspensa" */
  banned?: boolean;
  /** the name the admin took away: the username screen says why it asks for another */
  notice?: string;
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

/** The server answered with an error of its own (5xx): treated as offline, but a request that keeps failing is given up. */
export class ServerError extends OfflineError {}

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
  /** V3 delivery 2: sends a finished match to the global ranking; the answer is the player's position there.
   * Undefined when the server refused the record as malformed (it is dropped, never retried). */
  submitRecord(r: RecordIn & { sentAt: string }): Promise<Submitted | undefined>;
  /** one board of the global ranking: the top 30 matches plus the player's best line when none of them made it */
  ranking(mode: Mode, side: Role, difficulty: Difficulty): Promise<GlobalBoard>;
  /** reports a name seen on the global ranking: saved, too many today, or the name is not in use (or is the player's own) */
  reportName(username: string): Promise<'ok' | 'limit' | 'unknown'>;
  /** V3 delivery 3: a batch of usage events for the /admin panel */
  sendEvents(events: ClientEvent[], context: EventContext): Promise<void>;
  /** the /admin panel's numbers; 'forbidden' for any account but the admin's */
  adminStats(days: number): Promise<AdminStats | 'forbidden'>;
  /** the /admin "Denúncias" tab; 'forbidden' for any account but the admin's */
  adminReports(): Promise<ModerationView | 'forbidden'>;
  /** a decision on a reported account; the answer is the tab drawn again ('unknown': the account no longer exists) */
  adminAct(userId: string, action: ModerationAction): Promise<ModerationView | 'unknown' | 'forbidden'>;
}

/** the player's place after sending a record (pos null: not on the board, e.g. a record the server finds suspect) */
export interface Submitted {
  pos: number | null;
  /** this match is the player's best on that board */
  best: boolean;
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
    if (res.status >= 500) throw new ServerError(); // server down or not configured: same as no internet
    return res;
  };
  const read = async <T>(res: Response): Promise<T> => (await res.json()) as T;
  const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
  const isGone = async (res: Response) => ((await res.json().catch(() => ({}))) as { error?: string }).error === 'gone';
  const signedIn = async <T>(res: Response): Promise<T> => {
    if (res.status === 401) throw new SignedOutError(await isGone(res));
    // banned meanwhile: back to the gate, which asks /api/me and shows "Conta suspensa"
    if (
      res.status === 403 &&
      (
        (await res
          .clone()
          .json()
          .catch(() => ({}))) as { error?: string }
      ).error === 'banned'
    )
      throw new SignedOutError();
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
    async submitRecord(r) {
      const res = await call('/api/records', send('POST', r));
      if (res.status === 400) return undefined;
      return signedIn<Submitted>(res);
    },
    async sendEvents(events, context) {
      await signedIn<{ saved: number }>(await call('/api/events', send('POST', { events, context, sentAt: new Date().toISOString() })));
    },
    async adminReports() {
      const res = await call('/api/admin/stats?view=reports');
      if (res.status === 403) return 'forbidden';
      return signedIn<ModerationView>(res);
    },
    async adminAct(userId, action) {
      const res = await call('/api/admin/stats', send('POST', { userId, action }));
      if (res.status === 403) return 'forbidden';
      if (res.status === 404) return 'unknown';
      return signedIn<ModerationView>(res);
    },
    async adminStats(days) {
      const res = await call(`/api/admin/stats?days=${days}`);
      if (res.status === 403) return 'forbidden';
      return signedIn<AdminStats>(res);
    },
    async reportName(username) {
      const res = await call('/api/ranking', send('POST', { username }));
      if (res.status === 404 || res.status === 400) return 'unknown';
      if (res.status === 429) return 'limit';
      await signedIn<{ ok: true }>(res);
      return 'ok';
    },
    async ranking(mode, side, difficulty) {
      const res = await call(`/api/ranking?mode=${mode}&side=${side}&difficulty=${difficulty}`);
      if (!res.ok) throw new OfflineError();
      return read<GlobalBoard>(res);
    },
  };
}

/** The session ended on the server; `gone` when the account itself was deleted (on another phone or on the web). */
export class SignedOutError extends Error {
  constructor(readonly gone = false) {
    super('signed-out');
  }
}
