import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCarModel } from '../../src/render/carFactory';
import { attachGunner, flashGunner, updateGunner } from '../../src/render/gunner';
import { createCar } from '../../src/sim/car';

const setup = (role: 'police' | 'thief') => {
  const model = createCarModel(role);
  const g = attachGunner(model, role);
  return { model, g };
};
const aimX = (g: THREE.Object3D) => {
  g.updateMatrixWorld(true);
  return new THREE.Vector3(0, 0, -1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
};
const visibleMeshes = (g: THREE.Object3D) => {
  let n = 0;
  g.traverseVisible((o) => (o as THREE.Mesh).isMesh && n++);
  return n;
};

describe('gunner in the passenger window', () => {
  it('sits on the right side of the car, at window height', () => {
    const { g } = setup('police');
    expect(g.position.x).toBeGreaterThan(0.4);
    expect(g.position.y).toBeGreaterThan(0.7);
  });

  it('police gunner always shows; thief only with the rear gun', () => {
    const p = setup('police');
    updateGunner(p.g, { ...createCar('police', 1, 0), hasGun: true }, { s: 40, x: 1.5 }, 0);
    expect(p.g.visible).toBe(true);
    const t = setup('thief');
    updateGunner(t.g, createCar('thief', 2, 40), { s: 0, x: -1.5 }, 0);
    expect(t.g.visible).toBe(false);
    updateGunner(t.g, { ...createCar('thief', 2, 40), hasGun: true }, { s: 0, x: -1.5 }, 0);
    expect(t.g.visible).toBe(true);
  });

  it('aims at the target: right and ahead for police, behind for the thief', () => {
    const p = setup('police');
    updateGunner(p.g, { ...createCar('police', 1, 0), x: 0, hasGun: true }, { s: 20, x: 6 }, 0);
    const d = aimX(p.g);
    expect(d.x).toBeGreaterThan(0.2);
    expect(d.z).toBeLessThan(0); // à frente (−z)
    const t = setup('thief');
    updateGunner(t.g, { ...createCar('thief', 2, 100), x: 0, hasGun: true }, { s: 80, x: 0 }, 0);
    expect(aimX(t.g).z).toBeGreaterThan(0.8); // para trás
  });

  it('out of the fire cone it goes back to rest (looking ahead)', () => {
    const p = setup('police');
    updateGunner(p.g, { ...createCar('police', 1, 100), x: 0, hasGun: true }, { s: 20, x: 0 }, 0); // alvo atrás: fora do cone frontal
    expect(aimX(p.g).z).toBeLessThan(-0.9);
  });

  it('muzzle flash shows after a shot and is gone 60 ms later', () => {
    const { g } = setup('police');
    const car = { ...createCar('police', 1, 0), hasGun: true };
    updateGunner(g, car, { s: 30, x: 1.5 }, 1);
    expect(g.getObjectByName('gunner-flash')!.visible).toBe(false);
    flashGunner(g, 1);
    updateGunner(g, car, { s: 30, x: 1.5 }, 1.03);
    expect(g.getObjectByName('gunner-flash')!.visible).toBe(true);
    updateGunner(g, car, { s: 30, x: 1.5 }, 1.07);
    expect(g.getObjectByName('gunner-flash')!.visible).toBe(false);
  });

  it('costs one draw call when not firing', () => {
    for (const role of ['police', 'thief'] as const) {
      const { g } = setup(role);
      updateGunner(g, { ...createCar(role, 1, 0), hasGun: true }, { s: 30, x: 1.5 }, 0);
      expect(visibleMeshes(g)).toBe(1);
    }
  });
});
