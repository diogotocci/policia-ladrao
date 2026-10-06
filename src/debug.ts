import type { Intents } from './sim/intents';
import type { WorldState } from './sim/world';

/** FPS/draw-call overlay and window.__game handle for tests (only with ?debug). */
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
    /** draw calls of the main pass (scene + shadows) in the last frame */
    drawCalls: () => lastCalls,
    /** draw calls of the rear-view mirror in the last frame (0 when hidden) */
    mirrorDrawCalls: () => mirrorCalls,
    intents: () => ({ ...getIntents() }),
    quality: () => getQuality(),
    /** visual state for e2e tests (live particles, visible shooters...) */
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
