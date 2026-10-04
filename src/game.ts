import * as THREE from 'three';
import { BALANCE, type Role } from './config/balance';
import { createMixer } from './audio/mixer';
import { createNullBackend, createWebAudioBackend, type AudioBackend } from './audio/synth';
import { createDebug } from './debug';
import { createKeyboardInput } from './input/keyboard';
import { createTouchButtons } from './input/touchButtons';
import { createChaseCamera } from './render/cameras';
import { createCombatFx } from './render/combatFx';
import { applyDamage, damageLook } from './render/damageView';
import { attachGunner, flashGunner, updateGunner } from './render/gunner';
import { createParticles } from './render/particles';
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
import { createHud, pickupToast } from './ui/hud';
import { createSoundToggle, readSoundPref, writeSoundPref } from './ui/soundToggle';

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
    /** começa mudo (?mute), sem mexer na preferência salva */
    mute?: boolean;
  },
): { stop(): void } {
  const view = createRenderer(container, opts.quality ?? 'high');
  const { renderer } = view;
  renderer.info.autoReset = false;
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
  const gunners: Record<Role, THREE.Group> = {
    [opts.role]: attachGunner(model, opts.role),
    [opponentRole]: attachGunner(opponentModel, opponentRole),
  } as Record<Role, THREE.Group>;
  const fx = createCombatFx(scene);
  const particles = createParticles(scene);
  particles.setQuality(view.quality);
  // emissão contínua de fumaça/faíscas dos carros danificados (acumuladores por carro)
  const emitAcc: Record<Role, { smoke: number; spark: number }> = { police: { smoke: 0, spark: 0 }, thief: { smoke: 0, spark: 0 } };
  let clock = 0; // relógio de render (clarão do cano)
  const damageFx = (c: CarState, dt: number) => {
    const look = damageLook(c.hp);
    const acc = emitAcc[c.role];
    if (look.whiteSmoke || look.blackSmoke) {
      acc.smoke += dt * (look.blackSmoke ? 20 : 12) * particles.emissionScale();
      for (; acc.smoke >= 1; acc.smoke--) particles.emitSmoke(c.x, 1.0, c.s + 1.9, look.blackSmoke ? 'black' : 'white');
    }
    if (look.sparks) {
      acc.spark += dt * 3;
      for (; acc.spark >= 1; acc.spark--) fx.sparkAt(c.s + 1.6, c.x);
    }
    return look;
  };
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

  // áudio: mixer começa num backend nulo; o WebAudio nasce no 1º gesto (regra dos navegadores)
  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  })();
  const mixer = createMixer(createNullBackend());
  mixer.setMuted(opts.mute === true || readSoundPref(storage));
  let audio: AudioBackend | undefined;
  // Destrava no gesto: toque conta no pointerup/touchend/click (não no pointerdown), tecla no keydown.
  // O resume() é chamado dentro do próprio handler; os ouvintes só saem quando o áudio está rodando.
  const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;
  const unlockAudio = () => {
    if (!audio) {
      try {
        audio = createWebAudioBackend();
        mixer.use(audio);
      } catch {
        audio = undefined;
        for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlockAudio, true); // sem WebAudio: segue mudo
        return;
      }
    }
    audio.resume();
    if (audio.running()) for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlockAudio, true);
  };
  for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, unlockAudio, true);
  const soundToggle = createSoundToggle((ui.querySelector('.hud-center') as HTMLElement | null) ?? ui, {
    muted: mixer.muted(),
    keyTarget: window,
    onChange: (m) => {
      mixer.setMuted(m);
      if (!opts.mute) writeSoundPref(storage, m);
    },
  });
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
        hud.toast(pickupToast(e.item));
      }
    }
  };
  const readIntents = () => anyOf(keyboard.read(), touch.read());
  const debug = opts.debug ? createDebug(ui, () => world, readIntents, () => view.quality, () => ({
        particles: particles.alive(),
        gunners: { police: gunners.police.visible, thief: gunners.thief.visible },
        muted: mixer.muted(),
      })) : undefined;

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
    if (document.visibilityState === 'visible') {
      governor?.reset();
      audio?.resume();
      // alguns navegadores (iOS) só retomam com um novo gesto: volta a escutar até destravar
      if (audio && !audio.running()) for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, unlockAudio, true);
    } else audio?.suspend(); // aba escondida: sem motor/sirene zumbindo em segundo plano
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
    clock += elapsed;
    applyDamage(model, portrait ? damageLook(car.hp) : damageFx(car, elapsed), world.time);
    applyDamage(opponentModel, portrait ? damageLook(foe.hp) : damageFx(foe, elapsed), world.time);
    updateGunner(gunners[car.role], car, foe, clock);
    updateGunner(gunners[foe.role], foe, car, clock);
    marker.update(foe, Math.abs(foe.s - car.s), origin);
    props.update(world, origin, world.time, portrait ? undefined : prev, alpha);
    fx.update(world, frameEvents, origin, elapsed);
    for (const e of frameEvents) {
      if (e.type === 'shot') flashGunner(gunners[e.from], clock);
      else if (e.type === 'explosion') particles.emitBurst(e.x, e.s, 'explosion');
      else if (e.type === 'crash') particles.emitBurst(e.x, e.s, 'crash');
    }
    particles.update(elapsed, origin, chase.camera);
    onEvents(frameEvents);
    mixer.frame(world, portrait ? 0 : elapsed, portrait);
    mixer.events(frameEvents);
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
        particles.setQuality(tier);
      }
    }
    // contagem de draw calls por passe: o info acumula no quadro e é zerado aqui
    renderer.info.reset();
    renderer.render(scene, chase.camera);
    const mainCalls = renderer.info.render.calls;
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
    debug?.frame(elapsed, { main: mainCalls, mirror: renderer.info.render.calls - mainCalls });
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
      soundToggle.dispose();
      for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlockAudio, true);
      mixer.reset();
      audio?.close();
      debug?.dispose();
      ui.remove();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
