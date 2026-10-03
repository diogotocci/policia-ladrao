import { describe, expect, it } from 'vitest';
import { buildingsForChunk } from '../../src/render/buildings';

describe('buildingsForChunk', () => {
  it('is deterministic per (seed, chunk)', () => {
    expect(buildingsForChunk(1, 7, 50)).toEqual(buildingsForChunk(1, 7, 50));
    expect(buildingsForChunk(1, 7, 50)).not.toEqual(buildingsForChunk(1, 8, 50));
  });

  it('fits the instanced pool and stays off the road and sidewalk', () => {
    for (let k = -5; k < 200; k++) {
      const specs = buildingsForChunk(42, k, 50);
      expect(specs.length).toBeLessThanOrEqual(16);
      for (const b of specs) {
        expect(Math.abs(b.x) - b.depth / 2).toBeGreaterThanOrEqual(10);
        expect(b.s - b.width / 2).toBeGreaterThanOrEqual(0);
        expect(b.s + b.width / 2).toBeLessThanOrEqual(50);
        expect(b.height).toBeGreaterThan(0);
      }
    }
  });
});
