import type { Intents } from './sim/intents';
import type { WorldState } from './sim/world';

/** Overlay de FPS/draw calls e handle window.__game para testes (só com ?debug). */
export function createDebug(
  root: HTMLElement,
  getWorld: () => WorldState,
  getIntents: () => Intents,
  getQuality: () => string = () => '',
  getVisuals: () => Record<string, unknown> = () => ({}),
): { frame(dtSeconds: number, calls: { main: number; mirror: number }): void; dispose(): void } {
  const el = document.createElement('div');
  el.className = 'debug-overlay';
  root.append(el);
  let lastCalls = 0;
  let mirrorCalls = 0;
  let acc = 0;
  let frames = 0;

  (window as unknown as { __game?: unknown }).__game = {
    snapshot: () => structuredClone(getWorld()),
    /** draw calls do passe principal (cena + sombras) no último quadro */
    drawCalls: () => lastCalls,
    /** draw calls do retrovisor no último quadro (0 quando escondido) */
    mirrorDrawCalls: () => mirrorCalls,
    intents: () => ({ ...getIntents() }),
    quality: () => getQuality(),
    /** estado visual para os testes e2e (partículas vivas, atiradores visíveis…) */
    visuals: () => getVisuals(),
  };

  return {
    frame(dt, calls) {
      lastCalls = calls.main;
      mirrorCalls = calls.mirror;
      acc += dt;
      frames++;
      if (acc >= 0.5) {
        const w = getWorld();
        el.textContent = `${Math.round(frames / acc)} fps · ${getQuality()} · ${lastCalls}${mirrorCalls ? `+${mirrorCalls}` : ''} draws · ${w.player.speed.toFixed(1)} m/s · s ${w.player.s.toFixed(0)}`;
        acc = 0;
        frames = 0;
      }
    },
    dispose() {
      el.remove();
      delete (window as unknown as { __game?: unknown }).__game;
    },
  };
}
