// V3 delivery 3 (spec §6): usage events and the /admin panel numbers, against PGlite.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountDelete, adminStatsGet, eventsPost } from '../../api/_lib/http';
import type { AdminStats } from '../../src/meta/events';
import { req, testServer } from './helpers';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });
let s: Awaited<ReturnType<typeof testServer>>;
const NOW = '2026-10-12T15:00:00Z';
beforeAll(async () => (s = await testServer()));
beforeEach(async () => {
  await s.reset();
  s.deps.now = () => new Date(NOW);
});

let n = 0;
const match = (o: Record<string, unknown> = {}, at = NOW) => ({
  id: `ev-${(n++).toString().padStart(6, '0')}`,
  type: 'match_end',
  at,
  data: {
    matchId: `m-${n.toString().padStart(8, '0')}`,
    mode: 'pursuit',
    side: 'police',
    difficulty: 'normal',
    car: 'viatura',
    won: true,
    time: 60,
    level: 3,
    coins: 40,
    ...o,
  },
});
const post = (cookie: string, events: unknown[], context = { version: '0.28.0', client: 'play' }) =>
  eventsPost(req('/api/events', 'POST', { events, context, sentAt: s.deps.now!().toISOString() }, cookie), s.deps);
const stats = async (cookie: string, days = 30) =>
  (await adminStatsGet(req(`/api/admin/stats?days=${days}`, 'GET', undefined, cookie), s.deps)).json() as Promise<AdminStats>;

describe('events', () => {
  it('saves valid events once; drops malformed ones and anything from another site', async () => {
    const ana = await s.login('ana', 'Ana');
    const e = match();
    expect(
      await (await post(ana, [e, e, { id: 'x', type: 'hack', at: NOW, data: {} }, { ...match(), data: { mode: 'x' } }])).json(),
    ).toEqual({ saved: 1 });
    expect(await (await post(ana, [e])).json()).toEqual({ saved: 0 });
    const form = new Request('http://localhost/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ events: [match()] }),
    });
    expect((await eventsPost(form, s.deps)).status).toBe(403);
  });

  it('the panel opens only for the admin account', async () => {
    const ana = await s.login('ana', 'Ana');
    expect((await adminStatsGet(req('/api/admin/stats', 'GET', undefined, ana), s.deps)).status).toBe(403);
    expect((await adminStatsGet(req('/api/admin/stats'), s.deps)).status).toBe(401);
    const diogo = await s.loginEmail('g-diogo', 'diogotocci@gmail.com', 'Diogo');
    expect((await adminStatsGet(req('/api/admin/stats', 'GET', undefined, diogo), s.deps)).status).toBe(200);
  });

  it('counts accounts, players, matches by mode, side and difficulty, wins, cars and items, durations and versions', async () => {
    const ana = await s.login('ana', 'Ana');
    const bia = await s.login('bia', 'Bia');
    await post(ana, [
      match({ time: 50 }),
      match({ side: 'thief', car: 'seda', won: false, time: 30 }),
      match({ mode: 'survival', side: 'thief', car: 'seda', difficulty: 'hard', won: false, time: 200 }),
      { id: 'ev-buy-0001', type: 'purchase', at: NOW, data: { item: 'car:esportivo', price: 3000 } },
      { id: 'ev-buy-0002', type: 'purchase', at: NOW, data: { item: 'paint:viatura:2', price: 900 } },
      { id: 'ev-ses-0001', type: 'session_start', at: NOW, data: {} },
    ]);
    await post(
      bia,
      [match({ difficulty: 'easy', won: false, time: 70 }), { id: 'ev-ses-0002', type: 'session_start', at: NOW, data: {} }],
      { version: '0.27.0', client: 'web' },
    );
    const diogo = await s.loginEmail('g-diogo', 'diogotocci@gmail.com', 'Diogo');
    await post(diogo, [{ id: 'ev-buy-0003', type: 'purchase', at: NOW, data: { item: 'car:prf', price: 0, admin: true } }]);
    const st = await stats(diogo);
    expect(st.accounts).toEqual({ total: 3, today: 3 });
    expect(st.active).toMatchObject({ today: 3, week: 3, month: 3 });
    expect(st.matches).toEqual({ total: 4, players: 2 });
    expect(st.byModeSide).toEqual(
      expect.arrayContaining([
        { mode: 'pursuit', side: 'police', matches: 2 },
        { mode: 'pursuit', side: 'thief', matches: 1 },
        { mode: 'survival', side: 'thief', matches: 1 },
      ]),
    );
    expect(st.byDifficulty).toEqual(expect.arrayContaining([{ difficulty: 'normal', matches: 2 }]));
    expect(st.wins.find((w) => w.side === 'police' && w.difficulty === 'normal')).toMatchObject({ rate: 1, matches: 1 });
    expect(st.carsUsed).toEqual(
      expect.arrayContaining([
        { car: 'viatura', matches: 2 },
        { car: 'seda', matches: 2 },
      ]),
    );
    expect(st.carsBought).toEqual([{ car: 'esportivo', count: 1 }]); // the admin's free pick does not count
    expect(st.itemsBought).toEqual([{ kind: 'paint', count: 1 }]);
    expect(st.duration.find((d) => d.mode === 'pursuit')!.seconds).toBeCloseTo(50);
    expect(st.versions).toEqual(
      expect.arrayContaining([
        { version: '0.28.0', players: 1 },
        { version: '0.27.0', players: 1 },
      ]),
    );
    expect(st.clients).toEqual(
      expect.arrayContaining([
        { client: 'play', players: 1 },
        { client: 'web', players: 1 },
      ]),
    );
    expect(st.daily).toHaveLength(30);
    expect(st.daily.at(-1)).toEqual({ day: '2026-10-12', accounts: 3, active: 3 });
  });

  it('retention: of the accounts created in the period, who came back the day after', async () => {
    s.deps.now = () => new Date('2026-10-01T15:00:00Z');
    const ana = await s.login('ana', 'Ana');
    await s.login('bia', 'Bia');
    s.deps.now = () => new Date('2026-10-02T15:00:00Z');
    await post(ana, [{ id: 'ev-ses-0100', type: 'session_start', at: '2026-10-02T15:00:00Z', data: {} }]);
    s.deps.now = () => new Date(NOW);
    const diogo = await s.loginEmail('g-diogo', 'diogotocci@gmail.com', 'Diogo');
    const st = await stats(diogo);
    expect(st.retention.d1).toBeCloseTo(0.5); // ana came back, bia did not (Diogo signed in today: not a day old)
    expect(st.retention.d30).toBeNull();
  });

  it('deleting an account keeps its events with no link to the person, plus an account_deleted event', async () => {
    const ana = await s.login('ana', 'Ana');
    await post(ana, [match()]);
    await accountDelete(req('/api/account', 'DELETE', { confirm: 'Ana' }, ana), s.deps);
    const rows = await s.pg.query<{ type: string; user_id: string | null }>('select type, user_id from events order by id');
    expect(rows.rows.map((r) => r.type)).toEqual(['account_created', 'username_set', 'match_end', 'account_deleted']);
    expect(rows.rows.every((r) => r.user_id === null)).toBe(true);
  });
});

describe('event data is cleaned', () => {
  it('only known fields within bounds are kept: no personal data, no numbers that would break the sums', async () => {
    const ana = await s.login('ana', 'Ana');
    const huge = match({ time: 1e308 });
    const res = await post(ana, [
      huge,
      { id: 'ev-buy-0100', type: 'purchase', at: NOW, data: { item: 'car:blazer', price: 9000, admin: 'x', email: 'ana@example.com' } },
      { id: 'ev-ses-0100', type: 'session_start', at: NOW, data: { name: 'Ana Maria' } },
    ]);
    expect(await res.json()).toEqual({ saved: 2 }); // the huge match is dropped
    const rows = await s.pg.query<{ type: string; data: unknown }>(
      `select type, data from events where type in ('purchase', 'session_start') order by id`,
    );
    expect(rows.rows.map((r) => r.data)).toEqual([{ item: 'car:blazer', price: 9000 }, {}]);
    const diogo = await s.loginEmail('g-diogo', 'diogotocci@gmail.com', 'Diogo');
    expect((await adminStatsGet(req('/api/admin/stats', 'GET', undefined, diogo), s.deps)).status).toBe(200);
  });
});
