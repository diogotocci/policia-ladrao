// Sessão de áudio da app: um mixer só, destravado no 1º gesto, com a preferência de som salva.
// Vive entre telas e partidas (o jogo recebe a sessão pronta; sem ela, cria uma própria — modo debug/e2e).
import { createSoundToggle, readSoundPref, writeSoundPref } from '../ui/soundToggle';
import { createMixer, type Mixer } from './mixer';
import { createNullBackend, createWebAudioBackend, type AudioBackend } from './synth';

export interface AudioSession {
  mixer: Mixer;
  setMuted(m: boolean): void;
  muted(): boolean;
  /** botão 🔊/🔇 (todos os botões refletem o mesmo estado; a tecla M é tratada aqui, uma vez só) */
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
  // Destrava no gesto: toque conta no pointerup/touchend/click (não no pointerdown), tecla no keydown.
  const unlock = () => {
    if (!audio) {
      try {
        audio = createWebAudioBackend();
        mixer.use(audio);
      } catch {
        audio = undefined;
        listen(false); // sem WebAudio: segue mudo
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
      if (audio && !audio.running()) listen(true); // iOS: só retoma com novo gesto
    } else audio?.suspend(); // aba escondida: nada zumbindo em segundo plano
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
