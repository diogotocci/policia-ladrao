import { describe, expect, it } from 'vitest';
import { createMixer } from '../../src/audio/mixer';
import { SONG, stepSeconds } from '../../src/audio/music';
import { createNullBackend } from '../../src/audio/synth';
import { createWorld, policeOf, thiefOf, withCar, type GameEvent, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const world = (role: 'police' | 'thief' = 'thief'): WorldState => createWorld({ seed: 1, playerRole: role });
const shot: GameEvent = { type: 'shot', from: 'police', s: 0, x: 0 };

describe('audio mixer', () => {
  it('engine pitch rises with speed', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    let w = world();
    w = withCar(w, 'thief', { ...thiefOf(w), speed: 5 });
    mx.frame(w, DT);
    const slow = be.engine.freq;
    w = withCar(w, 'thief', { ...thiefOf(w), speed: 34 });
    mx.frame(w, DT);
    expect(be.engine.freq).toBeGreaterThan(slow);
    expect(be.engine.freq).toBeCloseTo(55 + 3 * 34, 5);
    expect(be.engine.gain).toBeGreaterThan(0);
  });

  it('siren is silent with the police far away and gets louder as it closes in (playing thief)', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    let w = world('thief');
    w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 200 });
    mx.frame(w, DT);
    expect(be.siren).toBe(0);
    w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 60 });
    mx.frame(w, DT);
    const mid = be.siren;
    w = withCar(w, 'police', { ...policeOf(w), s: thiefOf(w).s - 10 });
    mx.frame(w, DT);
    expect(mid).toBeGreaterThan(0);
    expect(be.siren).toBeGreaterThan(mid);
  });

  it('playing police, the own siren is low and constant', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('police'), DT);
    expect(be.siren).toBeGreaterThan(0);
    expect(be.siren).toBeLessThan(0.1);
  });

  it('each event plays its recipe', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('thief'), DT);
    mx.events([
      shot,
      { type: 'hit', target: 'thief', amount: 1, s: 0, x: 0 },
      { type: 'crash', a: 'thief', b: 'traffic', s: 0, x: 0 },
      { type: 'explosion', s: 0, x: 0 },
      { type: 'pickup', role: 'thief', item: 'bomb' },
      { type: 'pickup', role: 'thief', item: 'wrong' },
      { type: 'pickup', role: 'police', item: 'heal' }, // not the player's: no sound
      { type: 'bombDropped', s: 0, x: 0 },
      { type: 'end', winner: 'thief' },
    ]);
    expect(be.played).toEqual(['shot-police', 'hit', 'crash', 'explosion', 'pickup', 'wrong', 'bomb-drop', 'win']);
  });

  it('V2 part 3 events: oil, flat tire, smoke, spikes and the yellow box roulette (player only)', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('thief'), DT);
    mx.events([
      { type: 'oilSkid', role: 'police', s: 0, x: 0 },
      { type: 'tirePop', role: 'police', s: 0, x: 0 },
      { type: 'special', role: 'thief', kind: 'smoke', s: 0, x: 0 },
      { type: 'special', role: 'thief', kind: 'spikes', s: 0, x: 0 },
      { type: 'mystery', role: 'thief', outcome: { good: true, item: 'heal' }, s: 0, x: 0 },
      { type: 'mystery', role: 'police', outcome: { good: true, item: 'heal' }, s: 0, x: 0 },
      { type: 'mysteryReveal', role: 'thief', outcome: { good: false, effect: 'mud' } },
    ]);
    expect(be.played).toEqual(['oil-splash', 'tire-pop', 'smoke', 'spikes', 'mystery-spin', 'mystery-bad']);
  });

  it('V2 part 3 police items: machine gun burst, roadblock siren and backup car', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('police'), DT);
    mx.events([
      { type: 'shot', from: 'police', s: 0, x: 0, rapid: true },
      { type: 'special', role: 'police', kind: 'roadblock', s: 0, x: 0 },
      { type: 'policeItem', item: 'wingman' },
    ]);
    expect(be.played).toEqual(['shot-mg', 'roadblock', 'wingman']);
  });

  it('a burst of 20 shots in the same frame plays at most 6', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world(), DT);
    mx.events(Array.from({ length: 20 }, () => shot));
    expect(be.played).toHaveLength(6);
    for (let i = 0; i < 7; i++) mx.frame(world(), DT); // > 100 ms later
    mx.events([shot]);
    expect(be.played).toHaveLength(7);
  });

  it('muted: master at 0 and no new sounds or notes', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.setMuted(true);
    expect(be.master).toBe(0);
    for (let i = 0; i < 120; i++) mx.frame(world(), DT);
    mx.events([shot]);
    expect(be.played).toHaveLength(0);
    expect(be.notes).toHaveLength(0);
    mx.setMuted(false);
    expect(be.master).toBe(1);
  });

  it('music notes are scheduled ahead on the audio clock, evenly spaced, never in the past', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    for (let i = 0; i < 60; i++) {
      be.advance(DT);
      mx.frame(world(), DT);
    }
    expect(be.notes.length).toBeGreaterThan(5);
    const step = stepSeconds(SONG.bpm);
    const times = [...new Set(be.notes.map((n) => n.when))].sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      const k = (times[i]! - times[i - 1]!) / step; // empty steps (pause) count: integer multiple of the step
      expect(k).toBeGreaterThanOrEqual(1 - 1e-6);
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
    }
    for (const n of be.notes) expect(n.when).toBeGreaterThanOrEqual(0);
  });

  it('a slow frame (250 ms) keeps the beat: no overlap, no out-of-order steps', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    for (let i = 0; i < 30; i++) {
      be.advance(DT);
      mx.frame(world(), DT);
    }
    be.advance(0.25);
    mx.frame(world(), 0.25);
    for (let i = 0; i < 30; i++) {
      be.advance(DT);
      mx.frame(world(), DT);
    }
    const step = stepSeconds(SONG.bpm);
    const times = [...new Set(be.notes.map((n) => n.when))].sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(step - 1e-6);
  });

  it('after a long stall (5 s) it skips ahead instead of bursting the missed notes', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    be.advance(DT);
    mx.frame(world(), DT);
    be.advance(5);
    const before = be.notes.length;
    mx.frame(world(), 0.25);
    const fresh = be.notes.slice(before);
    expect(new Set(fresh.map((n) => n.when)).size).toBeLessThanOrEqual(2);
    for (const n of fresh) expect(n.when).toBeGreaterThanOrEqual(be.now());
  });

  it('while the audio is not running (locked/suspended) nothing piles up', () => {
    const be = createNullBackend();
    be.setRunning(false);
    const mx = createMixer(be);
    for (let i = 0; i < 300; i++) mx.frame(world(), DT);
    mx.events([shot]);
    expect(be.notes).toHaveLength(0);
    expect(be.played).toHaveLength(0);
  });

  it('paused (portrait): engine and siren silent, no music scheduled', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world(), DT);
    const n = be.notes.length;
    be.advance(1);
    mx.frame(world(), 0, true);
    expect(be.engine.gain).toBe(0);
    expect(be.siren).toBe(0);
    expect(be.notes).toHaveLength(n);
  });

  it('"everything maxed" pickup does not play the success chime', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('thief'), DT);
    mx.events([{ type: 'pickup', role: 'thief', item: 'none' }]);
    expect(be.played).toEqual(['wrong']);
  });

  it('match over: engine and siren stop, music ducks; reset() stops everything for a new match', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    const w = world();
    mx.frame(w, DT);
    mx.frame({ ...w, match: { over: true, winner: 'police', endTime: 1 } }, DT);
    expect(be.engine.gain).toBe(0);
    expect(be.siren).toBe(0);
    expect(be.music).toBeLessThan(0.5);
    mx.reset();
    expect(be.engine.gain).toBe(0);
    mx.frame(w, DT);
    expect(be.music).toBe(1);
  });

  it('menu mode: calm menu music, engine and siren silent; going back to a match switches to the chase song', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    for (let i = 0; i < 60; i++) {
      be.advance(DT);
      mx.menu(DT);
    }
    expect(be.engine.gain).toBe(0);
    expect(be.siren).toBe(0);
    const menuNotes = be.notes.length;
    expect(menuNotes).toBeGreaterThan(0);
    expect(mx.song()).toBe('menu');
    be.advance(DT);
    mx.frame(world(), DT);
    expect(mx.song()).toBe('chase');
  });

  it('ui sounds: beep, go and ui clicks play their recipes (respecting mute)', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.cue('beep');
    mx.cue('go');
    mx.cue('ui');
    expect(be.played).toEqual(['beep', 'go', 'ui']);
    mx.setMuted(true);
    mx.cue('beep');
    expect(be.played).toHaveLength(3);
  });

  it('tires squeal when a car starts to skid in a curve', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('thief'), DT);
    const me = thiefOf(world('thief')).s;
    mx.events([{ type: 'skid', role: 'thief', s: me, x: 0 }]);
    expect(be.played).toEqual(['skid']);
  });

  it('squeal: one at a time per car (no machine-gun when feathering the brake at the limit), and not from a car far away', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    const w = world('thief');
    const me = thiefOf(w).s;
    mx.frame(w, DT);
    mx.events([{ type: 'skid', role: 'thief', s: me, x: 0 }]);
    for (let i = 0; i < 10; i++) mx.frame(w, DT);
    mx.events([{ type: 'skid', role: 'thief', s: me, x: 0 }]);
    expect(be.played.filter((n) => n === 'skid')).toHaveLength(1);
    for (let i = 0; i < 60; i++) mx.frame(w, DT);
    mx.events([{ type: 'skid', role: 'thief', s: me, x: 0 }]);
    mx.events([{ type: 'skid', role: 'police', s: me - 300, x: 0 }]);
    expect(be.played.filter((n) => n === 'skid')).toHaveLength(2);
  });

  it('the thief hears its own "bomb hit" sound on top of the explosion', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('thief'), DT);
    mx.cue('bomb-hit');
    expect(be.played).toEqual(['bomb-hit']);
  });

  it('helicopter rotor: steady beat while it is active (and near, playing thief), silent otherwise', () => {
    const run = (w: WorldState) => {
      const be = createNullBackend();
      const mx = createMixer(be);
      for (let i = 0; i < 60; i++) mx.frame(w, DT);
      return be.played.filter((n) => n === 'rotor').length;
    };
    const w = world('police');
    const heli = withCar(w, 'police', { ...policeOf(w), upgrades: { ...policeOf(w).upgrades, heliUntil: w.time + 5 } });
    expect(run(w)).toBe(0);
    expect(run(heli)).toBeGreaterThanOrEqual(8);
    const t = world('thief');
    const near = withCar(t, 'police', {
      ...policeOf(t),
      s: thiefOf(t).s - 30,
      upgrades: { ...policeOf(t).upgrades, heliUntil: t.time + 5 },
    });
    const far = withCar(near, 'police', { ...policeOf(near), s: thiefOf(t).s - 300 });
    expect(run(near)).toBeGreaterThanOrEqual(8);
    expect(run(far)).toBe(0);
  });

  it('last 10 s before the escape: one beep per second (none before, none while paused)', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    let w = { ...world('thief'), time: 75 };
    const beeps = () => be.played.filter((n) => n === 'beep').length;
    for (let i = 0; i < 60 * 4; i++) mx.frame((w = { ...w, time: w.time + DT }), DT);
    expect(beeps()).toBe(0);
    w = { ...w, time: 84.5 };
    for (let i = 0; i < 60 * 3; i++) mx.frame((w = { ...w, time: w.time + DT }), DT);
    expect(beeps()).toBe(3);
    for (let i = 0; i < 60; i++) mx.frame((w = { ...w, time: w.time + DT }), DT, true);
    expect(beeps()).toBe(3);
  });

  it('the escape plays its own whoosh', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    mx.frame(world('thief'), DT);
    mx.events([{ type: 'escape' }]);
    expect(be.played).toEqual(['escape']);
  });

  it('during the escape scene: no siren and no rotor', () => {
    const be = createNullBackend();
    const mx = createMixer(be);
    const t0 = world('thief');
    const w = withCar({ ...t0, time: 91, match: { over: false, escapeAt: 90 } }, 'police', {
      ...policeOf(t0),
      s: thiefOf(t0).s - 20,
      upgrades: { ...policeOf(t0).upgrades, heliUntil: 95 },
    });
    for (let i = 0; i < 30; i++) mx.frame(w, DT);
    expect(be.siren).toBe(0);
    expect(be.played.filter((n) => n === 'rotor')).toHaveLength(0);
  });
});
