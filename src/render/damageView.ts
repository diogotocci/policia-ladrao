// Visual damage of the game cars (spec §9): a function of health only, continuous and reversible on healing.
// Creates no meshes (no new draw calls): tweaks the material and vertices of the car's own parts.
import * as THREE from 'three';

export interface DamageLook {
  dirt: number; // 0..1
  dents: number; // 0..1
  tiltedLamp: boolean;
  whiteSmoke: boolean;
  hangingBumper: boolean;
  crackedGlass: boolean;
  blackSmoke: boolean;
  sparks: boolean;
  blinkingHeadlight: boolean;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function damageLook(hp: number): DamageLook {
  return {
    dirt: clamp01((80 - hp) / 60),
    dents: clamp01((60 - hp) / 60),
    tiltedLamp: hp <= 60,
    whiteSmoke: hp <= 40 && hp > 20,
    hangingBumper: hp <= 40,
    crackedGlass: hp <= 40,
    blackSmoke: hp <= 20,
    sparks: hp <= 20,
    blinkingHeadlight: hp <= 20,
  };
}

// ---------- textures ----------
let crackTex: THREE.DataTexture | undefined;
/** Light cracks on black (used as emissiveMap: only shows when the glass emissive turns on). */
function crackTexture(): THREE.DataTexture {
  if (crackTex) return crackTex;
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) data[i * 4 + 3] = 255;
  const plot = (x: number, y: number) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= N || py >= N) return;
    data.set([235, 240, 245, 255], (py * N + px) * 4);
  };
  // star of cracks from an impact point, with branches
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const branch = (x: number, y: number, a: number, len: number, depth: number) => {
    for (let k = 0; k < len; k++) {
      a += (rand() - 0.5) * 0.35;
      x += Math.cos(a);
      y += Math.sin(a);
      plot(x, y);
      if (depth > 0 && rand() < 0.03) branch(x, y, a + (rand() - 0.5) * 1.6, len * 0.5, depth - 1);
    }
  };
  for (let i = 0; i < 9; i++) branch(N * 0.55, N * 0.5, (i / 9) * Math.PI * 2, 70, 2);
  crackTex = new THREE.DataTexture(data, N, N);
  crackTex.wrapS = crackTex.wrapT = THREE.RepeatWrapping;
  crackTex.repeat.set(0.6, 0.6);
  crackTex.magFilter = THREE.LinearFilter;
  crackTex.minFilter = THREE.LinearMipmapLinearFilter; // no shimmering from afar
  crackTex.generateMipmaps = true;
  crackTex.needsUpdate = true;
  return crackTex;
}

// ---------- per-car state ----------
interface PartState {
  geo: THREE.BufferGeometry;
  original: Float32Array;
  originalNormals: Float32Array;
  atRest: boolean;
}
interface CarDamageState {
  key: string;
  shell?: PartState;
  tail?: PartState;
  bumper?: PartState;
  dents: { c: THREE.Vector3; r: number }[];
  center: THREE.Vector3;
  paint?: { mat: THREE.MeshPhysicalMaterial; color: THREE.Color; clearcoat: number; roughness: number };
  glass?: THREE.MeshPhysicalMaterial;
  head?: { mat: THREE.MeshStandardMaterial; intensity: number };
}

const DIRT = new THREE.Color(0x4a3f33);
const DENT_DEPTH = 0.16;
const LAMP_TILT = 0.45; // rad
const BUMPER_DROP = 0.15; // rad (the loose end almost scrapes the ground)

function part(model: THREE.Object3D, name: string): PartState | undefined {
  const m = model.getObjectByName(name) as THREE.Mesh | undefined;
  if (!m) return undefined;
  const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute;
  const nor = m.geometry.getAttribute('normal') as THREE.BufferAttribute;
  return {
    geo: m.geometry,
    original: Float32Array.from(pos.array as ArrayLike<number>),
    originalNormals: Float32Array.from(nor.array as ArrayLike<number>),
    atRest: true,
  };
}

function init(model: THREE.Object3D): CarDamageState {
  const shellMesh = model.getObjectByName('shell') as THREE.Mesh;
  shellMesh.geometry.computeBoundingBox();
  const box = shellMesh.geometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  // fixed dents per car: sides, corners and hood (deterministic)
  const { min, max } = box;
  const dents = [
    { c: new THREE.Vector3(max.x, 0.65, min.z + 0.9), r: 0.55 },
    { c: new THREE.Vector3(min.x, 0.6, center.z + 0.3), r: 0.6 },
    { c: new THREE.Vector3(max.x, 0.7, max.z - 0.6), r: 0.5 },
    { c: new THREE.Vector3(center.x - 0.3, max.y, min.z + 0.6), r: 0.55 },
    { c: new THREE.Vector3(min.x + 0.3, 0.55, max.z), r: 0.5 },
    { c: new THREE.Vector3(max.x - 0.2, 0.5, min.z), r: 0.45 },
  ];
  const shellMat = shellMesh.material as THREE.MeshPhysicalMaterial;
  const glass = (model.getObjectByName('greenhouse') as THREE.Mesh | undefined)?.material as THREE.MeshPhysicalMaterial | undefined;
  if (glass) {
    glass.emissiveMap = crackTexture();
    glass.emissive.setHex(0);
  }
  const headMat = (model.getObjectByName('headlights') as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
  return {
    key: '',
    shell: part(model, 'shell'),
    tail: part(model, 'taillights'),
    bumper: part(model, 'bumpers') ?? part(model, 'chrome'),
    dents,
    center,
    paint: { mat: shellMat, color: shellMat.color.clone(), clearcoat: shellMat.clearcoat, roughness: shellMat.roughness },
    glass,
    head: headMat ? { mat: headMat, intensity: headMat.emissiveIntensity } : undefined,
  };
}

/** Deforms from the original shape. `normal` rotates the original normals (rigid part) or, without it, recomputes them (dent). */
function writeBack(
  p: PartState,
  transform: (x: number, y: number, z: number, out: THREE.Vector3) => void,
  normal?: (x: number, y: number, z: number, nx: number, ny: number, nz: number, out: THREE.Vector3) => void,
) {
  const pos = p.geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = p.geo.getAttribute('normal') as THREE.BufferAttribute;
  const a = pos.array as Float32Array;
  const n = nor.array as Float32Array;
  const o = p.original;
  const on = p.originalNormals;
  for (let i = 0; i < a.length; i += 3) {
    transform(o[i]!, o[i + 1]!, o[i + 2]!, TMP);
    a[i] = TMP.x;
    a[i + 1] = TMP.y;
    a[i + 2] = TMP.z;
    if (normal) {
      normal(o[i]!, o[i + 1]!, o[i + 2]!, on[i]!, on[i + 1]!, on[i + 2]!, TMP);
      n[i] = TMP.x;
      n[i + 1] = TMP.y;
      n[i + 2] = TMP.z;
    }
  }
  pos.needsUpdate = true;
  if (normal) nor.needsUpdate = true;
  else p.geo.computeVertexNormals();
  p.geo.computeBoundingSphere();
  p.atRest = false;
}

function restore(p: PartState) {
  if (p.atRest) return;
  const pos = p.geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = p.geo.getAttribute('normal') as THREE.BufferAttribute;
  (pos.array as Float32Array).set(p.original);
  (nor.array as Float32Array).set(p.originalNormals);
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  p.geo.computeBoundingSphere();
  p.atRest = true;
}

const TMP = new THREE.Vector3();
const DIR = new THREE.Vector3();
const ORIG = new THREE.Vector3();

/** rotation in the xy plane around (cx, cy) by an angle (cos c, sin s) */
const rotXY = (x: number, y: number, cx: number, cy: number, c: number, s: number, out: THREE.Vector3, z: number) =>
  out.set(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c, z);

function deform(st: CarDamageState, dents: number, tilted: boolean, hanging: boolean) {
  if (st.shell) {
    if (dents === 0) restore(st.shell);
    else
      writeBack(st.shell, (x, y, z, out) => {
        ORIG.set(x, y, z);
        out.set(x, y, z);
        for (const d of st.dents) {
          const dist = ORIG.distanceTo(d.c); // distance in the original shape: does not depend on dent order
          if (dist >= d.r) continue;
          const f = (1 - dist / d.r) ** 2;
          DIR.set(x - st.center.x, (y - st.center.y) * 0.6, (z - st.center.z) * 0.4).normalize();
          out.addScaledVector(DIR, -DENT_DEPTH * dents * f);
        }
      });
  }
  if (st.tail) {
    if (!tilted) restore(st.tail);
    else {
      // only the left lamp (x < 0) rotates around its own center
      let cx = 0;
      let cy = 0;
      let n = 0;
      for (let i = 0; i < st.tail.original.length; i += 3)
        if (st.tail.original[i]! < 0) {
          cx += st.tail.original[i]!;
          cy += st.tail.original[i + 1]!;
          n++;
        }
      cx /= Math.max(1, n);
      cy /= Math.max(1, n);
      const c = Math.cos(LAMP_TILT);
      const s = Math.sin(LAMP_TILT);
      writeBack(
        st.tail,
        (x, y, z, out) => (x >= 0 ? out.set(x, y, z) : rotXY(x, y, cx, cy, c, s, out, z).setY(out.y - 0.04)),
        (x, _y, _z, nx, ny, nz, out) => (x >= 0 ? out.set(nx, ny, nz) : rotXY(nx, ny, 0, 0, c, s, out, nz)),
      );
    }
  }
  if (st.bumper) {
    if (!hanging) restore(st.bumper);
    else {
      // rear bumper (+z) hanging: attached at the right end, the left end drops
      const c = Math.cos(BUMPER_DROP);
      const s = Math.sin(BUMPER_DROP);
      writeBack(
        st.bumper,
        (x, y, z, out) => (z < 1.9 ? out.set(x, y, z) : rotXY(x, y, 0.9, 0.42, c, s, out, z)),
        (_x, _y, z, nx, ny, nz, out) => (z < 1.9 ? out.set(nx, ny, nz) : rotXY(nx, ny, 0, 0, c, s, out, nz)),
      );
    }
  }
}

/** Applies the damage visuals to a game car model (created by createCarModel). */
export function applyDamage(model: THREE.Object3D, look: DamageLook, time: number): void {
  const st = (model.userData.damage ??= init(model)) as CarDamageState;

  // vertices: only rebuilt when the (quantized) state changes — never every frame
  const dents = Math.round(look.dents * 20) / 20;
  const key = `${dents}|${look.tiltedLamp}|${look.hangingBumper}`;
  if (key !== st.key) {
    st.key = key;
    deform(st, dents, look.tiltedLamp, look.hangingBumper);
  }

  if (st.paint) {
    const { mat, color, clearcoat, roughness } = st.paint;
    mat.color.copy(color).lerp(DIRT, look.dirt * 0.55);
    mat.clearcoat = clearcoat * (1 - 0.85 * look.dirt);
    mat.roughness = roughness + (0.9 - roughness) * look.dirt;
  }
  st.glass?.emissive.setHex(look.crackedGlass ? 0x7c838c : 0);
  if (st.head) {
    // irregular flicker (bad contact)
    const on = !look.blinkingHeadlight || Math.sin(time * 23) + Math.sin(time * 7.3) > -0.2;
    st.head.mat.emissiveIntensity = on ? st.head.intensity : 0;
  }
}
