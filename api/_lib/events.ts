// Usage events and the /admin panel numbers (V3 delivery 3, spec §6). Days are counted in Brasília time.
import type { AdminStats, ClientEvent, EventContext } from '../../src/meta/events.js';
import type { Db } from './db.js';

const TZ = 'America/Sao_Paulo';
/** an event that sat offline longer than this is dropped */
const MAX_AGE_DAYS = 30;

/** Events written by the server itself (no phone involved). `userId` null: the account no longer exists. */
export async function serverEvent(
  db: Db,
  userId: string | null,
  type: 'account_created' | 'username_set' | 'account_deleted',
  now = new Date(),
) {
  await db.query(`insert into events (event_id, user_id, type, data, created_at) values ($1, $2, $3, '{}', $4)`, [
    `srv-${type}-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    userId,
    type,
    now.toISOString(),
  ]);
}

/**
 * Saves a batch from a phone. Each event is placed on the server's clock from how long before sending it happened
 * (the phone's clock may be off). The same event sent twice counts once. Returns how many were new.
 */
export async function saveEvents(
  db: Db,
  userId: string,
  list: ClientEvent[],
  ctx: EventContext,
  sentAt: string | undefined,
  now = new Date(),
) {
  const sent = sentAt && !Number.isNaN(Date.parse(sentAt)) ? Date.parse(sentAt) : now.getTime();
  let saved = 0;
  for (const e of list) {
    const ago = Math.max(0, (sent - Date.parse(e.at)) / 1000);
    if (ago > MAX_AGE_DAYS * 86400) continue;
    const matchId = e.type === 'match_end' && typeof e.data.matchId === 'string' ? e.data.matchId : null;
    const rows = await db.query(
      `insert into events (event_id, user_id, type, data, app_version, client, match_id, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (user_id, event_id) do nothing returning id`,
      [e.id, userId, e.type, JSON.stringify(e.data), ctx.version, ctx.client, matchId, new Date(now.getTime() - ago * 1000).toISOString()],
    );
    saved += rows.length;
  }
  return saved;
}

const num = (v: unknown) => Number(v ?? 0);
const rate = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/** Everything the panel shows for the last `days` days. */
export async function adminStats(db: Db, days: number, now = new Date()): Promise<AdminStats> {
  const since = new Date(now.getTime() - days * 86400_000).toISOString();
  const at = now.toISOString();
  const q = <T>(sql: string, params: unknown[] = []) => db.query<T>(sql, params);
  const day = `(created_at at time zone '${TZ}')::date`;
  const today = `(($2::timestamptz) at time zone '${TZ}')::date`;

  const [acc] = await q<{ total: unknown; today: unknown }>(
    `select (select count(*) from users) as total,
            (select count(*) from events where type = 'account_created' and ${day} = ${today}) as today
     from (select $1::text as x) s`,
    [since, at],
  );
  const [act] = await q<{ today: unknown; week: unknown; before: unknown; month: unknown }>(
    `select count(distinct user_id) filter (where ${day} = ${today}) as today,
            count(distinct user_id) filter (where created_at > $2::timestamptz - interval '7 days') as week,
            count(distinct user_id) filter (where created_at <= $2::timestamptz - interval '7 days'
                                             and created_at > $2::timestamptz - interval '14 days') as before,
            count(distinct user_id) filter (where created_at > $2::timestamptz - interval '30 days') as month
     from events where user_id is not null and created_at > $1::timestamptz - interval '30 days'`,
    [since, at],
  );
  const [matches] = await q<{ total: unknown; players: unknown }>(
    `select count(*) as total, count(distinct user_id) as players from events where type = 'match_end' and created_at > $1`,
    [since],
  );
  // retention Dn: accounts old enough (created in the n days before the period, up to n days ago), active again exactly
  // n days after the day they were created. Each event is looked up by account and a one-day range (index events_user).
  const ret = await q<{ n: number; cohort: unknown; back: unknown }>(
    `select d.n, count(*) as cohort, count(*) filter (where exists (
         select 1 from events e where e.user_id = u.id
           and e.created_at >= ((u.created_at at time zone '${TZ}')::date + d.n) at time zone '${TZ}'
           and e.created_at < ((u.created_at at time zone '${TZ}')::date + d.n + 1) at time zone '${TZ}'
       )) as back
     from (values (1), (7), (30)) as d(n)
     join users u on u.created_at > $1::timestamptz - make_interval(days => d.n)
                 and (u.created_at at time zone '${TZ}')::date + d.n <= ${today}
     group by d.n`,
    [since, at],
  );
  const back = (n: number) => {
    const r = ret.find((x) => Number(x.n) === n);
    return r ? rate(num(r.back), num(r.cohort)) : null;
  };
  // one pass over the period's events, grouped by day, joined to every day so quiet days show as zero
  const daily = await q<{ day: string; accounts: unknown; active: unknown }>(
    `with days as (
       select generate_series((($1::timestamptz) at time zone '${TZ}')::date + 1, ${today}, interval '1 day')::date as day
     ), per as (
       select (created_at at time zone '${TZ}')::date as day,
              count(*) filter (where type = 'account_created') as accounts,
              count(distinct user_id) as active
       from events where created_at > $1 group by 1
     )
     select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(p.accounts, 0) as accounts, coalesce(p.active, 0) as active
     from days d left join per p on p.day = d.day order by d.day`,
    [since, at],
  );
  const match = `from events where type = 'match_end' and created_at > $1`;
  const byModeSide = await q<{ mode: string; side: string; n: unknown }>(
    `select data->>'mode' as mode, data->>'side' as side, count(*) as n ${match} group by 1, 2 order by n desc`,
    [since],
  );
  const byDifficulty = await q<{ difficulty: string; n: unknown }>(
    `select data->>'difficulty' as difficulty, count(*) as n ${match} group by 1`,
    [since],
  );
  const wins = await q<{ side: string; difficulty: string; won: unknown; n: unknown }>(
    `select data->>'side' as side, data->>'difficulty' as difficulty,
            count(*) filter (where (data->>'won')::boolean) as won, count(*) as n ${match} group by 1, 2`,
    [since],
  );
  const carsUsed = await q<{ car: string; n: unknown }>(
    `select data->>'car' as car, count(*) as n ${match} and data->>'car' is not null group by 1 order by n desc, 1 limit 8`,
    [since],
  );
  // the admin's free picks in the shop are not purchases
  const bought = `from events where type = 'purchase' and created_at > $1 and coalesce(data->>'admin', '') <> 'true'`;
  const carsBought = await q<{ car: string; n: unknown }>(
    `select substr(data->>'item', 5) as car, count(*) as n ${bought} and data->>'item' like 'car:%' group by 1 order by n desc, 1 limit 8`,
    [since],
  );
  const itemsBought = await q<{ kind: string; n: unknown }>(
    `select split_part(data->>'item', ':', 1) as kind, count(*) as n ${bought} and data->>'item' not like 'car:%' group by 1 order by n desc, 1 limit 8`,
    [since],
  );
  const duration = await q<{ mode: string; s: unknown }>(
    `select data->>'mode' as mode, avg((data->>'time')::float8) as s ${match} group by 1`,
    [since],
  );
  const session = `from events where type = 'session_start' and created_at > $1 and user_id is not null`;
  const versions = await q<{ v: string; n: unknown }>(
    `select coalesce(app_version, 'unknown') as v, count(distinct user_id) as n ${session} group by 1 order by n desc limit 6`,
    [since],
  );
  const clients = await q<{ c: string; n: unknown }>(
    `select coalesce(client, 'web') as c, count(distinct user_id) as n ${session} group by 1 order by n desc`,
    [since],
  );

  return {
    days,
    accounts: { total: num(acc?.total), today: num(acc?.today) },
    active: { today: num(act?.today), week: num(act?.week), weekBefore: num(act?.before), month: num(act?.month) },
    matches: { total: num(matches?.total), players: num(matches?.players) },
    retention: { d1: back(1), d7: back(7), d30: back(30) },
    daily: daily.map((d) => ({ day: d.day, accounts: num(d.accounts), active: num(d.active) })),
    byModeSide: byModeSide.map((r) => ({ mode: r.mode as never, side: r.side as never, matches: num(r.n) })),
    byDifficulty: byDifficulty.map((r) => ({ difficulty: r.difficulty as never, matches: num(r.n) })),
    wins: wins.map((r) => ({
      side: r.side as never,
      difficulty: r.difficulty as never,
      rate: num(r.won) / Math.max(1, num(r.n)),
      matches: num(r.n),
    })),
    carsUsed: carsUsed.map((r) => ({ car: r.car, matches: num(r.n) })),
    carsBought: carsBought.map((r) => ({ car: r.car, count: num(r.n) })),
    itemsBought: itemsBought.map((r) => ({ kind: r.kind, count: num(r.n) })),
    duration: duration.map((r) => ({ mode: r.mode as never, seconds: num(r.s) })),
    versions: versions.map((r) => ({ version: r.v, players: num(r.n) })),
    clients: clients.map((r) => ({ client: r.c, players: num(r.n) })),
  };
}
