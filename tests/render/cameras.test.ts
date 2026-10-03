import { describe, expect, it } from 'vitest';
import { createChaseCamera } from '../../src/render/cameras';
import { createCar } from '../../src/sim/car';

describe('createChaseCamera', () => {
  it('sits 6 m behind and 2.6 m above the car, relative to the render origin', () => {
    const chase = createChaseCamera();
    const car = { ...createCar('police', 1), s: 1020 };
    chase.update(car, 10, 1000); // dt grande = já estabilizada
    const carZ = -(1020 - 1000);
    expect(chase.camera.position.z).toBeCloseTo(carZ + 6, 5);
    expect(chase.camera.position.y).toBeCloseTo(2.6, 5);
    expect(chase.camera.position.x).toBeCloseTo(car.x, 2);
  });

  it('follows lateral moves smoothly (not instantly)', () => {
    const chase = createChaseCamera();
    const car = createCar('police', 0);
    chase.update(car, 10, 0);
    const moved = { ...car, x: car.x + 6 };
    chase.update(moved, 1 / 60, 0);
    expect(chase.camera.position.x).toBeGreaterThan(car.x);
    expect(chase.camera.position.x).toBeLessThan(moved.x);
  });

  it('uses a 60° field of view', () => {
    expect(createChaseCamera().camera.fov).toBe(60);
  });
});
