// Shader warm-up: every material in the scene is compiled before the match starts (during the countdown), hidden
// objects included (three's compile goes through all of them), so the first explosion, item box or helicopter does
// not stall the game while its shader compiles. On a weak phone one compile can take 100-300 ms, felt as a freeze.
import type * as THREE from 'three';

/** a second way the scene is drawn: the rear-view mirror draws it into a texture (other shader variants) */
export interface ExtraPass {
  target: THREE.WebGLRenderTarget;
  camera: THREE.Camera;
  /** what then draws that texture on screen */
  overlay?: { scene: THREE.Scene; camera: THREE.Camera };
}

/**
 * Compiles the programs of everything in `scene` for `camera`, and for each extra pass. Uses the parallel compile
 * extension when the browser has it, so the page keeps drawing meanwhile.
 */
export function warmUpShaders(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  extra: ExtraPass[] = [],
): Promise<unknown> {
  // without the parallel compile extension three warns on compileAsync: compile directly (it is the countdown anyway)
  const parallel = renderer.extensions.has('KHR_parallel_shader_compile');
  const compile = (s: THREE.Scene, c: THREE.Camera): Promise<unknown> =>
    parallel ? renderer.compileAsync(s, c) : Promise.resolve(renderer.compile(s, c));
  const done: Promise<unknown>[] = [compile(scene, camera)];
  const before = renderer.getRenderTarget();
  try {
    for (const p of extra) {
      // drawing into a texture uses its own variants (no tone mapping, linear colour): compiled with that target set
      renderer.setRenderTarget(p.target);
      done.push(compile(scene, p.camera));
      renderer.setRenderTarget(before);
      if (p.overlay) done.push(compile(p.overlay.scene, p.overlay.camera));
    }
  } finally {
    renderer.setRenderTarget(before);
  }
  return Promise.all(done).catch(() => undefined);
}

/** the loading screen never waits longer than this (a phone too slow to finish still gets to play) */
export const PREPARE_LIMIT_MS = 6000;

/**
 * Sets the match up before the countdown: compiles every shader (see warmUpShaders), then draws everything once into
 * a tiny hidden picture, hidden objects included and without skipping what is off camera, so every model and texture
 * is already on the GPU (and the shadow pass compiled) when it first shows up. `progress` goes 0..1 for the loading bar.
 */
export function prepareMatch(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  extra: ExtraPass[],
  makeTarget: () => THREE.WebGLRenderTarget,
  /** false once the match was left (the renderer may be gone by the time the shaders are compiled) */
  alive: () => boolean = () => true,
  now: () => number = () => performance.now(),
): { ready: Promise<void>; progress(): number } {
  const t0 = now();
  let done = false;
  let compiled = false;
  const upload = () => {
    const target = makeTarget();
    const before = renderer.getRenderTarget();
    const changed: [THREE.Object3D, boolean, boolean][] = [];
    try {
      scene.traverse((o) => {
        changed.push([o, o.visible, o.frustumCulled]);
        o.visible = true;
        o.frustumCulled = false;
      });
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(before);
      for (const [o, visible, culled] of changed) {
        o.visible = visible;
        o.frustumCulled = culled;
      }
      target.dispose();
    }
  };
  const work = warmUpShaders(renderer, scene, camera, extra)
    .then(() => {
      compiled = true;
      // past the time limit the match has already moved on: a full draw now would be the very hitch this avoids
      if (alive() && !done) upload();
    })
    .catch(() => undefined);
  const limit = new Promise<void>((resolve) => setTimeout(resolve, PREPARE_LIMIT_MS));
  const ready = Promise.race([work, limit]).then(() => {
    done = true;
  });
  return {
    ready,
    progress() {
      if (done) return 1;
      // compiling has no count of its own: the bar eases toward 85% meanwhile, and jumps on when it is over
      const t = (now() - t0) / 1000;
      return compiled ? 0.92 : 0.85 * (1 - Math.exp(-t / 1.5));
    },
  };
}
