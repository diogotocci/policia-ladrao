// Mixer puro: transforma o estado do mundo e os eventos em comandos para o backend de áudio.
// Não sabe nada de WebAudio — os testes usam o null backend.
import type { GameEvent, WorldState } from '../sim/types';
import { SONG, createSequencer, stepSeconds } from './music';
import type { SoundName } from './sfx';
import type { AudioBackend } from './synth';

const SIREN_RANGE = 120; // m
const BURST_WINDOW = 0.1; // s
const BURST_MAX = 6;
const LOOKAHEAD = 0.1; // s

export interface Mixer {
  /** paused: jogo pausado (ex.: celular em retrato) — motor e sirene calam, música não avança */
  frame(w: WorldState, dt: number, paused?: boolean): void;
  events(events: readonly GameEvent[]): void;
  setMuted(muted: boolean): void;
  muted(): boolean;
  /** troca o backend (ex.: null → WebAudio no primeiro gesto do usuário) */
  use(backend: AudioBackend): void;
  reset(): void;
}

export function createMixer(initial: AudioBackend): Mixer {
  let be = initial;
  let isMuted = false;
  let clock = 0;
  let recent = new Map<SoundName, number[]>(); // por som: rajada do mesmo som não estoura
  let playerRole: 'police' | 'thief' = 'police';
  let musicGain = -1;
  const seq = createSequencer(SONG);
  const STEP = stepSeconds(SONG.bpm);
  let nextNoteTime = -1; // no relógio do backend; -1 = recomeçar no próximo quadro

  const play = (name: SoundName) => {
    if (isMuted || !be.running()) return;
    const times = (recent.get(name) ?? []).filter((t) => clock - t < BURST_WINDOW);
    if (times.length >= BURST_MAX) return;
    times.push(clock);
    recent.set(name, times);
    be.play(name);
  };
  const setMusic = (g: number) => {
    if (g === musicGain) return;
    musicGain = g;
    be.setMusic(g);
  };

  return {
    frame(w, dt, paused = false) {
      clock += dt;
      playerRole = w.playerRole;
      const me = w.player;
      const police = w.playerRole === 'police' ? w.player : w.opponent;
      const thief = w.playerRole === 'police' ? w.opponent : w.player;
      const over = w.match.over;
      const quiet = over || paused;

      be.setEngine(55 + 3 * me.speed, quiet ? 0 : me.airTime > 0 ? 0.1 : 0.16);
      let siren = 0;
      if (!quiet) {
        if (w.playerRole === 'police') siren = 0.05;
        else {
          const d = Math.abs(police.s - me.s);
          siren = d >= SIREN_RANGE ? 0 : 0.22 * (1 - d / SIREN_RANGE);
        }
      }
      be.setSiren(siren);
      setMusic(over ? 0.3 : 1);

      // música agendada no relógio do áudio (não no do quadro): batida estável mesmo com quadros lentos
      if (paused || isMuted || !be.running()) {
        nextNoteTime = -1;
        return;
      }
      const now = be.now();
      if (nextNoteTime < now) nextNoteTime = now + 0.02; // começo ou travada longa: pula para frente, sem rajada
      const intense = !over && (Math.abs(thief.s - police.s) < 40 || Math.min(police.hp, thief.hp) <= 30);
      while (nextNoteTime < now + LOOKAHEAD) {
        for (const n of seq.next(intense)) be.note(n, nextNoteTime);
        nextNoteTime += STEP;
      }
    },
    events(events) {
      for (const e of events) {
        if (e.type === 'shot') play(e.from === 'police' ? 'shot-police' : 'shot-thief');
        else if (e.type === 'hit') play('hit');
        else if (e.type === 'crash') play('crash');
        else if (e.type === 'explosion') play('explosion');
        else if (e.type === 'bombDropped') play('bomb-drop');
        else if (e.type === 'pickup' && e.role === playerRole) play(e.item === 'wrong' || e.item === 'none' ? 'wrong' : 'pickup');
        else if (e.type === 'end') play(e.winner === playerRole ? 'win' : 'lose');
      }
    },
    setMuted(m) {
      isMuted = m;
      be.setMaster(m ? 0 : 1);
    },
    muted: () => isMuted,
    use(next) {
      be = next;
      be.setMaster(isMuted ? 0 : 1);
      if (musicGain >= 0) be.setMusic(musicGain);
    },
    reset() {
      be.setEngine(0, 0);
      be.setSiren(0);
      seq.reset();
      nextNoteTime = -1;
      recent = new Map();
      musicGain = -1;
    },
  };
}
