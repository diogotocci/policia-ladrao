// What each map segment looks like (mockups approved 2026-10-17): the buildings (facade, sides, heights, colours),
// the ground beyond the sidewalks (sand and sea, grass, river) and the props along the road. Deterministic per
// (seed, chunk): the same chunk always looks the same. No three.js here: roadChunks.ts draws it.
import type { MapId, Segment } from '../meta/maps';
import { createRng } from '../sim/rng';
import type { BuildingSpec } from './buildings';

export type Facade = 'city' | 'pastel' | 'brick' | 'night' | 'stone' | 'prewar';
/** the wide plane under the segment, beyond the sidewalks */
export type Outer = 'beach' | 'grass' | 'river';
/** the street's own texture (road, curb and sidewalks) */
export type Street = 'city' | 'promenade' | 'bridge';
export type DecorKind =
  | 'tree'
  | 'palm'
  | 'umbrella'
  | 'hedge'
  | 'rock'
  | 'waterTower'
  | 'mansard'
  | 'billboard'
  | 'wall'
  | 'suspender'
  | 'railing'
  | 'bridgeTower';

export interface DecorSpec {
  kind: DecorKind;
  /** along the chunk, 0..chunkLength (m) */
  s: number;
  /** lateral (m); negative = left */
  x: number;
  /** base height (m) */
  y?: number;
  /** size (x across, y up, z along); 1 = the model's own size */
  scale: [number, number, number];
  /** turn around y (rad) */
  turn?: number;
  /** tint (multiplies the model's colours); billboards: the panel colour */
  color?: number;
}

export interface SegmentLook {
  facade: Facade | null;
  /** sides with buildings */
  sides: readonly (-1 | 1)[];
  height: readonly [number, number];
  /** share of tall buildings and their height */
  tall?: readonly [number, number, number];
  palette: readonly number[];
  outer: Outer | null;
  street: Street;
  lamps: boolean;
}

/** Sky, fog and light of a whole map (one look per map: no sudden change of sky inside a match). */
export interface MapLook {
  sky: readonly [string, string, string];
  fog: { color: number; near: number; far: number };
  hemi: { sky: number; ground: number; intensity: number };
  sun: { color: number; intensity: number };
}

const CITY_PALETTE = [0xb9a48a, 0x9aa3ad, 0xc98f6b, 0x8e9a7d, 0xd6c7a1, 0x7f8794, 0xa86f5c, 0xc2b8d0];

export const SEGMENT_LOOKS: Record<Segment, SegmentLook> = {
  city: {
    facade: 'city',
    sides: [-1, 1],
    height: [8, 24],
    tall: [0.15, 30, 46],
    palette: CITY_PALETTE,
    outer: null,
    street: 'city',
    lamps: true,
  },
  'paris-avenue': {
    facade: 'stone',
    sides: [-1, 1],
    height: [15, 19],
    palette: [0xffffff, 0xf3eee4, 0xece4d4, 0xf8f3ea],
    outer: null,
    street: 'city',
    lamps: true,
  },
  'paris-park': {
    facade: 'stone',
    sides: [-1],
    height: [15, 19],
    palette: [0xffffff, 0xf3eee4, 0xece4d4],
    outer: 'grass',
    street: 'city',
    lamps: true,
  },
  rio: {
    facade: 'pastel',
    sides: [-1],
    height: [6, 14],
    palette: [0xffffff, 0xf8dccb, 0xdbe9f3, 0xf3e6b9, 0xead6e8, 0xf4efe4],
    outer: 'beach',
    street: 'promenade',
    lamps: true,
  },
  'ny-brooklyn': {
    facade: 'brick',
    sides: [-1, 1],
    height: [11, 20],
    palette: [0xffffff, 0xe8d0c8, 0xf0dcd2, 0xd8b8ac],
    outer: null,
    street: 'city',
    lamps: true,
  },
  'ny-times': {
    facade: 'night',
    sides: [-1, 1],
    height: [30, 60],
    palette: [0xffffff, 0xd8dcef, 0xe8e4f4],
    outer: null,
    street: 'city',
    lamps: true,
  },
  'ny-park': {
    facade: 'prewar',
    sides: [-1],
    height: [9, 15],
    palette: [0xffffff, 0xf0e8d8, 0xe2d8c4, 0xd6ccb8],
    outer: 'grass',
    street: 'city',
    lamps: true,
  },
  'ny-bridge': { facade: null, sides: [], height: [0, 0], palette: [0xffffff], outer: 'river', street: 'bridge', lamps: false },
};

export const MAP_LOOKS: Record<MapId, MapLook> = {
  city: {
    sky: ['#5f8fcf', '#a9c8e6', '#e6dccb'],
    fog: { color: 0xd3dbe2, near: 110, far: 300 },
    hemi: { sky: 0xe4eeff, ground: 0x6a6052, intensity: 1.7 },
    sun: { color: 0xffe4bd, intensity: 3.0 },
  },
  paris: {
    sky: ['#6fa3d8', '#b9d4ec', '#f3ead8'],
    fog: { color: 0xe6e2d6, near: 120, far: 310 },
    hemi: { sky: 0xeef2ff, ground: 0x7a6e58, intensity: 1.7 },
    sun: { color: 0xfff0d0, intensity: 2.8 },
  },
  rio: {
    sky: ['#3f8fe0', '#8cc6f2', '#d9eefc'],
    fog: { color: 0xcfe6f7, near: 130, far: 320 },
    hemi: { sky: 0xf0f6ff, ground: 0x9a8a6a, intensity: 1.8 },
    sun: { color: 0xfff2d6, intensity: 3.2 },
  },
  // late afternoon: Times Square's lights show, the rest is still day
  ny: {
    sky: ['#2c3f78', '#9a7fb0', '#f2a98a'],
    fog: { color: 0xc9a9a8, near: 110, far: 300 },
    hemi: { sky: 0xd9d4ff, ground: 0x5a4a44, intensity: 1.35 },
    sun: { color: 0xffc89a, intensity: 2.3 },
  },
};

/** Where the buildings start, from the road centre (m). */
export const SETBACK = 10.6;

/** Buildings of a chunk of a segment, deterministic per (seed, chunkIndex). */
export function buildingsFor(look: SegmentLook, seed: number, chunkIndex: number, chunkLength: number): BuildingSpec[] {
  const rng = createRng((seed * 2654435761 + chunkIndex * 40503) >>> 0);
  const out: BuildingSpec[] = [];
  if (!look.facade) return out;
  for (const side of [-1, 1] as const) {
    if (!look.sides.includes(side)) continue;
    let s = 0;
    while (s < chunkLength - 4) {
      const width = Math.min(rng.range(8, 16), chunkLength - s);
      const depth = rng.range(9, 14);
      const tall = look.tall && rng.next() < look.tall[0];
      out.push({
        x: side * (SETBACK + depth / 2),
        s: s + width / 2,
        width: width - 0.6,
        depth,
        height: tall ? rng.range(look.tall![1], look.tall![2]) : rng.range(look.height[0], look.height[1]),
        color: look.palette[rng.int(0, look.palette.length - 1)] ?? 0xffffff,
      });
      s += width + rng.range(0, 2);
    }
  }
  return out;
}

const BILLBOARD_COLORS = [0xff2d55, 0x0a84ff, 0x30d158, 0xffd60a, 0xbf5af2, 0xff9f0a, 0x64d2ff, 0xff375f];

/**
 * Props of a chunk: trees, palms, umbrellas, hedges, water towers, Paris roofs, Times Square panels, the park wall and
 * the bridge. `buildings` are the chunk's own (roofs and panels sit on them). `start` is the chunk's start (m).
 */
export function decorFor(
  segment: Segment,
  seed: number,
  chunkIndex: number,
  chunkLength: number,
  buildings: readonly BuildingSpec[],
  segmentStart: number,
  start: number,
): DecorSpec[] {
  const rng = createRng((seed * 97 + chunkIndex * 7919 + 13) >>> 0);
  const out: DecorSpec[] = [];
  const along = (step: number, from: number, f: (s: number) => void) => {
    for (let s = from; s < chunkLength; s += step) f(s);
  };
  const tree = (s: number, x: number, size = 1) =>
    out.push({ kind: 'tree', s, x, scale: [size, size * rng.range(0.9, 1.15), size], turn: rng.range(0, Math.PI) });
  switch (segment) {
    case 'paris-avenue':
    case 'paris-park':
      for (const b of buildings) out.push({ kind: 'mansard', s: b.s, x: b.x, y: b.height, scale: [b.depth, 1, b.width], color: 0xffffff });
      along(12.5, 4, (s) => {
        tree(s, -8.6, 0.9);
        if (segment === 'paris-avenue') tree(s + 6, 8.6, 0.9);
      });
      if (segment === 'paris-park') {
        along(25, 2, (s) => {
          out.push({ kind: 'hedge', s, x: 17, scale: [1.4, 1.2, 10] });
          out.push({ kind: 'hedge', s, x: 31, scale: [1.4, 1.2, 10] });
        });
        along(16, rng.range(0, 8), (s) => tree(s, rng.range(40, 80), rng.range(1.1, 1.5)));
        out.push({ kind: 'railing', s: chunkLength / 2, x: 11.2, scale: [1, 1, chunkLength] });
      }
      break;
    case 'rio':
      along(14, 3, (s) => out.push({ kind: 'palm', s, x: 9.8, scale: [1, rng.range(0.9, 1.15), 1], turn: rng.range(0, Math.PI) }));
      along(11, rng.range(0, 6), (s) =>
        out.push({
          kind: 'umbrella',
          s,
          x: rng.range(16, 40),
          scale: [1, 1, 1],
          color: [0xff5a3c, 0xffd23f, 0x2fb5a3, 0xff8fb1, 0x4f7cff][rng.int(0, 4)],
        }),
      );
      break;
    case 'ny-brooklyn':
      for (const b of buildings)
        if (rng.next() < 0.4) out.push({ kind: 'waterTower', s: b.s, x: b.x + rng.range(-1.5, 1.5), y: b.height, scale: [1, 1, 1] });
      along(16, 6, (s) => {
        tree(s, -8.6, 0.8);
        tree(s + 8, 8.6, 0.8);
      });
      break;
    case 'ny-times':
      for (const b of buildings) {
        const side = Math.sign(b.x);
        let y = 5;
        for (let i = 0; i < 3 && y < b.height - 8; i++) {
          const h = rng.range(6, 11);
          const w = Math.min(b.width * rng.range(0.7, 0.95), 14);
          out.push({
            kind: 'billboard',
            s: b.s,
            x: side * (SETBACK - 0.15),
            y,
            scale: [1, h, w],
            turn: side < 0 ? 0 : Math.PI, // the panel faces the road
            color: BILLBOARD_COLORS[rng.int(0, BILLBOARD_COLORS.length - 1)],
          });
          y += h + rng.range(1.5, 4);
        }
      }
      break;
    case 'ny-park':
      out.push({ kind: 'wall', s: chunkLength / 2, x: 11.3, scale: [1, 1, chunkLength] });
      along(9, rng.range(0, 5), (s) => tree(s, rng.range(14, 90), rng.range(1.1, 1.6)));
      if (rng.next() < 0.6)
        out.push({ kind: 'rock', s: rng.range(0, chunkLength), x: rng.range(16, 50), scale: [rng.range(1.5, 3), 1, rng.range(1.5, 3)] });
      break;
    case 'ny-bridge': {
      // one tower in the middle of the bridge (the road goes through its arches); the cables hang from it
      const mid = segmentStart + 300;
      for (const side of [-1, 1]) {
        out.push({ kind: 'railing', s: chunkLength / 2, x: side * 10.4, scale: [1, 1, chunkLength] });
        along(5, 2.5, (s) => {
          const d = Math.min(1, Math.abs(start + s - mid) / 150);
          out.push({ kind: 'suspender', s, x: side * 10.6, y: 1, scale: [1, 4 + 62 * (1 - d) ** 2, 1] });
        });
      }
      if (mid >= start && mid < start + chunkLength) out.push({ kind: 'bridgeTower', s: mid - start, x: 0, scale: [1, 1, 1] });
      break;
    }
    default:
      break;
  }
  return out;
}
