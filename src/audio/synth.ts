// Backends de áudio. O mixer só conversa com esta interface:
// - createWebAudioBackend: síntese real com WebAudio (sem arquivos), contexto criado no 1º gesto do usuário;
// - createNullBackend: só grava as chamadas (testes e navegadores sem áudio).
import type { Note } from './music';
import { RECIPES, type SoundName, type Voice } from './sfx';

export interface AudioBackend {
  now(): number;
  /** o relógio do áudio está andando (contexto destravado e não suspenso) */
  running(): boolean;
  play(name: SoundName, gain?: number): void;
  setEngine(freq: number, gain: number): void;
  setSiren(gain: number): void;
  setMaster(gain: number): void;
  setMusic(gain: number): void;
  note(n: Note, when: number): void;
  /** destrava/retoma (chamar dentro do handler de um gesto do usuário) */
  resume(): void;
  suspend(): void;
  close(): void;
}

export interface NullBackend extends AudioBackend {
  /** simula contexto travado/suspenso nos testes */
  running: () => boolean;
  setRunning(r: boolean): void;
  advance(dt: number): void;
  played: SoundName[];
  notes: { note: Note; when: number }[];
  engine: { freq: number; gain: number };
  siren: number;
  master: number;
  music: number;
}

export function createNullBackend(): NullBackend {
  let t = 0;
  let run = true;
  const be: NullBackend = {
    running: () => run,
    setRunning(r) {
      run = r;
    },
    advance(dt) {
      t += dt;
    },
    played: [],
    notes: [],
    engine: { freq: 0, gain: 0 },
    siren: 0,
    master: 1,
    music: 1,
    now: () => t,
    play(name) {
      be.played.push(name);
    },
    setEngine(freq, gain) {
      be.engine = { freq, gain };
    },
    setSiren(gain) {
      be.siren = gain;
    },
    setMaster(gain) {
      be.master = gain;
    },
    setMusic(gain) {
      be.music = gain;
    },
    note(note, when) {
      be.notes.push({ note, when });
    },
    resume() {},
    suspend() {},
    close() {},
  };
  return be;
}

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Síntese WebAudio. Lança se o navegador não tiver AudioContext (quem chama cai para o null backend). */
export function createWebAudioBackend(): AudioBackend {
  const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)!;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  const sfxBus = ctx.createGain();
  sfxBus.connect(master);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.35;
  musicBus.connect(master);

  // ruído branco reaproveitado por todos os sons
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const ch = noise.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < ch.length; i++) ch[i] = ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  // pulso 25% (timbre "NES") para a melodia
  const pulse = (() => {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    return ctx.createPeriodicWave(real, imag);
  })();

  // motor: serra + quadrada graves num passa-baixa
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 700;
  const e1 = ctx.createOscillator();
  e1.type = 'sawtooth';
  const e2 = ctx.createOscillator();
  e2.type = 'square';
  e2.detune.value = -1200;
  e1.connect(engineFilter);
  e2.connect(engineFilter);
  engineFilter.connect(engineGain).connect(sfxBus);
  e1.start();
  e2.start();

  // sirene: quadrada com LFO na frequência (sobe e desce)
  const sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  const siren = ctx.createOscillator();
  siren.type = 'square';
  siren.frequency.value = 760;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.9;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 230;
  lfo.connect(lfoDepth).connect(siren.frequency);
  const sirenFilter = ctx.createBiquadFilter();
  sirenFilter.type = 'lowpass';
  sirenFilter.frequency.value = 2200;
  siren.connect(sirenFilter).connect(sirenGain).connect(sfxBus);
  siren.start();
  lfo.start();

  const voice = (v: Voice, t0: number, gainScale: number, bus: AudioNode, freqOverride?: number, durOverride?: number, wave?: OscillatorType | 'pulse') => {
    const start = t0 + v.delay;
    const dur = durOverride ?? v.duration;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(v.gain * gainScale, start + v.attack);
    g.gain.linearRampToValueAtTime(0, start + dur);
    let src: AudioScheduledSourceNode;
    if (v.wave === 'noise' || v.wave === 'squeal') {
      const b = ctx.createBufferSource();
      b.buffer = noise;
      b.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = v.wave === 'squeal' ? 'bandpass' : 'lowpass';
      if (v.wave === 'squeal') f.Q.setValueAtTime(v.q ?? 12, start);
      f.frequency.setValueAtTime(v.freq, start);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, v.freqEnd), start + dur);
      b.connect(f).connect(g);
      src = b;
    } else {
      const o = ctx.createOscillator();
      if (wave === 'pulse') o.setPeriodicWave(pulse);
      else o.type = wave ?? v.wave;
      const f0 = freqOverride ?? v.freq;
      o.frequency.setValueAtTime(f0, start);
      if (!freqOverride && v.freqEnd !== v.freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, v.freqEnd), start + dur);
      o.connect(g);
      src = o;
    }
    g.connect(bus);
    src.start(start);
    src.stop(start + dur + 0.02);
    src.onended = () => g.disconnect();
  };

  const DRUM: Record<'kick' | 'snare' | 'hat', Voice> = {
    kick: { wave: 'sine', freq: 140, freqEnd: 45, gain: 0.6, attack: 0.002, duration: 0.14, delay: 0 },
    snare: { wave: 'noise', freq: 5000, freqEnd: 1500, gain: 0.35, attack: 0.002, duration: 0.12, delay: 0 },
    hat: { wave: 'noise', freq: 9000, freqEnd: 7000, gain: 0.12, attack: 0.001, duration: 0.035, delay: 0 },
  };

  // automação só quando o valor muda (o mixer chama a cada quadro)
  const last = new Map<AudioParam, number>();
  const smooth = (p: AudioParam, v: number) => {
    if (last.get(p) === v) return;
    last.set(p, v);
    p.setTargetAtTime(v, ctx.currentTime, 0.05);
  };
  // contexto travado/suspenso: currentTime parado — nada é agendado (senão os nós se acumulam e estouram juntos)
  const live = () => ctx.state === 'running';

  return {
    now: () => ctx.currentTime,
    running: live,
    play(name, gain = 1) {
      if (!live()) return;
      for (const v of RECIPES[name]) voice(v, ctx.currentTime, gain, sfxBus);
    },
    setEngine(freq, gain) {
      freq = Math.round(freq * 2) / 2; // quantizado: evita automação nova a cada quadro
      smooth(e1.frequency, Math.max(20, freq));
      smooth(e2.frequency, Math.max(20, freq));
      smooth(engineFilter.frequency, 300 + freq * 4);
      smooth(engineGain.gain, gain);
    },
    setSiren(gain) {
      smooth(sirenGain.gain, gain);
    },
    setMaster(gain) {
      smooth(master.gain, gain * 0.8);
    },
    setMusic(gain) {
      smooth(musicBus.gain, gain * 0.35);
    },
    note(n, when) {
      if (!live()) return;
      if (n.voice === 'kick' || n.voice === 'snare' || n.voice === 'hat') voice(DRUM[n.voice], when, 1, musicBus);
      else {
        const base: Voice = { wave: 'square', freq: 0, freqEnd: 0, gain: n.voice === 'bass' ? 0.32 : 0.2, attack: 0.005, duration: n.dur, delay: 0 };
        voice(base, when, 1, musicBus, midiHz(n.midi), n.dur, n.voice === 'lead' ? 'pulse' : 'square');
      }
    },
    resume() {
      if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {});
    },
    suspend() {
      if (ctx.state === 'running') void ctx.suspend().catch(() => {});
    },
    close() {
      void ctx.close().catch(() => {});
    },
  };
}
