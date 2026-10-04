import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCarModel, createTrafficModel, updateCarModel } from '../../src/render/carFactory';
import { createWorldProps } from '../../src/render/worldProps';
import { createCar } from '../../src/sim/car';
import { bumpsBetween } from '../../src/sim/track';
import { createWorld, type TrafficCar, type WorldState } from '../../src/sim/world';

const traffic = (n: number): TrafficCar[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, s: 60 + i * 15, x: [-4.5, -1.5, 1.5, 4.5][i % 4]!, speed: 20, targetX: 0, model: i % 4 }));
const visibleNamed = (scene: THREE.Scene, prefix: string) => {
  let n = 0;
  scene.traverse((o) => o.name.startsWith(prefix) && o.visible && o.parent === scene && n++);
  return n;
};

describe('createWorldProps', () => {
  const setup = () => {
    const scene = new THREE.Scene();
    const props = createWorldProps(scene, null);
    return { scene, props };
  };
  const world = (patch: Partial<WorldState>): WorldState => ({ ...createWorld({ seed: 7, playerRole: 'police' }), ...patch });

  it('shows one traffic car per traffic entry, up to 8', () => {
    const { scene, props } = setup();
    props.update(world({ traffic: traffic(5) }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(5);
    props.update(world({ traffic: traffic(12) }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(8);
    props.update(world({ traffic: [] }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(0);
  });

  it('shows boxes and bombs that are in the world', () => {
    const { scene, props } = setup();
    props.update(
      world({
        boxes: [{ id: 1, s: 80, x: 1.5, color: 'red' }, { id: 2, s: 120, x: -1.5, color: 'blue' }],
        bombs: [{ id: 1, s: 30, x: 1.5, expiresAt: 99 }],
      }),
      0,
      0,
    );
    expect(visibleNamed(scene, 'box-')).toBe(2);
    expect(visibleNamed(scene, 'bomb-')).toBe(1);
  });

  it('places speed bumps over their 2 lanes at the right s', () => {
    const { scene, props } = setup();
    const w = world({});
    props.update(w, 0, 0);
    const first = bumpsBetween(w.seed, 0, 300)[0]!;
    const bump = scene.children.find((o) => o.name.startsWith('bump-') && o.visible)!;
    expect(bump).toBeDefined();
    expect(bump.position.z).toBeCloseTo(-first.s, 5);
  });

  it('never adds objects to the scene after creation', () => {
    const { scene, props } = setup();
    let before = 0;
    scene.traverse(() => before++);
    for (let i = 0; i < 1000; i++) props.update(world({ traffic: traffic(i % 10) }), i * 10, i / 60);
    let after = 0;
    scene.traverse(() => after++);
    expect(after).toBe(before);
  });
});

describe('car models', () => {
  it('models of the same kind share geometry (cached templates)', () => {
    const geo = (m: THREE.Object3D) => (m.getObjectByName('shell') as THREE.Mesh).geometry.uuid;
    expect(geo(createCarModel('thief'))).toBe(geo(createCarModel('thief')));
    expect(geo(createTrafficModel(2))).toBe(geo(createTrafficModel(2)));
  });

  it('traffic cars are cheap: ≤ 6 draw calls (sedan/hatch/van ≤ 5), no shadow casting', () => {
    for (let m = 0; m < 4; m++) {
      const meshes: THREE.Mesh[] = [];
      createTrafficModel(m).traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
      const draws = meshes.reduce((n, x) => n + (Array.isArray(x.material) ? x.material.length : 1), 0);
      expect(draws).toBeLessThanOrEqual(m === 3 ? 6 : 5);
      expect(meshes.some((x) => x.castShadow)).toBe(false);
    }
  });

  it('each police car keeps its own light-bar materials', () => {
    const a = createCarModel('police');
    const b = createCarModel('police');
    updateCarModel(a, createCar('police', 1), 0);
    updateCarModel(b, createCar('police', 1), 0.25);
    const red = (m: THREE.Object3D) => ((m.getObjectByName('lightbar-red') as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity;
    expect(red(a)).not.toBe(red(b));
  });

  it('titanium plates appear 0 → 3 on the thief', () => {
    const m = createCarModel('thief');
    const shown = () => ['plate-front', 'plate-left', 'plate-right'].filter((n) => m.getObjectByName(n)!.visible).length;
    for (let p = 0; p <= 3; p++) {
      const car = createCar('thief', 2);
      updateCarModel(m, { ...car, upgrades: { ...car.upgrades, plates: p } }, 0);
      expect(shown()).toBe(p);
    }
  });

  it('jumping lifts the car', () => {
    const m = createCarModel('police');
    updateCarModel(m, { ...createCar('police', 1), airTime: 0.3 }, 0);
    expect(m.position.y).toBeCloseTo(0.9, 5);
  });
});
