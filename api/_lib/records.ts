// The global ranking in the database (V3 delivery 2, spec §5): records go up with the end of each match, the boards show
// each player's best, top 100, plus the player's own line.
import { GLOBAL_TOP, longestFirst, plausible, type GlobalBoard, type GlobalRow, type RecordIn } from '../../src/meta/records.js';
import type { Difficulty, Mode, Role } from '../../src/config/balance.js';
import type { Db } from './db.js';
import { reportedAmong } from './reports.js';

/** ORDER BY of a board, from a fixed list (never from the request) */
const order = (mode: Mode, side: Role) =>
  longestFirst(mode, side)
    ? 'time_ms desc, hp desc, ended_at, id'
    : side === 'thief'
      ? 'time_ms, hp desc, ended_at, id'
      : 'time_ms, ended_at, id';

interface Row {
  pos: string | number;
  user_id: string | number;
  username: string;
  time_ms: number;
  hp: number;
  how: string | null;
  car: string;
  rank: number;
  id: string | number;
}

/** Every player's best on one board, ranked; `onlyTop` plus the given player's line. */
async function ranked(db: Db, where: { mode: Mode; side: Role; difficulty: Difficulty }, me?: string): Promise<Row[]> {
  const ord = order(where.mode, where.side);
  return db.query<Row>(
    `with best as (
       select distinct on (r.user_id) r.id, r.user_id, u.username, r.time_ms, r.hp, r.how, r.car, r.rank, r.ended_at
       from records r join users u on u.id = r.user_id
       where r.mode = $1 and r.side = $2 and r.difficulty = $3 and not r.suspect and u.username is not null
         -- delivery 3: the record must match the match_end event of the same match (sent just before it)
         and (not r.needs_event or exists (
           select 1 from events e where e.user_id = r.user_id and e.type = 'match_end' and e.match_id = r.match_id
             and e.data->>'mode' = r.mode and e.data->>'side' = r.side and e.data->>'difficulty' = r.difficulty
             and abs((e.data->>'time')::float8 * 1000 - r.time_ms) <= 5 and (e.data->>'won')::boolean = (r.how is distinct from 'caught')
         ))
       order by r.user_id, ${ord}
     ), pos as (select *, row_number() over (order by ${ord}) as pos from best)
     select pos, user_id, username, time_ms, hp, how, car, rank, id from pos
     where pos <= $4 or user_id::text = $5 order by pos`,
    [where.mode, where.side, where.difficulty, GLOBAL_TOP, me ?? ''],
  );
}

const toRow = (r: Row, me?: string): GlobalRow => ({
  pos: Number(r.pos),
  username: r.username,
  time: r.time_ms / 1000,
  hp: r.hp,
  ...(r.how ? { how: r.how as GlobalRow['how'] } : {}),
  car: r.car,
  rank: r.rank,
  ...(me !== undefined && String(r.user_id) === me ? { me: true } : {}),
});

export async function board(db: Db, where: { mode: Mode; side: Role; difficulty: Difficulty }, me?: string): Promise<GlobalBoard> {
  const raw = await ranked(db, where, me);
  const reported = me
    ? await reportedAmong(
        db,
        me,
        raw.map((r) => String(r.user_id)),
      )
    : new Set<string>();
  const rows = raw.map((r) => (reported.has(String(r.user_id)) ? { ...toRow(r, me), reported: true } : toRow(r, me)));
  const top = rows.filter((r) => r.pos <= GLOBAL_TOP);
  const mine = rows.find((r) => r.me && r.pos > GLOBAL_TOP);
  return mine ? { rows: top, me: mine } : { rows: top };
}

export interface Submitted {
  /** the player's position on that board now (null: not on it, e.g. the record is suspect) */
  pos: number | null;
  /** this match is the player's best on that board */
  best: boolean;
}

/** a record that sat offline longer than this is not trusted */
const MAX_AGE_DAYS = 30;

/**
 * Saves a record. Suspect (kept, never shown) when the numbers are not believable, when it ended sooner after the
 * player's previous match than the match itself lasts, or when it says it was sent before it ended or long after.
 * Sending the same match again changes nothing.
 */
export async function submit(db: Db, userId: string, r: RecordIn, now = new Date()): Promise<Submitted> {
  // when the match ended, on the server's clock: now minus how long ago it ended by the phone's own clock
  const ago = (Date.parse(r.sentAt ?? r.endedAt) - Date.parse(r.endedAt)) / 1000;
  const ended = new Date(now.getTime() - Math.max(0, ago) * 1000);
  const prev = (
    await db.query<{ ended_at: string | Date }>(
      `select ended_at from records where user_id = $1 and ended_at <= $2 and match_id <> $3 order by ended_at desc limit 1`,
      [userId, ended.toISOString(), r.matchId],
    )
  )[0];
  const gap = prev ? (ended.getTime() - new Date(prev.ended_at).getTime()) / 1000 : Infinity;
  const suspect = !plausible(r) || gap < r.time * 0.8 || ago < 0 || ago > MAX_AGE_DAYS * 86400;
  const inserted = await db.query<{ id: string | number }>(
    `insert into records (user_id, match_id, mode, side, difficulty, time_ms, hp, how, car, rank, suspect, ended_at, needs_event)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     on conflict (user_id, match_id) do nothing returning id`,
    [
      userId,
      r.matchId,
      r.mode,
      r.side,
      r.difficulty,
      Math.round(r.time * 1000),
      Math.round(r.hp),
      r.how ?? null,
      r.car,
      r.rank,
      suspect,
      ended.toISOString(),
      r.ev === true, // older phones send no match_end event: their records are not held back for it
    ],
  );
  const id =
    inserted[0]?.id ??
    (await db.query<{ id: string | number }>(`select id from records where match_id = $1 and user_id = $2`, [r.matchId, userId]))[0]?.id;
  const mine = (await ranked(db, r, userId)).find((x) => String(x.user_id) === userId);
  return { pos: mine ? Number(mine.pos) : null, best: mine !== undefined && id !== undefined && String(mine.id) === String(id) };
}
