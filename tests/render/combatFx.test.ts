import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCombatFx } from '../../src/render/combatFx';
import { createWorld, type GameEvent, type Projectile, type WorldState } from '../../src/sim/world';

const proj = (i: number): Projectile => ({ from: 'police', s: 10 + i, x: 0, vs: 300, vx: 0, travelled: 0, damage: 1 });
const withProjectiles = (n: number): WorldState => ({
  ...createWorld({ seed: 1, playerRole: 'police' }),
  projectiles: Array.from({ length: n }, (_, i) => proj(i)),
});
/** traçadores são um InstancedMesh só (1 draw call): conta as instâncias ativas */
const visibleTracers = (scene: THREE.Scene) => {
  const m = scene.getObjectByName('tracers') as THREE.InstancedMesh;
  return m.visible ? m.count : 0;
};
const hit: GameEvent = { type: 'hit', target: 'thief', amount: 1, s: 40, x: 1.5 };

describe('createCombatFx', () => {
  it('shows one tracer per projectile from a fixed pool of 32', () => {
    const scene = new THREE.Scene();
    const fx = createCombatFx(scene);
    fx.update(withProjectiles(5), [], 0, 1 / 60);
    expect(visibleTracers(scene)).toBe(5);
    fx.update(withProjectiles(40), [], 0, 1 / 60);
    expect(visibleTracers(scene)).toBe(32);
    fx.update(withProjectiles(0), [], 0, 1 / 60);
    expect(visibleTracers(scene)).toBe(0);
  });

  it('tracers are a single instanced mesh with room for 32', () => {
    const scene = new THREE.Scene();
    createCombatFx(scene);
    const m = scene.getObjectByName('tracers') as THREE.InstancedMesh;
    expect(m.isInstancedMesh).toBe(true);
    expect(m.instanceMatrix.count).toBe(32);
  });

  it('hides tracers on the end screen', () => {
    const scene = new THREE.Scene();
    const fx = createCombatFx(scene);
    const w = withProjectiles(5);
    fx.update({ ...w, match: { over: true, winner: 'police', endTime: 1 } }, [], 0, 1 / 60);
    expect(visibleTracers(scene)).toBe(0);
  });

  it('a hit spawns sparks that are gone 0.4 s later', () => {
    const scene = new THREE.Scene();
    const fx = createCombatFx(scene);
    const w = withProjectiles(0);
    fx.update(w, [hit], 0, 1 / 60);
    expect(fx.activeSparks()).toBeGreaterThan(0);
    for (let i = 0; i < 24; i++) fx.update(w, [], 0, 1 / 60);
    expect(fx.activeSparks()).toBe(0);
  });

  it('sparkAt throws a few sparks from a badly damaged car (spec §9: ≤ 20 hp)', () => {
    const scene = new THREE.Scene();
    const fx = createCombatFx(scene);
    fx.sparkAt(50, 1.5);
    fx.update(withProjectiles(0), [], 0, 1 / 60);
    expect(fx.activeSparks()).toBeGreaterThanOrEqual(3);
  });

  it('a crash shakes the camera briefly', () => {
    const scene = new THREE.Scene();
    const fx = createCombatFx(scene);
    const w = withProjectiles(0);
    fx.update(w, [{ type: 'crash', a: 'police', b: 'thief', s: 30, x: 0 }], 0, 1 / 60);
    expect(fx.shake().length()).toBeGreaterThan(0);
    for (let i = 0; i < 15; i++) fx.update(w, [], 0, 1 / 60);
    expect(fx.shake().length()).toBe(0);
  });

  it('never adds objects to the scene after creation', () => {
    const scene = new THREE.Scene();
    const fx = createCombatFx(scene);
    let count = 0;
    scene.traverse(() => count++);
    for (let i = 0; i < 1000; i++) fx.update(withProjectiles(i % 50), i % 7 === 0 ? [hit] : [], 0, 1 / 60);
    let after = 0;
    scene.traverse(() => after++);
    expect(after).toBe(count);
  });
});
