import { createRng } from '../sim/rng';

export interface BuildingSpec {
  /** centro lateral (m) */
  x: number;
  /** centro ao longo do bloco, 0..chunkLength (m) */
  s: number;
  width: number; // ao longo da rua
  depth: number;
  height: number;
  color: number;
}

const PALETTE = [0xb9a48a, 0x9aa3ad, 0xc98f6b, 0x8e9a7d, 0xd6c7a1, 0x7f8794, 0xa86f5c, 0xc2b8d0];
const SETBACK = 10.6;

/** Prédios de um bloco, determinísticos por (seed, chunkIndex). */
export function buildingsForChunk(seed: number, chunkIndex: number, chunkLength: number): BuildingSpec[] {
  const rng = createRng((seed * 2654435761 + chunkIndex * 40503) >>> 0);
  const out: BuildingSpec[] = [];
  for (const side of [-1, 1]) {
    let s = 0;
    while (s < chunkLength - 4) {
      const width = Math.min(rng.range(8, 16), chunkLength - s);
      const depth = rng.range(9, 14);
      out.push({
        x: side * (SETBACK + depth / 2),
        s: s + width / 2,
        width: width - 0.6,
        depth,
        height: rng.next() < 0.15 ? rng.range(30, 46) : rng.range(8, 24),
        color: PALETTE[rng.int(0, PALETTE.length - 1)] ?? 0x999999,
      });
      s += width + rng.range(0, 2);
    }
  }
  return out;
}
