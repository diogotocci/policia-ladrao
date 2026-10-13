// Example numbers for the /admin panel on localhost (the fake account server has no real players). Fixed, so the page
// and its tests look the same every time.
import type { AdminStats } from '../meta/events';

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
