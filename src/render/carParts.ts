// Shared parts of the built-in cars (patrol car, sedan and traffic): materials, side profiles, wheels, lamps and
// the soft contact shadow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const WHEEL_RADIUS = 0.36;
export const MAX_ROLL = (6 * Math.PI) / 180;
export const BLINK_PERIOD = 0.25;

// ---------- materials ----------
export const paint = (color: number) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1 });
export const GLASS = new THREE.MeshPhysicalMaterial({
  color: 0x0a0f15,
  roughness: 0.15,
  metalness: 0.1,
  clearcoat: 0.6,
  envMapIntensity: 0.8,
});
export const CHROME = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 });
export const RUBBER = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.92 });
export const PLASTIC = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.55 });
export const HEAD = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c4, emissiveIntensity: 0.7 });
export const TAIL = new THREE.MeshStandardMaterial({ color: 0x7a0a0f, emissive: 0xff1a1a, emissiveIntensity: 1.8 });

// ---------- geometry helpers ----------
export type P = [number, number];

/** Side profile (x = length, front positive; y = height) with wheel arches. */
export function sideProfile(top: P[], rearX: number, frontX: number, axleRear: number, axleFront: number): THREE.Shape {
  const s = new THREE.Shape();
  const floor = 0.3;
  const arch = 0.47;
  const cy = WHEEL_RADIUS;
  s.moveTo(rearX, floor);
  s.lineTo(axleRear - arch, floor);
  s.lineTo(axleRear - arch, cy);
  s.absarc(axleRear, cy, arch, Math.PI, 0, true);
  s.lineTo(axleRear + arch, floor);
  s.lineTo(axleFront - arch, floor);
  s.lineTo(axleFront - arch, cy);
  s.absarc(axleFront, cy, arch, Math.PI, 0, true);
  s.lineTo(axleFront + arch, floor);
  s.lineTo(frontX, floor);
  for (const [x, y] of top) s.lineTo(x, y); // front to back
  s.lineTo(rearX, floor);
  return s;
}

/** Extrudes a side profile across the width and orients it: front at -z, centered on x. */
export function extrudeProfile(shape: THREE.Shape, width: number, bevel = 0.07): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.rotateY(Math.PI / 2); // profile x → -z ; depth → +x
  g.translate(-(width - bevel * 2) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

export const rb = (w: number, h: number, l: number, r: number, x = 0, y = 0, z = 0) =>
  new RoundedBoxGeometry(w, h, l, 2, r).translate(x, y, z);

export const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], name = '') => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export const mirrored = (make: (side: number) => THREE.BufferGeometry) => mergeGeometries([make(-1), make(1)])!;

// ---------- contact shadow ----------
let contactTex: THREE.DataTexture | undefined;
function contactTexture(): THREE.DataTexture {
  if (contactTex) return contactTex;
  const W = 32;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5) / W - 0.5;
      const dy = (y + 0.5) / H - 0.5;
      const d = Math.min(1, Math.hypot(dx * 2.1, dy * 2.1));
      const a = Math.pow(1 - d, 1.6) * 200;
      data.set([0, 0, 0, Math.round(a)], (y * W + x) * 4);
    }
  }
  contactTex = new THREE.DataTexture(data, W, H);
  contactTex.magFilter = THREE.LinearFilter;
  contactTex.needsUpdate = true;
  return contactTex;
}

export function contactShadow(width: number, length: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, length).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: contactTexture(), transparent: true, depthWrite: false, opacity: 0.85 });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'contact-shadow';
  m.position.y = 0.02;
  m.renderOrder = -1;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

// ---------- wheels ----------
export const tireGeo = (w: number) => new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, w, 22).rotateZ(Math.PI / 2);
const rimGeo = (w: number) => new THREE.CylinderGeometry(WHEEL_RADIUS * 0.6, WHEEL_RADIUS * 0.6, w + 0.02, 14).rotateZ(Math.PI / 2);

export function addWheels(root: THREE.Object3D, halfTrack: number, axleRear: number, axleFront: number, frontW: number, rearW: number) {
  for (const [s, w] of [
    [axleFront, frontW],
    [axleRear, rearW],
  ] as const) {
    const geo = mergeGeometries([tireGeo(w), rimGeo(w)], true)!;
    for (const side of [-1, 1]) {
      const wheel = mesh(geo, [RUBBER, CHROME], 'wheel');
      wheel.castShadow = false; // the contact shadow already covers it; saves draw calls in the shadow pass
      wheel.position.set(side * halfTrack, WHEEL_RADIUS, -s);
      root.add(wheel);
    }
  }
}

export function addLamps(body: THREE.Object3D, halfW: number, frontZ: number, rearZ: number, y: number) {
  body.add(
    mesh(
      mirrored((sd) => rb(0.44, 0.15, 0.08, 0.03, sd * (halfW - 0.34), y, frontZ)),
      HEAD,
      'headlights',
    ),
  );
  body.add(
    mesh(
      mirrored((sd) => rb(0.56, 0.24, 0.08, 0.04, sd * (halfW - 0.36), y, rearZ)),
      TAIL,
      'taillights',
    ),
  );
}
