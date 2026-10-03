import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Role } from '../config/balance';
import type { CarState } from '../sim/car';

const WHEEL_RADIUS = 0.36;
const MAX_ROLL = (6 * Math.PI) / 180;
const BLINK_PERIOD = 0.25;

// ---------- materiais ----------
const paint = (color: number) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1 });
const GLASS = new THREE.MeshPhysicalMaterial({ color: 0x0a0f15, roughness: 0.15, metalness: 0.1, clearcoat: 0.6, envMapIntensity: 0.8 });
const CHROME = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 });
const RUBBER = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.92 });
const PLASTIC = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.55 });
const HEAD = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c4, emissiveIntensity: 0.7 });
const TAIL = new THREE.MeshStandardMaterial({ color: 0x7a0a0f, emissive: 0xff1a1a, emissiveIntensity: 1.1 });

// ---------- helpers de geometria ----------
type P = [number, number];

/** Perfil lateral (x = comprimento, frente positiva; y = altura) com caixas de roda. */
function sideProfile(top: P[], rearX: number, frontX: number, axleRear: number, axleFront: number): THREE.Shape {
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
  for (const [x, y] of top) s.lineTo(x, y); // da frente para trás
  s.lineTo(rearX, floor);
  return s;
}

/** Extruda um perfil lateral na largura e orienta: frente em -z, centrado em x. */
function extrudeProfile(shape: THREE.Shape, width: number, bevel = 0.07): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.rotateY(Math.PI / 2); // x do perfil → -z ; profundidade → +x
  g.translate(-(width - bevel * 2) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

const rb = (w: number, h: number, l: number, r: number, x = 0, y = 0, z = 0) =>
  new RoundedBoxGeometry(w, h, l, 2, r).translate(x, y, z);

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], name = '') => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

const mirrored = (make: (side: number) => THREE.BufferGeometry) => mergeGeometries([make(-1), make(1)])!;

// ---------- sombra de contato ----------
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

function contactShadow(width: number, length: number): THREE.Mesh {
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

// ---------- rodas ----------
const tireGeo = (w: number) => new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, w, 22).rotateZ(Math.PI / 2);
const rimGeo = (w: number) => new THREE.CylinderGeometry(WHEEL_RADIUS * 0.6, WHEEL_RADIUS * 0.6, w + 0.02, 14).rotateZ(Math.PI / 2);

function addWheels(root: THREE.Object3D, halfTrack: number, axleRear: number, axleFront: number, frontW: number, rearW: number) {
  for (const [s, w] of [
    [axleFront, frontW],
    [axleRear, rearW],
  ] as const) {
    const geo = mergeGeometries([tireGeo(w), rimGeo(w)], true)!;
    for (const side of [-1, 1]) {
      const wheel = mesh(geo, [RUBBER, CHROME], 'wheel');
      wheel.position.set(side * halfTrack, WHEEL_RADIUS, -s);
      root.add(wheel);
    }
  }
}

function addLamps(body: THREE.Object3D, halfW: number, frontZ: number, rearZ: number, y: number) {
  body.add(mesh(mirrored((sd) => rb(0.44, 0.15, 0.08, 0.03, sd * (halfW - 0.34), y, frontZ)), HEAD, 'headlights'));
  body.add(mesh(mirrored((sd) => rb(0.52, 0.2, 0.08, 0.04, sd * (halfW - 0.36), y, rearZ)), TAIL, 'taillights'));
}

// ---------- viatura ----------
function buildPolice(root: THREE.Group, body: THREE.Group) {
  const W = 1.8;
  const WHITE = paint(0xf4f5f7);
  const BLUE = paint(0x1c4ac2);
  const shell = sideProfile(
    [
      [2.22, 0.62],
      [2.12, 0.86],
      [1.1, 0.95],
      [-1.15, 0.96],
      [-2.12, 0.92],
      [-2.24, 0.6],
    ],
    -2.2,
    2.2,
    -1.35,
    1.4,
  );
  body.add(mesh(extrudeProfile(shell, W), WHITE, 'shell'));

  const gh = new THREE.Shape();
  gh.moveTo(-1.25, 0.9);
  gh.lineTo(-0.8, 1.43);
  gh.lineTo(0.42, 1.45);
  gh.lineTo(1.05, 0.9);
  gh.lineTo(-1.25, 0.9);
  body.add(mesh(extrudeProfile(gh, 1.56, 0.06), GLASS, 'greenhouse'));
  body.add(mesh(rb(1.46, 0.07, 1.3, 0.03, 0, 1.47, 0.18), WHITE, 'roof'));

  // portas azuis + faixa do capô
  const doors = mirrored((sd) => rb(0.04, 0.3, 2.1, 0.02, sd * (W / 2 + 0.005), 0.62, 0.1));
  const hood = rb(1.2, 0.03, 0.9, 0.015, 0, 0.965, -1.55);
  body.add(mesh(mergeGeometries([doors, hood])!, BLUE, 'police-blue'));
  body.add(mesh(mergeGeometries([rb(1.86, 0.22, 0.26, 0.07, 0, 0.42, -2.15), rb(1.86, 0.22, 0.26, 0.07, 0, 0.42, 2.15)])!, PLASTIC, 'bumpers'));
  addLamps(body, W / 2, -2.2, 2.2, 0.78);

  const bar = new THREE.Group();
  bar.name = 'lightbar';
  bar.position.set(0, 1.53, 0.18);
  bar.add(mesh(rb(1.25, 0.08, 0.32, 0.03), PLASTIC, 'lightbar-base'));
  for (const [name, color, x] of [
    ['lightbar-red', 0xff2020, -0.33],
    ['lightbar-blue', 0x2a5bff, 0.33],
  ] as const) {
    const m = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.2, clearcoat: 1 });
    bar.add(mesh(rb(0.52, 0.17, 0.28, 0.06, x, 0.11, 0), m, name));
  }
  body.add(bar);
  addWheels(root, 0.82, -1.35, 1.4, 0.26, 0.26);
}

// ---------- muscle car ----------
function buildThief(root: THREE.Group, body: THREE.Group) {
  const W = 1.88;
  const BLACK = paint(0x090a0c);
  const shell = sideProfile(
    [
      [2.3, 0.6],
      [2.22, 0.84],
      [0.8, 0.87],
      [-1.6, 0.88],
      [-2.22, 0.9],
      [-2.32, 0.6],
    ],
    -2.28,
    2.26,
    -1.42,
    1.45,
  );
  body.add(mesh(extrudeProfile(shell, W), BLACK, 'shell'));

  const gh = new THREE.Shape();
  gh.moveTo(-1.6, 0.85);
  gh.lineTo(-0.95, 1.3);
  gh.lineTo(0.1, 1.32);
  gh.lineTo(0.78, 0.85);
  gh.lineTo(-1.6, 0.85);
  body.add(mesh(extrudeProfile(gh, 1.5, 0.06), GLASS, 'greenhouse'));
  body.add(mesh(rb(1.4, 0.06, 0.95, 0.03, 0, 1.335, 0.42), BLACK, 'roof'));

  const stripe = paint(0x6b7079);
  body.add(
    mesh(mergeGeometries([rb(0.46, 0.02, 1.4, 0.01, 0, 0.885, -1.45), rb(0.46, 0.02, 0.9, 0.01, 0, 1.37, 0.42)])!, stripe, 'stripe'),
  );
  const spoiler = mergeGeometries([
    rb(1.76, 0.06, 0.3, 0.02, 0, 1.14, 2.1),
    ...[-1, 1].map((sd) => rb(0.06, 0.24, 0.08, 0.02, sd * 0.7, 1.0, 2.1)),
    rb(0.72, 0.16, 0.62, 0.06, 0, 0.98, -1.15), // tomada de ar
  ])!;
  body.add(mesh(spoiler, PLASTIC, 'spoiler'));
  const chrome = mergeGeometries([
    rb(1.92, 0.18, 0.22, 0.06, 0, 0.42, -2.28),
    rb(1.92, 0.18, 0.22, 0.06, 0, 0.42, 2.3),
    ...[-1, 1].map((sd) => rb(0.13, 0.13, 0.32, 0.05, sd * 0.5, 0.3, 2.36)),
  ])!;
  body.add(mesh(chrome, CHROME, 'chrome'));
  addLamps(body, W / 2, -2.3, 2.3, 0.72);
  addWheels(root, 0.86, -1.42, 1.45, 0.28, 0.42);
}

export function createCarModel(role: Role): THREE.Group {
  const root = new THREE.Group();
  root.name = `car-${role}`;
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  if (role === 'police') buildPolice(root, body);
  else buildThief(root, body);
  root.add(contactShadow(2.3, 5.0));
  return root;
}

export function updateCarModel(model: THREE.Group, car: CarState, timeSeconds: number, originS = 0): void {
  model.position.set(car.x, 0, -(car.s - originS));
  const body = model.getObjectByName('body');
  if (body) body.rotation.z = car.steer === 0 ? 0 : -car.steer * MAX_ROLL;

  const spin = -car.s / WHEEL_RADIUS;
  for (const child of model.children) if (child.name === 'wheel') child.rotation.x = spin;

  const red = model.getObjectByName('lightbar-red') as THREE.Mesh | undefined;
  const blue = model.getObjectByName('lightbar-blue') as THREE.Mesh | undefined;
  if (red && blue) {
    const redOn = Math.floor(timeSeconds / BLINK_PERIOD) % 2 === 0;
    (red.material as THREE.MeshStandardMaterial).emissiveIntensity = redOn ? 3 : 0;
    (blue.material as THREE.MeshStandardMaterial).emissiveIntensity = redOn ? 0 : 3;
  }
}
