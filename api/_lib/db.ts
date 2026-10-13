// Database access (V3 part 1): Postgres on Neon in production; any driver with the same `query` works (PGlite in tests).
import { neon } from '@neondatabase/serverless';

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

/** Neon over HTTP: one round trip per query, nothing kept open between function calls. */
export function neonDb(url: string): Db {
  const sql = neon(url);
  return { query: async <T>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] };
}

const SCHEMA = [
  `create table if not exists users (
    id bigserial primary key,
    google_sub text unique not null,
    email text not null,
    name text not null default '',
    picture text not null default '',
    username text,
    username_lower text unique,
    username_changed_at timestamptz,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
  )`,
  `create table if not exists profiles (
    user_id bigint primary key references users(id) on delete cascade,
    data jsonb not null,
    rev integer not null default 1,
    updated_at timestamptz not null default now()
  )`,
  // V3 delivery 2: the global ranking. One row per match; the boards show each player's best (suspect rows never show).
  `create table if not exists records (
    id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    match_id text not null,
    mode text not null,
    side text not null,
    difficulty text not null,
    time_ms integer not null,
    hp integer not null,
    how text,
    car text not null,
    rank integer not null,
    suspect boolean not null default false,
    ended_at timestamptz not null,
    created_at timestamptz not null default now(),
    unique (user_id, match_id)
  )`,
  // V3 delivery 3: usage events for the /admin panel. Deleting the account keeps them, with no link to the person.
  `create table if not exists events (
    id bigserial primary key,
    event_id text not null,
    user_id bigint references users(id) on delete set null,
    type text not null,
    data jsonb not null default '{}',
    app_version text,
    client text,
    match_id text,
    created_at timestamptz not null,
    unique (user_id, event_id)
  )`,
  `create index if not exists events_type on events (type, created_at)`,
  `create index if not exists events_user on events (user_id, created_at)`,
  `create index if not exists events_match on events (user_id, match_id) where match_id is not null`,
  // records sent from 0.28 on must match their match_end event to show (older ones keep showing)
  `alter table records add column if not exists needs_event boolean not null default false`,
  `create index if not exists records_board on records (mode, side, difficulty) where not suspect`,
  `create index if not exists records_user on records (user_id, ended_at desc)`,
];

const ready = new WeakMap<Db, Promise<void>>();
/** Creates the tables once per database handle (cheap `if not exists`; Neon runs one statement per query). */
export function ensureSchema(db: Db): Promise<void> {
  let p = ready.get(db);
  if (!p) {
    p = (async () => {
      for (const s of SCHEMA) await db.query(s);
    })().catch((e: unknown) => {
      ready.delete(db); // two cold starts racing on "create table": the next request tries again
      throw e;
    });
    ready.set(db, p);
  }
  return p;
}

let shared: Db | undefined;
/** The production database (DATABASE_URL); undefined without the variable (local dev). */
export function prodDb(): Db | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  return (shared ??= neonDb(url));
}
