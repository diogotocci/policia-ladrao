// Vercel function: checks the admin password (playtest 2026-10-09). The password lives only in the Vercel environment
// variable ADMIN_PASSWORD (server side, never in the game's code). Without it, admin mode stays off.
import { timingSafeEqual } from 'node:crypto';

/** true when the given password is the one in ADMIN_PASSWORD (an empty or missing variable matches nothing) */
export function passwordMatches(given: unknown, expected: string | undefined): boolean {
  if (typeof given !== 'string' || !given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  let password: unknown;
  try {
    password = ((await request.json()) as { password?: unknown }).password;
  } catch {
    password = undefined;
  }
  const ok = passwordMatches(password, process.env.ADMIN_PASSWORD);
  return Response.json({ ok }, { status: ok ? 200 : 401, headers: { 'Cache-Control': 'no-store' } });
}
