// Screen flow (spec §7) as a pure state machine: title -> choice -> countdown -> game <-> pause -> end -> ranking.
// The shop (V2 part 4) opens from the title or the side choice and goes back there.
import type { Difficulty, Mode, Role } from '../../config/balance';
import type { MatchStats, Reward } from '../../meta/rewards';

export const COUNTDOWN = 3; // s

export interface MatchResult {
  winner: Role;
  time: number;
  /** how it ended (Delivery 7) */
  reason?: 'escape' | 'policeDown' | 'thiefDown';
  /** player's car health at the end (breaks ties between escapes in the thief ranking) */
  hp?: number;
  /** difficulty level reached */
  level?: number;
  /** damage dealt and boxes of the player's color (coins, V2 part 1) */
  stats?: MatchStats;
}

export type FlowState =
  | { screen: 'title' }
  | { screen: 'mode' }
  | { screen: 'choose' }
  /** V2 part 4: the shop, on one side; Back returns to whoever opened it */
  | { screen: 'shop'; side: Role; from: 'title' | 'choose' }
  | { screen: 'countdown'; role: Role; left: number }
  | { screen: 'playing'; role: Role }
  | { screen: 'paused'; role: Role }
  | EndState
  | { screen: 'ranking'; tab: Role; mode: Mode; difficulty: Difficulty; from: 'title' }
  /** opened from the end screen: Back returns to the same end screen (an unsaved record is still there) */
  | { screen: 'ranking'; tab: Role; mode: Mode; difficulty: Difficulty; from: 'end'; end: EndState };

export type EndState = {
  screen: 'end';
  role: Role;
  result: MatchResult;
  qualifies: boolean;
  saved?: boolean;
  /** coins credited for this match (already in the profile) */
  reward?: Reward;
};

export type FlowAction =
  | { type: 'play' }
  /** mode screen: a mode was picked (the app keeps which) */
  | { type: 'pickMode' }
  | { type: 'choose'; role: Role }
  | { type: 'tick'; dt: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'quit' }
  | { type: 'ended'; result: MatchResult; qualifies?: boolean; reward?: Reward }
  /** opens on this difficulty (the app's current one); default Médio */
  | { type: 'openRanking'; difficulty?: Difficulty; mode?: Mode }
  | { type: 'modeTab'; mode: Mode }
  | { type: 'difficultyTab'; difficulty: Difficulty }
  /** end screen: play again choosing the side */
  | { type: 'changeSide' }
  /** initials saved on the end screen */
  | { type: 'saved' }
  | { type: 'tab'; tab: Role }
  /** title: "Loja"; choose: "trocar" under a car (opens on that side) */
  | { type: 'openShop'; side?: Role }
  | { type: 'shopSide'; side: Role }
  | { type: 'back' };

export const initialState = (): FlowState => ({ screen: 'title' });

const countdown = (role: Role): FlowState => ({ screen: 'countdown', role, left: COUNTDOWN });

export function reduce(s: FlowState, a: FlowAction): FlowState {
  switch (s.screen) {
    case 'title':
      if (a.type === 'play') return { screen: 'mode' };
      if (a.type === 'openRanking')
        return { screen: 'ranking', tab: 'police', mode: a.mode ?? 'pursuit', difficulty: a.difficulty ?? 'normal', from: 'title' };
      if (a.type === 'openShop') return { screen: 'shop', side: a.side ?? 'police', from: 'title' };
      return s;
    case 'shop':
      if (a.type === 'shopSide') return a.side === s.side ? s : { ...s, side: a.side };
      if (a.type === 'back') return s.from === 'choose' ? { screen: 'choose' } : initialState();
      if (a.type === 'quit') return initialState();
      return s;
    case 'mode':
      if (a.type === 'pickMode') return { screen: 'choose' };
      if (a.type === 'back' || a.type === 'quit') return initialState();
      return s;
    case 'choose':
      if (a.type === 'choose') return countdown(a.role);
      if (a.type === 'openShop') return { screen: 'shop', side: a.side ?? 'police', from: 'choose' };
      if (a.type === 'back') return { screen: 'mode' };
      if (a.type === 'quit') return initialState();
      return s;
    case 'countdown':
      if (a.type === 'tick') {
        const left = s.left - a.dt;
        return left <= 0 ? { screen: 'playing', role: s.role } : { ...s, left };
      }
      if (a.type === 'quit') return initialState();
      return s;
    case 'playing':
      if (a.type === 'pause') return { screen: 'paused', role: s.role };
      if (a.type === 'ended') return { screen: 'end', role: s.role, result: a.result, qualifies: a.qualifies === true, reward: a.reward };
      return s;
    case 'paused':
      if (a.type === 'resume') return { screen: 'playing', role: s.role };
      if (a.type === 'restart') return countdown(s.role);
      if (a.type === 'quit') return initialState();
      return s;
    case 'end':
      if (a.type === 'restart') return countdown(s.role);
      if (a.type === 'quit' || a.type === 'back') return initialState();
      if (a.type === 'changeSide') return { screen: 'choose' };
      if (a.type === 'openRanking')
        return { screen: 'ranking', tab: s.role, mode: a.mode ?? 'pursuit', difficulty: a.difficulty ?? 'normal', from: 'end', end: s };
      if (a.type === 'saved') return s.saved ? s : { ...s, saved: true };
      return s;
    case 'ranking':
      if (a.type === 'tab') return { ...s, tab: a.tab };
      if (a.type === 'difficultyTab') return { ...s, difficulty: a.difficulty };
      if (a.type === 'modeTab') return { ...s, mode: a.mode };
      if (a.type === 'back' && s.from === 'end') return s.end;
      if (a.type === 'back' || a.type === 'quit') return initialState();
      return s;
  }
}
