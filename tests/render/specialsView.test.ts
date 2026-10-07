import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createSpecialsView } from '../../src/render/specialsView';
import type { Hazard } from '../../src/sim/types';

describe('oil and spikes view', () => {
  it('one object per hazard on the road, hidden when they expire', () => {
    const scene = new THREE.Scene();
    const view = createSpecialsView(scene);
    const hz: Hazard[] = [
      { id: 1, kind: 'oil', s: 100, length: 10, xFrom: -3, xTo: 0, expiresAt: 9 },
      { id: 2, kind: 'spikes', s: 140, length: 2, xFrom: 0, xTo: 3, expiresAt: 9 },
    ];
    view.update(hz, 0);
    const visible = (p: string) => scene.children.filter((o) => o.name.startsWith(p) && o.visible).length;
    expect(visible('oil-')).toBe(1);
    expect(visible('spikes-')).toBe(1);
    view.update([], 0);
    expect(visible('oil-') + visible('spikes-')).toBe(0);
  });
});
