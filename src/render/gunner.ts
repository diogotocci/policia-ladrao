// Atirador na janela do carona (lado direito), inclinado para fora, girando para o alvo.
// Um mesh só (cor por vértice) + o clarão do cano, que só aparece no instante do tiro.
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
  thief: { shirt: 0x2b2b30, hat: 0x111113, face: 0xb01818 }, // touca preta e lenço vermelho no rosto
};

const geoCache = new Map<Role, THREE.BufferGeometry>();
function gunnerGeometry(role: Role): THREE.BufferGeometry {
  let g = geoCache.get(role);
  if (g) return g;
  const st = STYLE[role];
  const SKIN = 0xc89a72;
  const GUN = 0x17181a;
  const parts = [
    box(0.42, 0.42, 0.3, 0, 0.21, 0, st.shirt), // tronco
    box(0.24, 0.24, 0.24, 0, 0.56, 0, SKIN), // cabeça
    box(0.25, 0.1, 0.25, 0, 0.42 + 0.02, -0.002, st.face === SKIN ? SKIN : st.face), // lenço (ladrão) / pescoço
    box(0.07, 0.07, 0.36, 0.14, 0.32, -0.2, st.shirt), // braço estendido para frente (−z)
    box(0.08, 0.08, 0.08, 0.14, 0.32, -0.42, SKIN), // mão
    box(0.06, 0.1, 0.34, 0.14, 0.35, -0.6, GUN), // arma
  ];
  if (role === 'police') {
    parts.push(box(0.27, 0.08, 0.27, 0, 0.71, 0, st.hat)); // quepe
    parts.push(box(0.2, 0.025, 0.12, 0, 0.67, -0.17, st.hat)); // aba
  } else {
    parts.push(box(0.26, 0.12, 0.26, 0, 0.7, 0, st.hat)); // touca
  }
  g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  geoCache.set(role, g);
  return g;
}

const BODY_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
const FLASH_MAT = new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false });
const FLASH_GEO = new THREE.OctahedronGeometry(0.14);

/** Cria o atirador e encaixa na janela direita do carro (filho do 'body', acompanha a rolagem). */
export function attachGunner(model: THREE.Object3D, role: Role): THREE.Group {
  const g = new THREE.Group();
  g.name = 'gunner';
  const body = new THREE.Mesh(gunnerGeometry(role), BODY_MAT);
  body.name = 'gunner-body';
  body.castShadow = false;
  const flash = new THREE.Mesh(FLASH_GEO, FLASH_MAT);
  flash.name = 'gunner-flash';
  flash.position.set(0.14, 0.35, -0.82);
  flash.visible = false;
  g.add(body, flash);
  // inclinado para fora da janela do carona, no banco da frente
  g.position.set(0.86, 0.84, role === 'police' ? -0.05 : 0.0);
  g.scale.setScalar(1.15);
  g.userData.flashUntil = -1;
  g.userData.flash = flash;
  (model.getObjectByName('body') ?? model).add(g);
  return g;
}

export function flashGunner(g: THREE.Object3D, now: number): void {
  g.userData.flashUntil = now + FLASH_TIME;
}

/** Visibilidade (ladrão só com arma), mira no alvo dentro do cone e clarão. */
export function updateGunner(g: THREE.Object3D, car: CarState, target: { s: number; x: number }, now: number): void {
  g.visible = car.role === 'police' || car.hasGun;
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
