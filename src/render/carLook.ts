// The player's car with its shop look (V2 part 4, spec §4): model, paint, neon and plate. Visual only.
import * as THREE from 'three';
import type { Role } from '../config/balance';
import { defaultLook, type CarLook } from '../meta/shop';
import { instantiate } from './carFactory';
import { MODELS } from './models';
import { canvasTex } from './models/kit';

/** Mercosul plate: white, blue "BRASIL" band, black letters. */
function plateTexture(text: string): THREE.Texture | null {
  return canvasTex(256, 84, (g) => {
    g.fillStyle = '#f4f4f4';
    g.fillRect(0, 0, 256, 84);
    g.fillStyle = '#1f47b0';
    g.fillRect(0, 0, 256, 20);
    g.fillStyle = '#ffffff';
    g.font = 'bold 14px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('BRASIL', 128, 11);
    g.fillStyle = '#111111';
    g.font = 'bold 50px "Arial Narrow", Arial, sans-serif';
    g.fillText(text, 128, 54, 236);
    g.strokeStyle = '#111111';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 252, 80);
  });
}

let glowTex: THREE.DataTexture | undefined;
/** Soft oval glow (white; the material tints it). DataTexture: works without a DOM (tests). */
function glowTexture(): THREE.DataTexture {
  if (glowTex) return glowTex;
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.min(1, Math.hypot((x + 0.5) / N - 0.5, (y + 0.5) / N - 0.5) * 2);
      data.set([255, 255, 255, Math.round(Math.pow(1 - d, 1.4) * 255)], (y * N + x) * 4);
    }
  glowTex = new THREE.DataTexture(data, N, N);
  glowTex.magFilter = THREE.LinearFilter;
  glowTex.needsUpdate = true;
  return glowTex;
}

/** Game car for `role` with `look`. Without a look: the default car of that side (same as createCarModel). */
export function createLookModel(role: Role, look: CarLook = defaultLook(role)): THREE.Group {
  const spec = MODELS[look.car];
  const root = instantiate(`car-${look.car}`, spec.build);
  root.name = `car-${role}`;
  root.userData.camLift = spec.camLift;
  if (spec.gunner) root.userData.gunnerAt = spec.gunner;
  if (spec.scale) root.scale.setScalar(spec.scale);
  // paint: the materials are this car's own copies (instantiate), so the template and other cars keep theirs
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material])
      if (mat.userData.paint) (mat as THREE.MeshStandardMaterial).color.setHex(look.paint);
  });
  if (look.neon !== null) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.neon.w, spec.neon.l).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: look.neon,
        map: glowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.geometry.userData.own = true;
    glow.name = 'neon';
    glow.position.y = 0.035;
    glow.renderOrder = 1;
    root.add(glow);
  }
  if (look.plate) {
    const tex = plateTexture(look.plate);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.plate.w, spec.plate.w / 3),
      new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : 0xf4f4f4, map: tex, roughness: 0.5 }),
    );
    plate.geometry.userData.own = true;
    if (tex) tex.userData.own = true;
    plate.name = 'plate';
    plate.position.set(0, spec.plate.y, spec.plate.z + 0.012);
    root.getObjectByName('body')!.add(plate);
  }
  return root;
}

/**
 * Frees what belongs to one car only: its material copies, its own geometry (dents, neon, plate) and the plate
 * texture. Template geometry and shared textures (decals, glow) stay: other cars use them.
 */
export function disposeLookModel(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (m.geometry.userData.own) m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const map = (mat as THREE.MeshStandardMaterial).map;
      if (map?.userData.own) map.dispose();
      mat.dispose();
    }
  });
}
