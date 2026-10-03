import * as THREE from 'three';
import type { CarState } from '../sim/car';

const BACK = 6;
const UP = 2.6;
const LOOK_AHEAD = 10;
const LATERAL_FOLLOW = 8; // 1/s

export function createChaseCamera(): {
  camera: THREE.PerspectiveCamera;
  update(car: CarState, dt: number, originS?: number): void;
} {
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  let camX: number | undefined;
  return {
    camera,
    update(car, dt, originS = 0) {
      const t = 1 - Math.exp(-LATERAL_FOLLOW * dt);
      camX = camX === undefined ? car.x : camX + (car.x - camX) * t;
      const carZ = -(car.s - originS);
      camera.position.set(camX, UP, carZ + BACK);
      camera.lookAt(camX + (car.x - camX) * 0.5, 1, carZ - LOOK_AHEAD);
    },
  };
}
