import { describe, expect, it } from 'vitest';
import { COUNTDOWN, initialState, reduce, type FlowState } from '../../src/ui/screens/flow';

const run = (s: FlowState, ...actions: Parameters<typeof reduce>[1][]) => actions.reduce(reduce, s);

describe('screen flow', () => {
  it('happy path: title → choose → countdown → playing → end → ranking → title', () => {
    let s = run(initialState(), { type: 'play' });
    expect(s.screen).toBe('choose');
    s = reduce(s, { type: 'choose', role: 'thief' });
    expect(s).toEqual({ screen: 'countdown', role: 'thief', left: COUNTDOWN });
    s = reduce(s, { type: 'tick', dt: COUNTDOWN + 0.01 });
    expect(s).toEqual({ screen: 'playing', role: 'thief' });
    s = reduce(s, { type: 'ended', result: { winner: 'police', time: 42 } });
    expect(s.screen).toBe('end');
    s = reduce(s, { type: 'openRanking' });
    expect(s).toMatchObject({ screen: 'ranking', tab: 'thief', from: 'end' });
    s = reduce(s, { type: 'back' });
    expect(s.screen).toBe('end'); // Back returns to the end screen (from there: play again / title)
    expect(reduce(s, { type: 'quit' }).screen).toBe('title');
  });

  it('ranking opened from the end screen goes back to the same end screen, record still pending if not saved', () => {
    const end = reduce(
      { screen: 'playing', role: 'thief' },
      { type: 'ended', result: { winner: 'thief', time: 90, reason: 'escape', hp: 40 }, qualifies: true },
    );
    let s = reduce(end, { type: 'openRanking' });
    s = reduce(s, { type: 'tab', tab: 'police' });
    s = reduce(s, { type: 'back' });
    expect(s).toEqual(end); // the initials are still pending
    const saved = reduce(end, { type: 'saved' });
    expect(saved).toMatchObject({ screen: 'end', saved: true });
    expect(reduce(reduce(saved, { type: 'openRanking' }), { type: 'back' })).toEqual(saved); // already saved: does not ask again
  });

  it('the countdown goes 3 → 0 in 3 s and cannot be paused', () => {
    let s = run(initialState(), { type: 'play' }, { type: 'choose', role: 'police' });
    s = reduce(s, { type: 'tick', dt: 1 });
    expect(s).toMatchObject({ screen: 'countdown', left: 2 });
    expect(reduce(s, { type: 'pause' })).toBe(s);
    s = reduce(s, { type: 'tick', dt: 2 });
    expect(s.screen).toBe('playing');
  });

  it('pause / resume / restart (same side, back to the countdown) / quit (title)', () => {
    const playing: FlowState = { screen: 'playing', role: 'police' };
    const paused = reduce(playing, { type: 'pause' });
    expect(paused).toEqual({ screen: 'paused', role: 'police' });
    expect(reduce(paused, { type: 'resume' })).toEqual(playing);
    expect(reduce(paused, { type: 'restart' })).toEqual({ screen: 'countdown', role: 'police', left: COUNTDOWN });
    expect(reduce(paused, { type: 'quit' }).screen).toBe('title');
    const end = reduce(playing, { type: 'ended', result: { winner: 'police', time: 61 } });
    expect(reduce(end, { type: 'restart' })).toEqual({ screen: 'countdown', role: 'police', left: COUNTDOWN });
    expect(reduce(end, { type: 'quit' }).screen).toBe('title');
  });

  it('ranking from the title opens on the police tab and goes back to the title; tabs switch', () => {
    let s = reduce(initialState(), { type: 'openRanking' });
    expect(s).toMatchObject({ screen: 'ranking', tab: 'police', from: 'title' });
    s = reduce(s, { type: 'tab', tab: 'thief' });
    expect(s).toMatchObject({ tab: 'thief' });
    expect(reduce(s, { type: 'back' }).screen).toBe('title');
  });

  it('end keeps the rank of a new record (for the initials entry and highlight)', () => {
    const s = reduce({ screen: 'playing', role: 'thief' }, { type: 'ended', result: { winner: 'police', time: 90 }, qualifies: true });
    expect(s).toMatchObject({ screen: 'end', role: 'thief', qualifies: true });
  });

  it('invalid actions are ignored (same object back)', () => {
    const t = initialState();
    for (const a of [
      { type: 'pause' },
      { type: 'resume' },
      { type: 'restart' },
      { type: 'tick', dt: 1 },
      { type: 'ended', result: { winner: 'police', time: 1 } },
    ] as const)
      expect(reduce(t, a)).toBe(t);
    const playing: FlowState = { screen: 'playing', role: 'police' };
    expect(reduce(playing, { type: 'play' })).toBe(playing);
  });
});
