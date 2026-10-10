import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createParticles } from '../../src/render/particles';

const cam = () => {
  const c = new THREE.PerspectiveCamera();
  c.position.set(0, 3, 8);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
};

describe('createParticles', () => {
  it('one InstancedMesh, never more than max alive, oldest recycled', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 40);
    for (let i = 0; i < 100; i++) p.emitSmoke(0, 1, 100, 'white');
    expect(p.alive()).toBe(40);
    const meshes = scene.children.filter((o) => (o as THREE.InstancedMesh).isInstancedMesh);
    expect(meshes).toHaveLength(1);
  });

  it('coloured smoke (V2 part 6 delivery 2): each puff keeps its own colour', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 40);
    p.emitSmoke(0, 1, 100, 0xff3b3b);
    p.emitSmoke(0, 1, 100, 'white');
    p.update(0.01, 100, cam());
    const mesh = scene.getObjectByName('particles') as THREE.InstancedMesh;
    const c = new THREE.Color();
    mesh.getColorAt(0, c);
    expect(c.getHex()).toBe(0xff3b3b);
    mesh.getColorAt(1, c);
    expect(c.getHex()).toBe(0xdcdcdc);
  });

  it('expired particles disappear', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 40);
    p.emitSmoke(0, 1, 100, 'black');
    p.update(0.5, 100, cam());
    expect(p.alive()).toBe(1);
    for (let i = 0; i < 20; i++) p.update(0.1, 100, cam());
    expect(p.alive()).toBe(0);
    expect((scene.getObjectByName('particles') as THREE.InstancedMesh).count).toBe(0);
  });

  it('low quality: half the smoke rate (applied per emitter) and half the burst', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 160);
    expect(p.emissionScale()).toBe(1);
    p.setQuality('low');
    expect(p.emissionScale()).toBe(0.5);
    p.emitBurst(0, 50, 'explosion');
    expect(p.alive()).toBe(9);
  });

  it('two cars emitting alternately both get their smoke (no shared skip)', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 160);
    p.setQuality('low');
    for (let i = 0; i < 10; i++) {
      p.emitSmoke(0, 1, 50, 'white');
      p.emitSmoke(3, 1, 80, 'black');
    }
    expect(p.alive()).toBe(20);
  });

  it('smoke is visible from both sides (mirror camera looks backwards)', () => {
    const scene = new THREE.Scene();
    createParticles(scene, 10);
    const mesh = scene.getObjectByName('particles') as THREE.InstancedMesh;
    expect((mesh.material as THREE.Material).side).toBe(THREE.DoubleSide);
  });

  it('an explosion is a burst at the bomb position (track coordinates s, x)', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 160);
    p.emitBurst(2, 300, 'explosion');
    expect(p.alive()).toBeGreaterThanOrEqual(16);
    p.update(1 / 60, 290, cam());
    const mesh = scene.getObjectByName('particles') as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    mesh.getMatrixAt(0, m);
    pos.setFromMatrixPosition(m);
    expect(pos.z).toBeCloseTo(-(300 - 290), 0);
    expect(pos.x).toBeCloseTo(2, 0);
  });

  it('adds nothing to the scene after creation (fixed pool)', () => {
    const scene = new THREE.Scene();
    const p = createParticles(scene, 60);
    const n = scene.children.length;
    for (let i = 0; i < 50; i++) {
      p.emitBurst(0, i * 10, i % 2 ? 'crash' : 'explosion');
      p.update(0.05, i * 10, cam());
    }
    expect(scene.children.length).toBe(n);
  });
});
