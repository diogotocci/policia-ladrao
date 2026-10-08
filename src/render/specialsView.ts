// Things on the road from the specials (V2 part 3): fixed pools, placed along the track.
// Oil: a dark glossy patch. Spikes: a strip of gray nails. Roadblock: a patrol car across the lane, lights flashing,
// with a striped "Bloqueio" sign 80 m before. All show in the rear-view mirror too (same scene).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';
import { createCar } from '../sim/car';
import type { Hazard } from '../sim/types';
import { createCarModel, updateCarModel } from './carFactory';
import { trackPos } from './trackFrame';

const SLOTS = 8;

function nailsGeometry(): THREE.BufferGeometry {
  // 1 m wide, 1 m long strip (scaled per hazard): a base and two rows of nails
  const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(1, 0.05, 0.8).translate(0, 0.025, 0)];
  for (let i = 0; i < 6; i++)
    for (const z of [-0.2, 0.2]) parts.push(new THREE.ConeGeometry(0.06, 0.24, 5).translate(-0.42 + i * 0.17, 0.16, z));
  return mergeGeometries(parts)!;
}

const BLOCKS = 2;

/** Striped warning sign (red and white) on a post, at the roadside. */
function blockSign(): THREE.Group {
  const g = new THREE.Group();
  const N = 16;
  const data = new Uint8Array(N * 4 * 4);
  for (let x = 0; x < N; x++)
    for (let y = 0; y < 4; y++) data.set(Math.floor((x + y) / 2) % 2 === 0 ? [214, 32, 32, 255] : [245, 245, 245, 255], (y * N + x) * 4);
  const tex = new THREE.DataTexture(data, N, 4);
  tex.needsUpdate = true;
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.08), new THREE.MeshStandardMaterial({ map: tex, emissive: 0x401010 }));
  board.position.y = 1.9;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6), new THREE.MeshStandardMaterial({ color: 0x777777 }));
  post.position.y = 0.95;
  g.add(post, board);
  return g;
}

export function createSpecialsView(scene: THREE.Scene): {
  update(hazards: readonly Hazard[], originS: number, time?: number): void;
  dispose(): void;
} {
  const oilMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.92 });
  const oilGeo = new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2);
  const nailMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.7 });
  const nailGeo = nailsGeometry();
  const make = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string) =>
    Array.from({ length: SLOTS }, (_, i) => {
      const m = new THREE.Mesh(geo, mat);
      m.name = `${name}-${i}`;
      m.visible = false;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    });
  const oil = make(oilGeo, oilMat, 'oil');
  const spikes = make(nailGeo, nailMat, 'spikes');
  const blocks = Array.from({ length: BLOCKS }, (_, i) => {
    const car = createCarModel('police');
    car.name = `roadblock-${i}`;
    car.visible = false;
    const sign = blockSign();
    sign.name = `roadblock-sign-${i}`;
    sign.visible = false;
    scene.add(car, sign);
    return { car, sign };
  });
  const parked = createCar('police', 1);
  return {
    update(hazards, originS, time = 0) {
      const used = { oil: 0, spikes: 0, roadblock: 0 };
      for (const h of hazards) {
        if (h.kind === 'roadblock') {
          const b = blocks[used.roadblock++];
          if (!b) continue;
          const cx = (h.xFrom + h.xTo) / 2;
          // across the lane: the car model turned 90° (lights flashing via updateCarModel)
          updateCarModel(b.car, { ...parked, s: h.s + h.length / 2, x: cx }, time, originS);
          b.car.rotation.y += Math.PI / 2;
          b.car.visible = true;
          const side = cx < 0 ? -1 : 1;
          const p = trackPos(h.s - BALANCE.items.roadblock.sign, side * (BALANCE.road.halfWidth + 0.6), originS);
          b.sign.position.set(p.x, 0, p.z);
          b.sign.rotation.y = -p.heading;
          b.sign.visible = true;
          continue;
        }
        const pool = h.kind === 'oil' ? oil : spikes;
        const m = pool[used[h.kind]++];
        if (!m) continue;
        const p = trackPos(h.s + h.length / 2, (h.xFrom + h.xTo) / 2, originS);
        m.visible = true;
        m.position.set(p.x, 0.015, p.z);
        m.rotation.y = -p.heading;
        m.scale.set(h.xTo - h.xFrom - 0.4, 1, h.length);
      }
      for (let i = used.oil; i < SLOTS; i++) oil[i]!.visible = false;
      for (let i = used.spikes; i < SLOTS; i++) spikes[i]!.visible = false;
      for (let i = used.roadblock; i < BLOCKS; i++) blocks[i]!.car.visible = blocks[i]!.sign.visible = false;
    },
    dispose() {
      for (const m of [...oil, ...spikes, ...blocks.flatMap((b) => [b.car, b.sign])]) scene.remove(m);
      oilGeo.dispose();
      nailGeo.dispose();
      oilMat.dispose();
      nailMat.dispose();
    },
  };
}
