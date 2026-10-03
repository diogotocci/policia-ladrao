import type * as THREE from 'three';
import type { Intents } from './sim/intents';
import type { WorldState } from './sim/world';

/** Overlay de FPS/draw calls e handle window.__game para testes (só com ?debug). */
export function createDebug(
  root: HTMLElement,
  renderer: THREE.WebGLRenderer,
  getWorld: () => WorldState,
  getIntents: () => Intents,
  getQuality: () => string = () => '',
): { frame(dtSeconds: number): void; dispose(): void } {
  const el = document.createElement('div');
  el.className = 'debug-overlay';
  root.append(el);
  let lastCalls = 0;
  let acc = 0;
  let frames = 0;

  (window as unknown as { __game?: unknown }).__game = {
    snapshot: () => structuredClone(getWorld()),
    drawCalls: () => lastCalls,
    intents: () => ({ ...getIntents() }),
    quality: () => getQuality(),
  };

  return {
    frame(dt) {
      lastCalls = renderer.info.render.calls;
      acc += dt;
      frames++;
      if (acc >= 0.5) {
        const w = getWorld();
        el.textContent = `${Math.round(frames / acc)} fps · ${getQuality()} · ${lastCalls} draws · ${w.player.speed.toFixed(1)} m/s · s ${w.player.s.toFixed(0)}`;
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
