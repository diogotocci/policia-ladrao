// The /admin "Denúncias" tab against PGlite: the queue, the decisions and what they do to the account.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accountDelete,
  adminActPost,
  adminStatsGet,
  me,
  profileGet,
  rankingGet,
  recordPost,
  eventsPost,
  reportPost,
  usernameCheck,
  usernameSet,
} from '../../api/_lib/http';
import type { GlobalBoard } from '../../src/meta/records';
import type { ModerationView } from '../../src/meta/moderation';
import { req, testServer } from './helpers';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });
let s: Awaited<ReturnType<typeof testServer>>;
let admin: string;
beforeAll(async () => (s = await testServer()));
beforeEach(async () => {
  await s.reset();
  await s.pg.query('truncate moderation, blocked_names');
  s.deps.now = () => new Date('2026-10-15T12:00:00Z');
  admin = await s.loginEmail('diogo', 'diogotocci@gmail.com', 'Diogo');
});

const report = (username: string, cookie: string) => reportPost(req('/api/ranking', 'POST', { username }, cookie), s.deps);
const view = async (cookie = admin) =>
  (await adminStatsGet(req('/api/admin/stats?view=reports', 'GET', undefined, cookie), s.deps)).json() as Promise<ModerationView>;
const act = (userId: string, action: string, cookie = admin) =>
  adminActPost(req('/api/admin/stats', 'POST', { userId, action }, cookie), s.deps);
const idOf = async (username: string) =>
  String((await s.pg.query<{ id: number }>(`select id from users where username = $1`, [username])).rows[0]!.id);

/** bia gets reported by ana and caio */
async function reported() {
  const ana = await s.login('ana', 'Ana');
  const bia = await s.login('bia', 'Bia_Feia');
  const caio = await s.login('caio', 'Caio');
  await report('Bia_Feia', ana);
  s.deps.now = () => new Date('2026-10-15T13:00:00Z');
  await report('Bia_Feia', caio);
  await report('Caio', ana);
  return { ana, bia, caio, biaId: await idOf('Bia_Feia') };
}

describe('the reports tab', () => {
  it('lists each reported account once, most reported first, with dates and who reported', async () => {
    await reported();
    const v = await view();
    expect(v.pending.map((p) => [p.username, p.count, p.by])).toEqual([
      ['Bia_Feia', 2, ['Caio', 'Ana']],
      ['Caio', 1, ['Ana']],
    ]);
    expect(v.pending[0]).toMatchObject({ first: '2026-10-15T12:00:00.000Z', last: '2026-10-15T13:00:00.000Z' });
    expect(v.decided).toEqual([]);
  });

  it('only for the admin account', async () => {
    const { ana, biaId } = await reported();
    expect((await adminStatsGet(req('/api/admin/stats?view=reports', 'GET', undefined, ana), s.deps)).status).toBe(403);
    expect((await act(biaId, 'ban', ana)).status).toBe(403);
    expect((await act(await idOf('Diogo'), 'ban')).status).toBe(403); // the admin cannot act on himself
    expect((await act('999999', 'ban')).status).toBe(404);
    expect((await act(biaId, 'nuke')).status).toBe(400);
  });

  it('a player who renamed after being reported shows the reported name too', async () => {
    const { bia } = await reported();
    s.deps.now = () => new Date('2026-12-01T12:00:00Z'); // after the 30-day wait
    await usernameSet(req('/api/username', 'POST', { username: 'Bia_Nova' }, bia), s.deps);
    expect((await view()).pending[0]).toMatchObject({ username: 'Bia_Nova', reportedAs: 'Bia_Feia' });
  });

  it('dismiss: the reports leave the queue, nothing else changes, and the same person can report again', async () => {
    const { ana, bia, biaId } = await reported();
    const v = (await (await act(biaId, 'dismiss')).json()) as ModerationView;
    expect(v.pending.map((p) => p.username)).toEqual(['Caio']);
    expect(v.decided[0]).toMatchObject({ username: 'Bia_Feia', action: 'dismiss', reports: 2, nowName: 'Bia_Feia', banned: false });
    expect((await me(req('/api/me', 'GET', undefined, bia), s.deps)).status).toBe(200);
    await report('Bia_Feia', ana);
    expect((await view()).pending[0]).toMatchObject({ username: 'Bia_Feia', count: 1 });
  });

  it('rename: the account loses the name (with a notice), the name is never given again, a new one has no wait', async () => {
    const { bia, ana, biaId } = await reported();
    await act(biaId, 'rename');
    const acc = ((await (await me(req('/api/me', 'GET', undefined, bia), s.deps)).json()) as { account: Record<string, unknown> }).account;
    expect(acc).toMatchObject({ username: null, notice: 'Bia_Feia' });
    const taken = async (cookie: string) =>
      ((await (await usernameCheck(req('/api/username?u=bia_feia', 'GET', undefined, cookie), s.deps)).json()) as { problem?: string })
        .problem;
    expect(await taken(ana)).toBe('taken');
    expect(await taken(bia)).toBe('taken');
    const res = await usernameSet(req('/api/username', 'POST', { username: 'Bia_Ok' }, bia), s.deps);
    expect(res.status).toBe(200);
    const after = ((await res.json()) as { account: Record<string, unknown> }).account;
    expect(after.username).toBe('Bia_Ok');
    expect(after.notice).toBeUndefined();
    expect((await view()).decided[0]).toMatchObject({ username: 'Bia_Feia', action: 'rename', reports: 2, nowName: 'Bia_Ok' });
  });

  it('ban: the session stops working except for deleting the account; it leaves the ranking; undo brings it back', async () => {
    const { bia, biaId } = await reported();
    const rec = {
      matchId: 'match-ban-0001',
      mode: 'pursuit',
      side: 'police',
      difficulty: 'normal',
      time: 40,
      hp: 80,
      car: 'viatura',
      rank: 2,
      endedAt: '2026-10-15T11:00:00Z',
      sentAt: '2026-10-15T12:00:00Z',
      ev: true,
    };
    const ev = {
      id: 'ev-match-ban-0001',
      type: 'match_end',
      at: rec.endedAt,
      data: {
        matchId: rec.matchId,
        mode: 'pursuit',
        side: 'police',
        difficulty: 'normal',
        car: 'viatura',
        won: true,
        time: 40,
        level: 1,
        coins: 1,
      },
    };
    await eventsPost(req('/api/events', 'POST', { events: [ev], context: {}, sentAt: rec.sentAt }, bia), s.deps);
    await recordPost(req('/api/records', 'POST', rec, bia), s.deps);
    const rows = async () =>
      ((await (await rankingGet(req('/api/ranking?mode=pursuit&side=police&difficulty=normal'), s.deps)).json()) as GlobalBoard).rows
        .length;
    expect(await rows()).toBe(1);

    await act(biaId, 'ban');
    const meRes = await me(req('/api/me', 'GET', undefined, bia), s.deps);
    expect(((await meRes.json()) as { account: Record<string, unknown> }).account).toMatchObject({ username: 'Bia_Feia', banned: true });
    const profile = await profileGet(req('/api/profile', 'GET', undefined, bia), s.deps);
    expect(profile.status).toBe(403);
    expect(await profile.json()).toEqual({ error: 'banned' });
    expect(await rows()).toBe(0);
    expect((await view()).pending.map((p) => p.username)).toEqual(['Caio']);
    expect((await view()).decided[0]).toMatchObject({ action: 'ban', banned: true });

    await act(biaId, 'unban');
    expect((await profileGet(req('/api/profile', 'GET', undefined, bia), s.deps)).status).toBe(200);
    expect(await rows()).toBe(1);
    expect((await view()).decided.map((d) => [d.action, d.banned])).toEqual([
      ['unban', false],
      ['ban', false],
    ]);

    await act(biaId, 'ban');
    expect((await accountDelete(req('/api/account', 'DELETE', { confirm: 'Bia_Feia' }, bia), s.deps)).status).toBe(200);
    expect((await view()).decided[0]).toMatchObject({ userId: null, username: 'Bia_Feia', action: 'ban' });
  });

  it('a banned account cannot be reported', async () => {
    const { ana, biaId } = await reported();
    await act(biaId, 'ban');
    expect((await report('Bia_Feia', ana)).status).toBe(404);
  });

  it('rename after the player renamed himself: both the reported and the current name are blocked', async () => {
    const { bia, ana, biaId } = await reported();
    s.deps.now = () => new Date('2026-12-01T12:00:00Z');
    await usernameSet(req('/api/username', 'POST', { username: 'Bia_Normal' }, bia), s.deps);
    await act(biaId, 'rename');
    for (const name of ['bia_feia', 'bia_normal'])
      expect(
        ((await (await usernameCheck(req(`/api/username?u=${name}`, 'GET', undefined, ana), s.deps)).json()) as { problem?: string })
          .problem,
      ).toBe('taken');
  });

  it("the admin's own name cannot be reported", async () => {
    const ana = await s.login('ana', 'Ana');
    expect((await report('Diogo', ana)).status).toBe(404);
    expect((await view()).pending).toEqual([]);
  });

  it('only the latest ban still in force can be undone', async () => {
    const { biaId } = await reported();
    await act(biaId, 'ban');
    await act(biaId, 'unban');
    await act(biaId, 'ban');
    expect((await view()).decided.map((d) => [d.action, d.banned])).toEqual([
      ['ban', true],
      ['unban', false],
      ['ban', false],
    ]);
  });
});
