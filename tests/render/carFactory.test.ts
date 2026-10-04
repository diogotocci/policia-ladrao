import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCarModel, updateCarModel } from '../../src/render/carFactory';
import { createCar } from '../../src/sim/car';

const emissive = (model: THREE.Group, name: string) => {
  const mesh = model.getObjectByName(name) as THREE.Mesh;
  return (mesh.material as THREE.MeshLambertMaterial).emissiveIntensity;
};
const body = (model: THREE.Group) => model.getObjectByName('body')!;

describe('createCarModel', () => {
  it('police has a light bar with red and blue lights', () => {
    const m = createCarModel('police');
    expect(m.getObjectByName('lightbar')).toBeDefined();
    expect(m.getObjectByName('lightbar-red')).toBeDefined();
    expect(m.getObjectByName('lightbar-blue')).toBeDefined();
  });

  it('thief has no light bar', () => {
    expect(createCarModel('thief').getObjectByName('lightbar')).toBeUndefined();
  });

  it('police is about 4.4 m long and 1.8 m wide', () => {
    const size = new THREE.Box3().setFromObject(createCarModel('police').getObjectByName('body')!).getSize(new THREE.Vector3());
    expect(Math.abs(size.z - 4.4)).toBeLessThanOrEqual(0.3);
    expect(Math.abs(size.x - 1.8)).toBeLessThanOrEqual(0.2);
  });

  it('both cars have 4 wheels', () => {
    for (const role of ['police', 'thief'] as const) {
      const wheels: THREE.Object3D[] = [];
      createCarModel(role).traverse((o) => o.name === 'wheel' && wheels.push(o));
      expect(wheels).toHaveLength(4);
    }
  });
});

describe('car model rendering details', () => {
  const meshes = (m: THREE.Object3D) => {
    const out: THREE.Mesh[] = [];
    m.traverse((o) => (o as THREE.Mesh).isMesh && out.push(o as THREE.Mesh));
    return out;
  };

  it('has a soft contact shadow on the ground under the car', () => {
    for (const role of ['police', 'thief'] as const) {
      const m = createCarModel(role);
      const shadow = m.getObjectByName('contact-shadow') as THREE.Mesh;
      expect(shadow).toBeDefined();
      expect(shadow.position.y).toBeGreaterThan(0);
      expect(shadow.position.y).toBeLessThan(0.05);
      expect(shadow.castShadow).toBe(false);
      const size = new THREE.Box3().setFromObject(shadow).getSize(new THREE.Vector3());
      expect(size.x).toBeGreaterThanOrEqual(2);
      expect(size.z).toBeGreaterThanOrEqual(4.6);
    }
  });

  it('body parts cast shadows; wheels and the contact shadow do not (cheaper shadow pass)', () => {
    const m = createCarModel('thief');
    const casters = meshes(m).filter((x) => x.name !== 'contact-shadow' && x.name !== 'wheel');
    expect(casters.every((x) => x.castShadow)).toBe(true);
    expect(meshes(m).filter((x) => x.name === 'wheel').every((x) => !x.castShadow)).toBe(true);
  });

  it('stays cheap: at most 20 meshes per car', () => {
    for (const role of ['police', 'thief'] as const) expect(meshes(createCarModel(role)).length).toBeLessThanOrEqual(20);
  });

  it('has a glass greenhouse above a painted shell', () => {
    for (const role of ['police', 'thief'] as const) {
      const m = createCarModel(role);
      const shell = new THREE.Box3().setFromObject(m.getObjectByName('shell')!);
      const glass = new THREE.Box3().setFromObject(m.getObjectByName('greenhouse')!);
      expect(glass.max.y).toBeGreaterThan(shell.max.y);
      expect(glass.min.y).toBeGreaterThan(0.6);
    }
  });
});

describe('updateCarModel', () => {
  it('blinks the light bar every 0.25 s, alternating red and blue', () => {
    const m = createCarModel('police');
    const car = createCar('police', 1);
    updateCarModel(m, car, 0);
    expect(emissive(m, 'lightbar-red')).toBeGreaterThan(0.5);
    expect(emissive(m, 'lightbar-blue')).toBe(0);
    updateCarModel(m, car, 0.25);
    expect(emissive(m, 'lightbar-red')).toBe(0);
    expect(emissive(m, 'lightbar-blue')).toBeGreaterThan(0.5);
  });

  it('places the model at (x, -(s - origin))', () => {
    const m = createCarModel('thief');
    updateCarModel(m, { ...createCar('thief', 3), s: 1030 }, 0, 1000);
    expect(m.position.x).toBe(4.5);
    expect(m.position.z).toBe(-30);
  });

  it('rolls up to 6° in opposite directions when steering', () => {
    const m = createCarModel('police');
    const base = createCar('police', 1);
    updateCarModel(m, { ...base, steer: 1 }, 0);
    const right = body(m).rotation.z;
    updateCarModel(m, { ...base, steer: -1 }, 0);
    const left = body(m).rotation.z;
    updateCarModel(m, { ...base, steer: 0 }, 0);
    expect(Math.sign(right)).toBe(-Math.sign(left));
    expect(Math.abs(right)).toBeGreaterThan(0);
    expect(Math.abs(right)).toBeLessThanOrEqual((6 * Math.PI) / 180 + 1e-9);
    expect(body(m).rotation.z).toBe(0);
  });

  it('spins the wheels with distance travelled', () => {
    const m = createCarModel('police');
    updateCarModel(m, { ...createCar('police', 1), s: 0 }, 0);
    const w = m.getObjectByName('wheel')!;
    const a = w.rotation.x;
    updateCarModel(m, { ...createCar('police', 1), s: 1 }, 0);
    expect(w.rotation.x).not.toBe(a);
  });
});
