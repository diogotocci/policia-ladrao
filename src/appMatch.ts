// What the app does with a finished match: coins, career (XP, challenges, achievements, streak) and the record.
import type { Difficulty, Mode, Role } from './config/balance';
import type { CareerEvent } from './meta/career';
import { rankOf } from './meta/career';
import { settleCareer, settleMatch, type Profile } from './meta/profile';
import type { Reward } from './meta/rewards';
import type { MatchEnd } from './gameTypes';
import { insert, recordEntry, type ModeBoards } from './storage/ranking';
import type { MatchResult } from './ui/screens/flow';

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
  return { profile: career.profile, reward: settled.reward, events: career.events };
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
