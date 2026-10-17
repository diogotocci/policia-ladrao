// What each stretch of a map puts along the road (mapThemes.ts): deterministic, on the right sides, never on the lanes.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { buildingsForChunk } from '../../src/render/buildings';
import { SEGMENT_LOOKS, buildingsFor, decorFor } from '../../src/render/mapThemes';
import type { Segment } from '../../src/meta/maps';

const ALL = Object.keys(SEGMENT_LOOKS) as Segment[];

describe('map themes', () => {
  it('the city keeps its buildings', () => {
    expect(buildingsForChunk(4, 7, 50)).toEqual(buildingsFor(SEGMENT_LOOKS.city, 4, 7, 50));
    expect(buildingsForChunk(4, 7, 50).length).toBeGreaterThan(4);
  });

  it('Rio and the parks have buildings on the left only; the bridge has none', () => {
    for (const seg of ['rio', 'paris-park', 'ny-park'] as const)
      for (let k = 0; k < 10; k++) expect(buildingsFor(SEGMENT_LOOKS[seg], 1, k, 50).every((b) => b.x < 0)).toBe(true);
    expect(buildingsFor(SEGMENT_LOOKS['ny-bridge'], 1, 3, 50)).toEqual([]);
  });

  it('Central Park and Rio buildings are low; Times Square is tall', () => {
    const heights = (seg: Segment) =>
      Array.from({ length: 20 }, (_, k) => buildingsFor(SEGMENT_LOOKS[seg], 2, k, 50).map((b) => b.height)).flat();
    expect(Math.max(...heights('ny-park'))).toBeLessThanOrEqual(15);
    expect(Math.max(...heights('rio'))).toBeLessThanOrEqual(14);
    expect(Math.min(...heights('ny-times'))).toBeGreaterThanOrEqual(30);
  });

  it('props are deterministic and stay off the road (except the bridge tower, which spans it)', () => {
    for (const seg of ALL) {
      for (let k = 0; k < 12; k++) {
        const b = buildingsFor(SEGMENT_LOOKS[seg], 3, k, 50);
        const a = decorFor(seg, 3, k, 50, b, 0, k * 50);
        expect(decorFor(seg, 3, k, 50, b, 0, k * 50)).toEqual(a);
        for (const d of a) {
          if (d.kind === 'bridgeTower') continue;
          expect(Math.abs(d.x)).toBeGreaterThan(BALANCE.road.halfWidth + 1);
          expect(d.s).toBeGreaterThanOrEqual(0);
          expect(d.s).toBeLessThan(50 + 10);
        }
      }
    }
  });

  it('the Brooklyn Bridge has one tower, 300 m into the bridge', () => {
    const towers = Array.from(
      { length: 12 },
      (_, k) => decorFor('ny-bridge', 1, 48 + k, 50, [], 2400, (48 + k) * 50).filter((d) => d.kind === 'bridgeTower').length,
    );
    expect(towers.reduce((a, b) => a + b, 0)).toBe(1);
    expect(towers[6]).toBe(1); // chunk 54 starts at 2700 m
  });

  it('Times Square panels sit on the facades, facing the road', () => {
    const b = buildingsFor(SEGMENT_LOOKS['ny-times'], 5, 2, 50);
    const panels = decorFor('ny-times', 5, 2, 50, b, 800, 100).filter((d) => d.kind === 'billboard');
    expect(panels.length).toBeGreaterThan(2);
    for (const p of panels) expect(p.turn).toBe(p.x < 0 ? 0 : Math.PI);
  });
});
