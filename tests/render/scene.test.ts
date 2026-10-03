import { describe, expect, it } from 'vitest';
import { SHADOW_BOX, snapToGrid } from '../../src/render/scene';

describe('snapToGrid', () => {
  it('snaps to the nearest multiple of the step (keeps shadow texels stable while moving)', () => {
    expect(snapToGrid(10.04, 0.1)).toBeCloseTo(10.0, 10);
    expect(snapToGrid(10.06, 0.1)).toBeCloseTo(10.1, 10);
    expect(snapToGrid(-3.33, 0.5)).toBeCloseTo(-3.5, 10);
  });
});

describe('SHADOW_BOX', () => {
  it('covers the road well ahead of the car (no shadows popping in at 40 m)', () => {
    expect(SHADOW_BOX.ahead).toBeGreaterThanOrEqual(110); // até onde a neblina começa
    expect(SHADOW_BOX.behind).toBeGreaterThanOrEqual(10);
    expect(SHADOW_BOX.halfWidth).toBeGreaterThanOrEqual(25); // pista + calçadas + fachadas
  });
});
