// V3 delivery 2 (spec §5): the global ranking against PGlite.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountDelete, eventsPost, rankingGet, recordPost } from '../../api/_lib/http';
import type { GlobalBoard, RecordIn } from '../../src/meta/records';
import { req, testServer } from './helpers';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });
let s: Awaited<ReturnType<typeof testServer>>;
beforeAll(async () => (s = await testServer()));
beforeEach(async () => {
  await s.reset();
  s.deps.now = () => new Date('2026-10-12T12:00:00Z');
});

let n = 0;
const rec = (o: Partial<RecordIn> = {}): RecordIn => ({
  matchId: `match-${(n++).toString().padStart(6, '0')}`,
  mode: 'pursuit',
  side: 'police',
  difficulty: 'normal',
  time: 40,
  hp: 80,
  car: 'viatura',
  rank: 2,
  endedAt: new Date(Date.parse('2026-10-01T00:00:00Z') + n * 600_000).toISOString(),
  sentAt: '2026-10-12T12:00:00Z', // the phone clock agrees with the server here
  ev: true, // a 0.28 phone: the match_end event goes first
  ...o,
});
/** the phone sends the match_end event first (delivery 3), then the record */
const event = (r: RecordIn, o: Record<string, unknown> = {}) => ({
  id: `ev-${r.matchId}`,
  type: 'match_end',
  at: r.endedAt,
  data: {
    matchId: r.matchId,
    mode: r.mode,
    side: r.side,
    difficulty: r.difficulty,
    car: r.car,
    won: r.how !== 'caught',
    time: r.time,
    level: 3,
    coins: 50,
    ...o,
  },
});
const send = async (cookie: string, r: RecordIn, withEvent = true) => {
  if (withEvent)
    await eventsPost(req('/api/events', 'POST', { events: [event(r)], context: { version: '0.28.0' }, sentAt: r.sentAt }, cookie), s.deps);
  return (await recordPost(req('/api/records', 'POST', r, cookie), s.deps)).json() as Promise<{ pos: number | null; best: boolean }>;
};
const board = async (q = 'mode=pursuit&side=police&difficulty=normal', cookie?: string) =>
  (await rankingGet(req(`/api/ranking?${q}`, 'GET', undefined, cookie), s.deps)).json() as Promise<GlobalBoard>;

describe('global ranking', () => {
  it("every match is its own line (a player can appear many times); the answer is this match's place", async () => {
    const ana = await s.login('ana', 'Ana');
    const bia = await s.login('bia', 'Bia_191');
    expect(await send(ana, rec({ time: 50 }))).toEqual({ pos: 1, best: true });
    expect(await send(bia, rec({ time: 30, car: 'esportivo' }))).toEqual({ pos: 1, best: true });
    expect(await send(ana, rec({ time: 60 }))).toEqual({ pos: 3, best: false }); // slower than her 0:50
    expect(await send(ana, rec({ time: 20 }))).toEqual({ pos: 1, best: true });
    const b = await board();
    expect(b.rows.map((r) => [r.pos, r.username, r.time])).toEqual([
      [1, 'Ana', 20],
      [2, 'Bia_191', 30],
      [3, 'Ana', 50],
      [4, 'Ana', 60],
    ]);
    expect(b.rows[1]).toMatchObject({ car: 'esportivo', rank: 2 });
    const mine = (await board(undefined, ana)).rows;
    expect(mine.filter((r) => r.me).map((r) => r.pos)).toEqual([1, 3, 4]);
  });

  it('thief boards: fastest win with more life first; Sobrevivência thief: longest time alive first', async () => {
    const ana = await s.login('ana', 'Ana');
    const bia = await s.login('bia', 'Bia');
    await send(ana, rec({ side: 'thief', car: 'seda', how: 'escape', time: 90, hp: 20 }));
    await send(bia, rec({ side: 'thief', car: 'seda', how: 'escape', time: 90, hp: 70 }));
    expect((await board('mode=pursuit&side=thief&difficulty=normal')).rows.map((r) => r.username)).toEqual(['Bia', 'Ana']);
    await send(ana, rec({ mode: 'survival', side: 'thief', car: 'seda', how: 'caught', time: 300, hp: 0 }));
    await send(bia, rec({ mode: 'survival', side: 'thief', car: 'seda', how: 'caught', time: 120, hp: 0 }));
    expect((await board('mode=survival&side=thief&difficulty=normal')).rows.map((r) => r.username)).toEqual(['Ana', 'Bia']);
  });

  it('a phone clock that is off does not matter: the server counts from when the phone sent it', async () => {
    const ana = await s.login('ana', 'Ana');
    // the phone thinks it is 2030; the match ended 5 minutes before it was sent
    expect(await send(ana, rec({ endedAt: '2030-01-01T10:00:00Z', sentAt: '2030-01-01T10:05:00Z' }))).toEqual({ pos: 1, best: true });
    // offline: two matches sent together hours later keep their spacing
    const bia = await s.login('bia', 'Bia');
    expect(await send(bia, rec({ time: 60, endedAt: '2026-10-12T08:00:00Z', sentAt: '2026-10-12T11:59:00Z' }))).toMatchObject({ pos: 2 });
    expect(await send(bia, rec({ time: 30, endedAt: '2026-10-12T08:05:00Z', sentAt: '2026-10-12T11:59:01Z' }))).toEqual({
      pos: 1,
      best: true,
    });
  });

  it('records that cannot be real are kept as suspect and never shown', async () => {
    const ana = await s.login('ana', 'Ana');
    const bad = [
      rec({ side: 'thief', car: 'seda', how: 'escape', time: 4 }), // escape before 1:30 (the debug ?escape)
      rec({ time: 0.2 }), // too fast
      rec({ car: 'seda' }), // a thief car on the police board
      rec({ rank: 9 }),
      rec({ endedAt: '2026-10-12T12:00:00Z', sentAt: '2026-10-12T11:00:00Z' }), // sent before it ended
      rec({ endedAt: '2026-08-01T00:00:00Z' }), // sat offline for months
    ];
    for (const r of bad) expect(await send(ana, r)).toEqual({ pos: null, best: false });
    expect((await board()).rows).toEqual([]);
    const left = await s.pg.query<{ n: number }>('select count(*)::int as n from records where suspect');
    expect(left.rows[0]!.n).toBe(bad.length);
  });

  it('a match that ended sooner after the previous one than it lasted is suspect; the same match twice counts once', async () => {
    const ana = await s.login('ana', 'Ana');
    const first = rec({ time: 60, endedAt: '2026-10-12T11:00:00Z' });
    await send(ana, first);
    expect(await send(ana, rec({ time: 50, endedAt: '2026-10-12T11:00:20Z' }))).toEqual({ pos: null, best: false });
    // a huge number is refused outright (it would not fit the database)
    expect((await recordPost(req('/api/records', 'POST', rec({ hp: 1e12 }), ana), s.deps)).status).toBe(400);
    expect(await send(ana, first)).toEqual({ pos: 1, best: true }); // resent from the offline queue: no new row
    const rows = await s.pg.query<{ n: number }>('select count(*)::int as n from records');
    expect(rows.rows[0]!.n).toBe(2);
  });

  it("top 30 matches; the player's best line comes below when none made it; no username or signed out: not on it", async () => {
    const cookies: string[] = [];
    for (let i = 0; i < 31; i++) cookies.push(await s.login(`p${i}`, `Jogador${i}`));
    for (let i = 0; i < 31; i++) await send(cookies[i]!, rec({ time: 10 + i * 0.5 }));
    await send(cookies[30]!, rec({ time: 40 })); // a worse match of the same player: his best is the one shown below
    const nameless = await s.login('semnome');
    await send(nameless, rec({ time: 5 }));
    const b = await board(undefined, cookies[30]);
    expect(b.rows).toHaveLength(30);
    expect(b.me).toMatchObject({ pos: 31, username: 'Jogador30', time: 25, me: true });
    expect((await board()).me).toBeUndefined();
    // a match outside the top still gets its place
    expect(await send(cookies[30]!, rec({ time: 45 }))).toEqual({ pos: 33, best: false });
  });

  it('delivery 3: a record shows only when the match_end event of the same match agrees with it', async () => {
    const ana = await s.login('ana', 'Ana');
    expect(await send(ana, rec({ time: 40 }), false)).toEqual({ pos: null, best: false }); // no event
    const r = rec({ time: 30 });
    await eventsPost(req('/api/events', 'POST', { events: [event(r, { time: 55 })], sentAt: r.sentAt }, ana), s.deps); // other time
    expect(await send(ana, r, false)).toEqual({ pos: null, best: false });
    const old = rec({ time: 20, matchId: 'legacy-0001', ev: undefined }); // a 0.27 phone sends no event
    await send(ana, old, false);
    expect((await board()).rows.map((x) => x.time)).toEqual([20]);
  });

  it('prestige stars (0.37.0) show next to the rank; older phones send none; more than 10 is suspect', async () => {
    const ana = await s.login('ana', 'Ana');
    const bia = await s.login('bia', 'Bia_191');
    await send(ana, rec({ time: 40, prestige: 2 }));
    await send(bia, rec({ time: 45 })); // an older phone: no prestige field
    await send(bia, rec({ time: 30, prestige: 11 }));
    const rows = (await board()).rows;
    expect(rows.map((r) => [r.username, r.prestige])).toEqual([
      ['Ana', 2],
      ['Bia_191', undefined],
    ]);
    expect((await recordPost(req('/api/records', 'POST', rec({ prestige: 1.5 }), ana), s.deps)).status).toBe(400);
  });

  it('deleting the account takes its records off the boards; bad requests are refused', async () => {
    const ana = await s.login('ana', 'Ana');
    await send(ana, rec());
    await accountDelete(req('/api/account', 'DELETE', { confirm: 'Ana' }, ana), s.deps);
    expect((await board()).rows).toEqual([]);
    expect((await rankingGet(req('/api/ranking?mode=x&side=police&difficulty=normal'), s.deps)).status).toBe(400);
    const bia = await s.login('bia', 'Bia');
    expect((await recordPost(req('/api/records', 'POST', { matchId: 'x' }, bia), s.deps)).status).toBe(400);
    expect((await recordPost(req('/api/records', 'POST', rec()), s.deps)).status).toBe(401);
  });
});
