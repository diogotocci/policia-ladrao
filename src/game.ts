import * as THREE from 'three';
import { BALANCE, type Difficulty, type Mode, type Role } from './config/balance';
import { createAudioSession, type AudioSession } from './audio/session';
import { createDebug } from './debug';
import { createKeyboardInput } from './input/keyboard';
import { createTouchButtons } from './input/touchButtons';
import { createChaseCamera } from './render/cameras';
import { createLookModel } from './render/carLook';
import type { CarLook } from './meta/shop';
import { createCombatFx } from './render/combatFx';
import { applyDamage, damageLook } from './render/damageView';
import { attachGunner, flashGunner, updateGunner } from './render/gunner';
import { createHeli } from './render/heli';
import { createParticles } from './render/particles';
import { createOpponentMarker } from './render/opponentMarker';
import { createRearview, isBehind, rearviewRect } from './render/rearview';
import { createWorldProps } from './render/worldProps';
import { createCarModel, updateCarModel } from './render/carFactory';
import { createQualityGovernor, createRenderer, type QualityTier } from './render/renderer';
import { createLighting } from './render/scene';
import { createRoad, renderOrigin } from './render/roadChunks';
import { createTrackFrame, setActiveTrackFrame, trackPos } from './render/trackFrame';
import { hpPct, type CarState } from './sim/car';
import { FixedStepper } from './sim/fixedStepper';
import type { Intents } from './sim/intents';
import { addEvents, emptyStats, type MatchStats } from './meta/rewards';
import { createWorld, stepWorld, type GameEvent, type ItemId, type WorldState } from './sim/world';
import { feedbackForFrame } from './ui/feedback';
import { ICONS } from './ui/icons';
import { onTap } from './ui/mobileShell';
import { createHud, pickupToast } from './ui/hud';
import { createItemsFx, INSTANT_POLICE } from './itemsFx';

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

export interface GameHandle {
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  stop(): void;
}

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
    /** curves (Delivery 6); false = straight road (?curves=0) */
    curves?: boolean;
    /** shorter escape time (debug/e2e only: ?escape=N) */
    escapeTime?: number;
    /** V2 part 2: Fácil / Médio / Difícil (default Médio) */
    difficulty?: Difficulty;
    /** V2 part 3: Perseguição (default) / Sobrevivência; chaosEvery only in debug */
    mode?: Mode;
    chaosEvery?: number;
    /** V2 part 4: the player's car from the shop (visual and sound only); default car without it */
    look?: CarLook;
    /** debug/e2e only: share of yellow boxes (?mystery=1) */
    mysteryShare?: number;
    /** starts muted (?mute), without touching the saved preference */
    mute?: boolean;
    /** app audio session (without it the game creates its own) */
    audio?: AudioSession;
    /** starts frozen (3-2-1 countdown); the app calls resume() at the start */
    startPaused?: boolean;
    /** the app decides what the pause shows; without it the game pauses/resumes by itself (Esc/P/⏸) */
    onPauseRequest?: () => void;
    /** match end (the app shows the end screen; without it the HUD shows the end card) */
    onEnd?: (result: {
      winner: Role;
      time: number;
      reason?: 'escape' | 'policeDown' | 'thiefDown';
      hp: number;
      /** player's life left, 0..1 (career: escape with more than 80%) */
      hpFrac?: number;
      level: number;
      stats: MatchStats;
    }) => void;
  },
): GameHandle {
  const view = createRenderer(container, opts.quality ?? 'high');
  const { renderer } = view;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  const lighting = createLighting(scene, renderer);
  lighting.setQuality(view.quality);
  const governor = opts.quality ? undefined : createQualityGovernor(view.quality);

  const curvesOn = opts.curves ?? true;
  const trackFrame = createTrackFrame(opts.seed, curvesOn);
  setActiveTrackFrame(trackFrame); // all rendering positions along the track curve
  const road = createRoad(scene, opts.seed, trackFrame);
  const withReflections = (m: THREE.Object3D) =>
    m.traverse((o) => {
      if (o.name === 'contact-shadow' || o.name === 'neon') return;
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) if ('envMap' in x) x.envMap = lighting.reflections;
    });
  const opponentRole: Role = opts.role === 'police' ? 'thief' : 'police';
  const model = createLookModel(opts.role, opts.look);
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
  // continuous smoke/spark emission from damaged cars (per-car accumulators)
  const emitAcc: Record<Role, { smoke: number; spark: number; skid: number; side: number; wreck: number }> = {
    police: { smoke: 0, spark: 0, skid: 0, side: 1, wreck: 0 },
    thief: { smoke: 0, spark: 0, skid: 0, side: 1, wreck: 0 },
  };
  let clock = 0; // render clock (muzzle flash)
  const damageFx = (c: CarState, dt: number) => {
    const look = damageLook(hpPct(c));
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
  rearview.setQuality(view.quality);
  const props = createWorldProps(scene, lighting.reflections);
  const chase = createChaseCamera((model.userData.camLift as number | undefined) ?? 0, (model.userData.camBack as number | undefined) ?? 0);
  const fog = scene.fog instanceof THREE.Fog ? scene.fog : null;
  const FOG_NEAR = fog?.near ?? 0;
  const FOG_FAR = fog?.far ?? 0;
  const heli = createHeli(scene);

  let world: WorldState = createWorld({
    seed: opts.seed,
    playerRole: opts.role,
    debugHp: opts.debugHp,
    debugGive: opts.debugGive,
    traffic: opts.traffic,
    curves: curvesOn,
    escapeTime: opts.escapeTime,
    difficulty: opts.difficulty,
    mode: opts.mode,
    chaosEvery: opts.chaosEvery,
    mysteryShare: opts.mysteryShare,
  });
  let frameEvents: GameEvent[] = [];
  let prev = world;

  const ui = document.createElement('div');
  ui.className = 'ui-layer';
  ui.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  container.append(ui);
  const keyboard = createKeyboardInput(window);
  const touch = createTouchButtons(ui, { role: opts.role });
  // upright window on a computer (on phones the game rotates by itself — styles.css): asks to rotate
  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.textContent = 'Deixe a tela deitada';
  hint.hidden = true;
  ui.append(hint);
  const flashEl = document.createElement('div');
  flashEl.className = 'damage-flash';
  ui.append(flashEl);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  /** red border for 0.25 s (weaker with reduced motion) */
  const flash = (amount: number) => {
    const a = reducedMotion ? amount * 0.5 : amount;
    if (typeof flashEl.animate === 'function') flashEl.animate([{ opacity: a }, { opacity: 0 }], { duration: 250, easing: 'ease-out' });
    else {
      flashEl.style.opacity = String(a);
      setTimeout(() => (flashEl.style.opacity = '0'), 250);
    }
  };
  const mirrorFrame = document.createElement('div');
  mirrorFrame.className = 'rearview-frame';
  mirrorFrame.hidden = true;
  ui.append(mirrorFrame);
  // without the app (debug/e2e): "Jogar de novo" restarts right here, without reloading the page (no network in between)
  const hud = createHud(ui, opts.role, {
    showEnd: !opts.onEnd,
    onRestart: () => {
      handle.stop();
      startGame(container, opts);
    },
  });

  // V2 part 3 items: special button, yellow box roulette, screen effects, oil and spikes
  const itemsFx = createItemsFx({ ui, scene, role: opts.role, touch, particles, fx, toast: (t, big) => hud.toast(t, { big }) });

  // pause: HUD button, Esc/P, hidden tab, portrait
  let paused = opts.startPaused === true;
  const setPaused = (p: boolean) => {
    paused = p;
    hud.setPaused(p);
    pauseBtn.setAttribute('aria-pressed', String(p));
  };
  const requestPause = () => {
    if (world.match.over || paused) return;
    if (opts.onPauseRequest) opts.onPauseRequest();
    else setPaused(true);
  };
  const onPauseKey = (e: KeyboardEvent) => {
    if ((e.code !== 'Escape' && e.code !== 'KeyP') || e.repeat) return;
    if (!paused) requestPause();
    else if (!opts.onPauseRequest) setPaused(false); // without the app: the same key resumes
  };
  window.addEventListener('keydown', onPauseKey);

  // audio: the app passes the session (lives across screens); without it (debug/e2e), the game creates and discards its own
  const ownAudio = !opts.audio;
  const audioSession = opts.audio ?? createAudioSession({ forceMute: opts.mute });
  const mixer = audioSession.mixer;
  mixer.setLook(opts.role, opts.look?.sound ?? null);
  const hudCenter = (ui.querySelector('.hud-center') as HTMLElement | null) ?? ui;
  const soundToggle = audioSession.mountToggle(hudCenter);
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'pause-toggle';
  pauseBtn.innerHTML = ICONS.pause;
  pauseBtn.setAttribute('aria-label', 'Pausar');
  // on touch (not click): right after releasing an arrow the click could be swallowed (pause hard to press)
  onTap(pauseBtn, () => {
    pauseBtn.blur();
    if (paused && !opts.onPauseRequest)
      setPaused(false); // without the app: the same button resumes
    else requestPause();
  });
  hudCenter.append(pauseBtn);
  let fireVisible = false;
  const syncFireButton = () => {
    const me = world.player;
    if (me.hasGun !== fireVisible) {
      fireVisible = me.hasGun;
      touch.setVisible('fire', fireVisible);
    }
    if (me.role === 'thief') {
      touch.setLocked('fire', me.speed < BALANCE.combat.thiefMinSpeedToFire);
    }
  };
  const buzz = (ms: number) => {
    // the browser blocks vibration (and complains in the console) before the user's first touch/key
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* no vibration */
    }
  };
  const onEvents = (events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'noTarget' && e.from === opts.role) touch.flashNoTarget();
      else if (e.type === 'pickup' && e.role === opts.role && !INSTANT_POLICE.has(e.item)) hud.toast(pickupToast(e.item));
    }
    const f = feedbackForFrame(events, opts.role);
    if (f.flash) flash(f.flash);
    if (f.buzz) buzz(f.buzz);
    if (f.toast) hud.toast(f.toast, { big: true });
    if (f.cue) mixer.cue(f.cue);
  };
  const readIntents = () => anyOf(keyboard.read(), touch.read());
  const debug = opts.debug
    ? createDebug(
        ui,
        () => world,
        readIntents,
        () => view.quality,
        () => ({
          particles: particles.alive(),
          gunners: { police: gunners.police.visible, thief: gunners.thief.visible },
          muted: mixer.muted(),
          cameraAspect: chase.camera.aspect,
        }),
      )
    : undefined;

  // damage dealt and right boxes, for the coins earned (V2 part 1)
  let stats = emptyStats();
  const stepper = new FixedStepper((dt) => {
    prev = world;
    world = stepWorld(world, readIntents(), dt);
    if (world.events.length) {
      frameEvents.push(...world.events);
      stats = addEvents(stats, world.events, opts.role);
    }
  });

  let portrait = false;
  let sizeW = -1;
  let sizeH = -1;
  const resize = () => {
    sizeW = container.clientWidth;
    sizeH = container.clientHeight;
    view.resize();
    chase.camera.aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    chase.camera.updateProjectionMatrix();
    const wasPortrait = portrait;
    // with the phone upright the game draws rotated (styles.css): the container stays landscape and the game keeps running.
    // Only a truly upright container (narrow window on a computer) freezes and shows the warning.
    portrait = container.clientHeight > container.clientWidth;
    hint.hidden = !portrait;
    // in the app, rotating to portrait opens the pause screen (returning to landscape does not resume the game by itself)
    if (portrait && !wasPortrait && opts.onPauseRequest) requestPause();
  };
  resize();
  window.addEventListener('resize', resize);
  // iOS (installed app / rotation) sometimes changes size without firing 'resize' in time: stretched image.
  // So we also check the container size every frame (cheap) and listen to rotation/visualViewport.
  window.addEventListener('orientationchange', resize);
  window.visualViewport?.addEventListener('resize', resize);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') governor?.reset();
    else requestPause(); // hidden tab: pause (the session suspends the audio)
  };
  document.addEventListener('visibilitychange', onVisibility);

  let raf = 0;
  let endReported = false;
  const reportEnd = () => {
    endReported = true;
    opts.onEnd?.({
      winner: world.match.winner!,
      time: world.match.endTime ?? world.time,
      reason: world.match.reason,
      hp: world.player.hp,
      hpFrac: world.player.maxHp > 0 ? world.player.hp / world.player.maxHp : 0,
      level: world.level,
      stats,
    });
  };
  let last = performance.now();
  const frame = (now: number) => {
    if (container.clientWidth !== sizeW || container.clientHeight !== sizeH) resize();
    const raw = (now - last) / 1000;
    const elapsed = Math.min(0.25, raw);
    last = now;
    // frozen (portrait, pause or countdown): simulation and effects stop; the frame keeps being drawn
    const frozen = portrait || paused;
    const dt = frozen ? 0 : elapsed;
    const alpha = frozen ? 1 : stepper.advance(elapsed);
    const car = frozen ? world.player : lerpCar(prev.player, world.player, alpha);
    const origin = renderOrigin(car.s);
    road.update(car.s);
    updateCarModel(model, car, world.time, origin);
    const foe = frozen ? world.opponent : lerpCar(prev.opponent, world.opponent, alpha);
    updateCarModel(opponentModel, foe, world.time, origin);
    clock += dt;
    applyDamage(model, frozen ? damageLook(hpPct(car)) : damageFx(car, dt), world.time);
    applyDamage(opponentModel, frozen ? damageLook(hpPct(foe)) : damageFx(foe, dt), world.time);
    updateGunner(gunners[car.role], car, foe, clock);
    updateGunner(gunners[foe.role], foe, car, clock);
    marker.update(foe, Math.abs(foe.s - car.s), origin);
    // escape (1:30): the fog closes in and the thief vanishes on the horizon; no marker
    if (world.match.escapeAt !== undefined) {
      marker.setVisible(false);
      const k = Math.min(1, (world.time - world.match.escapeAt) / (BALANCE.match.escapeScene * 0.7)); // vanishes before the end screen
      if (fog) {
        fog.near = FOG_NEAR + (12 - FOG_NEAR) * k;
        fog.far = FOG_FAR + (85 - FOG_FAR) * k;
      }
    }
    heli.update(car.role === 'police' ? car : foe, world.time, origin, dt);
    // end with a destroyed car (arrest: the thief; police destroyed: the patrol car) — thick black smoke while the scene runs
    const wreckRole: Role | undefined =
      world.match.arrestAt !== undefined
        ? 'thief'
        : world.match.escapeAt !== undefined && world.match.reason === 'policeDown'
          ? 'police'
          : undefined;
    if (wreckRole && !frozen) {
      const wc = car.role === wreckRole ? car : foe;
      const acc = emitAcc[wreckRole];
      acc.wreck += dt * 28 * particles.emissionScale();
      for (; acc.wreck >= 1; acc.wreck--) particles.emitSmoke(wc.x + (acc.side = -acc.side) * 0.5, 1.1, wc.s + 1.6, 'black');
    }
    // tire squeal: white smoke from the rear wheels while skidding
    for (let k = 0; k < 2 && !frozen; k++) {
      const c = k === 0 ? car : foe;
      if (!c.skidding) continue;
      const acc = emitAcc[c.role];
      acc.skid += dt * 26 * particles.emissionScale();
      for (; acc.skid >= 1; acc.skid--) particles.emitSmoke(c.x + (acc.side = -acc.side) * 0.8, 0.25, c.s - 1.5, 'white');
    }
    props.update(world, origin, world.time, frozen ? undefined : prev, alpha);
    itemsFx.frame(world, car, foe, frameEvents, origin, dt, frozen);
    fx.update(world, frameEvents, origin, dt);
    for (const e of frameEvents) {
      if (e.type === 'shot' && !e.air) flashGunner(gunners[e.from], clock);
      else if (e.type === 'explosion') particles.emitBurst(e.x, e.s, 'explosion');
      else if (e.type === 'crash') particles.emitBurst(e.x, e.s, 'crash');
    }
    particles.update(dt, origin, chase.camera);
    onEvents(frameEvents);
    mixer.frame(world, dt, frozen);
    mixer.events(frameEvents);
    frameEvents = [];
    chase.update(car, dt, origin);
    chase.camera.position.add(fx.shake());
    syncFireButton();
    hud.update(world);
    if (world.match.over && !endReported) reportEnd();
    const here = trackPos(car.s, car.x, origin);
    lighting.follow(here.x, here.z, here.heading);
    if (governor && !frozen) {
      const tier = governor.sample(raw); // real time (without the 0.25 s cap) to ignore long stalls
      if (tier !== view.quality) {
        view.setQuality(tier);
        lighting.setQuality(tier);
        particles.setQuality(tier);
        rearview.setQuality(tier);
      }
    }
    // draw-call count per pass: info accumulates over the frame and is reset here
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
      marker.setVisible(false); // the marker does not appear in the mirror
      rearview.render(renderer, scene, cssW, cssH);
    }
    debug?.frame(elapsed, { main: mainCalls, mirror: renderer.info.render.calls - mainCalls });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const handle: GameHandle = {
    pause: () => setPaused(true),
    resume() {
      setPaused(false);
      keyboard.dropTaps(); // taps made during the countdown/pause do not fire at the start
      touch.dropTaps();
      last = performance.now(); // no time jump on return
    },
    isPaused: () => paused,
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onPauseKey);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      keyboard.dispose();
      touch.dispose();
      hud.dispose();
      itemsFx.dispose();
      soundToggle.dispose();
      mixer.reset();
      if (ownAudio) audioSession.dispose();
      debug?.dispose();
      ui.remove();
      renderer.dispose();
      renderer.forceContextLoss(); // frees the GPU now (the browser limits live WebGL contexts)
      renderer.domElement.remove();
    },
  };
  return handle;
}
