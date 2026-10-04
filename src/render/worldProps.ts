// Objetos do mundo com pools fixos: tráfego, caixinhas, bombas, quebra-molas e placas de aviso.
import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { bumpXRange, bumpsBetween } from '../sim/track';
import type { WorldState } from '../sim/types';
import { createTrafficModel, updateCarModel } from './carFactory';
import { createCar } from '../sim/car';

const TRAFFIC_SLOTS = 8;
const MODELS = 4;
const BOXES = 2;
const BOMBS = 3;
const BUMPS = 4;

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

export function createWorldProps(
  scene: THREE.Scene,
  reflections: THREE.Texture | null,
): { update(w: WorldState, originS: number, time: number): void } {
  const withEnv = (o: THREE.Object3D) =>
    o.traverse((c) => {
      if (!reflections || c.name === 'contact-shadow') return;
      const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) if ('envMap' in m) m.envMap = reflections;
    });

  // tráfego: 8 de cada modelo (o pior caso), todos criados agora
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
  const trafficCar = createCar('police', 1); // estado temporário só para posicionar o modelo

  // caixinhas: cubo de vidro com núcleo brilhante
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const coreGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const boxColors = { blue: new THREE.Color(0x3d7bff), red: new THREE.Color(0xff3b3b) };
  const boxes = Array.from({ length: BOXES }, (_, i) => {
    const g = new THREE.Group();
    g.name = `box-${i}`;
    const shell = new THREE.Mesh(
      boxGeo,
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1, clearcoat: 1 }),
    );
    const core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.6 }));
    core.name = 'core';
    shell.castShadow = true;
    g.add(shell, core);
    g.visible = false;
    scene.add(g);
    return { g, core };
  });

  // bombas: esfera escura, pavio e luz piscando
  const bombs = Array.from({ length: BOMBS }, (_, i) => {
    const g = new THREE.Group();
    g.name = `bomb-${i}`;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.4, metalness: 0.4 }));
    ball.position.y = 0.38;
    ball.castShadow = true;
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x8b6b3d }));
    fuse.position.y = 0.85;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff3020, emissiveIntensity: 2 }));
    light.name = 'light';
    light.position.y = 0.98;
    g.add(ball, fuse, light);
    g.visible = false;
    scene.add(g);
    return { g, light };
  });

  // quebra-molas (2 faixas = 6 m) e placa de aviso na calçada 40 m antes
  const bumpGeo = new THREE.BoxGeometry(6, 0.14, 0.8);
  const bumpMat = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.7 });
  bumpMat.map!.repeat.set(3, 1);
  const signGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6).translate(0, 1.1, 0);
  const signPlateGeo = new THREE.BoxGeometry(0.6, 0.6, 0.04).rotateZ(Math.PI / 4).translate(0, 2.2, 0);
  const signMat = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 });
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
    scene.add(m, sign);
    return { m, sign };
  });

  return {
    update(w, originS, time) {
      const z = (s: number) => -(s - originS);

      for (const list of traffic) for (const g of list) g.visible = false;
      const used = new Array(MODELS).fill(0) as number[];
      for (const t of w.traffic.slice(0, TRAFFIC_SLOTS)) {
        const m = ((t.model % MODELS) + MODELS) % MODELS;
        const g = traffic[m]![used[m]!++]!;
        g.visible = true;
        updateCarModel(g, { ...trafficCar, s: t.s, x: t.x, steer: Math.sign(t.targetX - t.x) as -1 | 0 | 1 }, time, originS);
      }

      boxes.forEach(({ g, core }, i) => {
        const b = w.boxes[i];
        g.visible = !!b;
        if (!b) return;
        g.position.set(b.x, 0.9 + Math.sin(time * 3 + i) * 0.15, z(b.s));
        g.rotation.y = time * 1.5;
        const mat = core.material as THREE.MeshStandardMaterial;
        mat.color.copy(boxColors[b.color]);
        mat.emissive.copy(boxColors[b.color]);
      });

      bombs.forEach(({ g, light }, i) => {
        const b = w.bombs[i];
        g.visible = !!b;
        if (!b) return;
        g.position.set(b.x, 0, z(b.s));
        (light.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.floor(time * 4) % 2 === 0 ? 3 : 0.2;
      });

      const near = bumpsBetween(w.seed, originS - 60, originS + 260);
      bumps.forEach(({ m, sign }, i) => {
        const b = near[i];
        m.visible = !!b;
        sign.visible = !!b;
        if (!b) return;
        const [a, zMax] = bumpXRange(b);
        m.position.set((a + zMax) / 2, 0.07, z(b.s));
        const side = (a + zMax) / 2 < 0 ? -1 : 1;
        sign.position.set(side * (BALANCE.road.halfWidth + 1.2), 0, z(b.s - 40));
      });
    },
  };
}
