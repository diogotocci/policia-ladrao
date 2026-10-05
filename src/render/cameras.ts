import * as THREE from 'three';
import { trackPos } from './trackFrame';
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
      // atrás do carro ao longo da pista e olhando adiante nela: nas curvas a câmera acompanha a rua
      const eye = trackPos(car.s - BACK, camX, originS);
      const at = trackPos(car.s + LOOK_AHEAD, camX + (car.x - camX) * 0.5, originS);
      camera.position.set(eye.x, UP, eye.z);
      camera.lookAt(at.x, 1, at.z);
      // inclina um pouco para dentro da curva (sensação de velocidade)
      const turn = at.heading - eye.heading;
      camera.rotateZ(Math.max(-0.035, Math.min(0.035, turn * 0.3)));
    },
  };
}
