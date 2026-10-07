import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { createCarModel, createTrafficModel, updateCarModel } from '../../src/render/carFactory';
import { createWorldProps } from '../../src/render/worldProps';
import { createCar } from '../../src/sim/car';
import { bumpsBetween } from '../../src/sim/track';
import { curvesBetween } from '../../src/sim/curves';
import { createWorld, type TrafficCar, type WorldState } from '../../src/sim/world';

const traffic = (n: number): TrafficCar[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    s: 60 + i * 15,
    x: [-4.5, -1.5, 1.5, 4.5][i % 4]!,
    speed: 20,
    targetX: 0,
    model: i % 4,
  }));
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

  it('shows every traffic car (playtest 2026-10-07: past 8 the extra cars were invisible), nearest first', () => {
    const { scene, props } = setup();
    props.update(world({ traffic: traffic(5) }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(5);
    props.update(world({ traffic: traffic(12) }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(12);
    // all of the same model: still all drawn
    const same = traffic(BALANCE.traffic.maxCount).map((t) => ({ ...t, model: 2 }));
    props.update(world({ traffic: same }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(BALANCE.traffic.maxCount);
    // more than the cap (never happens in the sim): the farthest are left out, whatever their ids
    const many = traffic(BALANCE.traffic.maxCount + 3).map((t, i, all) => ({ ...t, s: 60 + (all.length - 1 - i) * 15, model: 0 }));
    props.update(world({ traffic: many }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(BALANCE.traffic.maxCount);
    const shown = (s: number) =>
      scene.children.some((o) => o.name.startsWith('traffic-') && o.visible && Math.abs(-o.position.z - s) < 0.5);
    expect(shown(60)).toBe(true); // nearest (highest id) drawn
    expect(shown(60 + (many.length - 1) * 15)).toBe(false); // farthest (id 1) left out
    // beyond the fog: not drawn
    props.update(world({ traffic: [{ ...traffic(1)[0]!, s: 400 }] }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(0);
    props.update(world({ traffic: [] }), 0, 0);
    expect(visibleNamed(scene, 'traffic-')).toBe(0);
  });

  it('shows boxes and bombs that are in the world', () => {
    const { scene, props } = setup();
    props.update(
      world({
        boxes: [
          { id: 1, s: 80, x: 1.5, color: 'red' },
          { id: 2, s: 120, x: -1.5, color: 'blue' },
        ],
        bombs: [{ id: 1, s: 30, x: 1.5, expiresAt: 99 }],
      }),
      0,
      0,
    );
    expect(visibleNamed(scene, 'box-')).toBe(2);
    expect(visibleNamed(scene, 'bomb-')).toBe(1);
  });

  it('shows up to 6 bombs (3 in stock + the ones already on the road)', () => {
    const { scene, props } = setup();
    const bombs = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, s: 30 + i * 10, x: 1.5, expiresAt: 99 }));
    props.update(world({ bombs }), 0, 0);
    expect(visibleNamed(scene, 'bomb-')).toBe(6);
  });

  it('traffic moves smoothly between simulation steps (interpolated by id)', () => {
    const { scene, props } = setup();
    const now = world({ traffic: [{ id: 7, s: 60, x: 1.5, speed: 20, targetX: 1.5, model: 0 }] });
    const before = world({ traffic: [{ id: 7, s: 50, x: -1.5, speed: 20, targetX: 1.5, model: 0 }] });
    props.update(now, 0, 0, before, 0.5);
    const car = scene.children.find((o) => o.name.startsWith('traffic-') && o.visible)!;
    expect(car.position.z).toBeCloseTo(-55, 5);
    expect(car.position.x).toBeCloseTo(0, 5);
    props.update(now, 0, 0); // no previous state: current position
    expect(car.position.z).toBeCloseTo(-60, 5);
  });

  it('blue and red boxes differ in shape and in shell colour, not only in the core', () => {
    const { scene, props } = setup();
    props.update(
      world({
        boxes: [
          { id: 1, s: 80, x: 1.5, color: 'blue' },
          { id: 2, s: 120, x: -1.5, color: 'red' },
        ],
      }),
      0,
      0,
    );
    const shellOf = (name: string) => scene.getObjectByName(name)!.getObjectByName('shell') as THREE.Mesh;
    const [blue, red] = [shellOf('box-0'), shellOf('box-1')];
    expect(blue.geometry.type).not.toBe(red.geometry.type);
    const hue = (m: THREE.Mesh) => (m.material as THREE.MeshStandardMaterial).color.getHSL({ h: 0, s: 0, l: 0 });
    expect(hue(blue).s).toBeGreaterThan(0.5);
    expect(hue(red).s).toBeGreaterThan(0.5);
    expect(Math.abs(hue(blue).h - hue(red).h)).toBeGreaterThan(0.3);
  });

  it('the yellow "?" box is a solid block with a halo instead of the translucent shell (V2 part 3)', () => {
    const { scene, props } = setup();
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    props.update({ ...w, boxes: [{ id: 1, s: 80, x: 1.5, color: 'yellow' }] } as WorldState, 0, 0);
    const box = scene.getObjectByName('box-0')!;
    expect(box.getObjectByName('mystery')!.visible).toBe(true);
    expect(box.getObjectByName('shell')!.visible).toBe(false);
    props.update({ ...w, boxes: [{ id: 2, s: 80, x: 1.5, color: 'red' }] } as WorldState, 0, 0);
    expect(box.getObjectByName('mystery')!.visible).toBe(false);
    expect(box.getObjectByName('shell')!.visible).toBe(true);
  });

  it('the area bomb shows a second bomb on the lane next to it', () => {
    const { scene, props } = setup();
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    props.update({ ...w, bombs: [{ id: 1, s: 80, x: 4.5, x2: 1.5, expiresAt: 9 }] } as WorldState, 0, 0);
    const twin = scene.getObjectByName('bomb-0')!.getObjectByName('twin')!;
    expect(twin.visible).toBe(true);
    expect(twin.position.x).toBeCloseTo(-3);
    props.update({ ...w, bombs: [{ id: 2, s: 80, x: 4.5, expiresAt: 9 }] } as WorldState, 0, 0);
    expect(twin.visible).toBe(false);
  });

  it('warns about each bump: a big sign at least 70 m before and paint on its 2 lanes', () => {
    const { scene, props } = setup();
    const w = world({});
    props.update(w, 0, 0);
    const first = bumpsBetween(w.seed, 0, 300)[0]!;
    const sign = scene.children.find((o) => o.name.startsWith('sign-') && o.visible)!;
    expect(-sign.position.z).toBeLessThanOrEqual(first.s - 70);
    const size = new THREE.Box3().setFromObject(sign).getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThanOrEqual(1.2);
    expect(size.y).toBeGreaterThanOrEqual(3);
    const paint = scene.children.find((o) => o.name.startsWith('bump-paint-') && o.visible)!;
    expect(paint).toBeDefined();
    expect(-paint.position.z).toBeLessThan(first.s);
    expect(-paint.position.z).toBeGreaterThan(first.s - 45);
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

  it('warns about each sharp curve: chevron sign 90 m before it, on the outside, pointing to the turn', () => {
    const { scene, props } = setup();
    const w = world({ curvesOn: true });
    const sharp = curvesBetween(w.seed, 0, 5000).filter((c) => c.sharp);
    expect(sharp.length).toBeGreaterThan(0);
    const c = sharp[0]!;
    props.update(w, c.start - 150, 0);
    const signs = scene.children.filter((o) => o.name.startsWith('curve-sign-') && o.visible);
    expect(signs.length).toBeGreaterThan(0);
    const sign = signs.find((o) => Math.abs(-o.position.z - (150 - 90)) < 1)!; // origin at start-150 (straight street in the test)
    expect(sign).toBeDefined();
    expect(Math.sign(sign.position.x)).toBe(-c.dir); // on the outside of the curve
    expect(Math.sign(sign.scale.x)).toBe(c.dir); // arrows pointing toward the curve side
    // gentle curves have no sign; without curves, no signs
    props.update(world({ curvesOn: false }), c.start - 150, 0);
    expect(scene.children.filter((o) => o.name.startsWith('curve-sign-') && o.visible)).toHaveLength(0);
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
  it('models of the same kind share geometry (cached templates); game cars own only the parts that dent', () => {
    const geo = (m: THREE.Object3D, part = 'shell') => (m.getObjectByName(part) as THREE.Mesh).geometry.uuid;
    expect(geo(createCarModel('thief'), 'greenhouse')).toBe(geo(createCarModel('thief'), 'greenhouse'));
    expect(geo(createCarModel('thief'))).not.toBe(geo(createCarModel('thief')));
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
    const red = (m: THREE.Object3D) =>
      ((m.getObjectByName('lightbar-red') as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity;
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
