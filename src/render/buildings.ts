import { SEGMENT_LOOKS, buildingsFor } from './mapThemes';

export interface BuildingSpec {
  /** lateral center (m) */
  x: number;
  /** center along the chunk, 0..chunkLength (m) */
  s: number;
  width: number; // along the street
  depth: number;
  height: number;
  color: number;
}

/** Buildings of a chunk of the city map, deterministic per (seed, chunkIndex). */
export function buildingsForChunk(seed: number, chunkIndex: number, chunkLength: number): BuildingSpec[] {
  return buildingsFor(SEGMENT_LOOKS.city, seed, chunkIndex, chunkLength);
}
