import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CONES_PER_WORKS, createWorksView } from '../../src/render/hazardsView';
import { createWorld } from '../../src/sim/world';

describe('roadworks view', () => {
  it('cones and an "Obras" sign for each works near the cars; nothing in Perseguição', () => {
    const scene = new THREE.Scene();
    const view = createWorksView(scene);
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    view.update(w, 0);
    const cones = scene.getObjectByName('works-cones') as THREE.InstancedMesh;
    expect(cones.count).toBe(0);
    const works = [
      { s: 300, lane: 1 as const, length: 60, chaos: 3 },
      { s: 900, lane: 3 as const, length: 60, chaos: 3 },
    ];
    view.update({ ...w, works }, 0);
    expect(cones.count).toBe(2 * CONES_PER_WORKS);
    const signs = scene.children.filter((o) => o.name.startsWith('works-sign') && o.visible);
    expect(signs).toHaveLength(2);
    view.update({ ...w, works: [] }, 0);
    expect(cones.count).toBe(0);
    expect(scene.children.filter((o) => o.name.startsWith('works-sign') && o.visible)).toHaveLength(0);
  });
});
