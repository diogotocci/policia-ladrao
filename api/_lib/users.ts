// Accounts and their progress in the database (V3 part 1).
import { mergeProfiles } from '../../src/meta/merge.js';
import { parseProfile, type Profile } from '../../src/meta/profile.js';
import { USERNAME_COOLDOWN_DAYS, usernameProblem } from '../../src/meta/username.js';
import type { Db } from './db.js';
import type { GoogleUser } from './google.js';

export interface Account {
  id: string;
  email: string;
  name: string;
  picture: string;
  username: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  picture: string;
  username: string | null;
  username_changed_at: string | Date | null;
}
const toAccount = (r: UserRow): Account => ({ id: String(r.id), email: r.email, name: r.name, picture: r.picture, username: r.username });

/** First sign-in creates the account; later ones refresh name and picture. */
export async function upsertGoogleUser(db: Db, g: GoogleUser): Promise<Account> {
  const rows = await db.query<UserRow>(
    `insert into users (google_sub, email, name, picture) values ($1, $2, $3, $4)
     on conflict (google_sub) do update set email = excluded.email, name = excluded.name, picture = excluded.picture, last_seen_at = now()
     returning id, email, name, picture, username, username_changed_at`,
    [g.sub, g.email, g.name, g.picture],
  );
  return toAccount(rows[0]!);
}

export async function getAccount(db: Db, id: string): Promise<Account | undefined> {
  const rows = await db.query<UserRow>(
    `update users set last_seen_at = now() where id = $1 returning id, email, name, picture, username, username_changed_at`,
    [id],
  );
  return rows[0] ? toAccount(rows[0]) : undefined;
}

export async function usernameFree(db: Db, name: string, exceptId?: string): Promise<boolean> {
  const rows = await db.query<{ id: string }>(`select id from users where username_lower = $1`, [name.toLowerCase()]);
  return rows.every((r) => String(r.id) === exceptId);
}

export type SetUsername = { ok: true; account: Account } | { ok: false; problem: 'format' | 'blocked' | 'taken' | 'cooldown' };

export async function setUsername(db: Db, id: string, name: string, now = new Date()): Promise<SetUsername> {
  const problem = usernameProblem(name);
  if (problem) return { ok: false, problem };
  const cur = (await db.query<UserRow>(`select id, email, name, picture, username, username_changed_at from users where id = $1`, [id]))[0];
  if (!cur) return { ok: false, problem: 'format' };
  if (cur.username === name) return { ok: true, account: toAccount(cur) };
  const caseOnly = cur.username?.toLowerCase() === name.toLowerCase(); // fixing the case is not a new name
  if (cur.username && cur.username_changed_at && !caseOnly) {
    const since = (now.getTime() - new Date(cur.username_changed_at).getTime()) / 86400000;
    if (since < USERNAME_COOLDOWN_DAYS) return { ok: false, problem: 'cooldown' };
  }
  if (!(await usernameFree(db, name, id))) return { ok: false, problem: 'taken' };
  try {
    const rows = await db.query<UserRow>(
      `update users set username = $2, username_lower = $3, username_changed_at = $4 where id = $1
       returning id, email, name, picture, username, username_changed_at`,
      [id, name, name.toLowerCase(), caseOnly ? cur.username_changed_at : now.toISOString()],
    );
    return { ok: true, account: toAccount(rows[0]!) };
  } catch {
    return { ok: false, problem: 'taken' }; // someone took it between the check and the update
  }
}

export interface Stored {
  data: Profile | null;
  rev: number;
}

export async function getProfile(db: Db, id: string): Promise<Stored> {
  const row = (await db.query<{ data: unknown; rev: number }>(`select data, rev from profiles where user_id = $1`, [id]))[0];
  return row
    ? { data: parseProfile(typeof row.data === 'string' ? JSON.parse(row.data) : row.data) ?? null, rev: row.rev }
    : { data: null, rev: 0 };
}

/**
 * Saves the phone's profile. `baseRev` is the version the phone started from: when the account moved on meanwhile
 * (another phone), both are merged so nothing earned is lost, and the phone gets the merged copy back.
 */
export async function putProfile(db: Db, id: string, raw: unknown, baseRev: number): Promise<Stored | undefined> {
  const incoming = parseProfile(raw);
  if (!incoming) return undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getProfile(db, id);
    const data = cur.data && cur.rev !== baseRev ? mergeProfiles(cur.data, incoming) : incoming;
    const rows =
      cur.rev === 0
        ? await db.query<{ rev: number }>(
            `insert into profiles (user_id, data, rev) values ($1, $2, 1) on conflict (user_id) do nothing returning rev`,
            [id, JSON.stringify(data)],
          )
        : await db.query<{ rev: number }>(
            `update profiles set data = $2, rev = rev + 1, updated_at = now() where user_id = $1 and rev = $3 returning rev`,
            [id, JSON.stringify(data), cur.rev],
          );
    if (rows[0]) return { data, rev: rows[0].rev };
  }
  return undefined; // three writers at once: the phone retries later
}

/** Deletes the account and everything tied to it (the profile goes with it: on delete cascade). */
export async function deleteAccount(db: Db, id: string): Promise<boolean> {
  const rows = await db.query<{ id: string }>(`delete from users where id = $1 returning id`, [id]);
  return rows.length > 0;
}
