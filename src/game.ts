import * as THREE from 'three';
import { BALANCE, type Role } from './config/balance';
import { createAudioSession, type AudioSession } from './audio/session';
import { createDebug } from './debug';
import { createKeyboardInput } from './input/keyboard';
import { createTouchButtons } from './input/touchButtons';
import { createChaseCamera } from './render/cameras';
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
import type { CarState } from './sim/car';
import { FixedStepper } from './sim/fixedStepper';
import type { Intents } from './sim/intents';
import { createWorld, stepWorld, type GameEvent, type ItemId, type WorldState } from './sim/world';
import { feedbackForFrame } from './ui/feedback';
import { ICONS } from './ui/icons';
import { onTap } from './ui/mobileShell';
import { createHud, pickupToast } from './ui/hud';

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
    /** curvas (Entrega 6); false = rua reta (?curves=0) */
    curves?: boolean;
    /** tempo de fuga mais curto (só debug/e2e: ?escape=N) */
    escapeTime?: number;
    /** começa mudo (?mute), sem mexer na preferência salva */
    mute?: boolean;
    /** sessão de áudio da app (sem ela o jogo cria a própria) */
    audio?: AudioSession;
    /** começa congelado (contagem 3-2-1); a app chama resume() na largada */
    startPaused?: boolean;
    /** a app decide o que a pausa mostra; sem isso o jogo pausa/retoma sozinho (Esc/P/⏸) */
    onPauseRequest?: () => void;
    /** fim de partida (a app mostra a tela de fim; sem isso o HUD mostra o cartão de fim) */
    onEnd?: (result: { winner: Role; time: number; reason?: 'escape' | 'policeDown' | 'thiefDown'; hp: number }) => void;
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
  setActiveTrackFrame(trackFrame); // todo o render posiciona pela curva da pista
  const road = createRoad(scene, opts.seed, trackFrame);
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
  const emitAcc: Record<Role, { smoke: number; spark: number; skid: number; side: number; wreck: number }> = {
    police: { smoke: 0, spark: 0, skid: 0, side: 1, wreck: 0 },
    thief: { smoke: 0, spark: 0, skid: 0, side: 1, wreck: 0 },
  };
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
  rearview.setQuality(view.quality);
  const props = createWorldProps(scene, lighting.reflections);
  const chase = createChaseCamera();
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
  });
  let frameEvents: GameEvent[] = [];
  let prev = world;

  const ui = document.createElement('div');
  ui.className = 'ui-layer';
  ui.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  container.append(ui);
  const keyboard = createKeyboardInput(window);
  const touch = createTouchButtons(ui, { role: opts.role });
  // janela em pé num computador (no celular o jogo gira sozinho — styles.css): pede para deitar
  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.textContent = 'Deixe a tela deitada';
  hint.hidden = true;
  ui.append(hint);
  const flashEl = document.createElement('div');
  flashEl.className = 'damage-flash';
  ui.append(flashEl);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  /** borda vermelha por 0,25 s (com movimento reduzido: mais fraca) */
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
  // sem a app (debug/e2e): "Jogar de novo" recomeça aqui mesmo, sem recarregar a página (nada de rede no meio)
  const hud = createHud(ui, opts.role, {
    showEnd: !opts.onEnd,
    onRestart: () => {
      handle.stop();
      startGame(container, opts);
    },
  });

  // pausa: botão ⏸ no HUD, Esc/P, aba escondida, retrato
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
    else if (!opts.onPauseRequest) setPaused(false); // sem app: a mesma tecla retoma
  };
  window.addEventListener('keydown', onPauseKey);

  // áudio: a app passa a sessão (vive entre telas); sem ela (debug/e2e), o jogo cria e descarta a sua
  const ownAudio = !opts.audio;
  const audioSession = opts.audio ?? createAudioSession({ forceMute: opts.mute });
  const mixer = audioSession.mixer;
  const hudCenter = (ui.querySelector('.hud-center') as HTMLElement | null) ?? ui;
  const soundToggle = audioSession.mountToggle(hudCenter);
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'pause-toggle';
  pauseBtn.innerHTML = ICONS.pause;
  pauseBtn.setAttribute('aria-label', 'Pausar');
  // no toque (não no click): logo depois de soltar uma seta o click podia ser engolido (pausa difícil de apertar)
  onTap(pauseBtn, () => {
    pauseBtn.blur();
    if (paused && !opts.onPauseRequest)
      setPaused(false); // sem app: o mesmo botão retoma
    else requestPause();
  });
  hudCenter.append(pauseBtn);
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
      else if (e.type === 'pickup' && e.role === opts.role) hud.toast(pickupToast(e.item));
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

  const stepper = new FixedStepper((dt) => {
    prev = world;
    world = stepWorld(world, readIntents(), dt);
    if (world.events.length) frameEvents.push(...world.events);
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
    // com o celular em pé o jogo se desenha girado (styles.css): o container continua deitado e o jogo segue.
    // Só um container realmente em pé (janela estreita no computador) congela e mostra o aviso.
    portrait = container.clientHeight > container.clientWidth;
    hint.hidden = !portrait;
    // na app, girar para retrato abre a tela de pausa (ao voltar para paisagem o jogo não recomeça sozinho)
    if (portrait && !wasPortrait && opts.onPauseRequest) requestPause();
  };
  resize();
  window.addEventListener('resize', resize);
  // iOS (app instalado / rotação) às vezes muda o tamanho sem disparar 'resize' a tempo: imagem esticada.
  // Por isso também conferimos o tamanho do container a cada quadro (barato) e ouvimos rotação/visualViewport.
  window.addEventListener('orientationchange', resize);
  window.visualViewport?.addEventListener('resize', resize);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') governor?.reset();
    else requestPause(); // aba escondida: pausa (o áudio a sessão suspende)
  };
  document.addEventListener('visibilitychange', onVisibility);

  let raf = 0;
  let endReported = false;
  let last = performance.now();
  const frame = (now: number) => {
    if (container.clientWidth !== sizeW || container.clientHeight !== sizeH) resize();
    const raw = (now - last) / 1000;
    const elapsed = Math.min(0.25, raw);
    last = now;
    // congelado (retrato, pausa ou contagem): a simulação e os efeitos param; o quadro continua desenhado
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
    applyDamage(model, frozen ? damageLook(car.hp) : damageFx(car, dt), world.time);
    applyDamage(opponentModel, frozen ? damageLook(foe.hp) : damageFx(foe, dt), world.time);
    updateGunner(gunners[car.role], car, foe, clock);
    updateGunner(gunners[foe.role], foe, car, clock);
    marker.update(foe, Math.abs(foe.s - car.s), origin);
    // fuga (1:30): a neblina fecha e o ladrão some no horizonte; sem marcador
    if (world.match.escapeAt !== undefined) {
      marker.setVisible(false);
      const k = Math.min(1, (world.time - world.match.escapeAt) / (BALANCE.match.escapeScene * 0.7)); // some antes da tela de fim
      if (fog) {
        fog.near = FOG_NEAR + (12 - FOG_NEAR) * k;
        fog.far = FOG_FAR + (85 - FOG_FAR) * k;
      }
    }
    heli.update(car.role === 'police' ? car : foe, world.time, origin, dt);
    // fim com um carro destruído (prisão: o ladrão; polícia destruída: a viatura) — fumaça preta grossa enquanto a cena roda
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
    // pneus cantando: fumaça branca das rodas de trás enquanto derrapa
    for (let k = 0; k < 2 && !frozen; k++) {
      const c = k === 0 ? car : foe;
      if (!c.skidding) continue;
      const acc = emitAcc[c.role];
      acc.skid += dt * 26 * particles.emissionScale();
      for (; acc.skid >= 1; acc.skid--) particles.emitSmoke(c.x + (acc.side = -acc.side) * 0.8, 0.25, c.s - 1.5, 'white');
    }
    props.update(world, origin, world.time, frozen ? undefined : prev, alpha);
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
    if (world.match.over && !endReported) {
      endReported = true;
      opts.onEnd?.({
        winner: world.match.winner!,
        time: world.match.endTime ?? world.time,
        reason: world.match.reason,
        hp: world.player.hp,
      });
    }
    const here = trackPos(car.s, car.x, origin);
    lighting.follow(here.x, here.z, here.heading);
    if (governor && !frozen) {
      const tier = governor.sample(raw); // tempo real (sem o teto de 0,25 s) para ignorar travadas longas
      if (tier !== view.quality) {
        view.setQuality(tier);
        lighting.setQuality(tier);
        particles.setQuality(tier);
        rearview.setQuality(tier);
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

  const handle: GameHandle = {
    pause: () => setPaused(true),
    resume() {
      setPaused(false);
      keyboard.dropTaps(); // toques feitos na contagem/pausa não disparam na largada
      touch.dropTaps();
      last = performance.now(); // sem salto de tempo ao voltar
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
      soundToggle.dispose();
      mixer.reset();
      if (ownAudio) audioSession.dispose();
      debug?.dispose();
      ui.remove();
      renderer.dispose();
      renderer.forceContextLoss(); // libera a GPU já (o navegador limita contextos WebGL vivos)
      renderer.domElement.remove();
    },
  };
  return handle;
}
