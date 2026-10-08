import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createRearview, isBehind, rearviewRect } from '../../src/render/rearview';
import { createCar } from '../../src/sim/car';

describe('rearviewRect', () => {
  it('is small (22% of the width, 3:1) in the top-right corner, out of the road view', () => {
    const r = rearviewRect(844, 390);
    expect(r.w).toBeCloseTo(186, 0);
    expect(r.h).toBeCloseTo(62, 0);
    expect(r.x + r.w).toBe(844 - 14);
    expect(r.y).toBe(10);
  });
});

describe('isBehind', () => {
  const me = { ...createCar('thief', 2, 100) };
  it('only when the foe is more than 2 m behind', () => {
    expect(isBehind(me, { ...me, s: 80 })).toBe(true);
    expect(isBehind(me, { ...me, s: 99 })).toBe(false);
    expect(isBehind(me, { ...me, s: 130 })).toBe(false);
  });
});

describe('createRearview', () => {
  it('camera sits on the roof and looks backwards (+z)', () => {
    const rv = createRearview();
    const car = { ...createCar('thief', 2, 1050) };
    rv.place(car, 1000);
    const cam = rv.camera;
    expect(cam.position.z).toBeCloseTo(-50, 0);
    expect(cam.position.y).toBeGreaterThan(1.2);
    const dir = cam.getWorldDirection(new THREE.Vector3());
    expect(dir.z).toBeGreaterThan(0.9);
    expect(cam.fov).toBe(50);
  });
});

describe('rear-view mirror image', () => {
  it('is horizontally flipped like a real mirror', () => {
    const rv = createRearview();
    expect(rv.mirrorTexture().repeat.x).toBe(-1);
    expect(rv.mirrorTexture().offset.x).toBe(1);
  });

  it('does not recompute the shadow map for the mirror pass', () => {
    const rv = createRearview();
    const seen: boolean[] = [];
    const fake = {
      shadowMap: { autoUpdate: true },
      getPixelRatio: () => 1,
      setRenderTarget: () => {},
      render: () => seen.push(fake.shadowMap.autoUpdate),
      setScissorTest: () => {},
      setScissor: () => {},
      setViewport: () => {},
      autoClear: true,
      clearDepth: () => {},
    };
    rv.place(createCar('thief', 2, 100), 0);
    rv.render(fake as unknown as THREE.WebGLRenderer, new THREE.Scene(), 844, 390);
    expect(seen[0]).toBe(false);
    expect(fake.shadowMap.autoUpdate).toBe(true);
  });

  it('lighter on weak phones (playtest): shorter view and, on low quality, the scene is redrawn every other frame at 1× pixels', () => {
    const rv = createRearview();
    const scenes: THREE.Scene[] = [];
    const sizes: number[] = [];
    const fake = {
      shadowMap: { autoUpdate: true },
      getPixelRatio: () => 3,
      setRenderTarget: (t: THREE.WebGLRenderTarget | null) => t && sizes.push(t.width),
      render: (s: THREE.Scene) => scenes.push(s),
      setScissorTest: () => {},
      setScissor: () => {},
      setViewport: () => {},
    };
    const world = new THREE.Scene();
    const draw = () => rv.render(fake as unknown as THREE.WebGLRenderer, world, 844, 390);
    rv.place(createCar('thief', 2, 100), 0);
    rv.setQuality('high');
    const farHigh = rv.camera.far;
    draw();
    draw();
    expect(scenes.filter((s) => s === world)).toHaveLength(2);
    rv.setQuality('low');
    expect(rv.camera.far).toBeLessThan(farHigh);
    scenes.length = 0;
    sizes.length = 0;
    for (let i = 0; i < 4; i++) draw();
    expect(scenes.filter((s) => s === world)).toHaveLength(2); // scene only every 2 frames
    expect(scenes.filter((s) => s !== world)).toHaveLength(4); // the mirror (texture) appears every frame
    expect(Math.max(...sizes)).toBe(Math.round(844 * 0.22)); // 1× pixel, not 3×
  });
});

describe('clean mirror (playtest 2026-10-08)', () => {
  it('starts past the longest car: the player never sees their own car (pickup bed, shooter) in it', async () => {
    const { MIRROR_NEAR, createRearview } = await import('../../src/render/rearview');
    expect(MIRROR_NEAR).toBeGreaterThan(2.5);
    expect(createRearview().camera.near).toBe(MIRROR_NEAR);
  });
});
