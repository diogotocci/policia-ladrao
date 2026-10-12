// The production client of the account API: what each answer of the server means to the game.
import { describe, expect, it, vi } from 'vitest';
import { OfflineError, SignedOutError, httpApi } from '../../src/account/api';
import { emptyProfile } from '../../src/meta/profile';

const reply = (status: number, body: unknown = {}) => vi.fn(async () => Response.json(body, { status }));

describe('httpApi', () => {
  it('me: the account, null when signed out, offline when the network or the server fails', async () => {
    const account = { id: '1', email: 'e', name: 'n', picture: '', username: 'x' };
    expect(await httpApi(reply(200, { account })).me()).toEqual(account);
    expect(await httpApi(reply(401)).me()).toBeNull();
    await expect(httpApi(reply(503)).me()).rejects.toBeInstanceOf(OfflineError);
    const down = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(httpApi(down).me()).rejects.toBeInstanceOf(OfflineError);
  });

  it('sends JSON with the session cookie, and maps the username answers', async () => {
    const f = reply(409, { problem: 'taken' });
    expect(await httpApi(f).setUsername('Diogo')).toEqual({ problem: 'taken' });
    expect(f).toHaveBeenCalledWith(
      '/api/username',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: '{"username":"Diogo"}' }),
    );
    expect(await httpApi(reply(200, { ok: true })).checkUsername('Diogo')).toBeNull();
    expect(await httpApi(reply(200, { ok: false, problem: 'blocked' })).checkUsername('x')).toBe('blocked');
    const q = reply(200, { ok: true });
    await httpApi(q).checkUsername('a b&c');
    expect(q).toHaveBeenCalledWith('/api/username?u=a%20b%26c', expect.anything());
  });

  it('profile: a lost session is SignedOutError; delete: false when the confirmation does not match', async () => {
    await expect(httpApi(reply(401)).putProfile(emptyProfile(), 0)).rejects.toBeInstanceOf(SignedOutError);
    expect(await httpApi(reply(200, { data: null, rev: 0 })).getProfile()).toEqual({ data: null, rev: 0 });
    expect(await httpApi(reply(400, { error: 'confirm' })).deleteAccount('x')).toBe(false);
    expect(await httpApi(reply(200, { ok: true })).deleteAccount('x')).toBe(true);
    expect(await httpApi(reply(401)).signIn('bad')).toBeNull();
  });
});
