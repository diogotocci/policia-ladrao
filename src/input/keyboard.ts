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

export function createKeyboardInput(target: Window | HTMLElement): { read(): Intents; dispose(): void } {
  const held = new Set<string>();

  const onDown = (e: Event) => {
    const code = (e as KeyboardEvent).code;
    if (code in KEYMAP) {
      held.add(code);
      e.preventDefault();
    }
  };
  const onUp = (e: Event) => {
    held.delete((e as KeyboardEvent).code);
  };
  const onBlur = () => held.clear();

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
      return out;
    },
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
      held.clear();
    },
  };
}
