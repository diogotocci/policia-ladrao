// O que o jogador sente em cada evento: borda vermelha na tela (funciona em qualquer aparelho, inclusive iPhone,
// que não vibra pela web), vibração onde houver, avisos e sons especiais. Puro: o jogo só executa.
import { BALANCE, type Role } from '../config/balance';
import type { GameEvent } from '../sim/types';

export interface Feedback {
  /** intensidade do piscar vermelho da borda (0–1) */
  flash?: number;
  /** vibração (ms), onde houver */
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
      // bomba só explode quando pega a polícia
      return me === 'thief'
        ? { toast: `💥 Bomba acertou! −${BALANCE.items.bomb.damage}`, cue: 'bomb-hit', buzz: 60 }
        : { flash: 1, buzz: 80 };
    default:
      return null;
  }
}

/** junta os eventos de um quadro: o mais forte vale (bomba = explosão + acerto não vira um pisca fraco) */
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
