// Low-poly models of the map props (mapThemes.ts decides where they go). Each kind is one geometry with its colours
// in the vertices, drawn as an InstancedMesh per chunk (one draw call per kind in use); the instance colour tints it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { DecorKind } from './mapThemes';

const paint = (g: THREE.BufferGeometry, hex: number) => {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.deleteAttribute('uv');
  return geo;
};
const box = (w: number, h: number, d: number, x: number, y: number, z: number, hex: number) =>
  paint(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), hex);
const join = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts)!;

function tree(): THREE.BufferGeometry {
  return join([
    box(0.35, 3.2, 0.35, 0, 0, 0, 0x6e5a40),
    paint(new THREE.IcosahedronGeometry(2.2, 0).scale(1, 0.85, 1).translate(0, 4.9, 0), 0x4f8a3a),
  ]);
}

function palm(): THREE.BufferGeometry {
  const parts = [paint(new THREE.CylinderGeometry(0.16, 0.28, 8, 6).translate(0, 4, 0), 0x8a6a44)];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = new THREE.ConeGeometry(0.5, 3.6, 4);
    leaf.rotateZ(-Math.PI / 2 + 0.5);
    leaf.translate(1.6, 7.9, 0);
    leaf.rotateY(a);
    parts.push(paint(leaf, 0x2f8f3a));
  }
  return join(parts);
}

function umbrella(): THREE.BufferGeometry {
  return join([box(0.1, 2.3, 0.1, 0, 0, 0, 0xf2f2f2), paint(new THREE.ConeGeometry(1.7, 0.7, 8).translate(0, 2.5, 0), 0xffffff)]);
}

const hedge = () => box(1, 1, 1, 0, 0, 0, 0x3f7a35);
const rock = () => paint(new THREE.DodecahedronGeometry(1, 0).translate(0, 0.5, 0), 0x8a8a86);

function waterTower(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, z] of [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ] as const)
    parts.push(box(0.15, 2.4, 0.15, x, 0, z, 0x2a2a2a));
  parts.push(paint(new THREE.CylinderGeometry(1.4, 1.4, 3, 10).translate(0, 3.9, 0), 0x7a5b3c));
  parts.push(paint(new THREE.ConeGeometry(1.6, 1.4, 10).translate(0, 6.1, 0), 0x3a3a3a));
  return join(parts);
}

/** Paris zinc roof: a footprint of 1 × 1 (scaled to the building), 4.5 m high, with a chimney. */
function mansard(): THREE.BufferGeometry {
  const roof = new THREE.CylinderGeometry(0.62, 1, 4.5, 4, 1)
    .rotateY(Math.PI / 4)
    .scale(Math.SQRT1_2, 1, Math.SQRT1_2)
    .translate(0, 2.25, 0);
  return join([paint(roof, 0x5d6b7a), box(0.06, 1.2, 0.08, 0.2, 4, 0.25, 0xb87a5a)]);
}

/** a unit panel facing +x (x = depth, y = height, z = width), lit by itself */
const billboard = () => new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0.02, 0.5, 0);

/** Central Park: the low stone wall along the road (1 m long, scaled to the chunk) */
const wall = () => box(0.9, 1.1, 1, 0, 0, 0, 0x8f877a);

/** bridge walkway railing: a top rail and a kerb (1 m long, scaled to the chunk) */
const railing = () => join([box(0.12, 0.12, 1, 0, 1.1, 0, 0x3a3a3a), box(0.5, 0.3, 1, 0, 0, 0, 0x8a7a62)]);

/** a vertical cable of the bridge (1 m high, scaled) */
const suspender = () => box(0.12, 1, 0.12, 0, 0, 0, 0x2f2f33);

/** Brooklyn Bridge tower across the road: two stone piers beside the lanes, the block on top with its two pointed
 * openings (dark recesses) and the cap. Nothing stands on the lanes: the cars only pass under it. */
function bridgeTower(): THREE.BufferGeometry {
  const stone = 0xb59c7c;
  const dark = 0x2a2a30;
  const parts = [
    box(5, 72, 9, -12, 0, 0, stone),
    box(5, 72, 9, 12, 0, 0, stone),
    box(29, 30, 9, 0, 42, 0, stone),
    box(31, 3, 10, 0, 72, 0, 0x9c8466),
  ];
  for (const x of [-5.5, 5.5]) {
    for (const z of [-4.6, 4.6]) {
      parts.push(box(5, 16, 0.3, x, 48, z, dark));
      parts.push(
        paint(
          new THREE.ConeGeometry(3.6, 4, 4, 1)
            .rotateY(Math.PI / 4)
            .scale(1, 1, 0.08)
            .translate(x, 66, z),
          dark,
        ),
      );
    }
  }
  return join(parts);
}

export const DECOR_GEOMETRY: Record<DecorKind, () => THREE.BufferGeometry> = {
  tree,
  palm,
  umbrella,
  hedge,
  rock,
  waterTower,
  mansard,
  billboard,
  wall,
  railing,
  suspender,
  bridgeTower,
};

/** max instances of a kind in one 50 m chunk */
export const DECOR_MAX: Record<DecorKind, number> = {
  tree: 12,
  palm: 5,
  umbrella: 6,
  hedge: 6,
  rock: 2,
  waterTower: 8,
  mansard: 12,
  billboard: 48,
  wall: 1,
  railing: 2,
  suspender: 22,
  bridgeTower: 1,
};

/** The panels of Times Square: blocks of "text" and pictures on white, tinted per panel by the instance colour. */
export function makeBillboardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 128);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#9a9a9a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOW', 128, 54);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(40, 92, 176, 10);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 122);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
