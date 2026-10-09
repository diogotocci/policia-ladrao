// Admin mode (playtest 2026-10-09): Diogo tests the whole shop, unlocked and free. The password is the Vercel
// environment variable ADMIN_PASSWORD, checked by the server function api/admin.ts; it is never in the game's code.
// Without network or without the variable (local dev), admin mode cannot be turned on.

/** true when the server says the password is right; false when it is wrong or the server cannot be reached. */
export async function checkAdminPassword(password: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  if (!password) return false;
  try {
    const res = await fetchFn('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    return ((await res.json()) as { ok?: unknown }).ok === true;
  } catch {
    return false;
  }
}
