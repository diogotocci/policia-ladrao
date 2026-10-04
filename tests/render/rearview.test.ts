import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createRearview, isBehind, rearviewRect } from '../../src/render/rearview';
import { createCar } from '../../src/sim/car';

describe('rearviewRect', () => {
  it('is 28% of the width, 3:1, centred at the top below the HUD', () => {
    const r = rearviewRect(844, 390);
    expect(r.w).toBeCloseTo(236, 0);
    expect(r.h).toBeCloseTo(79, 0);
    expect(r.x + r.w / 2).toBeCloseTo(422, 0);
    expect(r.y).toBeGreaterThanOrEqual(64);
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
});
