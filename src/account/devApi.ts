// Fake account server for localhost only (spec §11): e2e tests and local play run without Google and without a database.
// It keeps its "server" in localStorage so a reload sees the same account. Without ?login it starts already signed in
// as a test account with a username, so the old e2e tests go straight to the title; ?login starts signed out to test the gate.
import { mergeProfiles } from '../meta/merge';
import { parseProfile, type Profile } from '../meta/profile';
import { better, GLOBAL_TOP, plausible, type GlobalRow, type RecordIn } from '../meta/records';
import { usernameProblem } from '../meta/username';
import { demoAct, demoModeration, demoStats } from './devStats';
import type { ModerationView } from '../meta/moderation';
import { SignedOutError, type Account, type AccountApi, type Stored } from './api';

export const DEV_API_KEY = 'pl.dev.api';
/** usernames the fake treats as already taken by someone else */
export const DEV_TAKEN = ['policial', 'ladrao'];

interface DevServer {
  signedIn: boolean;
  account: Account;
  profile: Profile | null;
  rev: number;
  /** V3 delivery 2: this test account's records (the fake has no other players) */
  records?: (RecordIn & { suspect: boolean })[];
  /** V3 delivery 3: how many usage events arrived (the fake only counts them) */
  events?: number;
  /** other players shown on every board (none unless a test seeds them) */
  rivals?: GlobalRow[];
  /** the names this account reported */
  reported?: string[];
  /** the /admin "Denúncias" tab (example data until the first decision) */
  moderation?: ModerationView;
}

const testAccount = (username: string | null): Account => ({
  id: 'dev-1',
  email: 'teste@exemplo.com',
  name: 'Conta de Teste',
  picture: '',
  username,
});

/** true where the fake is used: the dev server and the e2e preview on this computer, unless ?realapi */
export const useDevApi = (loc: { hostname: string; search: string }) =>
  (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') && !new URLSearchParams(loc.search).has('realapi');

export function devApi(storage: Storage | undefined, opts: { startSignedOut: boolean }): AccountApi {
  let mem: DevServer | undefined;
  const load = (): DevServer => {
    if (mem) return mem;
    try {
      const raw = storage?.getItem(DEV_API_KEY);
      if (raw) return (mem = JSON.parse(raw) as DevServer);
    } catch {
      // unreadable: start over
    }
    mem = opts.startSignedOut
      ? { signedIn: false, account: testAccount(null), profile: null, rev: 0 }
      : { signedIn: true, account: testAccount('Teste'), profile: null, rev: 0 };
    return mem;
  };
  const save = (s: DevServer) => {
    mem = s;
    try {
      storage?.setItem(DEV_API_KEY, JSON.stringify(s));
    } catch {
      // the fake still works in memory
    }
  };
  const signedIn = () => {
    const s = load();
    if (!s.signedIn || s.account.banned) throw new SignedOutError(); // banned: like the server, only /api/me answers
    return s;
  };
  const issue = (name: string) => usernameProblem(name) ?? (DEV_TAKEN.includes(name.toLowerCase()) ? ('taken' as const) : null);
  return {
    clientId: () => Promise.resolve('dev'),
    me: () => Promise.resolve(load().signedIn ? load().account : null),
    signIn() {
      const s = load();
      save({ ...s, signedIn: true });
      return Promise.resolve(s.account);
    },
    signOut() {
      save({ ...load(), signedIn: false });
      return Promise.resolve();
    },
    checkUsername: (name) => Promise.resolve(issue(name)),
    setUsername(name) {
      const s = signedIn();
      const problem = issue(name);
      if (problem) return Promise.resolve({ problem });
      const { notice: _gone, ...rest } = s.account;
      const account = { ...rest, username: name };
      save({ ...s, account });
      return Promise.resolve({ account });
    },
    getProfile: () => Promise.resolve<Stored>({ data: signedIn().profile, rev: signedIn().rev }),
    putProfile(data, baseRev) {
      const s = signedIn();
      const incoming = parseProfile(JSON.parse(JSON.stringify(data)));
      if (!incoming) return Promise.reject(new Error('invalid'));
      const merged = s.profile && s.rev !== baseRev ? mergeProfiles(s.profile, incoming) : incoming;
      save({ ...s, profile: merged, rev: s.rev + 1 });
      return Promise.resolve({ data: merged, rev: s.rev + 1 });
    },
    deleteAccount(confirm) {
      const s = signedIn();
      if (confirm.trim().toLowerCase() !== (s.account.username ?? s.account.email).toLowerCase()) return Promise.resolve(false);
      // a deleted account comes back as a brand new one on the next sign-in
      save({ signedIn: false, account: { ...testAccount(null), id: `dev-${Date.now()}` }, profile: null, rev: 0, records: [] });
      return Promise.resolve(true);
    },
    submitRecord(r) {
      const s = signedIn();
      const records = s.records ?? [];
      if (!records.some((x) => x.matchId === r.matchId)) records.push({ ...r, suspect: !plausible(r) });
      save({ ...s, records });
      // every match is its own line (like the server); the rivals seeded by tests share the board
      const at = boardOf({ ...s, records }, r).findIndex((x) => x.matchId === r.matchId);
      const best = bestOf(records, r);
      return Promise.resolve({ pos: at < 0 ? null : at + 1, best: best?.matchId === r.matchId });
    },
    async reportName(username) {
      const s = signedIn(); // async: signed out answers a rejected promise, like the real server
      const name = (s.rivals ?? []).find((r) => r.username.toLowerCase() === username.toLowerCase())?.username;
      if (!name) return 'unknown';
      save({ ...s, reported: [...new Set([...(s.reported ?? []), name])] });
      return 'ok';
    },
    sendEvents(events) {
      const s = signedIn();
      save({ ...s, events: (s.events ?? 0) + events.length });
      return Promise.resolve();
    },
    // localhost shows example numbers to every account (the real server shows them only to the admin)
    adminStats: (days) => Promise.resolve(demoStats(days)),
    adminReports: () => Promise.resolve(load().moderation ?? demoModeration()),
    adminAct(userId, action) {
      const s = load();
      const v = demoAct(s.moderation ?? demoModeration(), userId, action);
      if (v !== 'unknown') save({ ...s, moderation: v });
      return Promise.resolve(v);
    },
    ranking(mode, side, difficulty) {
      const rows = boardOf(load(), { mode, side, difficulty }).map(({ matchId: _id, ...r }) => r);
      const top = rows.slice(0, GLOBAL_TOP);
      const mine = top.some((r) => r.me) ? undefined : rows.find((r) => r.me);
      return Promise.resolve(mine ? { rows: top, me: mine } : { rows: top });
    },
  };
}

/** the best shown record of one board (the fake's only player) */
function bestOf(list: (RecordIn & { suspect: boolean })[], b: Pick<RecordIn, 'mode' | 'side' | 'difficulty'>) {
  return list
    .filter((x) => !x.suspect && x.mode === b.mode && x.side === b.side && x.difficulty === b.difficulty)
    .reduce<(RecordIn & { suspect: boolean }) | undefined>((top, x) => (!top || better(b.mode, b.side, x, top) ? x : top), undefined);
}

/** One board of the fake: the seeded rivals plus every shown match of the test account, each its own line. */
function boardOf(s: DevServer, b: Pick<RecordIn, 'mode' | 'side' | 'difficulty'>): (GlobalRow & { matchId?: string })[] {
  const reported = new Set(s.signedIn ? s.reported : []);
  const mine: (GlobalRow & { matchId: string })[] =
    s.signedIn && s.account.username
      ? (s.records ?? [])
          .filter((x) => !x.suspect && x.mode === b.mode && x.side === b.side && x.difficulty === b.difficulty)
          .map((x) => ({
            pos: 0,
            username: s.account.username!,
            time: x.time,
            hp: x.hp,
            how: x.how,
            car: x.car,
            rank: x.rank,
            me: true,
            matchId: x.matchId,
          }))
      : [];
  return [...(s.rivals ?? []).map((r) => (reported.has(r.username) ? { ...r, reported: true } : r)), ...mine]
    .sort((x, y) => (better(b.mode, b.side, x, y) ? -1 : better(b.mode, b.side, y, x) ? 1 : 0))
    .map((r, i) => ({ ...r, pos: i + 1 }));
}
