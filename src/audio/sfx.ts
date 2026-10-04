// Receitas dos efeitos sonoros: dados puros (forma de onda, frequência, envelope), testáveis sem WebAudio.

export type Wave = 'square' | 'sawtooth' | 'triangle' | 'sine' | 'noise';

export interface Voice {
  wave: Wave;
  freq: number; // Hz (para ruído: frequência de corte do filtro passa-baixa)
  freqEnd: number; // Hz no fim (glissando exponencial)
  gain: number; // pico
  attack: number; // s
  duration: number; // s (do início ao silêncio)
  delay: number; // s até começar
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
  // polícia: estalo agudo e curto (pistola); ladrão: estrondo grave e ruidoso (escopeta) — dá para saber quem atirou
  'shot-police': [v('square', 1600, 700, 0.14, 0.06), v('noise', 7000, 3000, 0.08, 0.04)],
  'shot-thief': [v('noise', 1800, 250, 0.3, 0.22, 0.003), v('sine', 160, 55, 0.3, 0.2)],
  hit: [v('square', 300, 120, 0.2, 0.08), v('noise', 3000, 800, 0.15, 0.06)],
  crash: [v('noise', 2400, 300, 0.45, 0.35, 0.002), v('sawtooth', 110, 50, 0.25, 0.3)],
  explosion: [v('noise', 1400, 90, 0.6, 1.1, 0.005), v('sine', 90, 35, 0.5, 0.9)],
  pickup: [v('square', 660, 660, 0.14, 0.07), v('square', 990, 990, 0.14, 0.09, 0.004, 0.07)],
  wrong: [v('square', 220, 140, 0.16, 0.18)],
  'bomb-drop': [v('triangle', 300, 120, 0.2, 0.15), v('noise', 900, 400, 0.08, 0.1)],
  win: [v('square', 523, 523, 0.15, 0.14), v('square', 659, 659, 0.15, 0.14, 0.004, 0.14), v('square', 784, 784, 0.15, 0.4, 0.004, 0.28)],
  lose: [v('square', 392, 392, 0.15, 0.2), v('square', 311, 311, 0.15, 0.2, 0.004, 0.2), v('square', 196, 196, 0.15, 0.6, 0.004, 0.4)],
} satisfies Record<string, Voice[]>;

export type SoundName = keyof typeof RECIPES;

/** Envelope do volume no instante t (desde o início da receita): sobe no ataque e cai linear até 0. */
export function envelopeAt(voice: Voice, t: number): number {
  const local = t - voice.delay;
  if (local <= 0 || local >= voice.duration) return 0;
  if (local <= voice.attack) return (voice.gain * local) / voice.attack;
  return voice.gain * (1 - (local - voice.attack) / (voice.duration - voice.attack));
}

export function recipeDuration(r: readonly Voice[]): number {
  return Math.max(...r.map((x) => x.delay + x.duration));
}
