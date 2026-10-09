import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CARS, CAR_IDS, defaultLook, type CarLook } from '../../src/meta/shop';
import { createCarModel, updateCarModel } from '../../src/render/carFactory';
import { createLookModel, disposeLookModel } from '../../src/render/carLook';
import { attachGunner, updateGunner } from '../../src/render/gunner';
import { createCar } from '../../src/sim/car';

const meshes = (o: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  o.traverse((x) => (x as THREE.Mesh).isMesh && out.push(x as THREE.Mesh));
  return out;
};
const look = (car: CarLook['car'], extra: Partial<CarLook> = {}): CarLook => ({
  car,
  paint: CARS[car].colors[0],
  neon: null,
  plate: null,
  sound: null,
  ...extra,
});

describe('shop car models (spec §4)', () => {
  it.each(CAR_IDS)('%s builds with the parts the game uses', (car) => {
    const role = CARS[car].role;
    const m = createLookModel(role, look(car));
    for (const name of ['body', 'shell', 'greenhouse', 'headlights', 'taillights']) expect(m.getObjectByName(name), name).toBeDefined();
    expect(m.children.filter((c) => c.name === 'wheel').length).toBeGreaterThanOrEqual(2);
    if (role === 'police') {
      expect(m.getObjectByName('lightbar-red')).toBeDefined();
      expect(m.getObjectByName('lightbar-blue')).toBeDefined();
    }
    expect(m.name).toBe(`car-${role}`);
  });

  it.each(CAR_IDS)('%s costs at most 12 meshes more than the default car of its side', (car) => {
    const role = CARS[car].role;
    const base = meshes(createCarModel(role)).length;
    expect(meshes(createLookModel(role, look(car, { neon: 0xff00ff, plate: 'ABC1234' }))).length).toBeLessThanOrEqual(base + 12);
  });

  it('no look = the default car of the side', () => {
    expect(meshes(createLookModel('police')).length).toBe(meshes(createCarModel('police')).length);
    expect(defaultLook('thief').car).toBe('seda');
  });
});

describe('look: paint, neon, plate', () => {
  it('paints only this car: the template and the next car keep the original colour', () => {
    const painted = createLookModel('police', look('esportivo', { paint: 0x1c3fa8 }));
    const shell = (m: THREE.Object3D) => ((m.getObjectByName('shell') as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex();
    expect(shell(painted)).toBe(0x1c3fa8);
    expect(shell(createLookModel('police', look('esportivo')))).toBe(CARS.esportivo.colors[0]);
  });

  it('neon and plate only when chosen', () => {
    const plain = createLookModel('thief', look('van'));
    expect(plain.getObjectByName('neon')).toBeUndefined();
    expect(plain.getObjectByName('plate')).toBeUndefined();
    const full = createLookModel('thief', look('van', { neon: 0x2bff88, plate: 'DIO2026' }));
    const neon = full.getObjectByName('neon') as THREE.Mesh;
    expect((neon.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x2bff88);
    expect((neon.material as THREE.MeshBasicMaterial).blending).toBe(THREE.AdditiveBlending);
    expect(full.getObjectByName('plate')).toBeDefined();
  });

  it('tall cars raise the chase camera; the moto is drawn bigger', () => {
    expect(createLookModel('police', look('caveirao')).userData.camBack).toBeGreaterThan(1);
    expect(createLookModel('police', look('caveirao')).scale.x).toBeLessThan(1); // drawn smaller
    expect(createLookModel('police', look('viatura')).userData.camLift).toBe(0);
    expect(createLookModel('thief', look('moto')).scale.x).toBeCloseTo(1.15);
  });

  it('moto: the shooter is the passenger from the start, unarmed until the thief gets a weapon', () => {
    const moto = createLookModel('thief', look('moto'));
    expect(moto.getObjectByName('passenger')).toBeUndefined(); // no second figure to swap with
    const g = attachGunner(moto, 'thief');
    expect(g.position.toArray()).toEqual([0, 1.0, 0.68]);
    const body = g.getObjectByName('gunner-body') as THREE.Mesh;
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: false }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(true);
    const unarmed = body.geometry.getAttribute('position').count;
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: true }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(true);
    expect(body.geometry.getAttribute('position').count).toBeGreaterThan(unarmed); // now with the gun
  });

  it('picape: the shooter rides in the bed from the start (playtest 2026-10-08)', () => {
    const g = attachGunner(createLookModel('thief', look('picape')), 'thief');
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: false }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(true);
    expect(g.position.z).toBeGreaterThan(0.7); // in the bed, behind the cab (z 0.62)
  });

  it('other cars: the thief gunner still shows only with a weapon; the Caveirão gunner is at the window, not on the roof', () => {
    const g = attachGunner(createLookModel('thief', look('van')), 'thief');
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: false }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(false);
    const cav = attachGunner(createLookModel('police', look('caveirao')), 'police');
    expect(cav.position.y).toBeLessThan(1.8);
    expect(cav.position.x).toBeGreaterThan(0.9);
  });

  it('wheels turn by their own radius', () => {
    const m = createLookModel('police', look('caveirao'));
    updateCarModel(m, { ...createCar('police', 0, 0), s: 5 }, 0, 0);
    const wheel = m.children.find((c) => c.name === 'wheel')!;
    expect(wheel.rotation.x).toBeCloseTo(-5 / (wheel.userData.r as number));
  });
});

describe('thief items on shop cars', () => {
  it.each(['seda', 'picape', 'moto', 'van'] as const)('%s shows the titanium plates picked up in the match', (car) => {
    const m = createLookModel('thief', look(car));
    const thief = { ...createCar('thief', 1, 0), upgrades: { ...createCar('thief', 1, 0).upgrades, plates: 3 } };
    updateCarModel(m, thief, 0, 0);
    for (const name of ['plate-front', 'plate-left', 'plate-right']) expect(m.getObjectByName(name)?.visible, name).toBe(true);
  });

  it('disposeLookModel frees the car copy but not the shared template', () => {
    const a = createLookModel('thief', look('van', { neon: 0xff00ff, plate: 'ABC' }));
    const b = createLookModel('thief', look('van'));
    const shared = (b.getObjectByName('greenhouse') as THREE.Mesh).geometry;
    let disposed = false;
    shared.addEventListener('dispose', () => (disposed = true));
    disposeLookModel(a);
    expect(disposed).toBe(false);
  });
});

describe('Blazer (playtest 2026-10-09)', () => {
  it('is a pickup with a closed bed: as tall as the Picape (lightbar apart), well below the Caveirão', () => {
    const roof = (car: CarLook['car'], role: 'police' | 'thief') => {
      const m = createLookModel(role, look(car));
      m.updateMatrixWorld(true);
      const shell = new THREE.Box3();
      for (const name of ['shell', 'greenhouse', 'roof']) {
        const o = m.getObjectByName(name);
        if (o) shell.expandByObject(o);
      }
      return shell.max.y;
    };
    const blazer = roof('blazer', 'police');
    expect(Math.abs(blazer - roof('picape', 'thief'))).toBeLessThan(0.1);
    expect(blazer).toBeLessThan(roof('caveirao', 'police') - 0.4);
  });
});
