// Reporting a name from the global ranking: the production client, the localhost fake and the app's answer to the screen.
import { describe, expect, it, vi } from 'vitest';
import { OfflineError, SignedOutError, httpApi, type AccountApi } from '../../src/account/api';
import { DEV_API_KEY, devApi } from '../../src/account/devApi';
import { createAppAccount } from '../../src/appAccount';
import { emptyProfile } from '../../src/meta/profile';
import { memStorage } from './memStorage';

const reply = (status: number, body: unknown = {}) => vi.fn(async () => Response.json(body, { status }));

describe('reporting a name', () => {
  it('httpApi: POST /api/ranking with the name; maps the answers', async () => {
    const f = reply(200, { ok: true });
    expect(await httpApi(f).reportName('turbo_br')).toBe('ok');
    expect(f).toHaveBeenCalledWith('/api/ranking', expect.objectContaining({ method: 'POST', body: '{"username":"turbo_br"}' }));
    expect(await httpApi(reply(404, { error: 'unknown' })).reportName('x')).toBe('unknown');
    expect(await httpApi(reply(400, { error: 'self' })).reportName('x')).toBe('unknown');
    expect(await httpApi(reply(429, { error: 'limit' })).reportName('x')).toBe('limit');
    await expect(httpApi(reply(401)).reportName('x')).rejects.toBeInstanceOf(SignedOutError);
    await expect(httpApi(reply(503)).reportName('x')).rejects.toBeInstanceOf(OfflineError);
  });

  it('the localhost fake keeps the reports and shows the seeded rivals, marking the reported ones', async () => {
    const storage = memStorage();
    storage.setItem(
      DEV_API_KEY,
      JSON.stringify({
        signedIn: true,
        account: { id: 'dev-1', email: 'e', name: 'n', picture: '', username: 'Teste' },
        profile: null,
        rev: 0,
        rivals: [
          { pos: 1, username: 'turbo_br', time: 41, hp: 90, car: 'caveirao', rank: 7 },
          { pos: 2, username: 'pmdorj', time: 45, hp: 70, car: 'prf', rank: 6 },
        ],
      }),
    );
    const api = devApi(storage, { startSignedOut: false });
    expect(await api.reportName('TURBO_BR')).toBe('ok');
    expect(await api.reportName('ninguem')).toBe('unknown');
    const { rows } = await api.ranking('pursuit', 'police', 'normal');
    expect(rows.map((r) => [r.username, r.reported ?? false])).toEqual([
      ['turbo_br', true],
      ['pmdorj', false],
    ]);
  });

  it('the app turns any failure into offline, so the dialog can try again', async () => {
    const make = (reportName: AccountApi['reportName']) =>
      createAppAccount({
        api: { ...devApi(memStorage(), { startSignedOut: false }), reportName },
        storage: memStorage(),
        account: { id: '1', email: 'e', name: 'n', picture: '', username: 'Teste' },
        profile: emptyProfile(),
        records: true,
        context: { version: 'test', client: 'web' },
        restart: vi.fn(),
      });
    expect(await make(async () => 'limit').report('x')).toBe('limit');
    expect(await make(() => Promise.reject(new OfflineError())).report('x')).toBe('offline');
  });

  it('a session that ended on the server goes back to the sign-in', async () => {
    const restart = vi.fn();
    const storage = memStorage();
    const app = createAppAccount({
      api: { ...devApi(memStorage(), { startSignedOut: false }), reportName: () => Promise.reject(new SignedOutError(true)) },
      storage,
      account: { id: '1', email: 'e', name: 'n', picture: '', username: 'Teste' },
      profile: emptyProfile(),
      records: true,
      context: { version: 'test', client: 'web' },
      restart,
    });
    expect(await app.report('x')).toBe('offline');
    expect(restart).toHaveBeenCalledOnce();
  });
});
