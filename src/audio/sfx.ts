// Sound effect recipes: pure data (waveform, frequency, envelope), testable without WebAudio.

/** squeal: noise through a narrow band-pass filter (tire screech) */
export type Wave = 'square' | 'sawtooth' | 'triangle' | 'sine' | 'noise' | 'squeal';

export interface Voice {
  wave: Wave;
  freq: number; // Hz (for noise: cutoff frequency of the low-pass filter)
  freqEnd: number; // Hz at the end (exponential glissando)
  gain: number; // peak
  attack: number; // s
  duration: number; // s (from start to silence)
  delay: number; // s until it starts
  /** squeal: filter narrowness (Q) */
  q?: number;
}

const v = (wave: Wave, freq: number, freqEnd: number, gain: number, duration: number, attack = 0.004, delay = 0): Voice => ({
  wave,
  freq,
  freqEnd,
  gain,
  attack,
  duration,
  delay,
});

export const RECIPES = {
  // real gunshots (playtest 2026-10-05): noise bang with instant attack + low body + tail (street echo).
  // police: pistol — brighter, shorter crack; thief: shotgun — deeper, longer boom
  'shot-police': [
    v('noise', 9000, 1400, 0.5, 0.09, 0.001), // crack
    v('sine', 190, 60, 0.32, 0.08, 0.001), // body
    v('noise', 2400, 350, 0.16, 0.26, 0.004, 0.015), // tail
  ],
  'shot-thief': [
    v('noise', 3500, 200, 0.55, 0.42, 0.002), // boom
    v('sine', 120, 42, 0.42, 0.3, 0.002), // body
    v('noise', 1200, 180, 0.2, 0.5, 0.01, 0.03), // tail
  ],
  hit: [v('square', 300, 120, 0.2, 0.08), v('noise', 3000, 800, 0.15, 0.06)],
  crash: [v('noise', 2400, 300, 0.45, 0.35, 0.002), v('sawtooth', 110, 50, 0.25, 0.3)],
  explosion: [v('noise', 1400, 90, 0.6, 1.1, 0.005), v('sine', 90, 35, 0.5, 0.9)],
  pickup: [v('square', 660, 660, 0.14, 0.07), v('square', 990, 990, 0.14, 0.09, 0.004, 0.07)],
  wrong: [v('square', 220, 140, 0.16, 0.18)],
  'bomb-drop': [v('triangle', 300, 120, 0.2, 0.15), v('noise', 900, 400, 0.08, 0.1)],
  win: [v('square', 523, 523, 0.15, 0.14), v('square', 659, 659, 0.15, 0.14, 0.004, 0.14), v('square', 784, 784, 0.15, 0.4, 0.004, 0.28)],
  beep: [v('square', 880, 880, 0.14, 0.12)], // countdown 3-2-1
  go: [v('square', 1320, 1320, 0.16, 0.35), v('square', 660, 660, 0.1, 0.35)], // start
  // tire squeal (playtest 2026-10-06): noise in narrow bands (rubber screech), three detuned bands
  // that rise and fall slightly — no pure tones (they sounded like a train horn)
  skid: [
    { ...v('squeal', 1900, 1650, 0.5, 0.5, 0.03), q: 14 },
    { ...v('squeal', 2450, 2250, 0.32, 0.38, 0.02, 0.06), q: 18 },
    { ...v('squeal', 1500, 1700, 0.25, 0.42, 0.04, 0.12), q: 10 },
  ],
  // thief: the bomb hit the police — deep explosion + short victory fanfare
  'bomb-hit': [v('square', 784, 784, 0.13, 0.1, 0.004, 0.12), v('square', 1046, 1046, 0.13, 0.2, 0.004, 0.22)],
  // helicopter rotor: one low beat per blade (the mixer repeats it)
  rotor: [v('noise', 380, 160, 0.13, 0.07, 0.004), v('sine', 70, 55, 0.12, 0.07)],
  // escape: nitro rising and fading
  escape: [v('sawtooth', 120, 900, 0.18, 1.4, 0.05), v('noise', 800, 6000, 0.12, 1.2, 0.1)],
  ui: [v('triangle', 1200, 900, 0.1, 0.05)], // menu click
  lose: [v('square', 392, 392, 0.15, 0.2), v('square', 311, 311, 0.15, 0.2, 0.004, 0.2), v('square', 196, 196, 0.15, 0.6, 0.004, 0.4)],
} satisfies Record<string, Voice[]>;

export type SoundName = keyof typeof RECIPES;

/** Volume envelope at time t (since the recipe start): rises during attack, then falls linearly to 0. */
export function envelopeAt(voice: Voice, t: number): number {
  const local = t - voice.delay;
  if (local <= 0 || local >= voice.duration) return 0;
  if (local <= voice.attack) return (voice.gain * local) / voice.attack;
  return voice.gain * (1 - (local - voice.attack) / (voice.duration - voice.attack));
}

export function recipeDuration(r: readonly Voice[]): number {
  return Math.max(...r.map((x) => x.delay + x.duration));
}
