// Oil and spikes on the road (V2 part 3, the thief's specials): fixed pools, placed along the track.
// Oil: a dark glossy patch. Spikes: a strip of gray nails. Both show in the rear-view mirror too (same scene).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Hazard } from '../sim/types';
import { trackPos } from './trackFrame';

const SLOTS = 8;

function nailsGeometry(): THREE.BufferGeometry {
  // 1 m wide, 1 m long strip (scaled per hazard): a base and two rows of nails
  const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(1, 0.05, 0.8).translate(0, 0.025, 0)];
  for (let i = 0; i < 6; i++)
    for (const z of [-0.2, 0.2]) parts.push(new THREE.ConeGeometry(0.06, 0.24, 5).translate(-0.42 + i * 0.17, 0.16, z));
  return mergeGeometries(parts)!;
}

export function createSpecialsView(scene: THREE.Scene): { update(hazards: readonly Hazard[], originS: number): void; dispose(): void } {
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
  return {
    update(hazards, originS) {
      const used = { oil: 0, spikes: 0 };
      for (const h of hazards) {
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
    },
    dispose() {
      for (const m of [...oil, ...spikes]) scene.remove(m);
      oilGeo.dispose();
      nailGeo.dispose();
      oilMat.dispose();
      nailMat.dispose();
    },
  };
}
