// What the app does with a finished match: coins, career (XP, challenges, achievements, streak) and the record.
import type { Difficulty, Mode, Role } from './config/balance';
import type { CareerEvent } from './meta/career';
import { rankOf } from './meta/career';
import { settleCareer, settleMatch, type Profile } from './meta/profile';
import type { Reward } from './meta/rewards';
import type { MatchEnd } from './gameTypes';
import { insert, recordEntry, type ModeBoards } from './storage/ranking';
import type { Submitted } from './account/api';
import type { MatchResult } from './ui/screens/flow';
import { newMatchId } from './meta/ids';
import { MAP_IDS, mapUnlocked } from './meta/maps';
import { goesGlobal, type RecordIn } from './meta/records';

type Ctx = { role: Role; mode: Mode; difficulty: Difficulty; today: string };

/** Credits the match (V2 part 1) and the career (part 5): the profile to save before the end screen shows. */
export function settleEnd(profile: Profile, r: MatchEnd, c: Ctx): { profile: Profile; reward: Reward; events: CareerEvent[] } {
  const settled = settleMatch(profile, r, c.role, c.difficulty, c.mode);
  const st = r.stats;
  const career = settleCareer(
    settled.profile,
    {
      role: c.role,
      mode: c.mode,
      difficulty: c.difficulty,
      won: r.winner === c.role,
      reason: r.reason,
      time: r.time,
      hpFrac: r.hpFrac ?? 0,
      rightBoxes: st.rightBoxes,
      mysteryBoxes: st.mysteryBoxes ?? 0,
      damageDealt: st.damageDealt,
      roadblocks: st.roadblocks ?? 0,
      bombHits: st.bombHits ?? 0,
      wrongBoxes: st.wrongBoxes ?? 0,
      shots: st.shots ?? 0,
      boxes: st.boxes ?? 0,
      skids: st.skids ?? 0,
      nitros: st.nitros ?? 0,
      car: profile.equipped[c.role].car, // mastery (V2 part 6)
      coins: settled.reward.total, // XP = the coins of the match
    },
    c.today,
  );
  // maps (2026-10-17): a win that reaches a map's number of wins unlocks it
  const opened = MAP_IDS.filter((m) => !mapUnlocked(m, profile.stats.wins) && mapUnlocked(m, career.profile.stats.wins));
  return {
    profile: career.profile,
    reward: settled.reward,
    events: [...career.events, ...opened.map((map) => ({ kind: 'map' as const, map }))],
  };
}

/** Puts the initials in the ranking of that mode and difficulty; rank 0 when it did not get in. */
export function addRecord(
  boards: ModeBoards,
  profile: Profile,
  s: { role: Role; result: MatchResult },
  initials: string,
  where: { mode: Mode; difficulty: Difficulty },
): { boards: ModeBoards; rank: number } {
  const entry = recordEntry(
    s.role,
    s.result,
    initials,
    new Date().toISOString(),
    profile.equipped.plate || null,
    rankOf(profile.career.xp[s.role]),
  );
  const r = insert(boards[where.mode][where.difficulty], s.role, entry, where.mode);
  return { boards: { ...boards, [where.mode]: { ...boards[where.mode], [where.difficulty]: r.board } }, rank: r.rank };
}

/** V3 delivery 2: the global ranking record of a finished match (the car and rank are the ones it was played with). */
export function globalRecord(
  profile: Profile,
  r: MatchEnd,
  c: { role: Role; mode: Mode; difficulty: Difficulty },
  now = new Date(),
  matchId = newMatchId(),
): RecordIn {
  const entry = recordEntry(c.role, r, 'x', '');
  return {
    matchId,
    mode: c.mode,
    side: c.role,
    difficulty: c.difficulty,
    time: r.time,
    hp: Math.max(0, Math.round(r.hp ?? 0)),
    ...(c.role === 'thief' ? { how: entry.how } : {}),
    car: profile.equipped[c.role].car,
    rank: rankOf(profile.career.xp[c.role]),
    prestige: profile.career.prestige[c.role],
    endedAt: now.toISOString(),
  };
}

/** what the app needs from the account at the end of a match */
export interface MatchReporter {
  record(rec: RecordIn): Promise<Submitted | undefined> | undefined;
  track(type: 'match_end', data: Record<string, unknown>): void;
}

/**
 * V3 deliveries 2 and 3: the match_end event for the /admin panel (always), then the global ranking record (a win, or
 * the Sobrevivência thief's time alive), with the same match id so the server can check one against the other.
 * The answer is the player's place in the global ranking; undefined when the match does not go global.
 */
export function reportMatch(
  profile: Profile,
  r: MatchEnd,
  c: { role: Role; mode: Mode; difficulty: Difficulty; coins: number },
  account?: MatchReporter,
): Promise<Submitted | undefined> | undefined {
  if (!account) return undefined;
  const matchId = newMatchId();
  const won = r.winner === c.role;
  account.track('match_end', {
    matchId,
    mode: c.mode,
    side: c.role,
    difficulty: c.difficulty,
    car: profile.equipped[c.role].car,
    won,
    ...(r.reason ? { reason: r.reason } : {}),
    time: r.time,
    level: r.level,
    coins: c.coins,
  });
  if (!goesGlobal(c.mode, c.role, won)) return undefined;
  return account.record({ ...globalRecord(profile, r, c, new Date(), matchId), ev: true });
}
