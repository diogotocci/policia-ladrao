// Mixer puro: transforma o estado do mundo e os eventos em comandos para o backend de áudio.
// Não sabe nada de WebAudio — os testes usam o null backend.
import type { GameEvent, WorldState } from '../sim/types';
import { MENU_SONG, SONG, createSequencer, stepSeconds, type Song } from './music';
import type { SoundName } from './sfx';
import type { AudioBackend } from './synth';

const SIREN_RANGE = 120; // m
const BURST_WINDOW = 0.1; // s
const BURST_MAX = 6;
const LOOKAHEAD = 0.1; // s
const ROTOR_BEAT = 0.09; // s entre batidas da hélice
const ROTOR_RANGE = 120; // m
const SKID_GAP = 0.6; // s entre chiados do mesmo carro
const SKID_RANGE = 80; // m

export interface Mixer {
  /** paused: jogo pausado (ex.: celular em retrato) — motor e sirene calam, música não avança */
  frame(w: WorldState, dt: number, paused?: boolean): void;
  events(events: readonly GameEvent[]): void;
  setMuted(muted: boolean): void;
  muted(): boolean;
  /** troca o backend (ex.: null → WebAudio no primeiro gesto do usuário) */
  use(backend: AudioBackend): void;
  /** telas (título, escolha, ranking): música calma, sem motor nem sirene */
  menu(dt: number): void;
  /** som de interface: bip da contagem, largada, clique */
  cue(name: 'beep' | 'go' | 'ui' | 'bomb-hit'): void;
  song(): 'menu' | 'chase';
  reset(): void;
}

export function createMixer(initial: AudioBackend): Mixer {
  let be = initial;
  let isMuted = false;
  let clock = 0;
  let recent = new Map<SoundName, number[]>(); // por som: rajada do mesmo som não estoura
  let playerRole: 'police' | 'thief' = 'police';
  let musicGain = -1;
  let rotorAcc = 0;
  let meS = 0;
  let lastBeep = Infinity; // segundo inteiro restante do último bip da contagem
  const lastSkid = { police: -Infinity, thief: -Infinity };
  const songs = { chase: { song: SONG, seq: createSequencer(SONG) }, menu: { song: MENU_SONG, seq: createSequencer(MENU_SONG) } };
  let current: 'menu' | 'chase' = 'chase';
  let nextNoteTime = -1; // no relógio do backend; -1 = recomeçar no próximo quadro
  const useSong = (name: 'menu' | 'chase') => {
    if (name === current) return;
    current = name;
    songs[name].seq.reset();
    nextNoteTime = -1;
  };
  /** agenda a música no relógio do áudio (não no do quadro): batida estável mesmo com quadros lentos */
  const scheduleMusic = (intense: boolean) => {
    const { song, seq } = songs[current] as { song: Song; seq: ReturnType<typeof createSequencer> };
    const now = be.now();
    if (nextNoteTime < now) nextNoteTime = now + 0.02; // começo ou travada longa: pula para frente, sem rajada
    const step = stepSeconds(song.bpm);
    while (nextNoteTime < now + LOOKAHEAD) {
      for (const n of seq.next(intense)) be.note(n, nextNoteTime);
      nextNoteTime += step;
    }
  };

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
      meS = me.s;
      const police = w.playerRole === 'police' ? w.player : w.opponent;
      const thief = w.playerRole === 'police' ? w.opponent : w.player;
      const over = w.match.over;
      const quiet = over || paused;
      const escaping = w.match.escapeAt !== undefined; // cena da fuga: sem sirene nem hélice

      be.setEngine(55 + 3 * me.speed, quiet ? 0 : me.airTime > 0 ? 0.1 : 0.16);
      let siren = 0;
      if (!quiet) {
        if (escaping) siren = 0;
        else if (w.playerRole === 'police') siren = 0.05;
        else {
          const d = Math.abs(police.s - me.s);
          siren = d >= SIREN_RANGE ? 0 : 0.22 * (1 - d / SIREN_RANGE);
        }
      }
      be.setSiren(siren);
      setMusic(over ? 0.3 : 1);
      // hélice: helicóptero ativo e perto (tocando de polícia, ele está sempre em cima)
      const heliOn = !quiet && !escaping && w.time < police.upgrades.heliUntil && Math.abs(police.s - me.s) < ROTOR_RANGE;
      if (heliOn) {
        rotorAcc += dt;
        for (; rotorAcc >= ROTOR_BEAT; rotorAcc -= ROTOR_BEAT) play('rotor');
      } else rotorAcc = ROTOR_BEAT; // a primeira batida sai logo que ele aparece

      // contagem final da fuga: um bip por segundo nos últimos 10 s
      const left = w.escapeTime - w.time;
      if (!quiet && w.match.escapeAt === undefined && left > 0 && left <= 10) {
        const sec = Math.ceil(left);
        if (sec < lastBeep) {
          if (lastBeep !== Infinity || sec === 10) play('beep'); // entrando no meio (ex.: teste) não bipa na hora
          lastBeep = sec;
        }
      } else if (left > 10) lastBeep = Infinity;
      if (paused) return; // pausado: sem música do jogo (a app pode tocar a do menu)
      useSong('chase');
      if (isMuted || !be.running()) {
        nextNoteTime = -1;
        return;
      }
      scheduleMusic(!over && (Math.abs(thief.s - police.s) < 40 || Math.min(police.hp, thief.hp) <= 30));
    },
    menu(dt) {
      clock += dt;
      be.setEngine(55, 0);
      be.setSiren(0);
      setMusic(0.8);
      useSong('menu');
      if (isMuted || !be.running()) {
        nextNoteTime = -1;
        return;
      }
      scheduleMusic(false);
    },
    cue(name) {
      if (isMuted || !be.running()) return;
      be.play(name);
    },
    song: () => current,
    events(events) {
      for (const e of events) {
        if (e.type === 'shot') play(e.from === 'police' ? 'shot-police' : 'shot-thief');
        else if (e.type === 'hit') play('hit');
        else if (e.type === 'crash') play('crash');
        else if (e.type === 'explosion') play('explosion');
        else if (e.type === 'bombDropped') play('bomb-drop');
        else if (e.type === 'escape') play('escape');
        else if (e.type === 'skid') {
          if (clock - lastSkid[e.role] < SKID_GAP || Math.abs(e.s - meS) > SKID_RANGE) continue;
          lastSkid[e.role] = clock;
          play('skid');
        }
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
      songs.chase.seq.reset();
      songs.menu.seq.reset();
      nextNoteTime = -1;
      recent = new Map();
      lastBeep = Infinity;
      lastSkid.police = lastSkid.thief = -Infinity;
      musicGain = -1;
    },
  };
}
