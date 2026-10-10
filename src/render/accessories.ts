// Thief accessories (V2 part 6 delivery 2): wing, roof rack, antenna with a pennant and a flaming exhaust, placed car
// by car (body coordinates, front at -z). The moto only takes the antenna and the exhaust.
import * as THREE from 'three';
import { CHROME as KIT_CHROME, PLASTIC as KIT_PLASTIC, box, cyl, merge, mesh, rb } from './models/kit';

import type { AccessoryId } from '../meta/parts';

type Wing = { z: number; y: number; w: number; base: number }; // blade centre, top height, width, height of the mount
type Rack = { z0: number; z1: number; y: number; w: number };
type Pole = { x: number; y: number; z: number };
type Pipe = { x: number; y: number; z: number };
interface Spots {
  aerofolio?: Wing;
  rack?: Rack;
  antena?: Pole;
  escapamento?: Pipe[];
}

export const ACCESSORY_SPOTS: Record<string, Spots> = {
  seda: {
    aerofolio: { z: 2.05, y: 1.42, w: 1.75, base: 1.0 },
    rack: { z0: 0.0, z1: 0.82, y: 1.38, w: 1.25 },
    antena: { x: -0.72, y: 0.98, z: 2.0 },
    escapamento: [{ x: 0.5, y: 0.34, z: 2.42 }],
  },
  picape: {
    aerofolio: { z: 2.12, y: 1.25, w: 1.7, base: 0.99 },
    rack: { z0: -0.36, z1: 0.38, y: 1.57, w: 1.4 },
    antena: { x: -0.82, y: 0.99, z: 2.05 },
    escapamento: [{ x: 0.55, y: 0.36, z: 2.3 }],
  },
  van: {
    aerofolio: { z: 2.28, y: 1.92, w: 1.7, base: 1.75 },
    rack: { z0: -0.7, z1: 1.9, y: 1.76, w: 1.6 },
    antena: { x: -0.78, y: 1.76, z: 2.15 },
    escapamento: [{ x: 0.55, y: 0.42, z: 2.5 }],
  },
  moto: {
    antena: { x: -0.1, y: 1.2, z: 1.05 },
    escapamento: [{ x: 0.24, y: 0.52, z: 1.12 }],
  },
};

/** Shared by every car: disposeLookModel leaves them (userData.shared). */
const shared = <M extends THREE.Material>(m: M): M => {
  m.userData.shared = true;
  return m;
};
const CHROME = shared(KIT_CHROME.clone());
const PLASTIC = shared(KIT_PLASTIC.clone());
const LAMP = shared(new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c4, emissiveIntensity: 0.8 }));
const FLAME = shared(new THREE.MeshBasicMaterial({ color: 0xff6a12, transparent: true, opacity: 0.85, depthWrite: false }));
const FLAME_CORE = shared(new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.95, depthWrite: false }));
const PENNANT = shared(new THREE.MeshStandardMaterial({ color: 0xe0202a, roughness: 0.7, side: THREE.DoubleSide }));

/** Adds one accessory; nothing when the car has no place for it. `paint` colours the wing like the body. */
export function addAccessory(root: THREE.Object3D, car: string, id: AccessoryId, paint: THREE.Material): void {
  const body = root.getObjectByName('body');
  const s = ACCESSORY_SPOTS[car];
  if (!body || !s) return;
  const before = new Set(body.children);
  BUILD[id](body, s, paint);
  // this car's own geometry: freed with it. No shadow pass for small parts (as the template does for the car)
  for (const o of body.children)
    if (!before.has(o)) {
      (o as THREE.Mesh).geometry.userData.own = true;
      o.castShadow = false;
    }
}

function wing(body: THREE.Object3D, s: Spots, paint: THREE.Material): void {
  if (s.aerofolio) {
    const a = s.aerofolio;
    const h = a.y - a.base;
    body.add(mesh(rb(a.w, 0.05, 0.42, 0.02, 0, a.y, a.z), paint, 'acc-wing'));
    const struts = [
      ...[-1, 1].map((sd) => box(0.05, h, 0.14, sd * a.w * 0.32, a.base + h / 2, a.z + 0.05)),
      ...[-1, 1].map((sd) => box(0.04, 0.2, 0.46, sd * (a.w / 2), a.y + 0.06, a.z)),
    ];
    body.add(mesh(merge(struts), PLASTIC, 'acc-wing-struts'));
  }
}

function rack(body: THREE.Object3D, s: Spots): void {
  if (s.rack) {
    const r = s.rack;
    const len = r.z1 - r.z0;
    const zc = (r.z0 + r.z1) / 2;
    const bars = [
      ...[-1, 1].map((sd) => box(0.04, 0.04, len, sd * r.w * 0.45, r.y + 0.12, zc)),
      ...[0, 0.33, 0.66, 1].map((t) => box(r.w * 0.9, 0.035, 0.04, 0, r.y + 0.12, r.z0 + len * t)),
      ...[-1, 1].flatMap((sd) => [r.z0, r.z1].map((z) => box(0.04, 0.12, 0.04, sd * r.w * 0.45, r.y + 0.06, z))),
    ];
    body.add(mesh(merge(bars), PLASTIC, 'acc-rack'));
    // two lamps at the front of the rack
    const lamps = [-1, 1].map((sd) =>
      cyl(0.07, 0.08, 12)
        .rotateX(Math.PI / 2)
        .translate(sd * r.w * 0.22, r.y + 0.2, r.z0),
    );
    body.add(mesh(merge(lamps), LAMP, 'acc-rack-lamps'));
  }
}

function antenna(body: THREE.Object3D, s: Spots): void {
  if (s.antena) {
    const p = s.antena;
    body.add(mesh(cyl(0.012, 1.1, 6).translate(p.x, p.y + 0.55, p.z), PLASTIC, 'acc-antenna'));
    const tri = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.2, 0),
      new THREE.Vector3(0, -0.1, 0.34),
    ]);
    tri.computeVertexNormals();
    const flag = new THREE.Mesh(tri.translate(p.x, p.y + 1.08, p.z), PENNANT);
    flag.name = 'acc-pennant';
    body.add(flag);
  }
}

function exhaust(body: THREE.Object3D, s: Spots): void {
  for (const p of s.escapamento ?? []) {
    body.add(
      mesh(
        cyl(0.065, 0.24, 12)
          .rotateX(Math.PI / 2)
          .translate(p.x, p.y, p.z - 0.06),
        CHROME,
        'acc-pipe',
      ),
    );
    // flame out of the back (+z): an outer cone and a hot core, from the pipe's mouth so the game can stretch it
    // along z when it flickers (userData.flame)
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 10).rotateX(Math.PI / 2).translate(0, 0, 0.25), FLAME);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 8).rotateX(Math.PI / 2).translate(0, 0, 0.15), FLAME_CORE);
    for (const f of [outer, core]) {
      f.name = 'acc-flame';
      f.userData.flame = true;
      f.position.set(p.x, p.y, p.z + 0.05);
      body.add(f);
    }
  }
}

const BUILD: Record<AccessoryId, (body: THREE.Object3D, s: Spots, paint: THREE.Material) => void> = {
  aerofolio: wing,
  rack,
  antena: antenna,
  escapamento: exhaust,
};
