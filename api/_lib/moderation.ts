// The /admin "Denúncias" tab on the database (spec docs/superpowers/specs/2026-10-15-denuncias-admin-design.md): the
// reported accounts waiting for a decision, the decisions taken, and the actions themselves.
import type { Decision, ModerationAction, ModerationView, PendingReport } from '../../src/meta/moderation.js';
import type { Db } from './db.js';
import { isAdminEmail } from './users.js';

/** decisions shown in the tab */
const HISTORY = 50;
/** reporters named on each line */
const BY = 3;

const iso = (v: unknown) => new Date(v as string).toISOString();

export async function moderationView(db: Db): Promise<ModerationView> {
  const pending = await db.query<{
    id: string | number;
    username: string | null;
    email: string;
    n: unknown;
    first: unknown;
    last: unknown;
    names: (string | null)[];
    by: (string | null)[];
  }>(
    `select u.id, u.username, u.email, count(*) as n, min(r.created_at) as first, max(r.created_at) as last,
            array_agg(r.username order by r.created_at desc) as names,
            array_agg(a.username order by r.created_at desc) as by
     from reports r join users u on u.id = r.reported_id join users a on a.id = r.reporter_id
     where u.banned_at is null
     group by u.id, u.username, u.email
     order by count(*) desc, max(r.created_at) desc`,
  );
  const decided = await db.query<{
    user_id: string | number | null;
    username: string | null;
    action: ModerationAction;
    reports: number;
    created_at: unknown;
    now_name: string | null;
    banned: boolean | null;
  }>(
    `select m.user_id, m.username, m.action, m.reports, m.created_at, u.username as now_name, u.banned_at is not null as banned
     from moderation m left join users u on u.id = m.user_id order by m.id desc limit ${HISTORY}`,
  );
  /** the latest ban of each account: only that line offers Desfazer while the account is still banned */
  const latestBan = new Set<string>();
  const undoable = (r: (typeof decided)[number]) => {
    if (r.action !== 'ban' || r.user_id === null || latestBan.has(String(r.user_id))) return false;
    latestBan.add(String(r.user_id));
    return r.banned === true;
  };
  return {
    // the admin's own account is never up for a decision (he cannot act on himself)
    pending: pending
      .filter((r) => !isAdminEmail(r.email))
      .map((r): PendingReport => {
        const as = r.names.find((x) => x && x.toLowerCase() !== (r.username ?? '').toLowerCase());
        return {
          userId: String(r.id),
          username: r.username,
          ...(as ? { reportedAs: as } : {}),
          count: Number(r.n),
          first: iso(r.first),
          last: iso(r.last),
          by: r.by.filter((x): x is string => !!x).slice(0, BY),
        };
      }),
    decided: decided.map((r): Decision => ({
      userId: r.user_id === null ? null : String(r.user_id),
      username: r.username,
      action: r.action,
      reports: r.reports,
      at: iso(r.created_at),
      ...(r.user_id !== null ? { nowName: r.now_name, banned: undoable(r) } : {}),
    })),
  };
}

export type ActResult = 'ok' | 'unknown' | 'forbidden';

/**
 * Takes a decision on an account. Every action but unban clears the account's reports from the queue (whoever reported
 * can report again later) and is written to the history with how many reports there were.
 */
export async function moderate(db: Db, userId: string, action: ModerationAction, now = new Date()): Promise<ActResult> {
  const [u] = await db.query<{ email: string; username: string | null; banned: boolean }>(
    `select email, username, banned_at is not null as banned from users where id = $1::bigint`,
    [userId],
  );
  if (!u) return 'unknown';
  if (isAdminEmail(u.email)) return 'forbidden';
  const at = now.toISOString();
  if (action === 'unban') {
    if (!u.banned) return 'ok';
    await db.query(`update users set banned_at = null where id = $1::bigint`, [userId]);
  } else if (action === 'ban') {
    if (!u.banned) await db.query(`update users set banned_at = $2 where id = $1::bigint`, [userId, at]);
  } else if (action === 'rename') {
    // the current name and every name it was reported as go to nobody again (a player may rename himself after being
    // reported); the player picks another one with a notice, without the 30-day wait
    const reported = await db.query<{ username: string }>(`select distinct username from reports where reported_id = $1::bigint`, [userId]);
    const names = new Set([u.username, ...reported.map((r) => r.username)].filter((x): x is string => !!x).map((x) => x.toLowerCase()));
    for (const name of names)
      await db.query(`insert into blocked_names (name_lower, created_at) values ($1, $2) on conflict do nothing`, [name, at]);
    if (u.username)
      await db.query(
        `update users set username = null, username_lower = null, username_changed_at = null, notice = $2 where id = $1::bigint`,
        [userId, u.username],
      );
  }
  const cleared = action === 'unban' ? [] : await db.query(`delete from reports where reported_id = $1::bigint returning id`, [userId]);
  await db.query(`insert into moderation (user_id, username, action, reports, created_at) values ($1, $2, $3, $4, $5)`, [
    userId,
    u.username,
    action,
    cleared.length,
    at,
  ]);
  return 'ok';
}
