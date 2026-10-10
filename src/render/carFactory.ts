import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Role } from '../config/balance';
import type { CarState } from '../sim/car';
import { jumpHeight } from '../sim/track';
import { trackPos } from './trackFrame';

import {
  WHEEL_RADIUS,
  MAX_ROLL,
  BLINK_PERIOD,
  paint,
  GLASS,
  CHROME,
  RUBBER,
  PLASTIC,
  type P,
  sideProfile,
  extrudeProfile,
  rb,
  mesh,
  mirrored,
  contactShadow,
  tireGeo,
  addWheels,
  addLamps,
} from './carParts';

// ---------- patrol car ----------
export function buildPolice(root: THREE.Group, body: THREE.Group) {
  const W = 1.8;
  const WHITE = paint(0xf4f5f7);
  WHITE.userData.paint = true; // the shop paint recolours it
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

  // blue doors + hood stripe
  const doors = mirrored((sd) => rb(0.04, 0.3, 2.1, 0.02, sd * (W / 2 + 0.005), 0.62, 0.1));
  const hood = rb(1.2, 0.03, 0.9, 0.015, 0, 0.965, -1.55);
  body.add(mesh(mergeGeometries([doors, hood])!, BLUE, 'police-blue'));
  body.add(
    mesh(mergeGeometries([rb(1.86, 0.22, 0.26, 0.07, 0, 0.42, -2.15), rb(1.86, 0.22, 0.26, 0.07, 0, 0.42, 2.15)])!, PLASTIC, 'bumpers'),
  );
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

// ---------- muscle car (red: stands out from the dark asphalt at a distance) ----------
export function buildThief(root: THREE.Group, body: THREE.Group) {
  const W = 1.88;
  const RED = paint(0xd0151c);
  RED.userData.paint = true;
  const BLACK = paint(0x0d0e10);
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
  body.add(mesh(extrudeProfile(shell, W), RED, 'shell'));

  const gh = new THREE.Shape();
  gh.moveTo(-1.6, 0.85);
  gh.lineTo(-0.95, 1.3);
  gh.lineTo(0.1, 1.32);
  gh.lineTo(0.78, 0.85);
  gh.lineTo(-1.6, 0.85);
  body.add(mesh(extrudeProfile(gh, 1.5, 0.06), GLASS, 'greenhouse'));
  body.add(mesh(rb(1.4, 0.06, 0.95, 0.03, 0, 1.335, 0.42), RED, 'roof'));

  const stripe = BLACK; // black racing stripes over the red
  body.add(
    mesh(mergeGeometries([rb(0.46, 0.02, 1.4, 0.01, 0, 0.885, -1.45), rb(0.46, 0.02, 0.9, 0.01, 0, 1.37, 0.42)])!, stripe, 'stripe'),
  );
  const spoiler = mergeGeometries([
    rb(1.76, 0.06, 0.3, 0.02, 0, 1.14, 2.1),
    ...[-1, 1].map((sd) => rb(0.06, 0.24, 0.08, 0.02, sd * 0.7, 1.0, 2.1)),
    rb(0.72, 0.16, 0.62, 0.06, 0, 0.98, -1.15), // air intake
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

  // titanium plates (items): rear and sides, hidden until the thief picks them up
  const TITANIUM = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.9 });
  const plates: [string, THREE.BufferGeometry][] = [
    ['plate-front', rb(1.7, 0.42, 0.06, 0.03, 0, 0.6, 2.36)],
    ['plate-left', rb(0.06, 0.38, 2.6, 0.03, -W / 2 - 0.03, 0.62, 0.1)],
    ['plate-right', rb(0.06, 0.38, 2.6, 0.03, W / 2 + 0.03, 0.62, 0.1)],
  ];
  for (const [name, geo] of plates) {
    const m = mesh(geo, TITANIUM, name);
    m.visible = false;
    body.add(m);
  }
}

// ---------- traffic: 4 civilian models ----------
interface CivilianSpec {
  W: number;
  color: number;
  shellTop: P[];
  rearX: number;
  frontX: number;
  axles: [number, number];
  gh: P[];
  roofTop?: boolean;
}

const CIVILIANS: CivilianSpec[] = [
  // 0: silver sedan
  {
    W: 1.78,
    color: 0xb9bec6,
    rearX: -2.2,
    frontX: 2.2,
    axles: [-1.35, 1.4],
    shellTop: [
      [2.22, 0.6],
      [2.1, 0.84],
      [1.0, 0.92],
      [-1.2, 0.94],
      [-2.12, 0.9],
      [-2.24, 0.58],
    ],
    gh: [
      [-1.25, 0.88],
      [-0.8, 1.4],
      [0.4, 1.42],
      [1.0, 0.88],
    ],
  },
  // 1: green hatchback
  {
    W: 1.7,
    color: 0x2f7d5b,
    rearX: -1.85,
    frontX: 1.95,
    axles: [-1.15, 1.2],
    shellTop: [
      [1.98, 0.6],
      [1.85, 0.84],
      [0.8, 0.94],
      [-1.75, 0.98],
      [-1.88, 0.6],
    ],
    gh: [
      [-1.8, 0.92],
      [-1.65, 1.45],
      [0.25, 1.47],
      [0.85, 0.92],
    ],
  },
  // 2: white van
  {
    W: 1.9,
    color: 0xe9ebee,
    rearX: -2.4,
    frontX: 2.3,
    axles: [-1.5, 1.55],
    shellTop: [
      [2.32, 0.65],
      [2.2, 1.0],
      [1.6, 1.15],
      [-2.35, 1.2],
      [-2.42, 0.62],
    ],
    gh: [
      [1.55, 1.1],
      [1.0, 1.85],
      [-2.3, 1.9],
      [-2.38, 1.1],
    ],
  },
  // 3: yellow taxi
  {
    W: 1.78,
    color: 0xf2c230,
    rearX: -2.2,
    frontX: 2.2,
    axles: [-1.35, 1.4],
    shellTop: [
      [2.22, 0.6],
      [2.1, 0.84],
      [1.0, 0.92],
      [-1.2, 0.94],
      [-2.12, 0.9],
      [-2.24, 0.58],
    ],
    gh: [
      [-1.25, 0.88],
      [-0.8, 1.4],
      [0.4, 1.42],
      [1.0, 0.88],
    ],
    roofTop: true,
  },
];

const CIVILIAN_LAMPS = new THREE.MeshBasicMaterial({ vertexColors: true });

function tinted(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function buildCivilian(root: THREE.Group, body: THREE.Group, spec: CivilianSpec) {
  const PAINT = paint(spec.color);
  body.add(mesh(extrudeProfile(sideProfile(spec.shellTop, spec.rearX, spec.frontX, spec.axles[0], spec.axles[1]), spec.W), PAINT, 'shell'));
  const gh = new THREE.Shape();
  spec.gh.forEach(([x, y], i) => (i === 0 ? gh.moveTo(x, y) : gh.lineTo(x, y)));
  gh.lineTo(spec.gh[0]![0], spec.gh[0]![1]);
  body.add(mesh(extrudeProfile(gh, spec.W - 0.24, 0.06), GLASS, 'greenhouse'));
  if (spec.roofTop) body.add(mesh(rb(0.5, 0.18, 0.25, 0.04, 0, 1.55, -0.2), PLASTIC, 'taxi-sign'));
  // headlights and taillights in a single mesh (vertex color, unlit): 1 draw call
  const halfW = spec.W / 2;
  const head = mirrored((sd) => rb(0.44, 0.15, 0.08, 0.03, sd * (halfW - 0.34), 0.72, -spec.frontX));
  const tail = mirrored((sd) => rb(0.56, 0.24, 0.08, 0.04, sd * (halfW - 0.36), 0.72, -spec.rearX));
  body.add(mesh(mergeGeometries([tinted(head, 0xfff0c4), tinted(tail, 0xff2a2a)])!, CIVILIAN_LAMPS, 'lamps'));
  // fixed wheels, tire only, in a single mesh (1 draw call): traffic is background, wheels need not spin
  const half = spec.W / 2 - 0.06;
  const tires: THREE.BufferGeometry[] = [];
  for (const z of [-spec.axles[0], -spec.axles[1]])
    for (const side of [-1, 1]) tires.push(tireGeo(0.26).translate(side * half, WHEEL_RADIUS, z));
  root.add(mesh(mergeGeometries(tires)!, RUBBER, 'wheels-static'));
  // no cast shadow: the contact shadow is enough and the shadow pass stays cheap
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
}

const templates = new Map<string, THREE.Group>();

/** parts with their own geometry per game car (visual damage deforms the vertices) */
const DEFORMABLE = new Set(['shell', 'taillights', 'bumpers', 'chrome']);

const SHADOW_CASTERS = new Set(['shell', 'greenhouse']);

function template(key: string, build: (root: THREE.Group, body: THREE.Group) => void): THREE.Group {
  let t = templates.get(key);
  if (!t) {
    t = new THREE.Group();
    t.name = key;
    const body = new THREE.Group();
    body.name = 'body';
    t.add(body);
    build(t, body);
    // only the silhouette casts shadow: small parts barely show and cost one draw call each in the shadow pass
    t.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.castShadow && SHADOW_CASTERS.has(o.name);
    });
    t.add(contactShadow(2.3, 5.0));
    templates.set(key, t);
  }
  return t;
}

/** Traffic model (0 sedan, 1 hatchback, 2 van, 3 taxi). Shared geometry and materials. */
export function createTrafficModel(model: number): THREE.Group {
  const i = ((model % CIVILIANS.length) + CIVILIANS.length) % CIVILIANS.length;
  return template(`traffic-model-${i}`, (r, b) => buildCivilian(r, b, CIVILIANS[i]!)).clone(true);
}

export function createCarModel(role: Role): THREE.Group {
  const root = instantiate(`car-${role}`, role === 'police' ? buildPolice : buildThief);
  root.name = `car-${role}`;
  return root;
}

/** A game car from a template: shared geometry, own materials, own geometry on the parts that dent. */
export function instantiate(key: string, build: (root: THREE.Group, body: THREE.Group) => void): THREE.Group {
  const root = template(key, build).clone(true);
  // game car: own materials (gyrophare, dirt, cracked glass, headlight) and own geometry on the parts
  // that dent/bend — the other car and the template are unchanged. Traffic keeps sharing everything.
  const clones = new Map<THREE.Material, THREE.Material>();
  const own = (m: THREE.Material) => {
    let c = clones.get(m);
    if (!c) clones.set(m, (c = m.clone()));
    return c;
  };
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.name === 'contact-shadow') return;
    m.material = Array.isArray(m.material) ? m.material.map(own) : own(m.material);
    if (DEFORMABLE.has(m.name)) {
      m.geometry = m.geometry.clone();
      m.geometry.userData.own = true; // this car's copy: freed with it (disposeLookModel)
    }
  });
  return root;
}

export function updateCarModel(model: THREE.Group, car: CarState, timeSeconds: number, originS = 0): void {
  const p = trackPos(car.s, car.x, originS);
  model.position.set(p.x, jumpHeight(car.airTime), p.z);
  model.rotation.y = -p.heading; // follows the road curve
  const body = model.getObjectByName('body');
  if (body) {
    body.rotation.z = car.steer === 0 ? 0 : -car.steer * MAX_ROLL;
    // on a jump: nose rises on the way up and drops on the way down
    body.rotation.x = car.airTime > 0 ? (car.airTime / 0.6 - 0.5) * 0.12 : 0;
  }
  if (car.role === 'thief') {
    const n = car.upgrades.plates;
    const set = (name: string, v: boolean) => {
      const o = model.getObjectByName(name);
      if (o) o.visible = v;
    };
    set('plate-front', n >= 1);
    set('plate-left', n >= 2);
    set('plate-right', n >= 3);
  }

  // each model has its own wheel size (userData.r): a bigger wheel turns slower
  for (const child of model.children)
    if (child.name === 'wheel') child.rotation.x = -car.s / ((child.userData.r as number | undefined) ?? WHEEL_RADIUS);

  flickerFlames(model, car, timeSeconds);
  blinkLightbar(model, timeSeconds);
}

function blinkLightbar(model: THREE.Group, timeSeconds: number): void {
  const red = model.getObjectByName('lightbar-red') as THREE.Mesh | undefined;
  const blue = model.getObjectByName('lightbar-blue') as THREE.Mesh | undefined;
  if (red && blue) {
    const redOn = Math.floor(timeSeconds / BLINK_PERIOD) % 2 === 0;
    (red.material as THREE.MeshStandardMaterial).emissiveIntensity = redOn ? 3 : 0;
    (blue.material as THREE.MeshStandardMaterial).emissiveIntensity = redOn ? 0 : 3;
  }
}

/**
 * Exhaust flames (thief accessory): always flickering, longer while the car speeds up (after a crash or a slow-down).
 */
function flickerFlames(model: THREE.Group, car: CarState, t: number): void {
  const flames = model.userData.flames as THREE.Object3D[] | undefined;
  if (!flames) return;
  const prev = (model.userData.prevSpeed as number | undefined) ?? car.speed;
  model.userData.prevSpeed = car.speed;
  const boost = car.speed - prev > 0.001 ? 1.7 : 1;
  flames.forEach((f, i) => {
    const flick = 0.75 + 0.18 * Math.sin(t * 37 + i * 1.7) + 0.12 * Math.sin(t * 61 + i * 0.9);
    f.scale.set(1, 1, boost * flick);
  });
}
