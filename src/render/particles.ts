// Particles with a fixed pool in a single InstancedMesh (1 draw call): damage smoke, bomb explosion and impacts.
// Positions in track coordinates (x, height, s): they stay in place while the cars move on.
import * as THREE from 'three';
import type { QualityTier } from './renderer';
import { trackPos } from './trackFrame';

type Kind = 'white' | 'black' | 'fire' | 'dust' | 'cloud';

const COLORS: Record<Kind, THREE.Color> = {
  white: new THREE.Color(0xdcdcdc),
  black: new THREE.Color(0x26262a),
  fire: new THREE.Color(0xff8a2a),
  dust: new THREE.Color(0x9a948a),
  cloud: new THREE.Color(0x4a4c52),
};

function puffTexture(): THREE.DataTexture {
  const N = 32;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.min(1, Math.hypot((x + 0.5) / N - 0.5, (y + 0.5) / N - 0.5) * 2);
      data.set([255, 255, 255, Math.round(Math.pow(1 - d, 1.5) * 255)], (y * N + x) * 4);
    }
  const t = new THREE.DataTexture(data, N, N);
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export interface Particles {
  emitSmoke(x: number, y: number, s: number, color: 'white' | 'black'): void;
  emitBurst(x: number, s: number, kind: 'explosion' | 'crash'): void;
  /** the thief's smoke screen: big dark puffs low over the road, left behind the car */
  emitCloud(x: number, s: number): void;
  update(dt: number, originS: number, camera: THREE.Camera): void;
  setQuality(q: QualityTier): void;
  /** factor for each emitter's smoke rate (0.5 on low) */
  emissionScale(): number;
  alive(): number;
}

export function createParticles(scene: THREE.Scene, max = 160): Particles {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({
    map: puffTexture(),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.name = 'particles';
  mesh.frustumCulled = false;
  mesh.count = 0;
  for (let i = 0; i < max; i++) mesh.setColorAt(i, COLORS.white);
  scene.add(mesh);

  const pos = new Float32Array(max * 3); // x, y, s
  const vel = new Float32Array(max * 3);
  const life = new Float32Array(max); // remaining (s)
  const total = new Float32Array(max);
  const size = new Float32Array(max * 2); // initial, final
  const kind: Kind[] = new Array(max).fill('white');
  let next = 0;
  let seed = 3;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let half = false;

  const spawn = (k: Kind, x: number, y: number, s: number, v: [number, number, number], lifeS: number, s0: number, s1: number) => {
    const i = next;
    next = (next + 1) % max;
    pos.set([x, y, s], i * 3);
    vel.set(v, i * 3);
    life[i] = total[i] = lifeS;
    size[i * 2] = s0;
    size[i * 2 + 1] = s1;
    kind[i] = k;
    mesh.setColorAt(i, COLORS[k]);
  };

  const tmp = new THREE.Object3D();
  return {
    emitSmoke(x, y, s, color) {
      spawn(
        color,
        x + (rand() - 0.5) * 0.3,
        y,
        s,
        [(rand() - 0.5) * 0.6, 1.1 + rand() * 0.6, (rand() - 0.5) * 0.6],
        1.0,
        0.3,
        color === 'black' ? 1.3 : 1.0,
      );
    },
    emitCloud(x, s) {
      // hangs where it was released (a wall the police drives into); no forward speed, so a slow device whose
      // simulation lags behind real time never sees the cloud run ahead of the car
      spawn(
        'cloud',
        x + (rand() - 0.5) * 2.4,
        0.6 + rand() * 0.8,
        s - rand() * 2,
        [(rand() - 0.5) * 2, 0.2 + rand() * 0.3, (rand() - 0.5) * 1.5],
        2.4,
        2.4,
        6,
      );
    },
    emitBurst(x, s, k) {
      const n = Math.round((k === 'explosion' ? 18 : 6) / (half ? 2 : 1));
      for (let j = 0; j < n; j++) {
        const a = rand() * Math.PI * 2;
        const sp = k === 'explosion' ? 3 + rand() * 4 : 1 + rand() * 2;
        const v: [number, number, number] = [Math.cos(a) * sp, 1 + rand() * (k === 'explosion' ? 4 : 1.5), Math.sin(a) * sp];
        if (k === 'explosion') spawn(j % 3 === 2 ? 'black' : 'fire', x, 0.4, s, v, j % 3 === 2 ? 1.4 : 0.5, 0.6, j % 3 === 2 ? 2.4 : 1.8);
        else spawn('dust', x, 0.5, s, v, 0.6, 0.3, 0.9);
      }
    },
    update(dt, originS, camera) {
      let n = 0;
      for (let i = 0; i < max; i++) {
        if (life[i]! <= 0) continue;
        life[i] = life[i]! - dt;
        if (life[i]! <= 0) continue;
        const k = i * 3;
        pos[k] = pos[k]! + vel[k]! * dt;
        pos[k + 1] = pos[k + 1]! + vel[k + 1]! * dt;
        pos[k + 2] = pos[k + 2]! + vel[k + 2]! * dt;
        vel[k] = vel[k]! * 0.96;
        vel[k + 2] = vel[k + 2]! * 0.96;
        if (kind[i] === 'fire' || kind[i] === 'dust') vel[k + 1] = vel[k + 1]! - 6 * dt;
        const t = 1 - life[i]! / total[i]!; // 0 → 1
        const grow = size[i * 2]! + (size[i * 2 + 1]! - size[i * 2]!) * t;
        const sc = grow * Math.min(1, (1 - t) * 4); // shrinks at the end (fades out smoothly)
        const wp = trackPos(pos[k + 2]!, pos[k]!, originS);
        tmp.position.set(wp.x, Math.max(0.05, pos[k + 1]!), wp.z);
        tmp.quaternion.copy(camera.quaternion);
        tmp.scale.setScalar(sc);
        tmp.updateMatrix();
        mesh.setMatrixAt(n, tmp.matrix);
        mesh.setColorAt(n, COLORS[kind[i]!]);
        n++;
      }
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    setQuality(q) {
      half = q === 'low';
    },
    emissionScale: () => (half ? 0.5 : 1),
    alive() {
      let n = 0;
      for (let i = 0; i < max; i++) if (life[i]! > 0) n++;
      return n;
    },
  };
}
