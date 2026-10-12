// Login session (V3 part 1): an HttpOnly cookie with a signed token (HS256, SESSION_SECRET) holding the user id.
// Nothing from Google is kept: the Google token is only checked once, at sign-in.
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE = 'pl_session';
export const SESSION_DAYS = 90;

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(userId: string, secret: string, now = Date.now()): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + SESSION_DAYS * 86400)
    .sign(key(secret));
}

/** the user id, or undefined for a missing, forged or expired token */
export async function readSession(token: string | undefined, secret: string | undefined): Promise<string | undefined> {
  if (!token || !secret) return undefined;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

export function cookieOf(req: Request, name = COOKIE): string | undefined {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export const setCookie = (token: string) =>
  `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
