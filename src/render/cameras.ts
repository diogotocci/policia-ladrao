import * as THREE from 'three';
import { trackPos } from './trackFrame';
import type { CarState } from '../sim/car';

const BACK = 6;
const UP = 2.6;
const LOOK_AHEAD = 10;
const LATERAL_FOLLOW = 8; // 1/s

/** `lift`: extra height for tall cars (V2 part 4), so they do not hide the road ahead. */
export function createChaseCamera(lift = 0): {
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
      // behind the car along the road and looking ahead along it: in curves the camera follows the street
      const eye = trackPos(car.s - BACK, camX, originS);
      const at = trackPos(car.s + LOOK_AHEAD, camX + (car.x - camX) * 0.5, originS);
      camera.position.set(eye.x, UP + lift, eye.z);
      camera.lookAt(at.x, 1 + lift * 0.4, at.z);
      // tilts slightly into the curve (sense of speed)
      const turn = at.heading - eye.heading;
      camera.rotateZ(Math.max(-0.035, Math.min(0.035, turn * 0.3)));
    },
  };
}
