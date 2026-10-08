// Pure mixer: turns world state and events into commands for the audio backend.
// It knows nothing about WebAudio — tests use the null backend.
import type { GameEvent, WorldState } from '../sim/types';
import { hpPct } from '../sim/car';
import { MENU_SONG, SONG, createSequencer, stepSeconds, type Song } from './music';
import type { SoundName } from './sfx';
import type { SoundId } from '../meta/shop';
import type { AudioBackend, SirenStyle } from './synth';

const SIREN_RANGE = 120; // m
const BURST_WINDOW = 0.1; // s
const BURST_MAX = 6;
const LOOKAHEAD = 0.1; // s
const ROTOR_BEAT = 0.09; // s between rotor beats
const ROTOR_RANGE = 120; // m
const SKID_GAP = 0.6; // s between skids of the same car
const SKID_RANGE = 80; // m
// V2 part 4: the thief player honks at the traffic just ahead in his lane
export const HORN_AHEAD = 18; // m
const HORN_LANE = 1.5; // m
export const HORN_GAP = 4; // s

export interface Mixer {
  /** paused: game paused (e.g. phone in portrait) — engine and siren go silent, music does not advance */
  frame(w: WorldState, dt: number, paused?: boolean): void;
  events(events: readonly GameEvent[]): void;
  setMuted(muted: boolean): void;
  muted(): boolean;
  /** swaps the backend (e.g. null -> WebAudio on the user's first gesture) */
  use(backend: AudioBackend): void;
  /** screens (title, choice, ranking): calm music, no engine or siren */
  menu(dt: number): void;
  /** UI sound: countdown beep, start, click */
  cue(name: 'beep' | 'go' | 'ui' | 'bomb-hit'): void;
  song(): 'menu' | 'chase';
  /** the player's shop sound for this match (siren style as police, horn as thief); null = standard */
  setLook(role: 'police' | 'thief', sound: SoundId | null, rivalSound?: SoundId | null): void;
  /** shop "Ouvir": a short sample of a siren or horn */
  preview(role: 'police' | 'thief', sound: SoundId | null): void;
  reset(): void;
}

export function createMixer(initial: AudioBackend): Mixer {
  let be = initial;
  let isMuted = false;
  let clock = 0;
  let recent = new Map<SoundName, number[]>(); // per sound: a burst of the same sound does not blow up
  let playerRole: 'police' | 'thief' = 'police';
  let musicGain = -1;
  let rotorAcc = 0;
  let meS = 0;
  let lastBeep = Infinity; // whole seconds remaining at the last countdown beep
  const lastSkid = { police: -Infinity, thief: -Infinity };
  let look: { role: 'police' | 'thief'; sound: SoundId | null; rival: SoundId | null } = { role: 'police', sound: null, rival: null };
  let sirenStyle: SirenStyle = 'padrao';
  let lastHorn = -Infinity;
  const setSirenStyle = (st: SirenStyle) => {
    if (st === sirenStyle) return;
    sirenStyle = st;
    be.setSirenStyle(st);
  };
  const songs = { chase: { song: SONG, seq: createSequencer(SONG) }, menu: { song: MENU_SONG, seq: createSequencer(MENU_SONG) } };
  let current: 'menu' | 'chase' = 'chase';
  let nextNoteTime = -1; // on the backend clock; -1 = restart on the next frame
  const useSong = (name: 'menu' | 'chase') => {
    if (name === current) return;
    current = name;
    songs[name].seq.reset();
    nextNoteTime = -1;
  };
  /** schedules music on the audio clock (not the frame clock): steady beat even with slow frames */
  const scheduleMusic = (intense: boolean) => {
    const { song, seq } = songs[current] as { song: Song; seq: ReturnType<typeof createSequencer> };
    const now = be.now();
    if (nextNoteTime < now) nextNoteTime = now + 0.02; // start or long stall: skip forward, no burst
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
      const escaping = w.match.escapeAt !== undefined; // escape scene: no siren or rotor

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
      // the siren heard: the player's as police, the computer's (random car, playtest 2026-10-08) as thief
      const style = w.playerRole === 'police' ? look.sound : look.rival;
      setSirenStyle(style === 'yelp' || style === 'choque' ? style : 'padrao');
      be.setSiren(siren);
      setMusic(over ? 0.3 : 1);
      if (!quiet && !escaping && w.playerRole === 'thief') {
        const ahead = w.traffic.some((t) => t.s - me.s > 0 && t.s - me.s < HORN_AHEAD && Math.abs(t.x - me.x) < HORN_LANE);
        if (ahead && clock - lastHorn >= HORN_GAP) {
          lastHorn = clock;
          play(look.role === 'thief' && look.sound ? (`horn-${look.sound}` as SoundName) : 'horn-padrao');
        }
      }
      // rotor: helicopter active and nearby (when playing as police, it is always overhead)
      const heliOn = !quiet && !escaping && w.time < police.upgrades.heliUntil && Math.abs(police.s - me.s) < ROTOR_RANGE;
      if (heliOn) {
        rotorAcc += dt;
        for (; rotorAcc >= ROTOR_BEAT; rotorAcc -= ROTOR_BEAT) play('rotor');
      } else rotorAcc = ROTOR_BEAT; // the first beat plays as soon as it appears

      // final escape countdown: one beep per second in the last 10 s
      const left = w.escapeTime - w.time;
      if (!quiet && w.match.escapeAt === undefined && w.match.arrestAt === undefined && left > 0 && left <= 10) {
        const sec = Math.ceil(left);
        if (sec < lastBeep) {
          if (lastBeep !== Infinity || sec === 10) play('beep'); // joining midway (e.g. a test) does not beep right away
          lastBeep = sec;
        }
      } else if (left > 10) lastBeep = Infinity;
      if (paused) return; // paused: no game music (the app may play the menu music)
      useSong('chase');
      if (isMuted || !be.running()) {
        nextNoteTime = -1;
        return;
      }
      scheduleMusic(!over && (Math.abs(thief.s - police.s) < 40 || Math.min(hpPct(police), hpPct(thief)) <= 30));
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
    setLook(role, sound, rival = null) {
      look = { role, sound, rival };
    },
    preview(role, sound) {
      if (isMuted || !be.running()) return;
      be.play((role === 'police' ? `siren-${sound ?? 'padrao'}` : `horn-${sound ?? 'padrao'}`) as SoundName);
    },
    events(events) {
      for (const e of events) {
        if (e.type === 'shot') play(e.rapid ? 'shot-mg' : e.from === 'police' ? 'shot-police' : 'shot-thief');
        else if (e.type === 'hit') play('hit');
        else if (e.type === 'crash') play('crash');
        else if (e.type === 'explosion') play('explosion');
        else if (e.type === 'bombDropped') play('bomb-drop');
        else if (e.type === 'oilSkid') play('oil-splash');
        else if (e.type === 'tirePop') play('tire-pop');
        else if (e.type === 'special' && e.kind === 'roadblock') play('roadblock');
        else if (e.type === 'roadblockHit') play('crash');
        else if (e.type === 'policeItem') play(e.item === 'wingman' ? 'wingman' : 'pickup');
        else if (e.type === 'wingmanHit') play('crash');
        else if (e.type === 'special' && e.kind === 'smoke') play('smoke');
        else if (e.type === 'special' && (e.kind === 'oil' || e.kind === 'spikes')) play(e.kind === 'oil' ? 'oil-splash' : 'spikes');
        else if (e.type === 'mystery' && e.role === playerRole) play('mystery-spin');
        else if (e.type === 'mysteryReveal' && e.role === playerRole) play(e.outcome.good ? 'mystery-good' : 'mystery-bad');
        else if (e.type === 'escape') play('escape');
        else if (e.type === 'skid') {
          if (clock - lastSkid[e.role] < SKID_GAP || Math.abs(e.s - meS) > SKID_RANGE) continue;
          lastSkid[e.role] = clock;
          play('skid');
        } else if (e.type === 'pickup' && e.role === playerRole && !['machineGun', 'wingman'].includes(e.item))
          play(e.item === 'wrong' || e.item === 'none' ? 'wrong' : 'pickup');
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
      be.setSirenStyle(sirenStyle);
      if (musicGain >= 0) be.setMusic(musicGain);
    },
    reset() {
      be.setEngine(0, 0);
      be.setSiren(0);
      lastHorn = -Infinity;
      look = { role: 'police', sound: null, rival: null };
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
