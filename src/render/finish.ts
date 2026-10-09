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

// ---------- stickers ----------
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, number: number) => void;
const INK = '#111317';
const SHAPES: Record<string, Draw> = {
  faixas: (g, w, h) => {
    for (const [y, c] of [
      [0.22, '#f4f4f4'],
      [0.62, '#f4f4f4'],
    ] as const) {
      g.fillStyle = INK;
      g.fillRect(0, h * y - 3, w, h * 0.26 + 6);
      g.fillStyle = c;
      g.fillRect(0, h * y, w, h * 0.26);
    }
  },
  chamas: (g, w, h) => {
    // flames from the front (right edge of the texture) going back
    const grad = g.createLinearGradient(w, 0, w * 0.35, 0);
    grad.addColorStop(0, '#ffd23a');
    grad.addColorStop(0.5, '#ff7a1a');
    grad.addColorStop(1, '#d4161c');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(w, h * 0.15);
    for (let i = 0; i <= 5; i++) {
      const x = w - (w * 0.65 * (i + 0.5)) / 5.5;
      g.quadraticCurveTo(x + 30, h * (i % 2 ? 0.1 : 0.3), x, h * 0.5);
      g.quadraticCurveTo(x + 30, h * (i % 2 ? 0.9 : 0.7), x + 10, h * 0.85);
    }
    g.lineTo(w, h * 0.85);
    g.closePath();
    g.fill();
  },
  numero: (g, w, h, n) => {
    g.fillStyle = INK;
    g.beginPath();
    g.arc(w / 2, h / 2, h * 0.46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f4f4f4';
    g.beginPath();
    g.arc(w / 2, h / 2, h * 0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = INK;
    g.font = `900 ${Math.round(h * 0.56)}px Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), w / 2, h * 0.53);
  },
  caveira: (g, w, h) => {
    const cx = w / 2;
    const r = h * 0.34;
    g.fillStyle = '#f4f4f4';
    g.beginPath();
    g.arc(cx, h * 0.42, r, 0, Math.PI * 2);
    g.fill();
    g.fillRect(cx - r * 0.6, h * 0.6, r * 1.2, h * 0.28);
    g.fillStyle = INK;
    for (const dx of [-0.42, 0.42]) {
      g.beginPath();
      g.arc(cx + dx * r, h * 0.44, r * 0.26, 0, Math.PI * 2);
      g.fill();
    }
    for (const dx of [-0.3, 0, 0.3]) g.fillRect(cx + dx * r - 3, h * 0.72, 6, h * 0.16);
  },
  brasao: (g, w, h) => {
    const cx = w / 2;
    g.fillStyle = '#d9b23a';
    g.beginPath();
    g.moveTo(cx - h * 0.36, h * 0.08);
    g.lineTo(cx + h * 0.36, h * 0.08);
    g.lineTo(cx + h * 0.36, h * 0.5);
    g.quadraticCurveTo(cx + h * 0.3, h * 0.82, cx, h * 0.94);
    g.quadraticCurveTo(cx - h * 0.3, h * 0.82, cx - h * 0.36, h * 0.5);
    g.closePath();
    g.fill();
    g.fillStyle = '#1b2a4a';
    g.font = `900 ${Math.round(h * 0.4)}px Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('★', cx, h * 0.47);
  },
  xadrez: (g, w, h) => {
    const s = h / 4;
    for (let x = 0; x * s < w; x++)
      for (let y = 1; y < 3; y++) {
        g.fillStyle = (x + y) % 2 ? INK : '#f4f4f4';
        g.fillRect(x * s, y * s, s, s);
      }
  },
};

/** Sticker on both sides of the body, sized from the shell; nothing without a canvas (tests). */
export function addSticker(root: THREE.Object3D, kind: string, number: number): void {
  const body = root.getObjectByName('body');
  const shell = body?.getObjectByName('shell') as THREE.Mesh | undefined;
  const draw = SHAPES[kind];
  if (!body || !shell || !draw) return;
  const round = kind === 'numero' || kind === 'caveira' || kind === 'brasao';
  const tex = canvasTex(round ? 128 : 512, 128, (g) => draw(g, round ? 128 : 512, 128, number));
  if (!tex) return;
  tex.userData.own = true;
  shell.geometry.computeBoundingBox();
  const b = shell.geometry.boundingBox!;
  const height = (b.max.y - b.min.y) * (round ? 0.5 : 0.32);
  const length = round ? height : (b.max.z - b.min.z) * 0.72;
  const geo = new THREE.PlaneGeometry(length, height);
  geo.userData.own = true;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.3,
    roughness: 0.5,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(geo, mat);
    m.name = 'sticker';
    m.rotation.y = (side * Math.PI) / 2;
    if (side < 0) m.scale.x = -1; // same reading direction on both sides (front of the car on the right of the art)
    m.position.set(side * (b.max.x + 0.006), b.min.y + (b.max.y - b.min.y) * 0.45, (b.min.z + b.max.z) / 2);
    body.add(m);
  }
}
