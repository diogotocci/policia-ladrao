// App audio session: a single mixer, unlocked on the 1st gesture, with the saved sound preference.
// Lives across screens and matches (the game receives the ready session; without it, creates its own — debug/e2e mode).
import { createSoundToggle, readSoundPref, writeSoundPref } from '../ui/soundToggle';
import { createMixer, type Mixer } from './mixer';
import { createNullBackend, createWebAudioBackend, type AudioBackend } from './synth';

export interface AudioSession {
  mixer: Mixer;
  setMuted(m: boolean): void;
  muted(): boolean;
  /** button (all buttons reflect the same state; the M key is handled here, only once) */
  mountToggle(parent: HTMLElement): { dispose(): void };
  dispose(): void;
}

const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

export function createAudioSession(opts: { forceMute?: boolean } = {}): AudioSession {
  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  })();
  const mixer = createMixer(createNullBackend());
  let isMuted = opts.forceMute === true || readSoundPref(storage);
  mixer.setMuted(isMuted);
  const toggles = new Set<{ set(m: boolean): void }>();

  let audio: AudioBackend | undefined;
  // Unlock on gesture: a touch counts on pointerup/touchend/click (not pointerdown), a key on keydown.
  const unlock = () => {
    if (!audio) {
      try {
        audio = createWebAudioBackend();
        mixer.use(audio);
      } catch {
        audio = undefined;
        listen(false); // no WebAudio: stays silent
        return;
      }
    }
    audio.resume();
    if (audio.running()) listen(false);
  };
  const listen = (on: boolean) => {
    for (const ev of UNLOCK_EVENTS) (on ? window.addEventListener : window.removeEventListener)(ev, unlock, true);
  };
  listen(true);

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      audio?.resume();
      if (audio && !audio.running()) listen(true); // iOS: only resumes on a new gesture
    } else audio?.suspend(); // hidden tab: nothing buzzing in the background
  };
  document.addEventListener('visibilitychange', onVisibility);

  const setMuted = (m: boolean) => {
    isMuted = m;
    mixer.setMuted(m);
    if (!opts.forceMute) writeSoundPref(storage, m);
    for (const t of toggles) t.set(m);
  };
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (k.code === 'KeyM' && !k.repeat && !k.ctrlKey && !k.metaKey && !k.altKey) setMuted(!isMuted);
  };
  window.addEventListener('keydown', onKey);
  const noKeys = new EventTarget();

  return {
    mixer,
    setMuted,
    muted: () => isMuted,
    mountToggle(parent) {
      const t = createSoundToggle(parent, { muted: isMuted, keyTarget: noKeys, onChange: setMuted });
      toggles.add(t);
      return {
        dispose() {
          toggles.delete(t);
          t.dispose();
        },
      };
    },
    dispose() {
      listen(false);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
      mixer.reset();
      audio?.close();
    },
  };
}
