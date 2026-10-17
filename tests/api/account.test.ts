// V3 part 1 (spec §3-4): the account endpoints against a real Postgres (PGlite, in memory) and a fake Google.
import { PGlite } from '@electric-sql/pglite';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureSchema, type Db } from '../../api/_lib/db';
import { isAdminEmail } from '../../api/_lib/users';
import { accountDelete, me, profileGet, profilePut, signIn, signOut, usernameCheck, usernameSet, type Deps } from '../../api/_lib/http';
import { emptyProfile, type Profile } from '../../src/meta/profile';

const CLIENT = 'test-client.apps.googleusercontent.com';
let privateKey: CryptoKey;
let deps: Deps;
let pg: PGlite;
let db: Db;
// PGlite starts slowly on a busy machine: one database for the file, emptied before each test
vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
  deps = { db: undefined, secret: 'test-secret-0123456789', clientId: CLIENT, googleKeys: createLocalJWKSet({ keys: [jwk] }) };
  pg = new PGlite();
  db = { query: async <T>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows };
  await ensureSchema(db);
});
beforeEach(async () => {
  await pg.query('truncate users restart identity cascade');
  deps = { ...deps, db, now: () => new Date('2026-10-12T12:00:00Z') };
});

const googleToken = (o: { sub?: string; email?: string; aud?: string; verified?: boolean; iss?: string } = {}) =>
  new SignJWT({ email: o.email ?? 'ana@example.com', email_verified: o.verified ?? true, name: 'Ana', picture: 'https://x/a.png' })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(o.iss ?? 'https://accounts.google.com')
    .setAudience(o.aud ?? CLIENT)
    .setSubject(o.sub ?? 'g-1')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

const req = (path: string, method = 'GET', body?: unknown, cookie?: string) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const cookieFrom = (res: Response) => res.headers.get('Set-Cookie')!.split(';')[0]!;

async function login(sub = 'g-1', email = 'ana@example.com') {
  const res = await signIn(req('/api/auth/google', 'POST', { credential: await googleToken({ sub, email }) }), deps);
  expect(res.status).toBe(200);
  return { cookie: cookieFrom(res), body: (await res.json()) as { account: { id: string; username: string | null; admin: boolean } } };
}

describe('sign-in with Google', () => {
  it('a valid token creates the account once and sets an HttpOnly session cookie', async () => {
    const first = await login();
    expect(first.body.account).toMatchObject({ email: 'ana@example.com', name: 'Ana', username: null });
    const again = await login();
    expect(again.body.account.id).toBe(first.body.account.id);
    const res = await signIn(req('/api/auth/google', 'POST', { credential: await googleToken() }), deps);
    expect(res.headers.get('Set-Cookie')).toMatch(/HttpOnly; Secure; SameSite=Lax; Max-Age=7776000/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('refuses a token for another app, from another issuer, or with an unverified e-mail', async () => {
    for (const bad of [{ aud: 'other-app' }, { iss: 'https://evil.example' }, { verified: false }]) {
      const res = await signIn(req('/api/auth/google', 'POST', { credential: await googleToken(bad) }), deps);
      expect(res.status).toBe(401);
    }
    expect((await signIn(req('/api/auth/google', 'POST', { credential: 'garbage' }), deps)).status).toBe(401);
  });

  it('/api/me knows the session and renews it; without it, or after logout, 401', async () => {
    const { cookie } = await login();
    const ok = await me(req('/api/me', 'GET', undefined, cookie), deps);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Set-Cookie')).toContain('pl_session=');
    expect((await me(req('/api/me'), deps)).status).toBe(401);
    expect((await me(req('/api/me', 'GET', undefined, 'pl_session=forged'), deps)).status).toBe(401);
    expect(signOut(req('/api/auth/logout', 'POST', {})).headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it("only Diogo's Google account is admin (no password, no other way)", async () => {
    expect((await login('g-1', 'ana@example.com')).body.account).toMatchObject({ admin: false });
    expect((await login('g-9', 'diogotocci@gmail.com')).body.account).toMatchObject({ admin: true });
    const res = await me(req('/api/me', 'GET', undefined, (await login('g-9', 'diogotocci@gmail.com')).cookie), deps);
    expect(await res.json()).toMatchObject({ account: { admin: true } });
    expect((await login('g-8', 'diogotocci@gmail.com.evil.example')).body.account).toMatchObject({ admin: false });
  });

  it('the admin e-mail comes from ADMIN_EMAIL (Vercel); unset or empty, nobody is admin', () => {
    expect(isAdminEmail(' DiogoTocci@Gmail.com ', { ADMIN_EMAIL: 'diogotocci@gmail.com' })).toBe(true);
    expect(isAdminEmail('ana@example.com', { ADMIN_EMAIL: 'ana@example.com ' })).toBe(true);
    expect(isAdminEmail('diogotocci@gmail.com', {})).toBe(false);
    expect(isAdminEmail('', { ADMIN_EMAIL: '' })).toBe(false);
    expect(isAdminEmail('diogotocci@gmail.com', { ADMIN_EMAIL: '   ' })).toBe(false);
  });

  it('without the database or the secret (local dev), the endpoints say so instead of failing', async () => {
    const res = await signIn(req('/api/auth/google', 'POST', { credential: await googleToken() }), { ...deps, db: undefined });
    expect(res.status).toBe(503);
  });
});

describe('requests from other sites (login CSRF)', () => {
  it('changes need JSON from the same site: a form post or a cross-site request is refused', async () => {
    const credential = await googleToken();
    const form = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ credential }),
    });
    expect((await signIn(form, deps)).status).toBe(403);
    const cross = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' },
      body: JSON.stringify({ credential }),
    });
    expect((await signIn(cross, deps)).status).toBe(403);
    const same = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', Origin: 'https://localhost', host: 'localhost' },
      body: JSON.stringify({ credential }),
    });
    expect((await signIn(same, deps)).status).toBe(200);
  });
});

describe('username (spec §4.1)', () => {
  it('checks format, swear words and who has it, ignoring case', async () => {
    const ana = await login();
    const check = async (u: string, cookie?: string) =>
      (await (await usernameCheck(req(`/api/username?u=${u}`, 'GET', undefined, cookie), deps)).json()) as {
        ok: boolean;
        problem?: string;
      };
    expect(await check('ab')).toEqual({ ok: false, problem: 'format' });
    expect(await check('xx_p0rra')).toEqual({ ok: false, problem: 'blocked' });
    expect(await check('Rolando')).toEqual({ ok: true });
    const set = await usernameSet(req('/api/username', 'POST', { username: 'Diogo_Fuga' }, ana.cookie), deps);
    expect(set.status).toBe(200);
    expect(await check('diogo_fuga')).toEqual({ ok: false, problem: 'taken' });
    expect(await check('diogo_fuga', ana.cookie)).toEqual({ ok: true }); // your own name is free for you
    const bia = await login('g-2', 'bia@example.com');
    const taken = await usernameSet(req('/api/username', 'POST', { username: 'DIOGO_FUGA' }, bia.cookie), deps);
    expect(taken.status).toBe(409);
    expect(await taken.json()).toEqual({ problem: 'taken' });
  });

  it('can change once every 30 days (fixing only the case is always allowed)', async () => {
    const { cookie } = await login();
    const set = (u: string) => usernameSet(req('/api/username', 'POST', { username: u }, cookie), deps);
    expect((await set('Primeiro')).status).toBe(200);
    expect((await set('primeiro')).status).toBe(200);
    expect(await (await set('Segundo')).json()).toEqual({ problem: 'cooldown' });
    deps = { ...deps, now: () => new Date('2026-11-12T12:00:00Z') };
    expect((await set('Segundo')).status).toBe(200);
  });
});

describe('progress in the account (spec §4.3)', () => {
  const p = (o: Partial<Profile> = {}): Profile => ({ ...emptyProfile(), ...o });

  it('saves and reads back, with a version number', async () => {
    const { cookie } = await login();
    expect(await (await profileGet(req('/api/profile', 'GET', undefined, cookie), deps)).json()).toEqual({ data: null, rev: 0 });
    const put = await profilePut(req('/api/profile', 'PUT', { data: p({ coins: 500 }), baseRev: 0 }, cookie), deps);
    expect(await put.json()).toMatchObject({ rev: 1, data: { coins: 500 } });
    const get = (await (await profileGet(req('/api/profile', 'GET', undefined, cookie), deps)).json()) as { rev: number; data: Profile };
    expect(get).toMatchObject({ rev: 1, data: { coins: 500 } });
  });

  it('two phones: an offline phone that saves from an old version is merged, nothing bought is lost', async () => {
    const { cookie } = await login();
    const put = async (data: Profile, baseRev: number) =>
      (await (await profilePut(req('/api/profile', 'PUT', { data, baseRev }, cookie), deps)).json()) as { rev: number; data: Profile };
    await put(p({ coins: 100 }), 0);
    const phoneA = await put(p({ coins: 50, owned: ['car:esportivo'] }), 1); // rev 2
    expect(phoneA.rev).toBe(2);
    const phoneB = await put(p({ coins: 900, owned: ['car:picape'] }), 1); // still on rev 1: merged
    expect(phoneB.rev).toBe(3);
    expect([...phoneB.data.owned].sort()).toEqual(['car:esportivo', 'car:picape']);
    expect(phoneB.data.coins).toBe(900); // coins from the copy saved last
  });

  it('refuses something that is not a profile, and anything without a session', async () => {
    const { cookie } = await login();
    expect((await profilePut(req('/api/profile', 'PUT', { data: { coins: -1 }, baseRev: 0 }, cookie), deps)).status).toBe(400);
    expect((await profileGet(req('/api/profile'), deps)).status).toBe(401);
  });
});

describe('deleting the account (Google Play rule, spec §4.5)', () => {
  it('needs the username typed again; deletes the account and its progress; the name is free again', async () => {
    const { cookie } = await login();
    await usernameSet(req('/api/username', 'POST', { username: 'Diogo_Fuga' }, cookie), deps);
    await profilePut(req('/api/profile', 'PUT', { data: emptyProfile(), baseRev: 0 }, cookie), deps);
    expect((await accountDelete(req('/api/account', 'DELETE', { confirm: 'outro' }, cookie), deps)).status).toBe(400);
    const res = await accountDelete(req('/api/account', 'DELETE', { confirm: 'diogo_fuga' }, cookie), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
    // the same session on another phone: told the account is gone, so that phone forgets it too
    const other = await me(req('/api/me', 'GET', undefined, cookie), deps);
    expect(other.status).toBe(401);
    expect(await other.json()).toEqual({ error: 'gone' });
    const late = await profilePut(req('/api/profile', 'PUT', { data: emptyProfile(), baseRev: 0 }, cookie), deps);
    expect(await late.json()).toEqual({ error: 'gone' });
    const left = await pg.query<{ n: number }>('select (select count(*) from users)::int + (select count(*) from profiles)::int as n');
    expect(left.rows[0]!.n).toBe(0);
    // signing in again starts a new, empty account
    const again = await login();
    expect(again.body.account.username).toBeNull();
  });
});
