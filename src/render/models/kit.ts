// Small kit shared by the shop car models: geometry helpers, materials, decals and wheels.
// Convention (same as carFactory): front at -z, x across, y up; parts merged per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type P = [number, number];

export const box = (w: number, h: number, l: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, l).translate(x, y, z);
export const rb = (w: number, h: number, l: number, r: number, x = 0, y = 0, z = 0) =>
  new RoundedBoxGeometry(w, h, l, 2, r).translate(x, y, z);
export const cyl = (r: number, len: number, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg);
export const both = (make: (sd: number) => THREE.BufferGeometry) => [make(-1), make(1)];
export const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)))!;

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], name: string) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- materials ----------
export const paint = (color: number, roughness = 0.45) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
/** The car's main colour: the shop paint recolours every mesh using it. */
export const mainPaint = (color: number, roughness = 0.45) => {
  const m = paint(color, roughness);
  m.userData.paint = true;
  return m;
};
export const matte = (color: number, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness });
export const metal = (color: number, roughness = 0.3) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.9 });
export const GLASS = new THREE.MeshPhysicalMaterial({ color: 0x0a0f15, roughness: 0.12, metalness: 0.1, clearcoat: 0.6 });
export const TINT = new THREE.MeshPhysicalMaterial({ color: 0x040507, roughness: 0.08, metalness: 0.3, clearcoat: 1 });
export const PLASTIC = matte(0x1a1b1e, 0.55);
export const RUBBER = matte(0x141414, 0.95);
export const CHROME = metal(0xdfe3e8, 0.12);
export const HEAD = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c4, emissiveIntensity: 0.8 });
export const TAIL = new THREE.MeshStandardMaterial({ color: 0x7a0a0f, emissive: 0xff1a1a, emissiveIntensity: 1.8 });
export const AMBER = new THREE.MeshStandardMaterial({ color: 0x8a4a00, emissive: 0xff9a1a, emissiveIntensity: 1.2 });

/** Red and blue emergency lights, named like the patrol car so updateCarModel blinks them. */
export function addEmergency(body: THREE.Object3D, red: THREE.BufferGeometry[], blue: THREE.BufferGeometry[]) {
  for (const [name, color, gs] of [
    ['lightbar-red', 0xff2020, red],
    ['lightbar-blue', 0x2a5bff, blue],
  ] as const) {
    const m = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.2, clearcoat: 1 });
    body.add(mesh(merge(gs), m, name));
  }
}

// ---------- body from a side profile ----------
/**
 * Side profile (x = along the length, front positive; y = height) with round wheel arches,
 * extruded across `width`. `top` goes from the front bumper to the rear bumper.
 */
export function shellFrom(
  top: P[],
  o: {
    rear: number;
    front: number;
    axleR: number;
    axleF: number;
    floor: number;
    arch: number;
    wheelR: number;
    width: number;
    bevel?: number;
  },
): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const cy = o.wheelR;
  s.moveTo(o.rear, o.floor);
  for (const ax of [o.axleR, o.axleF]) {
    s.lineTo(ax - o.arch, o.floor);
    s.lineTo(ax - o.arch, cy);
    s.absarc(ax, cy, o.arch, Math.PI, 0, true);
    s.lineTo(ax + o.arch, o.floor);
  }
  s.lineTo(o.front, o.floor);
  for (const [x, y] of top) s.lineTo(x, y);
  s.lineTo(o.rear, o.floor);
  return extrude(s, o.width, o.bevel ?? 0.07);
}

export function extrude(shape: THREE.Shape, width: number, bevel = 0.06): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: 0, // the outline stays exact: lamps, glass and decals sit right on the faces; chamfer on the sides only
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-(width - bevel * 2) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** Closed polygon in the side view (x = along the length, front positive), extruded across `width`. */
export function sidePoly(points: P[], width: number, bevel = 0.05): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(points[0]![0], points[0]![1]);
  for (const [x, y] of points.slice(1)) s.lineTo(x, y);
  s.lineTo(points[0]![0], points[0]![1]);
  return extrude(s, width, bevel);
}

// ---------- wheels ----------
export interface WheelOpts {
  r: number;
  width: number;
  rimR?: number; // fraction of r
  rim?: THREE.Material;
  spokes?: number;
  tread?: boolean;
}

/** Wheel meshes named 'wheel' (updateCarModel spins them), at (±x, r, z) for each z. */
export function addWheels(root: THREE.Object3D, o: WheelOpts, x: number, zs: number[], name = 'wheel') {
  const rimR = o.r * (o.rimR ?? 0.62);
  const parts: THREE.BufferGeometry[] = [cyl(o.r, o.width, 26).rotateZ(Math.PI / 2)];
  if (o.tread) {
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      for (const side of [-1, 1])
        parts.push(
          box(o.width * 0.38, 0.05, 0.1)
            .translate((i % 2 === 0 ? 0.22 : 0.27) * o.width * side, o.r + 0.005, 0)
            .applyMatrix4(new THREE.Matrix4().makeRotationX(a)),
        );
    }
  }
  const rubber = merge(parts);
  const spokes = o.spokes ?? 5;
  const rimParts: THREE.BufferGeometry[] = [
    cyl(rimR, o.width + 0.02, 20).rotateZ(Math.PI / 2),
    cyl(rimR * 0.3, o.width + 0.06, 10).rotateZ(Math.PI / 2),
  ];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    rimParts.push(
      box(o.width + 0.04, rimR * 0.85, 0.07)
        .translate(0, rimR * 0.45, 0)
        .applyMatrix4(new THREE.Matrix4().makeRotationX(a)),
    );
  }
  const geo = mergeGeometries([rubber, merge(rimParts)], true)!;
  const rimMat = o.rim ?? CHROME;
  for (const z of zs)
    for (const side of [-1, 1]) {
      const w = mesh(geo, [RUBBER, rimMat], name);
      w.castShadow = false;
      w.userData.r = o.r;
      w.position.set(side * x, o.r, z);
      root.add(w);
    }
}

// ---------- decals (canvas textures) ----------
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Text with the acute accent drawn by hand on letter `accentAt` (fallback fonts place it badly). */
export function textTex(text: string, color: string, size = 96, accentAt = -1, w = 512, h = 128) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = color;
    g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    g.textBaseline = 'middle';
    const x0 = (w - g.measureText(text).width) / 2;
    const y = h / 2 + size * 0.12;
    g.fillText(text, x0, y);
    if (accentAt >= 0) {
      const cx = x0 + g.measureText(text.slice(0, accentAt)).width + g.measureText(text[accentAt]!).width / 2;
      const top = y - size * 0.42;
      g.beginPath();
      g.moveTo(cx - size * 0.06, top - size * 0.08);
      g.lineTo(cx + size * 0.12, top - size * 0.26);
      g.lineTo(cx + size * 0.2, top - size * 0.18);
      g.lineTo(cx + size * 0.02, top - size * 0.02);
      g.fill();
    }
  });
}

export const POLICIA = (color = '#f2f2f2', size = 96) => textTex('POLICIA', color, size, 3);

export function decal(tex: THREE.Texture | null, w: number, h: number, name: string, transparent = true) {
  const mat = tex
    ? new THREE.MeshStandardMaterial({ map: tex, transparent, alphaTest: transparent ? 0.3 : 0, roughness: 0.6 })
    : new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 });
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, name);
  m.castShadow = false;
  return m;
}

/** Several planes sharing one decal texture, merged into one mesh (one draw call). */
export function decalSet(
  tex: THREE.Texture | null,
  planes: { w: number; h: number; x: number; y: number; z: number; ry?: number; rx?: number }[],
  name: string,
) {
  const geo = merge(
    planes.map((p) => {
      const g = new THREE.PlaneGeometry(p.w, p.h);
      if (p.rx) g.rotateX(p.rx);
      if (p.ry) g.rotateY(p.ry);
      return g.translate(p.x, p.y, p.z);
    }),
  );
  const d = decal(tex, 1, 1, name);
  d.geometry.dispose();
  d.geometry = geo;
  return d;
}

/** The same decal on both sides of the car, readable from outside (x = half width, z = center): one mesh. */
export function sideDecals(
  body: THREE.Object3D,
  make: () => THREE.Texture | null,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  name: string,
) {
  body.add(
    decalSet(
      make(),
      [-1, 1].map((sd) => ({ w, h, x: sd * x, y, z, ry: sd * (Math.PI / 2) })),
      name,
    ),
  );
}

/** A side stripe (flat colored plane) on both sides. */
export function sideStripes(
  body: THREE.Object3D,
  mat: THREE.Material,
  l: number,
  h: number,
  x: number,
  y: number,
  z: number,
  name: string,
) {
  body.add(mesh(merge(both((sd) => box(0.01, h, l, sd * x, y, z))), mat, name));
}

const TITANIUM = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.9 });
/**
 * Titanium plates (thief item): on the rear and both sides, hidden until picked up. Same names as the sedan
 * ('plate-front' is the rear one, as there), so updateCarModel shows them on every thief car.
 */
export function addArmorPlates(
  body: THREE.Object3D,
  o: { halfW: number; rearZ: number; y: number; w: number; h: number; sideLen: number; sideZ: number },
) {
  const parts: [string, THREE.BufferGeometry][] = [
    ['plate-front', rb(o.w, o.h, 0.06, 0.03, 0, o.y, o.rearZ + 0.04)],
    ['plate-left', rb(0.06, o.h * 0.9, o.sideLen, 0.03, -o.halfW - 0.03, o.y, o.sideZ)],
    ['plate-right', rb(0.06, o.h * 0.9, o.sideLen, 0.03, o.halfW + 0.03, o.y, o.sideZ)],
  ];
  for (const [name, geo] of parts) {
    const m = mesh(geo, TITANIUM, name);
    m.visible = false;
    body.add(m);
  }
}
