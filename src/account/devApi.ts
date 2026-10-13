// Fake account server for localhost only (spec §11): e2e tests and local play run without Google and without a database.
// It keeps its "server" in localStorage so a reload sees the same account. Without ?login it starts already signed in
// as a test account with a username, so the old e2e tests go straight to the title; ?login starts signed out to test the gate.
import { mergeProfiles } from '../meta/merge';
import { parseProfile, type Profile } from '../meta/profile';
import { better, GLOBAL_TOP, plausible, type GlobalRow, type RecordIn } from '../meta/records';
import { usernameProblem } from '../meta/username';
import { demoStats } from './devStats';
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
    if (!s.signedIn) throw new SignedOutError();
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
      const account = { ...s.account, username: name };
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
      const best = bestOf(records, r);
      return Promise.resolve({ pos: best ? 1 : null, best: best?.matchId === r.matchId });
    },
    sendEvents(events) {
      const s = signedIn();
      save({ ...s, events: (s.events ?? 0) + events.length });
      return Promise.resolve();
    },
    // localhost shows example numbers to every account (the real server shows them only to the admin)
    adminStats: (days) => Promise.resolve(demoStats(days)),
    ranking(mode, side, difficulty) {
      const s = load();
      const best = s.signedIn && s.account.username ? bestOf(s.records ?? [], { mode, side, difficulty }) : undefined;
      const row: GlobalRow[] = best
        ? [{ pos: 1, username: s.account.username!, time: best.time, hp: best.hp, how: best.how, car: best.car, rank: best.rank, me: true }]
        : [];
      return Promise.resolve({ rows: row.slice(0, GLOBAL_TOP) });
    },
  };
}

/** the best shown record of one board (the fake's only player) */
function bestOf(list: (RecordIn & { suspect: boolean })[], b: Pick<RecordIn, 'mode' | 'side' | 'difficulty'>) {
  return list
    .filter((x) => !x.suspect && x.mode === b.mode && x.side === b.side && x.difficulty === b.difficulty)
    .reduce<(RecordIn & { suspect: boolean }) | undefined>((top, x) => (!top || better(b.mode, b.side, x, top) ? x : top), undefined);
}
