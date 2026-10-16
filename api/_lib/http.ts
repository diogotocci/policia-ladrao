// The account endpoints (V3 part 1) as plain functions of a request and their dependencies, so the tests can run them
// against PGlite and a fake Google; the files in api/ only wire them to the environment.
import type { JWTVerifyGetKey } from 'jose';
import { ensureSchema, prodDb, type Db } from './db.js';
import { verifyGoogleToken } from './google.js';
import { clearCookie, cookieOf, readSession, setCookie, signSession } from './session.js';
import { deleteAccount, getAccount, getProfile, isAdminEmail, putProfile, setUsername, upsertGoogleUser, usernameFree } from './users.js';
import { parseProfile } from '../../src/meta/profile.js';
import { parseRecord } from '../../src/meta/records.js';
import { DIFFICULTIES, MODES, type Difficulty, type Mode } from '../../src/config/balance.js';
import { board, submit } from './records.js';
import { adminStats, saveEvents } from './events.js';
import { reportName } from './reports.js';
import { moderate, moderationView } from './moderation.js';
import { MODERATION_ACTIONS, type ModerationAction } from '../../src/meta/moderation.js';
import { parseContext, parseEvent, type ClientEvent } from '../../src/meta/events.js';
import { usernameProblem } from '../../src/meta/username.js';

export interface Deps {
  db: Db | undefined;
  secret: string | undefined;
  clientId: string | undefined;
  googleKeys?: JWTVerifyGetKey;
  now?: () => Date;
}

export const envDeps = (): Deps => ({ db: prodDb(), secret: process.env.SESSION_SECRET, clientId: process.env.GOOGLE_CLIENT_ID });

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
const bodyOf = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const b = (await req.json()) as unknown;
    return typeof b === 'object' && b !== null ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};
const unavailable = () => json({ error: 'unavailable' }, 503);

/**
 * Requests that change something must come from the game's own pages as JSON: a form or a page on another site cannot
 * send JSON, so this stops another site from signing the player in to someone else's account (login CSRF) or acting
 * with their session cookie.
 */
const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};
function foreign(req: Request): Response | undefined {
  const type = req.headers.get('content-type') ?? '';
  const site = req.headers.get('sec-fetch-site');
  const origin = req.headers.get('origin');
  // the host as the browser saw it (behind Vercel's proxy the function may see another scheme, so only hosts are compared)
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  const sameOrigin = (!site || site === 'same-origin' || site === 'none') && (!origin || hostOf(origin) === host);
  return type.startsWith('application/json') && sameOrigin ? undefined : json({ error: 'forbidden' }, 403);
}

/** the signed-in user's id, or undefined */
async function who(req: Request, d: Deps): Promise<string | undefined> {
  return readSession(cookieOf(req), d.secret);
}

/** a valid session whose account was deleted (on another phone or on the web): the phone must forget it */
const gone = () => json({ error: 'gone' }, 401, { 'Set-Cookie': clearCookie() });

/** the signed-in user's id when the account still exists and is not banned; otherwise the answer to send.
 * `banned: true` lets a banned account through (deleting the account must keep working, a Google Play rule). */
async function member(req: Request, d: Deps & { db: Db }, o: { banned?: boolean } = {}): Promise<string | Response> {
  const id = await who(req, d);
  if (!id) return json({ error: 'signed-out' }, 401);
  await ensureSchema(d.db);
  const rows = await d.db.query<{ id: string; banned: boolean }>(`select id, banned_at is not null as banned from users where id = $1`, [
    id,
  ]);
  if (!rows[0]) return gone();
  return rows[0].banned && !o.banned ? json({ error: 'banned' }, 403) : id;
}

export const config = (d: Deps) => json({ googleClientId: d.clientId ?? null });

export async function signIn(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db || !d.secret) return unavailable();
  const g = await verifyGoogleToken((await bodyOf(req)).credential, d.clientId, d.googleKeys);
  if (!g) return json({ error: 'invalid' }, 401);
  await ensureSchema(d.db);
  const account = await upsertGoogleUser(d.db, g, d.now?.());
  const token = await signSession(account.id, d.secret, d.now?.().getTime());
  return json({ account }, 200, { 'Set-Cookie': setCookie(token) });
}

export const signOut = (req: Request) => foreign(req) ?? json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });

export async function me(req: Request, d: Deps): Promise<Response> {
  if (!d.db || !d.secret) return unavailable();
  const id = await who(req, d);
  if (!id) return json({ error: 'signed-out' }, 401);
  await ensureSchema(d.db);
  const account = await getAccount(d.db, id);
  if (!account) return gone();
  // every visit with a valid session renews it for another 90 days
  const token = await signSession(id, d.secret, d.now?.().getTime());
  return json({ account }, 200, { 'Set-Cookie': setCookie(token) });
}

export async function usernameCheck(req: Request, d: Deps): Promise<Response> {
  if (!d.db) return unavailable();
  const name = new URL(req.url).searchParams.get('u') ?? '';
  const problem = usernameProblem(name);
  if (problem) return json({ ok: false, problem });
  await ensureSchema(d.db);
  const free = await usernameFree(d.db, name, await who(req, d));
  return json(free ? { ok: true } : { ok: false, problem: 'taken' });
}

export async function usernameSet(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  const name = (await bodyOf(req)).username;
  const r = await setUsername(d.db, id, typeof name === 'string' ? name : '', d.now?.());
  return r.ok ? json({ account: r.account }) : json({ problem: r.problem }, 409);
}

export async function profileGet(req: Request, d: Deps): Promise<Response> {
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  return json(await getProfile(d.db, id));
}

export async function profilePut(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  const b = await bodyOf(req);
  if (!parseProfile(b.data)) return json({ error: 'invalid' }, 400);
  const saved = await putProfile(d.db, id, b.data, typeof b.baseRev === 'number' ? b.baseRev : 0);
  // several phones writing at the same moment: the phone tries again a little later
  return saved ? json(saved) : json({ error: 'busy' }, 409);
}

/** Deletes the account: needs the session and the username typed again (spec §4.5). */
export async function accountDelete(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db }, { banned: true });
  if (typeof id !== 'string') return id;
  const account = await getAccount(d.db, id);
  const confirm = (await bodyOf(req)).confirm;
  const expected = account?.username ?? account?.email;
  if (!account || typeof confirm !== 'string' || confirm.trim().toLowerCase() !== expected?.toLowerCase())
    return json({ error: 'confirm' }, 400);
  await deleteAccount(d.db, id, d.now?.());
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}

/** POST /api/records: a finished match for the global ranking (delivery 2). Answers the player's position on that board. */
export async function recordPost(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  const r = parseRecord(await bodyOf(req));
  if (!r) return json({ error: 'invalid' }, 400);
  return json(await submit(d.db, id, r, d.now?.()));
}

/** GET /api/ranking?mode=&side=&difficulty=: the top 30 matches of a board, plus the signed-in player's best line. */
export async function rankingGet(req: Request, d: Deps): Promise<Response> {
  if (!d.db) return unavailable();
  const q = new URL(req.url).searchParams;
  const mode = q.get('mode') as Mode;
  const side = q.get('side');
  const difficulty = q.get('difficulty') as Difficulty;
  if (!MODES.includes(mode) || (side !== 'police' && side !== 'thief') || !DIFFICULTIES.includes(difficulty))
    return json({ error: 'invalid' }, 400);
  await ensureSchema(d.db);
  return json(await board(d.db, { mode, side, difficulty }, await who(req, d)));
}

/** POST /api/ranking {username}: reports a name seen on the global ranking (saved for review). */
export async function reportPost(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  const username = (await bodyOf(req)).username;
  if (typeof username !== 'string' || username.length > 40) return json({ error: 'invalid' }, 400);
  const r = await reportName(d.db, id, username, d.now?.());
  if (r === 'ok') return json({ ok: true });
  return json({ error: r }, r === 'unknown' ? 404 : r === 'limit' ? 429 : 400);
}

/** POST /api/events {events, context, sentAt}: a batch of usage events from the phone (delivery 3). Malformed ones are dropped. */
export async function eventsPost(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await member(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  const b = await bodyOf(req);
  const list = (Array.isArray(b.events) ? b.events : [])
    .slice(0, 100)
    .map(parseEvent)
    .filter((e): e is ClientEvent => e !== undefined);
  const saved = await saveEvents(d.db, id, list, parseContext(b.context), typeof b.sentAt === 'string' ? b.sentAt : undefined, d.now?.());
  return json({ saved });
}

/** the admin's id, or the answer to send to anyone else */
async function admin(req: Request, d: Deps & { db: Db }): Promise<string | Response> {
  const id = await member(req, d);
  if (typeof id !== 'string') return id;
  const account = await getAccount(d.db, id);
  return account && isAdminEmail(account.email) ? id : json({ error: 'forbidden' }, 403);
}

/** GET /api/admin/stats?days=7|30|90: the panel's numbers, only for the admin account.
 * GET /api/admin/stats?view=reports: the "Denúncias" tab (same function: the Hobby plan allows 12). */
export async function adminStatsGet(req: Request, d: Deps): Promise<Response> {
  if (!d.db) return unavailable();
  const id = await admin(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  if (new URL(req.url).searchParams.get('view') === 'reports') return json(await moderationView(d.db));
  const days = Number(new URL(req.url).searchParams.get('days'));
  return json(await adminStats(d.db, [7, 30, 90].includes(days) ? days : 30, d.now?.()));
}

/** POST /api/admin/stats {userId, action}: a decision in the "Denúncias" tab (rename, ban, unban, dismiss). */
export async function adminActPost(req: Request, d: Deps): Promise<Response> {
  const bad = foreign(req);
  if (bad) return bad;
  if (!d.db) return unavailable();
  const id = await admin(req, { ...d, db: d.db });
  if (typeof id !== 'string') return id;
  const b = await bodyOf(req);
  if (typeof b.userId !== 'string' || !/^[0-9]{1,19}$/.test(b.userId) || !MODERATION_ACTIONS.includes(b.action as ModerationAction))
    return json({ error: 'invalid' }, 400);
  const r = await moderate(d.db, b.userId, b.action as ModerationAction, d.now?.());
  if (r === 'ok') return json(await moderationView(d.db));
  return json({ error: r }, r === 'unknown' ? 404 : 403);
}
