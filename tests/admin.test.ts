import { describe, expect, it, vi } from 'vitest';
import { POST, passwordMatches } from '../api/admin';
import { checkAdminPassword } from '../src/admin';
import { emptyProfile } from '../src/meta/profile';
import { buy, canBuy } from '../src/meta/shop';

describe('admin password (playtest 2026-10-09): only the Vercel variable ADMIN_PASSWORD', () => {
  it('server: matches the variable exactly; no variable, nothing matches', () => {
    expect(passwordMatches('secret123', 'secret123')).toBe(true);
    expect(passwordMatches('Secret123', 'secret123')).toBe(false);
    expect(passwordMatches('secret12', 'secret123')).toBe(false);
    expect(passwordMatches('', 'secret123')).toBe(false);
    expect(passwordMatches(123, 'secret123')).toBe(false);
    expect(passwordMatches('secret123', undefined)).toBe(false);
    expect(passwordMatches('', '')).toBe(false);
  });

  it('server function: 200 {ok:true} with the right password, 401 otherwise, never cached', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret123');
    const call = (body: string) => POST(new Request('http://x/api/admin', { method: 'POST', body }));
    const right = await call(JSON.stringify({ password: 'secret123' }));
    expect(right.status).toBe(200);
    expect(await right.json()).toEqual({ ok: true });
    expect(right.headers.get('Cache-Control')).toBe('no-store');
    expect((await call(JSON.stringify({ password: 'nope' }))).status).toBe(401);
    expect((await call('not json')).status).toBe(401);
    vi.stubEnv('ADMIN_PASSWORD', '');
    expect((await call(JSON.stringify({ password: '' }))).status).toBe(401);
    vi.unstubAllEnvs();
  });

  it('game: asks the server; offline or an error is a no', async () => {
    const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
    const yes = answer(200, { ok: true });
    expect(await checkAdminPassword('secret123', yes as unknown as typeof fetch)).toBe(true);
    expect(yes).toHaveBeenCalledWith(
      '/api/admin',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ password: 'secret123' }) }),
    );
    expect(await checkAdminPassword('x', answer(401, { ok: false }) as unknown as typeof fetch)).toBe(false);
    expect(await checkAdminPassword('x', answer(404, 'not found') as unknown as typeof fetch)).toBe(false);
    const offline = vi.fn(async () => Promise.reject(new TypeError('offline')));
    expect(await checkAdminPassword('x', offline as unknown as typeof fetch)).toBe(false);
    expect(await checkAdminPassword('', yes as unknown as typeof fetch)).toBe(false);
  });
});

describe('admin shop', () => {
  it('everything unlocked and free (a paint still needs its car)', () => {
    const p = { ...emptyProfile(), coins: 0 };
    expect(canBuy(p, 'car:caveirao').ok).toBe(false);
    expect(canBuy(p, 'car:caveirao', { admin: true })).toEqual({ ok: true, price: 0 });
    const r = buy(p, 'car:caveirao', { admin: true });
    expect(r.ok).toBe(true);
    expect(r.profile.coins).toBe(0);
    expect(r.profile.equipped.police.car).toBe('caveirao');
    expect(canBuy(p, 'paint:van:1', { admin: true })).toEqual({ ok: false, reason: 'locked', need: 'Compre o carro primeiro' });
    expect(canBuy(r.profile, 'paint:caveirao:2', { admin: true }).ok).toBe(true);
  });
});
