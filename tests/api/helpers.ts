// Shared setup for the server tests: one PGlite database and a fake Google key.
import { PGlite } from '@electric-sql/pglite';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { ensureSchema, type Db } from '../../api/_lib/db';
import { signIn, usernameSet, type Deps } from '../../api/_lib/http';

export const CLIENT = 'test-client.apps.googleusercontent.com';

export async function testServer(): Promise<{
  deps: Deps;
  pg: PGlite;
  reset(): Promise<void>;
  login(sub: string, username?: string): Promise<string>;
  loginEmail(sub: string, email: string, username?: string): Promise<string>;
}> {
  const pair = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
  const pg = new PGlite();
  const db: Db = { query: async <T>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows };
  await ensureSchema(db);
  const deps: Deps = { db, secret: 'test-secret-0123456789', clientId: CLIENT, googleKeys: createLocalJWKSet({ keys: [jwk] }) };
  const token = (sub: string, email = `${sub}@example.com`) =>
    new SignJWT({ email, email_verified: true, name: sub, picture: '' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://accounts.google.com')
      .setAudience(CLIENT)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(pair.privateKey);
  return {
    deps,
    pg,
    reset: async () => void (await pg.query('truncate users restart identity cascade')),
    login: (sub, username) => loginEmail(sub, `${sub}@example.com`, username),
    loginEmail,
  };
  async function loginEmail(sub: string, email: string, username?: string) {
    const res = await signIn(req('/api/auth/google', 'POST', { credential: await token(sub, email) }), deps);
    const cookie = res.headers.get('Set-Cookie')!.split(';')[0]!;
    if (username) await usernameSet(req('/api/username', 'POST', { username }, cookie), deps);
    return cookie;
  }
}

export const req = (path: string, method = 'GET', body?: unknown, cookie?: string) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
