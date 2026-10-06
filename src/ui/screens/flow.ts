// Screen flow (spec §7) as a pure state machine: title -> choice -> countdown -> game <-> pause -> end -> ranking.
import type { Role } from '../../config/balance';

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
}

export type FlowState =
  | { screen: 'title' }
  | { screen: 'choose' }
  | { screen: 'countdown'; role: Role; left: number }
  | { screen: 'playing'; role: Role }
  | { screen: 'paused'; role: Role }
  | EndState
  | { screen: 'ranking'; tab: Role; from: 'title' }
  /** opened from the end screen: Back returns to the same end screen (an unsaved record is still there) */
  | { screen: 'ranking'; tab: Role; from: 'end'; end: EndState };

export type EndState = { screen: 'end'; role: Role; result: MatchResult; qualifies: boolean; saved?: boolean };

export type FlowAction =
  | { type: 'play' }
  | { type: 'choose'; role: Role }
  | { type: 'tick'; dt: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'quit' }
  | { type: 'ended'; result: MatchResult; qualifies?: boolean }
  | { type: 'openRanking' }
  /** end screen: play again choosing the side */
  | { type: 'changeSide' }
  /** initials saved on the end screen */
  | { type: 'saved' }
  | { type: 'tab'; tab: Role }
  | { type: 'back' };

export const initialState = (): FlowState => ({ screen: 'title' });

const countdown = (role: Role): FlowState => ({ screen: 'countdown', role, left: COUNTDOWN });

export function reduce(s: FlowState, a: FlowAction): FlowState {
  switch (s.screen) {
    case 'title':
      if (a.type === 'play') return { screen: 'choose' };
      if (a.type === 'openRanking') return { screen: 'ranking', tab: 'police', from: 'title' };
      return s;
    case 'choose':
      if (a.type === 'choose') return countdown(a.role);
      if (a.type === 'back' || a.type === 'quit') return initialState();
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
      if (a.type === 'ended') return { screen: 'end', role: s.role, result: a.result, qualifies: a.qualifies === true };
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
      if (a.type === 'openRanking') return { screen: 'ranking', tab: s.role, from: 'end', end: s };
      if (a.type === 'saved') return s.saved ? s : { ...s, saved: true };
      return s;
    case 'ranking':
      if (a.type === 'tab') return { ...s, tab: a.tab };
      if (a.type === 'back' && s.from === 'end') return s.end;
      if (a.type === 'back' || a.type === 'quit') return initialState();
      return s;
  }
}
