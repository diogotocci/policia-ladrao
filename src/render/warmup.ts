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
