// The yellow "?" box (V2 part 3, mockup option B): an opaque golden block with a black "?" on each side, a darker rim
// and a pulsing halo, so it reads as something different (and risky) next to the translucent blue and red boxes.
import * as THREE from 'three';

/** 12×16 pixel "?" (1 = ink) */
const GLYPH = [
  '............',
  '....####....',
  '...######...',
  '..###..###..',
  '..##....##..',
  '........##..',
  '.......###..',
  '......###...',
  '.....###....',
  '.....##.....',
  '.....##.....',
  '............',
  '.....##.....',
  '.....##.....',
  '............',
  '............',
];

/** Face texture: gold with a rim and a black "?" with a light edge. */
function faceTexture(): THREE.DataTexture {
  const S = 32;
  const data = new Uint8Array(S * S * 4);
  const set = (x: number, y: number, c: readonly number[]) => data.set(c, ((S - 1 - y) * S + x) * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const rim = x < 2 || y < 2 || x >= S - 2 || y >= S - 2;
      const t = (x + y) / (2 * S);
      set(x, y, rim ? [194, 106, 0, 255] : [255, Math.round(224 - 50 * t), Math.round(102 - 80 * t), 255]);
    }
  const ox = 4;
  const oy = 0;
  GLYPH.forEach((row, gy) =>
    [...row].forEach((ch, gx) => {
      if (ch !== '#') return;
      for (const [dx, dy, c] of [
        [1, 2, [255, 236, 170, 255]], // light edge under the ink
        [0, 0, [18, 14, 8, 255]], // black "?" (playtest 2026-10-09: the white one did not show on the gold)
      ] as const)
        for (let k = 0; k < 2; k++) {
          const px = ox + gx * 2 + dx + k;
          const py = oy + gy * 2 + dy;
          if (px < S && py < S) {
            set(px, py, c);
            if (py + 1 < S) set(px, py + 1, c);
          }
        }
    }),
  );
  const tex = new THREE.DataTexture(data, S, S);
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Soft round glow (alpha falls off from the center). */
function haloTexture(): THREE.DataTexture {
  const N = 32;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.min(1, Math.hypot((x + 0.5) / N - 0.5, (y + 0.5) / N - 0.5) * 2);
      data.set([255, 255, 255, Math.round(255 * (1 - d) ** 2)], (y * N + x) * 4);
    }
  const t = new THREE.DataTexture(data, N, N);
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

let shared: { geo: THREE.BoxGeometry; mat: THREE.MeshStandardMaterial; halo: THREE.SpriteMaterial } | undefined;

export function createMysteryBox(): THREE.Group {
  shared ??= {
    geo: new THREE.BoxGeometry(1, 1, 1),
    mat: new THREE.MeshStandardMaterial({ map: faceTexture(), emissive: 0xffb21a, emissiveIntensity: 0.35, roughness: 0.45 }),
    halo: new THREE.SpriteMaterial({ map: haloTexture(), color: 0xffd646, transparent: true, opacity: 0.6, depthWrite: false }),
  };
  const g = new THREE.Group();
  g.name = 'mystery';
  const cube = new THREE.Mesh(shared.geo, shared.mat);
  cube.name = 'mystery-cube';
  cube.castShadow = true;
  const halo = new THREE.Sprite(shared.halo);
  halo.name = 'mystery-halo';
  halo.scale.setScalar(2.2);
  g.add(halo, cube);
  return g;
}

/** Halo pulse (1.1 s), shared by every yellow box. */
export function pulseMysteryHalo(time: number): void {
  if (shared) shared.halo.opacity = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 1.1));
}
