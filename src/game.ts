import * as THREE from 'three';
import type { Role } from './config/balance';
import { createDebug } from './debug';
import { createKeyboardInput } from './input/keyboard';
import { createTouchButtons } from './input/touchButtons';
import { createChaseCamera } from './render/cameras';
import { createCarModel, updateCarModel } from './render/carFactory';
import { createQualityGovernor, createRenderer, type QualityTier } from './render/renderer';
import { createLighting } from './render/scene';
import { createRoad, renderOrigin } from './render/roadChunks';
import type { CarState } from './sim/car';
import { FixedStepper } from './sim/fixedStepper';
import type { Intents } from './sim/intents';
import { createWorld, stepWorld, type WorldState } from './sim/world';

const lerpCar = (a: CarState, b: CarState, t: number): CarState => ({
  ...b,
  s: a.s + (b.s - a.s) * t,
  x: a.x + (b.x - a.x) * t,
  speed: a.speed + (b.speed - a.speed) * t,
});

const anyOf = (a: Intents, b: Intents): Intents => ({
  left: a.left || b.left,
  right: a.right || b.right,
  brake: a.brake || b.brake,
  fire: a.fire || b.fire,
  bomb: a.bomb || b.bomb,
});

export function startGame(
  container: HTMLElement,
  opts: { role: Role; seed: number; debug: boolean; quality?: QualityTier },
): { stop(): void } {
  const view = createRenderer(container, opts.quality ?? 'high');
  const { renderer } = view;
  const scene = new THREE.Scene();
  const lighting = createLighting(scene, renderer);
  lighting.setQuality(view.quality);
  const governor = opts.quality ? undefined : createQualityGovernor(view.quality);

  const road = createRoad(scene, opts.seed);
  const model = createCarModel(opts.role);
  model.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
    for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) if ('envMap' in m) m.envMap = lighting.reflections;
  });
  scene.add(model);
  const chase = createChaseCamera();

  let world: WorldState = createWorld({ seed: opts.seed, playerRole: opts.role });
  let prev = world;

  const ui = document.createElement('div');
  ui.className = 'ui-layer';
  ui.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  container.append(ui);
  const keyboard = createKeyboardInput(window);
  const touch = createTouchButtons(ui, { role: opts.role });
  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.textContent = 'Gire o celular';
  hint.hidden = true;
  ui.append(hint);
  const readIntents = () => anyOf(keyboard.read(), touch.read());
  const debug = opts.debug ? createDebug(ui, renderer, () => world, readIntents, () => view.quality) : undefined;

  const stepper = new FixedStepper((dt) => {
    prev = world;
    world = stepWorld(world, readIntents(), dt);
  });

  let portrait = false;
  const resize = () => {
    view.resize();
    chase.camera.aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    chase.camera.updateProjectionMatrix();
    portrait = window.innerHeight > window.innerWidth;
    hint.hidden = !portrait;
  };
  resize();
  window.addEventListener('resize', resize);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') governor?.reset();
  };
  document.addEventListener('visibilitychange', onVisibility);

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const raw = (now - last) / 1000;
    const elapsed = Math.min(0.25, raw);
    last = now;
    const alpha = portrait ? 1 : stepper.advance(elapsed);
    const car = portrait ? world.player : lerpCar(prev.player, world.player, alpha);
    const origin = renderOrigin(car.s);
    road.update(car.s);
    updateCarModel(model, car, world.time, origin);
    chase.update(car, elapsed, origin);
    lighting.follow(car.x, -(car.s - origin));
    if (governor && !portrait) {
      const tier = governor.sample(raw); // tempo real (sem o teto de 0,25 s) para ignorar travadas longas
      if (tier !== view.quality) {
        view.setQuality(tier);
        lighting.setQuality(tier);
      }
    }
    renderer.render(scene, chase.camera);
    debug?.frame(elapsed);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      keyboard.dispose();
      touch.dispose();
      debug?.dispose();
      ui.remove();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
