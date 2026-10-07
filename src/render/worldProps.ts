// World objects with fixed pools: traffic, item boxes, bombs, speed bumps and warning signs.
import * as THREE from 'three';
import { createWorksView } from './hazardsView';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';
import { curvesBetween } from '../sim/curves';
import { bumpXRange, bumpsBetween } from '../sim/track';
import type { WorldState } from '../sim/types';
import { createTrafficModel, updateCarModel } from './carFactory';
import { trackPos } from './trackFrame';
import { createCar } from '../sim/car';
import { createMysteryBox, pulseMysteryHalo } from './mysteryBox';

const TRAFFIC_SLOTS = BALANCE.traffic.maxCount; // every traffic car is drawn (never an invisible one)
const FOG_FAR = 300; // m: scene.ts fog far
const MODELS = 4;
const BOXES = 2;
const BOMBS = 6; // up to 3 in stock + those still on the road (last 20 s)
const BUMPS = 4;
const CURVE_SIGNS = 3;
const CURVE_SIGN_BEFORE = 90; // m before the sharp curve

function stripeTexture(): THREE.DataTexture {
  const W = 32;
  const H = 4;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const yellow = Math.floor(x / 4) % 2 === 0;
      data.set(yellow ? [242, 194, 48, 255] : [25, 25, 28, 255], (y * W + x) * 4);
    }
  const t = new THREE.DataTexture(data, W, H);
  t.wrapS = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Warning sign: yellow diamond with a black border and a speed bump drawing (outside the diamond is transparent). */
function bumpSignTexture(): THREE.DataTexture {
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  for (let py = 0; py < N; py++)
    for (let px = 0; px < N; px++) {
      const x = ((px + 0.5) / N) * 2 - 1;
      const y = ((py + 0.5) / N) * 2 - 1; // y up (DataTexture starts at the bottom)
      const r = Math.abs(x) + Math.abs(y);
      let c: [number, number, number, number] = [0, 0, 0, 0];
      if (r <= 1) {
        const hump = y >= -0.32 && (x / 0.42) ** 2 + ((y + 0.32) / 0.26) ** 2 <= 1;
        const base = Math.abs(y + 0.36) < 0.05 && Math.abs(x) < 0.55;
        c = r > 0.86 || hump || base ? [20, 20, 22, 255] : [246, 196, 40, 255];
      }
      data.set(c, (py * N + px) * 4);
    }
  const t = new THREE.DataTexture(data, N, N);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Curve sign: yellow rectangle with 3 black arrows (›››) pointing right (mirrored for left). */
function chevronTexture(): THREE.DataTexture {
  const W = 96;
  const H = 48;
  const data = new Uint8Array(W * H * 4);
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / W;
      const y = (py + 0.5) / H - 0.5;
      const border = x < 0.04 || x > 0.96 || Math.abs(y) > 0.42;
      // each arrow: a "›" band — horizontal distance to the line x = c + 0.35·|y|·(-1)
      let arrow = false;
      for (const c of [0.27, 0.5, 0.73]) {
        const d = x - (c - 0.3 * Math.abs(y));
        if (d > -0.05 && d < 0.05 && Math.abs(y) < 0.34) arrow = true;
      }
      data.set(border || arrow ? [20, 20, 22, 255] : [246, 196, 40, 255], (py * W + px) * 4);
    }
  const t = new THREE.DataTexture(data, W, H);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function createWorldProps(
  scene: THREE.Scene,
  reflections: THREE.Texture | null,
): { update(w: WorldState, originS: number, time: number, prev?: WorldState, alpha?: number): void } {
  const works = createWorksView(scene); // V2 part 3: roadworks cones and sign
  const withEnv = (o: THREE.Object3D) =>
    o.traverse((c) => {
      if (!reflections || c.name === 'contact-shadow') return;
      const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) if ('envMap' in m) m.envMap = reflections;
    });

  // traffic: a full set of each model (the worst case: every car of the same model), all created now
  const traffic: THREE.Group[][] = [];
  for (let m = 0; m < MODELS; m++) {
    const list: THREE.Group[] = [];
    for (let i = 0; i < TRAFFIC_SLOTS; i++) {
      const g = createTrafficModel(m);
      g.name = `traffic-${m}-${i}`;
      g.visible = false;
      withEnv(g);
      scene.add(g);
      list.push(g);
    }
    traffic.push(list);
  }
  const trafficCar = createCar('police', 1); // temporary state just to position the model

  // item boxes: colored translucent shell with a bright white core.
  // Police = blue cube; thief = red diamond (octahedron) — different shape and color, distinguishable from afar.
  const shapes: Record<'blue' | 'red', { shell: THREE.BufferGeometry; core: THREE.BufferGeometry }> = {
    blue: { shell: new THREE.BoxGeometry(1.05, 1.05, 1.05), core: new THREE.BoxGeometry(0.5, 0.5, 0.5) },
    red: { shell: new THREE.OctahedronGeometry(0.8), core: new THREE.OctahedronGeometry(0.38) },
  };
  const boxColors = { blue: new THREE.Color(0x2f6bff), red: new THREE.Color(0xff2a2a) };
  const boxes = Array.from({ length: BOXES }, (_, i) => {
    const g = new THREE.Group();
    g.name = `box-${i}`;
    const shell = new THREE.Mesh(
      shapes.blue.shell,
      new THREE.MeshPhysicalMaterial({
        color: 0x2f6bff,
        emissive: 0x2f6bff,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.7,
        roughness: 0.15,
        clearcoat: 1,
      }),
    );
    shell.name = 'shell';
    const core = new THREE.Mesh(
      shapes.blue.core,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }),
    );
    core.name = 'core';
    shell.castShadow = true;
    const mystery = createMysteryBox(); // the yellow "?" box (V2 part 3)
    g.add(shell, core, mystery);
    g.visible = false;
    scene.add(g);
    return { g, shell, core, mystery };
  });

  // bombs: dark sphere, fuse and blinking light
  const bombs = Array.from({ length: BOMBS }, (_, i) => {
    const g = new THREE.Group();
    g.name = `bomb-${i}`;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.4, metalness: 0.4 }),
    );
    ball.position.y = 0.38;
    ball.castShadow = true;
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x8b6b3d }));
    fuse.position.y = 0.85;
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff3020, emissiveIntensity: 2 }),
    );
    light.name = 'light';
    light.position.y = 0.98;
    // area bomb (Sobrevivência): a second bomb on the lane next to it
    const twin = new THREE.Group();
    twin.name = 'twin';
    twin.add(ball.clone(), fuse.clone(), light.clone());
    g.add(ball, fuse, light, twin);
    g.visible = false;
    scene.add(g);
    return { g, light, twin };
  });

  // speed bumps (2 lanes = 6 m), large sign at the roadside 75 m before and yellow stripes painted on both lanes
  const SIGN_BEFORE = 75;
  const PAINT_BEFORE = 22; // center of the 3 painted stripes (16, 22 and 28 m before)
  const bumpGeo = new THREE.BoxGeometry(6, 0.14, 0.8);
  const bumpMat = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.7 });
  bumpMat.map!.repeat.set(3, 1);
  const signGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6).translate(0, 1.3, 0);
  const signPlateGeo = new THREE.PlaneGeometry(1.5, 1.5).translate(0, 3, 0);
  const signMat = new THREE.MeshStandardMaterial({
    map: bumpSignTexture(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.5,
    emissive: 0x3a2a00,
  });
  const paintGeo = mergeGeometries([-6, 0, 6].map((dz) => new THREE.PlaneGeometry(6, 0.6).rotateX(-Math.PI / 2).translate(0, 0, dz)))!;
  const paintMat = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.6, roughness: 0.4 });
  const bumps = Array.from({ length: BUMPS }, (_, i) => {
    const m = new THREE.Mesh(bumpGeo, bumpMat);
    m.name = `bump-${i}`;
    m.receiveShadow = true;
    m.visible = false;
    const sign = new THREE.Group();
    sign.name = `sign-${i}`;
    sign.add(new THREE.Mesh(signGeo, poleMat), new THREE.Mesh(signPlateGeo, signMat));
    sign.visible = false;
    const paint = new THREE.Mesh(paintGeo, paintMat);
    paint.name = `bump-paint-${i}`;
    paint.receiveShadow = true;
    paint.visible = false;
    scene.add(m, sign, paint);
    return { m, sign, paint };
  });

  // sharp curves: arrow sign 90 m before, on the outside of the curve
  const chevronGeo = new THREE.PlaneGeometry(2.2, 1.1).translate(0, 2.4, 0);
  const chevronMat = new THREE.MeshStandardMaterial({ map: chevronTexture(), side: THREE.DoubleSide, roughness: 0.5, emissive: 0x3a2a00 });
  const chevronPoleGeo = mergeGeometries([-0.8, 0.8].map((dx) => new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6).translate(dx, 0.95, 0)))!;
  const curveSigns = Array.from({ length: CURVE_SIGNS }, (_, i) => {
    const g = new THREE.Group();
    g.name = `curve-sign-${i}`;
    g.add(new THREE.Mesh(chevronPoleGeo, poleMat), new THREE.Mesh(chevronGeo, chevronMat));
    g.visible = false;
    scene.add(g);
    return g;
  });

  return {
    update(w, originS, time, prev, alpha = 1) {
      works.update(w, originS);
      /** places in the world following the curve and rotates with the road */
      const put = (o: THREE.Object3D, s: number, x: number, y: number) => {
        const p = trackPos(s, x, originS);
        o.position.set(p.x, y, p.z);
        o.rotation.y = -p.heading;
      };
      const before = new Map<number, { s: number; x: number }>();
      if (prev && alpha < 1) for (const t of prev.traffic) before.set(t.id, t);

      for (const list of traffic) for (const g of list) g.visible = false;
      const used = new Array(MODELS).fill(0) as number[];
      // nearest to the camera first (if there were ever more cars than slots, only far ones would be left out)
      // past the fog (300 m) a car is invisible anyway: not drawn
      const nearCars = w.traffic
        .filter((t) => Math.abs(t.s - originS) < FOG_FAR)
        .sort((a, b) => Math.abs(a.s - originS) - Math.abs(b.s - originS))
        .slice(0, TRAFFIC_SLOTS);
      for (const t of nearCars) {
        const m = ((t.model % MODELS) + MODELS) % MODELS;
        const g = traffic[m]![used[m]!++]!;
        g.visible = true;
        // interpolated between the previous and current step (like the game cars): no jitter at 60+ fps
        const b = before.get(t.id);
        const s = b ? b.s + (t.s - b.s) * alpha : t.s;
        const x = b ? b.x + (t.x - b.x) * alpha : t.x;
        updateCarModel(g, { ...trafficCar, s, x, steer: Math.sign(t.targetX - t.x) as -1 | 0 | 1 }, time, originS);
      }

      pulseMysteryHalo(time);
      boxes.forEach(({ g, shell, core, mystery }, i) => {
        const b = w.boxes[i];
        g.visible = !!b;
        if (!b) return;
        put(g, b.s, b.x, 1 + Math.sin(time * 3 + i) * 0.15);
        g.rotation.y = time * 1.5;
        const yellow = b.color === 'yellow';
        mystery.visible = yellow;
        shell.visible = !yellow;
        core.visible = !yellow;
        if (b.color === 'yellow') return;
        shell.geometry = shapes[b.color].shell;
        core.geometry = shapes[b.color].core;
        const mat = shell.material as THREE.MeshPhysicalMaterial;
        mat.color.copy(boxColors[b.color]);
        mat.emissive.copy(boxColors[b.color]);
      });

      bombs.forEach(({ g, light, twin }, i) => {
        const b = w.bombs[i];
        g.visible = !!b;
        if (!b) return;
        put(g, b.s, b.x, 0);
        twin.visible = b.x2 !== undefined;
        twin.position.x = (b.x2 ?? b.x) - b.x;
        (light.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.floor(time * 4) % 2 === 0 ? 3 : 0.2;
      });

      const near = bumpsBetween(w.seed, originS - 60, originS + 260);
      bumps.forEach(({ m, sign, paint }, i) => {
        const b = near[i];
        m.visible = !!b;
        sign.visible = !!b;
        paint.visible = !!b;
        if (!b) return;
        const [a, zMax] = bumpXRange(b);
        const cx = (a + zMax) / 2;
        put(m, b.s, cx, 0.07);
        put(paint, b.s - PAINT_BEFORE, cx, 0.012);
        const side = cx < 0 ? -1 : 1;
        put(sign, b.s - SIGN_BEFORE, side * (BALANCE.road.halfWidth + 0.5), 0);
      });

      const sharp = w.curvesOn
        ? curvesBetween(w.seed, originS - 60 + CURVE_SIGN_BEFORE, originS + 300 + CURVE_SIGN_BEFORE).filter((c) => c.sharp)
        : [];
      curveSigns.forEach((g, i) => {
        const c = sharp[i];
        g.visible = !!c;
        if (!c) return;
        put(g, c.start - CURVE_SIGN_BEFORE, -c.dir * (BALANCE.road.halfWidth + 0.8), 0);
        g.scale.x = c.dir; // arrows pointing toward the side of the curve
      });
    },
  };
}
