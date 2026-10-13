// Reporting a username from the global ranking: POST /api/ranking {username}, saved for review against PGlite.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountDelete, eventsPost, rankingGet, recordPost, reportPost } from '../../api/_lib/http';
import type { GlobalBoard } from '../../src/meta/records';
import { req, testServer } from './helpers';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });
let s: Awaited<ReturnType<typeof testServer>>;
beforeAll(async () => (s = await testServer()));
beforeEach(async () => {
  await s.reset();
  s.deps.now = () => new Date('2026-10-13T12:00:00Z');
});

const report = (username: unknown, cookie?: string) => reportPost(req('/api/ranking', 'POST', { username }, cookie), s.deps);
const saved = async () =>
  (
    await s.pg.query<{ reporter: string; reported: string; username: string }>(
      `select a.username as reporter, b.username as reported, r.username
     from reports r join users a on a.id = r.reporter_id join users b on b.id = r.reported_id order by r.id`,
    )
  ).rows;

describe('reporting a username', () => {
  it('saves who reported whom and the name as it was; case does not matter', async () => {
    const ana = await s.login('ana', 'Ana');
    await s.login('bia', 'Bia_191');
    const res = await report('bia_191', ana);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await saved()).toEqual([{ reporter: 'Ana', reported: 'Bia_191', username: 'Bia_191' }]);
  });

  it('reporting the same player again keeps one report', async () => {
    const ana = await s.login('ana', 'Ana');
    await s.login('bia', 'Bia_191');
    await report('Bia_191', ana);
    expect((await report('Bia_191', ana)).status).toBe(200);
    expect(await saved()).toHaveLength(1);
  });

  it('a name that is not in use any more answers unknown; the player cannot report himself', async () => {
    const ana = await s.login('ana', 'Ana');
    expect((await report('ninguem', ana)).status).toBe(404);
    expect((await report('Ana', ana)).status).toBe(400);
    expect((await report(42, ana)).status).toBe(400);
    expect(await saved()).toEqual([]);
  });

  it('needs a session and the same-site JSON guard', async () => {
    await s.login('bia', 'Bia_191');
    expect((await report('Bia_191')).status).toBe(401);
    const ana = await s.login('ana', 'Ana');
    const cross = new Request('http://localhost/api/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: ana, 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify({ username: 'Bia_191' }),
    });
    expect((await reportPost(cross, s.deps)).status).toBe(403);
  });

  it('at most 30 reports a day per player', async () => {
    const ana = await s.login('ana', 'Ana');
    for (let i = 0; i < 31; i++) await s.login(`p${i}`, `Jogador${i}`);
    for (let i = 0; i < 30; i++) expect((await report(`Jogador${i}`, ana)).status).toBe(200);
    expect((await report('Jogador30', ana)).status).toBe(429);
    s.deps.now = () => new Date('2026-10-14T12:30:00Z');
    expect((await report('Jogador30', ana)).status).toBe(200);
  });

  it('deleting either account removes the report', async () => {
    const ana = await s.login('ana', 'Ana');
    const bia = await s.login('bia', 'Bia_191');
    const caio = await s.login('caio', 'Caio');
    await report('Bia_191', ana);
    await report('Caio', bia);
    await accountDelete(req('/api/account', 'DELETE', { confirm: 'Ana' }, ana), s.deps);
    expect(await saved()).toEqual([{ reporter: 'Bia_191', reported: 'Caio', username: 'Caio' }]);
    await accountDelete(req('/api/account', 'DELETE', { confirm: 'Caio' }, caio), s.deps);
    expect(await saved()).toEqual([]);
  });

  it('the board marks the lines the signed-in player already reported', async () => {
    const ana = await s.login('ana', 'Ana');
    const bia = await s.login('bia', 'Bia_191');
    const r = {
      matchId: 'match-report-1',
      mode: 'pursuit',
      side: 'police',
      difficulty: 'normal',
      time: 40,
      hp: 80,
      car: 'viatura',
      rank: 2,
      endedAt: '2026-10-13T11:00:00Z',
      sentAt: '2026-10-13T12:00:00Z',
      ev: true,
    };
    const ev = {
      id: 'ev-match-report-1',
      type: 'match_end',
      at: r.endedAt,
      data: {
        matchId: r.matchId,
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
    await eventsPost(req('/api/events', 'POST', { events: [ev], context: {}, sentAt: r.sentAt }, bia), s.deps);
    await recordPost(req('/api/records', 'POST', r, bia), s.deps);
    const look = async (cookie?: string) =>
      (
        (await (
          await rankingGet(req('/api/ranking?mode=pursuit&side=police&difficulty=normal', 'GET', undefined, cookie), s.deps)
        ).json()) as GlobalBoard
      ).rows[0];
    expect((await look(ana))!.reported).toBeUndefined();
    await report('Bia_191', ana);
    expect((await look(ana))!.reported).toBe(true);
    expect((await look(bia))!.reported).toBeUndefined();
    expect((await look())!.reported).toBeUndefined();
  });
});
