// Example numbers for the /admin panel on localhost (the fake account server has no real players). Fixed, so the page
// and its tests look the same every time.
import type { AdminStats } from '../meta/events';
import type { Decision, ModerationAction, ModerationView } from '../meta/moderation';

export function demoStats(days: number, now = new Date()): AdminStats {
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 86400_000);
    const t = i / Math.max(1, days - 1);
    return {
      day: d.toISOString().slice(0, 10),
      accounts: Math.round(4 + 30 * t + (i % 3)),
      active: Math.round(10 + 120 * t + (i % 5) * 2),
    };
  });
  return {
    days,
    accounts: { total: 612, today: 38 },
    active: { today: 130, week: 300, weekBefore: 268, month: 488 },
    matches: { total: 9350, players: 488 },
    retention: { d1: 0.41, d7: 0.22, d30: days >= 30 ? 0.09 : null },
    daily,
    byModeSide: [
      { mode: 'pursuit', side: 'police', matches: 4120 },
      { mode: 'pursuit', side: 'thief', matches: 3380 },
      { mode: 'survival', side: 'thief', matches: 1210 },
      { mode: 'survival', side: 'police', matches: 640 },
    ],
    byDifficulty: [
      { difficulty: 'easy', matches: 1890 },
      { difficulty: 'normal', matches: 6110 },
      { difficulty: 'hard', matches: 1350 },
    ],
    wins: [
      { side: 'police', difficulty: 'easy', rate: 0.71, matches: 900 },
      { side: 'police', difficulty: 'normal', rate: 0.52, matches: 3000 },
      { side: 'police', difficulty: 'hard', rate: 0.38, matches: 700 },
      { side: 'thief', difficulty: 'easy', rate: 0.64, matches: 990 },
      { side: 'thief', difficulty: 'normal', rate: 0.47, matches: 3110 },
      { side: 'thief', difficulty: 'hard', rate: 0.29, matches: 650 },
    ],
    carsUsed: [
      { car: 'viatura', matches: 3020 },
      { car: 'seda', matches: 2410 },
      { car: 'esportivo', matches: 1380 },
      { car: 'caveirao', matches: 990 },
      { car: 'moto', matches: 870 },
      { car: 'prf', matches: 520 },
    ],
    carsBought: [
      { car: 'esportivo', count: 412 },
      { car: 'picape', count: 350 },
      { car: 'moto', count: 190 },
      { car: 'blazer', count: 161 },
      { car: 'kombi', count: 88 },
      { car: 'rocam', count: 74 },
    ],
    itemsBought: [
      { kind: 'paint', count: 820 },
      { kind: 'wheels', count: 430 },
      { kind: 'neon', count: 300 },
      { kind: 'sticker', count: 210 },
      { kind: 'smoke', count: 150 },
    ],
    duration: [
      { mode: 'pursuit', seconds: 72 },
      { mode: 'survival', seconds: 185 },
    ],
    versions: [
      { version: '0.28.0', players: 450 },
      { version: '0.27.0', players: 38 },
    ],
    clients: [
      { client: 'play', players: 380 },
      { client: 'web', players: 80 },
      { client: 'pwa', players: 28 },
    ],
  };
}

/** Example reports for the /admin "Denúncias" tab on localhost (made-up names). */
export function demoModeration(now = new Date()): ModerationView {
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
  return {
    pending: [
      {
        userId: '101',
        username: 'xX_Policial_Xx',
        count: 5,
        first: ago(60),
        last: ago(3),
        by: ['turbo_br', 'pmdorj', 'Sirene_BR'],
      },
      { userId: '102', username: 'NitroMax', reportedAs: 'Nitr0_Xyz', count: 2, first: ago(40), last: ago(14), by: ['Zé_da_Rota', 'Ana'] },
      { userId: '103', username: 'Fuga_Rapida', count: 1, first: ago(4), last: ago(4), by: ['PegaLadrao'] },
    ],
    decided: [
      { userId: '104', username: 'Ladrao_Ruim', action: 'ban', reports: 4, at: ago(26), nowName: 'Ladrao_Ruim', banned: true },
      { userId: '105', username: 'Nome_Feio', action: 'rename', reports: 3, at: ago(41), nowName: 'Vel0z', banned: false },
      { userId: '106', username: 'Caveirao_BR', action: 'dismiss', reports: 1, at: ago(44), nowName: 'Caveirao_BR', banned: false },
    ],
  };
}

/** The fake's answer to a decision: the same rules as the server, on the example data. */
export function demoAct(v: ModerationView, userId: string, action: ModerationAction, now = new Date()): ModerationView | 'unknown' {
  const at = now.toISOString();
  if (action === 'unban') {
    const d = v.decided.find((x) => x.userId === userId && x.action === 'ban');
    if (!d) return 'unknown';
    const decided = v.decided.map((x) => (x.userId === userId ? { ...x, banned: false } : x));
    return { ...v, decided: [{ ...d, action, reports: 0, at, banned: false }, ...decided] };
  }
  const p = v.pending.find((x) => x.userId === userId);
  if (!p) return 'unknown';
  const d: Decision = {
    userId,
    username: p.username,
    action,
    reports: p.count,
    at,
    nowName: action === 'rename' ? null : p.username,
    banned: action === 'ban',
  };
  return { pending: v.pending.filter((x) => x !== p), decided: [d, ...v.decided] };
}
