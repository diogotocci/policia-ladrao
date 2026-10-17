// The landmark "ao fundo" of a map (mockups approved 2026-10-17): the Christ the Redeemer on Corcovado and the Sugarloaf
// in Rio, the Eiffel Tower in Paris, Manhattan's skyline in New York. The road has no end and curves, so the landmark
// is not a place: it stays ahead of the camera, past the fog, like a painted backdrop. No fog on it; its colours are
// mixed with the fog colour instead, so it looks far away. A few merged meshes: 1-3 draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MapId } from '../meta/maps';

/** distance ahead of the camera (inside the camera's far plane, 400 m) */
const DISTANCE = 330;
/** how far below the street the backdrop sits (the landmarks are tall: keep them in the picture) */
const SINK: Partial<Record<MapId, number>> = { rio: 26 };

const hazy = (hex: number, fog: number, k: number) => new THREE.Color(hex).lerp(new THREE.Color(fog), k);

function colored(geo: THREE.BufferGeometry, c: THREE.Color): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  return g;
}

const flatMat = () => new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });

function rio(fog: number): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [];
  const hill = (x: number, z: number, r: number, h: number, hex: number, k: number) =>
    parts.push(colored(new THREE.ConeGeometry(r, h, 7).scale(1, 1, 0.7).translate(x, h / 2 - 4, z), hazy(hex, fog, k)));
  hill(-150, 40, 110, 95, 0x4c7d55, 0.3);
  hill(170, 50, 120, 70, 0x557f5c, 0.35);
  hill(-30, 0, 48, 135, 0x2f6b3a, 0.12); // Corcovado
  const white = hazy(0xf4f4f0, fog, 0.2);
  const cx = -30;
  const top = 127;
  parts.push(colored(new THREE.BoxGeometry(4, 6, 4).translate(cx, top + 3, 0), hazy(0xcfcfc8, fog, 0.25)));
  parts.push(colored(new THREE.BoxGeometry(4, 18, 4).translate(cx, top + 15, 0), white));
  parts.push(colored(new THREE.BoxGeometry(26, 3, 3).translate(cx, top + 21, 0), white));
  parts.push(colored(new THREE.BoxGeometry(2.6, 3, 2.6).translate(cx, top + 25.5, 0), white));
  // the Sugarloaf by the sea, on the right
  parts.push(colored(new THREE.SphereGeometry(28, 10, 8).scale(0.75, 1.7, 0.8).translate(120, 6, 10), hazy(0x6a7563, fog, 0.4)));
  parts.push(colored(new THREE.SphereGeometry(18, 10, 8).scale(0.9, 1.1, 0.8).translate(85, -2, 20), hazy(0x5f7258, fog, 0.45)));
  return new THREE.Mesh(mergeGeometries(parts)!, flatMat());
}

function paris(fog: number): THREE.Object3D {
  const iron = hazy(0x5a4632, fog, 0.12);
  const parts: THREE.BufferGeometry[] = [];
  // four legs leaning in, the first platform, the middle and the top, the antenna
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const leg = new THREE.BoxGeometry(6, 50, 6);
    leg.rotateZ(sx * 0.42);
    leg.rotateX(-sz * 0.42);
    parts.push(colored(leg.translate(sx * 20, 22, sz * 20), iron));
  }
  parts.push(colored(new THREE.TorusGeometry(19, 1.4, 4, 16, Math.PI).translate(0, 20, 27), iron));
  parts.push(colored(new THREE.BoxGeometry(44, 3, 44).translate(0, 45, 0), iron));
  parts.push(colored(new THREE.CylinderGeometry(7, 17, 50, 4, 1).rotateY(Math.PI / 4).translate(0, 71, 0), iron));
  parts.push(colored(new THREE.BoxGeometry(18, 2.5, 18).translate(0, 96, 0), iron));
  parts.push(colored(new THREE.CylinderGeometry(1.6, 7, 90, 4, 1).rotateY(Math.PI / 4).translate(0, 142, 0), iron));
  parts.push(colored(new THREE.BoxGeometry(4, 5, 4).translate(0, 189, 0), iron));
  parts.push(colored(new THREE.CylinderGeometry(0.4, 0.7, 14, 5).translate(0, 198, 0), iron));
  const g = new THREE.Mesh(mergeGeometries(parts)!, flatMat());
  g.position.y = -6;
  return g;
}

function ny(fog: number): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = -260; x < 260; x += 18 + rnd() * 10) {
    const h = 30 + rnd() * 90 * (1 - Math.abs(x) / 400);
    const w = 14 + rnd() * 12;
    parts.push(colored(new THREE.BoxGeometry(w, h, 14).translate(x, h / 2 - 4, rnd() * 40), hazy(0x5d6577, fog, 0.25 + rnd() * 0.3)));
  }
  // one Art Deco tower taller than the rest, with its spire
  const deco = hazy(0x8a8f9c, fog, 0.25);
  parts.push(colored(new THREE.BoxGeometry(22, 120, 18).translate(40, 56, -10), deco));
  parts.push(colored(new THREE.BoxGeometry(14, 30, 12).translate(40, 131, -10), deco));
  parts.push(colored(new THREE.BoxGeometry(8, 16, 8).translate(40, 154, -10), deco));
  parts.push(colored(new THREE.CylinderGeometry(0.6, 2, 26, 5).translate(40, 175, -10), deco));
  return new THREE.Mesh(mergeGeometries(parts)!, flatMat());
}

const BUILD: Partial<Record<MapId, (fog: number) => THREE.Object3D>> = { rio, paris, ny };

export interface Backdrop {
  /** follows the camera: ahead of it, facing it */
  update(camera: THREE.Camera): void;
  dispose(): void;
}

export function createBackdrop(scene: THREE.Scene, map: MapId, fogColor: number): Backdrop | null {
  const build = BUILD[map];
  if (!build) return null;
  const group = new THREE.Group();
  group.name = `backdrop-${map}`;
  const obj = build(fogColor);
  obj.renderOrder = -1; // drawn first: everything else covers it
  obj.frustumCulled = false;
  group.add(obj);
  scene.add(group);
  const dir = new THREE.Vector3();
  let heading = Number.NaN;
  return {
    update(camera) {
      camera.getWorldDirection(dir);
      const h = Math.atan2(dir.x, -dir.z);
      // smoothed: the camera sways in the curves, the horizon should not
      heading = Number.isNaN(heading) ? h : heading + Math.atan2(Math.sin(h - heading), Math.cos(h - heading)) * 0.04;
      group.position.set(
        camera.position.x + Math.sin(heading) * DISTANCE,
        -(SINK[map] ?? 0),
        camera.position.z - Math.cos(heading) * DISTANCE,
      );
      group.rotation.y = -heading;
    },
    dispose() {
      group.removeFromParent();
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
    },
  };
}
