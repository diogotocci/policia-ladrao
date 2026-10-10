// Paint finishes and stickers (V2 part 6, spec §3): visual only, applied on the car's own material copies.
import * as THREE from 'three';
import type { Role } from '../config/balance';
import { LEGENDARY, type FinishId } from '../meta/mastery';
import { canvasTex } from './models/kit';

const camoCache = new Map<number, THREE.Texture | null>();
/** Blotches in three tones of the paint (darker colours get stronger contrast). */
function camoTexture(hex: number): THREE.Texture | null {
  if (camoCache.has(hex)) return camoCache.get(hex)!;
  const base = new THREE.Color(hex);
  const tone = (k: number) => `#${base.clone().multiplyScalar(k).getHexString()}`;
  const dark = base.getHSL({ h: 0, s: 0, l: 0 }).l < 0.2;
  const tex = canvasTex(256, 256, (g) => {
    g.fillStyle = tone(1);
    g.fillRect(0, 0, 256, 256);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const layers: [number, number][] = dark
      ? [
          [0.35, 14],
          [2.6, 10],
          [0.15, 8],
        ]
      : [
          [0.55, 14],
          [1.35, 10],
          [0.3, 8],
        ];
    for (const [k, n] of layers) {
      g.fillStyle = tone(k);
      for (let i = 0; i < n; i++) {
        g.beginPath();
        const x = rnd() * 256;
        const y = rnd() * 256;
        for (let a = 0; a < 7; a++) {
          const ang = (a / 7) * Math.PI * 2;
          const r = 18 + rnd() * 26;
          g.lineTo(x + Math.cos(ang) * r * 1.4, y + Math.sin(ang) * r);
        }
        g.closePath();
        g.fill();
      }
    }
  });
  if (tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.6, 0.6);
  }
  camoCache.set(hex, tex);
  return tex;
}

/** Changes a paint material for a finish (the colour is already set). */
export function applyFinish(mat: THREE.MeshStandardMaterial, finish: FinishId, paint: number, role: Role): void {
  const phys = mat as THREE.MeshPhysicalMaterial;
  if (finish === 'metalico') {
    mat.color.multiplyScalar(1.25);
    mat.metalness = 0.5;
    mat.roughness = 0.32;
    if (phys.isMeshPhysicalMaterial) phys.clearcoat = 1;
  } else if (finish === 'fosco') {
    mat.metalness = 0;
    mat.roughness = 0.9;
    if (phys.isMeshPhysicalMaterial) phys.clearcoat = 0;
  } else if (finish === 'perolizado') {
    mat.color.multiplyScalar(1.15);
    mat.metalness = 0.15;
    mat.roughness = 0.22;
    if (phys.isMeshPhysicalMaterial) {
      phys.clearcoat = 1;
      phys.iridescence = 1;
      phys.iridescenceIOR = 1.8;
      phys.iridescenceThicknessRange = [250, 700];
    }
  } else if (finish === 'camuflado') {
    const tex = camoTexture(paint);
    if (tex) {
      mat.color.setHex(0xffffff);
      mat.map = tex;
    }
    mat.roughness = 0.75;
    if (phys.isMeshPhysicalMaterial) phys.clearcoat = 0;
  } else if (finish === 'lendaria') {
    const c = LEGENDARY[role].color;
    mat.color.setHex(c);
    mat.metalness = 0.7;
    mat.roughness = 0.2;
    mat.emissive.setHex(c);
    mat.emissiveIntensity = 0.12;
    if (phys.isMeshPhysicalMaterial) phys.clearcoat = 1;
  }
  mat.needsUpdate = true;
}
