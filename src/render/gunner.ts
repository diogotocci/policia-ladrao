// Gunner at the passenger window (right side), leaning out, turning toward the target.
// A single mesh (vertex color) + the muzzle flash, which only shows at the instant of the shot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Role } from '../config/balance';
import type { CarState } from '../sim/car';
import { inFireCone } from '../sim/rules';

const FLASH_TIME = 0.06; // s

function box(w: number, h: number, d: number, x: number, y: number, z: number, hex: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed();
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

const STYLE: Record<Role, { shirt: number; hat: number; face: number }> = {
  police: { shirt: 0x1d2f5c, hat: 0x13203f, face: 0xc89a72 },
  thief: { shirt: 0x2b2b30, hat: 0x111113, face: 0xb01818 }, // black beanie and red scarf over the face
};

const geoCache = new Map<string, THREE.BufferGeometry>();
/**
 * `armed` false: the same person without the gun (moto passenger before picking a weapon); `helmet`: a white
 * motorcycle helmet instead of the cap (the Rocam passenger, V2 part 6 delivery 3)
 */
function gunnerGeometry(role: Role, armed = true, helmet = false): THREE.BufferGeometry {
  const key = `${role}-${armed}-${helmet}`;
  let g = geoCache.get(key);
  if (g) return g;
  const st = STYLE[role];
  const SKIN = 0xc89a72;
  const GUN = 0x17181a;
  const parts = [
    box(0.42, 0.42, 0.3, 0, 0.21, 0, st.shirt), // torso
    box(0.24, 0.24, 0.24, 0, 0.56, 0, SKIN), // head
    box(0.25, 0.1, 0.25, 0, 0.42 + 0.02, -0.002, st.face === SKIN ? SKIN : st.face), // scarf (thief) / neck
    box(0.07, 0.07, 0.36, 0.14, 0.32, -0.2, st.shirt), // arm extended forward (−z)
    box(0.08, 0.08, 0.08, 0.14, 0.32, -0.42, SKIN), // hand
  ];
  if (armed) parts.push(box(0.06, 0.1, 0.34, 0.14, 0.35, -0.6, GUN)); // gun
  if (helmet) {
    parts.push(box(0.32, 0.3, 0.32, 0, 0.6, 0.01, 0xf4f5f7)); // helmet over the head
    parts.push(box(0.26, 0.09, 0.03, 0, 0.6, -0.16, 0x111316)); // visor
  } else if (role === 'police') {
    parts.push(box(0.27, 0.08, 0.27, 0, 0.71, 0, st.hat)); // cap
    parts.push(box(0.2, 0.025, 0.12, 0, 0.67, -0.17, st.hat)); // brim
  } else {
    parts.push(box(0.26, 0.12, 0.26, 0, 0.7, 0, st.hat)); // beanie
  }
  g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

const BODY_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
const FLASH_MAT = new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false });
const FLASH_GEO = new THREE.OctahedronGeometry(0.14);

/** Creates the gunner and fits him in the car's right window (child of 'body', follows the roll). */
export function attachGunner(model: THREE.Object3D, role: Role): THREE.Group {
  const g = new THREE.Group();
  g.name = 'gunner';
  const helmet = model.userData.gunnerHelmet === true;
  const body = new THREE.Mesh(gunnerGeometry(role, true, helmet), BODY_MAT);
  body.name = 'gunner-body';
  body.castShadow = false;
  const flash = new THREE.Mesh(FLASH_GEO, FLASH_MAT);
  flash.name = 'gunner-flash';
  flash.position.set(0.14, 0.35, -0.82);
  flash.visible = false;
  g.add(body, flash);
  // leaning out of the passenger window, in the front seat; shop cars say where (roof hatch, pickup bed, moto seat)
  const at = model.userData.gunnerAt as [number, number, number] | undefined;
  if (at) g.position.set(...at);
  else g.position.set(0.86, 0.84, role === 'police' ? -0.05 : 0.0);
  g.scale.setScalar(1.15);
  Object.assign(g.userData, { flashUntil: -1, body, always: model.userData.gunnerAlways === true, helmet, flash });
  (model.getObjectByName('body') ?? model).add(g);
  return g;
}

export function flashGunner(g: THREE.Object3D, now: number): void {
  g.userData.flashUntil = now + FLASH_TIME;
}

/** Visibility (thief only with a weapon), aiming at the target within the cone, and flash. */
export function updateGunner(g: THREE.Object3D, car: CarState, target: { s: number; x: number }, now: number): void {
  g.visible = car.role === 'police' || car.hasGun;
  // moto (shop): the passenger figure stands in while the armed gunner is not on the back seat
  // moto (shop): the shooter is the passenger from the start; without a weapon he just rides, unarmed
  if (g.userData.always) {
    const armed = g.visible;
    g.visible = true;
    const body = g.userData.body as THREE.Mesh;
    body.geometry = gunnerGeometry(car.role, armed, g.userData.helmet === true);
    if (!armed) {
      g.rotation.y = 0;
      (g.userData.flash as THREE.Object3D).visible = false;
      return;
    }
  }
  if (!g.visible) return;
  const facing = car.role === 'police' ? 'front' : 'rear';
  let yaw = 0;
  if (inFireCone(car, target, facing)) {
    const dx = target.x - car.x;
    const dz = -(target.s - car.s);
    yaw = Math.atan2(-dx, -dz);
  }
  g.rotation.y = yaw;
  (g.userData.flash as THREE.Object3D).visible = now < (g.userData.flashUntil as number);
}
