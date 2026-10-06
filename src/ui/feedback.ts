// What the player feels on each event: red screen border (works on any device, including iPhone,
// which cannot vibrate via the web), vibration where available, warnings and special sounds. Pure: the game only executes it.
import { BALANCE, type Role } from '../config/balance';
import type { GameEvent } from '../sim/types';

export interface Feedback {
  /** intensity of the red border flash (0–1) */
  flash?: number;
  /** vibration (ms), where available */
  buzz?: number;
  toast?: string;
  cue?: 'bomb-hit';
}

export function feedbackFor(e: GameEvent, me: Role): Feedback | null {
  switch (e.type) {
    case 'hit':
      if (e.target !== me) return null;
      return { flash: Math.min(1, 0.3 + e.amount / 12), buzz: 20 };
    case 'crash':
      if (e.a !== me && e.b !== me) return null;
      return { flash: 0.6, buzz: 40 };
    case 'explosion':
      // the bomb only explodes when it hits the police
      return me === 'thief'
        ? { toast: `💥 Bomba acertou! −${BALANCE.items.bomb.damage}`, cue: 'bomb-hit', buzz: 60 }
        : { flash: 1, buzz: 80 };
    default:
      return null;
  }
}

/** merges a frame's events: the strongest wins (bomb = explosion + hit does not become a weak flash) */
export function feedbackForFrame(events: readonly GameEvent[], me: Role): Feedback {
  const out: Feedback = {};
  for (const e of events) {
    const f = feedbackFor(e, me);
    if (!f) continue;
    if (f.flash !== undefined) out.flash = Math.max(out.flash ?? 0, f.flash);
    if (f.buzz !== undefined) out.buzz = Math.max(out.buzz ?? 0, f.buzz);
    if (f.toast) out.toast = f.toast;
    if (f.cue) out.cue = f.cue;
  }
  return out;
}
