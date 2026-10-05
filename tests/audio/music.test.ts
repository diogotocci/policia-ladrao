import { describe, expect, it } from 'vitest';
import { MENU_SONG, SONG, createSequencer, stepSeconds } from '../../src/audio/music';

const run = (seconds: number, intense = false, dt = 1 / 60) => {
  const seq = createSequencer(SONG);
  const out = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) out.push(...seq.step(dt, intense));
  return { seq, out };
};

describe('chiptune sequencer', () => {
  it('every track has exactly one entry per step (chase and menu songs)', () => {
    for (const song of [SONG, MENU_SONG]) for (const t of [song.bass, song.lead, song.drums]) expect(t).toHaveLength(song.length);
    expect(MENU_SONG.bpm).toBeLessThan(SONG.bpm);
  });

  it('is deterministic', () => {
    expect(run(3).out).toEqual(run(3).out);
  });

  it('140 bpm in sixteenth notes: ~9.3 steps per second', () => {
    expect(stepSeconds(140)).toBeCloseTo(60 / 140 / 4, 10);
    const { seq } = run(1);
    expect(seq.stepIndex()).toBeGreaterThanOrEqual(9);
    expect(seq.stepIndex()).toBeLessThanOrEqual(10);
  });

  it('the song loops: step k and k + song length play the same notes', () => {
    const seq = createSequencer(SONG);
    const len = SONG.length;
    const byStep: string[] = [];
    for (let k = 0; k < len * 2; k++) byStep.push(JSON.stringify(seq.step(stepSeconds(SONG.bpm), false).map((n) => [n.voice, n.midi])));
    for (let k = 0; k < len; k++) expect(byStep[k + len]).toBe(byStep[k]);
    expect(len % 16).toBe(0);
  });

  it('high intensity adds a percussion layer', () => {
    const calm = run(4).out.filter((n) => n.voice === 'hat').length;
    const hot = run(4, true).out.filter((n) => n.voice === 'hat').length;
    expect(hot).toBeGreaterThan(calm);
  });

  it('next() returns exactly one step and advances', () => {
    const a = createSequencer(SONG);
    const b = createSequencer(SONG);
    const viaNext = Array.from({ length: 20 }, () => a.next(false).map((n) => [n.voice, n.midi]));
    const viaStep = Array.from({ length: 20 }, () => b.step(stepSeconds(SONG.bpm), false).map((n) => [n.voice, n.midi]));
    expect(viaNext).toEqual(viaStep);
    expect(a.stepIndex()).toBe(20);
  });

  it('notes carry a small offset inside the frame so slow frames keep the beat', () => {
    const seq = createSequencer(SONG);
    const notes = seq.step(0.5, false);
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) {
      expect(n.at).toBeGreaterThanOrEqual(0);
      expect(n.at).toBeLessThan(0.5);
    }
  });
});
