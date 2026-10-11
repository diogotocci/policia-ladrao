// Wheel styles (V2 part 6 delivery 2): the same wheel size and place, a new rim. The moto only changes the rim colour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RUBBER as KIT_RUBBER, box, cyl, merge, metal } from './models/kit';

import type { WheelStyle } from '../meta/parts';

/** Shared by every car: disposeLookModel leaves them (userData.shared), and the geometry is cached (not own). */
const shared = <M extends THREE.Material>(m: M): M => {
  m.userData.shared = true;
  return m;
};
const RUBBER = shared(KIT_RUBBER.clone());
const MATS: Record<WheelStyle, THREE.Material> = {
  cromadas: shared(metal(0xe6e9ee, 0.1)),
  esportivas: shared(new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.3, metalness: 0.6 })),
  rodao: shared(metal(0xc9ced6, 0.15)),
};

/** per style: rim radius (share of the wheel), lip thickness, spoke count, spoke thickness, split spokes */
const SHAPE: Record<WheelStyle, { rim: number; lip: number; spokes: number; thick: number; arms: number[] }> = {
  cromadas: { rim: 0.66, lip: 0.06, spokes: 10, thick: 0.045, arms: [0] },
  esportivas: { rim: 0.7, lip: 0.06, spokes: 5, thick: 0.05, arms: [-0.09, 0.09] },
  rodao: { rim: 0.82, lip: 0.08, spokes: 6, thick: 0.12, arms: [0] },
};

const cache = new Map<string, THREE.BufferGeometry>();
function wheelGeometry(style: WheelStyle, r: number, width: number): THREE.BufferGeometry {
  const key = `${style}:${r.toFixed(3)}:${width.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sh = SHAPE[style];
  const rimR = r * sh.rim;
  // tire and a dark barrel set back inside it (group 0), then the rim faces on both sides (group 1)
  const tire = [cyl(r, width, 26).rotateZ(Math.PI / 2), cyl(rimR * 0.97, width + 0.004, 24).rotateZ(Math.PI / 2)];
  const rim: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) {
    const x = sd * (width / 2 + 0.012);
    rim.push(new THREE.TorusGeometry(rimR * 0.95, rimR * sh.lip, 6, 28).rotateY(Math.PI / 2).translate(x, 0, 0));
    rim.push(
      cyl(rimR * 0.2, 0.05, 12)
        .rotateZ(Math.PI / 2)
        .translate(x, 0, 0),
    );
    for (let i = 0; i < sh.spokes; i++) {
      const rot = new THREE.Matrix4().makeRotationX((i / sh.spokes) * Math.PI * 2);
      for (const off of sh.arms)
        rim.push(
          box(0.03, rimR * 0.78, sh.thick)
            .translate(x, rimR * 0.5, off * rimR)
            .applyMatrix4(rot),
        );
    }
  }
  const geo = mergeGeometries([merge(tire), merge(rim)], true)!;
  cache.set(key, geo);
  return geo;
}

/** Puts a wheel style on every 'wheel' mesh of a car (null: leaves the car's own wheels). */
export function applyWheels(root: THREE.Object3D, style: WheelStyle | null, car: string): void {
  if (!style) return;
  root.traverse((o) => {
    const w = o as THREE.Mesh;
    if (!w.isMesh || w.name !== 'wheel') return;
    if (car === 'moto' || car === 'rocam') {
      // thin moto wheels: keep them, the rim takes the style's material (the old one was this car's own copy)
      const rim = w.getObjectByName('rim') as THREE.Mesh | undefined;
      if (rim) {
        (rim.material as THREE.Material).dispose();
        rim.material = MATS[style];
      }
      return;
    }
    w.geometry.computeBoundingBox();
    const b = w.geometry.boundingBox!;
    const r = (w.userData.r as number | undefined) ?? (b.max.y - b.min.y) / 2;
    const width = Math.min(0.4, b.max.x - b.min.x - 0.04);
    w.geometry = wheelGeometry(style, r, width);
    w.material = [RUBBER, MATS[style]];
  });
}
