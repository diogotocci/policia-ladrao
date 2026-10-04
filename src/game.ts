import * as THREE from 'three';
import { BALANCE, type Role } from './config/balance';
import { createDebug } from './debug';
import { createKeyboardInput } from './input/keyboard';
import { createTouchButtons } from './input/touchButtons';
import { createChaseCamera } from './render/cameras';
import { createCombatFx } from './render/combatFx';
import { createOpponentMarker } from './render/opponentMarker';
import { createRearview, isBehind, rearviewRect } from './render/rearview';
import { createWorldProps } from './render/worldProps';
import { createCarModel, updateCarModel } from './render/carFactory';
import { createQualityGovernor, createRenderer, type QualityTier } from './render/renderer';
import { createLighting } from './render/scene';
import { createRoad, renderOrigin } from './render/roadChunks';
import type { CarState } from './sim/car';
import { FixedStepper } from './sim/fixedStepper';
import type { Intents } from './sim/intents';
import { createWorld, stepWorld, type GameEvent, type ItemId, type WorldState } from './sim/world';
import { ITEM_LABEL, createHud } from './ui/hud';

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
  opts: {
    role: Role;
    seed: number;
    debug: boolean;
    quality?: QualityTier;
    debugHp?: { police?: number; thief?: number };
    debugGive?: ItemId[];
    traffic?: boolean;
  },
): { stop(): void } {
  const view = createRenderer(container, opts.quality ?? 'high');
  const { renderer } = view;
  const scene = new THREE.Scene();
  const lighting = createLighting(scene, renderer);
  lighting.setQuality(view.quality);
  const governor = opts.quality ? undefined : createQualityGovernor(view.quality);

  const road = createRoad(scene, opts.seed);
  const withReflections = (m: THREE.Object3D) =>
    m.traverse((o) => {
      if (o.name === 'contact-shadow') return;
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) if ('envMap' in x) x.envMap = lighting.reflections;
    });
  const opponentRole: Role = opts.role === 'police' ? 'thief' : 'police';
  const model = createCarModel(opts.role);
  const opponentModel = createCarModel(opponentRole);
  withReflections(model);
  withReflections(opponentModel);
  scene.add(model, opponentModel);
  const fx = createCombatFx(scene);
  const marker = createOpponentMarker(scene, opponentRole);
  const rearview = createRearview();
  const props = createWorldProps(scene, lighting.reflections);
  const chase = createChaseCamera();

  let world: WorldState = createWorld({
    seed: opts.seed,
    playerRole: opts.role,
    debugHp: opts.debugHp,
    debugGive: opts.debugGive,
    traffic: opts.traffic,
  });
  let frameEvents: GameEvent[] = [];
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
  const mirrorFrame = document.createElement('div');
  mirrorFrame.className = 'rearview-frame';
  mirrorFrame.hidden = true;
  ui.append(mirrorFrame);
  const hud = createHud(ui, opts.role);
  let fireVisible = false;
  let lastBombs = -1;
  const syncFireButton = () => {
    const me = world.player;
    if (me.hasGun !== fireVisible) {
      fireVisible = me.hasGun;
      touch.setVisible('fire', fireVisible);
    }
    if (me.role === 'thief') {
      touch.setLocked('fire', me.speed < BALANCE.combat.thiefMinSpeedToFire);
      if (me.upgrades.bombs !== lastBombs) {
        lastBombs = me.upgrades.bombs;
        touch.setBombs(lastBombs);
      }
    }
  };
  const buzz = (ms: number) => {
    // o navegador bloqueia (e reclama no console) vibração antes do primeiro toque/tecla do usuário
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* sem vibração */
    }
  };
  const onEvents = (events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'noTarget' && e.from === opts.role) touch.flashNoTarget();
      else if (e.type === 'hit' && e.target === opts.role) buzz(20);
      else if (e.type === 'pickup' && e.role === opts.role) {
        if (e.item === 'wrong') hud.toast('−2 caixinha errada');
        else if (e.item !== 'none') hud.toast(`+ ${ITEM_LABEL[e.item] ?? e.item}`);
      }
    }
  };
  const readIntents = () => anyOf(keyboard.read(), touch.read());
  const debug = opts.debug ? createDebug(ui, renderer, () => world, readIntents, () => view.quality) : undefined;

  const stepper = new FixedStepper((dt) => {
    prev = world;
    world = stepWorld(world, readIntents(), dt);
    if (world.events.length) frameEvents.push(...world.events);
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
    const foe = portrait ? world.opponent : lerpCar(prev.opponent, world.opponent, alpha);
    updateCarModel(opponentModel, foe, world.time, origin);
    marker.update(foe, Math.abs(foe.s - car.s), origin);
    props.update(world, origin, world.time);
    fx.update(world, frameEvents, origin, elapsed);
    onEvents(frameEvents);
    frameEvents = [];
    chase.update(car, elapsed, origin);
    chase.camera.position.add(fx.shake());
    syncFireButton();
    hud.update(world);
    lighting.follow(car.x, -(car.s - origin));
    if (governor && !portrait) {
      const tier = governor.sample(raw); // tempo real (sem o teto de 0,25 s) para ignorar travadas longas
      if (tier !== view.quality) {
        view.setQuality(tier);
        lighting.setQuality(tier);
      }
    }
    renderer.render(scene, chase.camera);
    const showMirror = isBehind(car, foe) && !world.match.over;
    mirrorFrame.hidden = !showMirror;
    if (showMirror) {
      const cssW = container.clientWidth;
      const cssH = container.clientHeight;
      const r = rearviewRect(cssW, cssH);
      mirrorFrame.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
      rearview.place(car, origin);
      marker.setVisible(false); // o marcador não aparece no espelho
      rearview.render(renderer, scene, cssW, cssH);
    }
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
      hud.dispose();
      debug?.dispose();
      ui.remove();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
