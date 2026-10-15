// Reports of a username from the global ranking (Play user-generated content policy): saved for review, nothing else yet.
import type { Db } from './db.js';
import { isAdminEmail } from './users.js';

/** reports one player can send in 24 hours */
export const REPORTS_PER_DAY = 30;

export type ReportResult = 'ok' | 'self' | 'unknown' | 'limit';

/** Saves a report of `username` by `reporterId`. Reporting the same player again changes nothing. */
export async function reportName(db: Db, reporterId: string, username: string, now = new Date()): Promise<ReportResult> {
  const [target] = await db.query<{ id: string | number; username: string; email: string }>(
    `select id, username, email from users where username_lower = $1 and banned_at is null`,
    [username.trim().toLowerCase()],
  );
  if (!target || isAdminEmail(target.email)) return 'unknown'; // the admin's own name is not up for review
  if (String(target.id) === reporterId) return 'self';
  const [done] = await db.query(`select 1 from reports where reporter_id = $1 and reported_id = $2`, [reporterId, target.id]);
  if (done) return 'ok';
  const [recent] = await db.query<{ n: unknown }>(
    `select count(*) as n from reports where reporter_id = $1 and created_at > $2::timestamptz - interval '24 hours'`,
    [reporterId, now.toISOString()],
  );
  if (Number(recent?.n ?? 0) >= REPORTS_PER_DAY) return 'limit';
  await db.query(
    `insert into reports (reporter_id, reported_id, username, created_at) values ($1, $2, $3, $4)
     on conflict (reporter_id, reported_id) do nothing`,
    [reporterId, target.id, target.username, now.toISOString()],
  );
  return 'ok';
}

/** the players `reporterId` already reported, among `ids` */
export async function reportedAmong(db: Db, reporterId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db.query<{ id: string | number }>(
    `select reported_id as id from reports where reporter_id = $1 and reported_id::text = any($2::text[])`,
    [reporterId, ids],
  );
  return new Set(rows.map((r) => String(r.id)));
}
