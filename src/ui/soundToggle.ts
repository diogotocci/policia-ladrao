// Sound button (speaker drawn in SVG) and the M key. The choice is saved; unavailable storage breaks nothing.
import { ICONS } from './icons';
import { onTap } from './mobileShell';

const KEY = 'pl.sound';

/** true = muted. Default: sound on. */
export function readSoundPref(storage: Storage | undefined): boolean {
  try {
    return storage?.getItem(KEY) === 'off';
  } catch {
    return false;
  }
}

export function writeSoundPref(storage: Storage | undefined, muted: boolean): void {
  try {
    storage?.setItem(KEY, muted ? 'off' : 'on');
  } catch {
    /* no storage: applies only to this session */
  }
}

export function createSoundToggle(
  parent: HTMLElement,
  opts: { muted: boolean; onChange: (muted: boolean) => void; keyTarget: EventTarget },
): { set(muted: boolean): void; dispose(): void } {
  let muted = opts.muted;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  const render = () => {
    btn.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
    btn.setAttribute('aria-label', muted ? 'Som desligado' : 'Som ligado');
    btn.setAttribute('aria-pressed', String(muted));
  };
  const toggle = () => {
    muted = !muted;
    render();
    opts.onChange(muted);
  };
  onTap(btn, () => {
    toggle();
    btn.blur(); // no focus on the button: Space keeps firing on PC
  });
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (k.code === 'KeyM' && !k.repeat && !k.ctrlKey && !k.metaKey && !k.altKey) toggle();
  };
  opts.keyTarget.addEventListener('keydown', onKey);
  render();
  parent.append(btn);
  return {
    set(m) {
      muted = m;
      render();
    },
    dispose() {
      opts.keyTarget.removeEventListener('keydown', onKey);
      btn.remove();
    },
  };
}
