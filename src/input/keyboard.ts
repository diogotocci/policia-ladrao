import type { Intents } from '../sim/intents';

type IntentName = keyof Intents;

const KEYMAP: Record<string, IntentName> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'brake',
  KeyS: 'brake',
  Space: 'fire',
  KeyB: 'bomb',
};

export function createKeyboardInput(target: Window | HTMLElement): { read(): Intents; dropTaps(): void; dispose(): void } {
  const held = new Set<string>();
  /** quick taps (down and up between two reads) count once */
  const tapped = new Set<IntentName>();

  const onDown = (e: Event) => {
    const code = (e as KeyboardEvent).code;
    // Space/Enter on a focused button (e.g. "Jogar de novo") belongs to the button, not the game
    const el = (e.target as Element | null) ?? null;
    if (code === 'Space' && el && 'closest' in el && el.closest('button')) return;
    if (code in KEYMAP) {
      held.add(code);
      tapped.add(KEYMAP[code]!);
      e.preventDefault();
    }
  };
  const onUp = (e: Event) => {
    held.delete((e as KeyboardEvent).code);
  };
  const onBlur = () => {
    held.clear();
    tapped.clear();
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);

  return {
    read() {
      const out: Intents = { left: false, right: false, brake: false, fire: false, bomb: false };
      for (const code of held) {
        const name = KEYMAP[code];
        if (name) out[name] = true;
      }
      for (const name of tapped) out[name] = true;
      tapped.clear();
      return out;
    },
    /** forgets stored quick taps (made during the countdown/pause); keys still held remain valid */
    dropTaps() {
      tapped.clear();
    },
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
      held.clear();
      tapped.clear();
    },
  };
}
