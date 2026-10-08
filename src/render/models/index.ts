// Shop car registry (V2 part 4, spec §4): how each car is built and where its extras go.
import type * as THREE from 'three';
import type { CarId } from '../../meta/shop';
import { buildPolice, buildThief } from '../carFactory';
import { buildCaveirao } from './caveirao';
import { buildBlazer, buildEsportivo, buildMoto, buildPicape, buildVan } from './shopCars';

export interface ModelSpec {
  build(root: THREE.Group, body: THREE.Group): void;
  /** chase camera raised by this much (tall cars must not hide the road) */
  camLift: number;
  /** chase camera further back by this much (big cars) */
  camBack?: number;
  /** the gunner is always shown (moto: he is the passenger), unarmed until the thief gets a weapon */
  gunnerAlways?: boolean;
  /** gunner position in the body (default: passenger window) */
  gunner?: [number, number, number];
  /** rear plate: centre height, rear face z, width */
  plate: { y: number; z: number; w: number };
  /** neon glow under the car: width and length */
  neon: { w: number; l: number };
  /** whole model scale (the moto is drawn bigger to be seen on the road; the hitbox does not change) */
  scale?: number;
}

export const MODELS: Record<CarId, ModelSpec> = {
  viatura: { build: buildPolice, camLift: 0, plate: { y: 0.6, z: 2.33, w: 0.5 }, neon: { w: 2.1, l: 4.7 } },
  esportivo: {
    build: buildEsportivo,
    camLift: 0,
    gunner: [0.88, 0.8, -0.05],
    plate: { y: 0.56, z: 2.4, w: 0.5 },
    neon: { w: 2.2, l: 4.8 },
  },
  blazer: { build: buildBlazer, camLift: 0.25, gunner: [0.9, 0.98, -0.2], plate: { y: 0.71, z: 2.45, w: 0.5 }, neon: { w: 2.1, l: 4.9 } },
  // playtest 2026-10-08: drawn 12% smaller, camera further back, the gunner at the passenger window (not on the roof)
  caveirao: {
    build: buildCaveirao,
    camLift: 0.35,
    camBack: 1.5,
    gunner: [0.98, 1.5, -0.5],
    plate: { y: 1.0, z: 2.47, w: 0.52 },
    neon: { w: 2.3, l: 5.1 },
    scale: 0.88,
  },
  seda: { build: buildThief, camLift: 0, plate: { y: 0.62, z: 2.42, w: 0.5 }, neon: { w: 2.1, l: 4.8 } },
  picape: { build: buildPicape, camLift: 0, gunner: [0.25, 0.95, 1.35], plate: { y: 0.8, z: 2.27, w: 0.5 }, neon: { w: 2.0, l: 4.7 } },
  moto: {
    build: buildMoto,
    camLift: 0,
    gunner: [0, 1.0, 0.68],
    gunnerAlways: true,
    plate: { y: 0.86, z: 1.13, w: 0.3 },
    neon: { w: 0.9, l: 2.2 },
    scale: 1.15,
  },
  van: {
    build: buildVan,
    camLift: 0.2,
    camBack: 0.6,
    gunner: [0.92, 1.0, 0.4],
    plate: { y: 0.78, z: 2.58, w: 0.5 },
    neon: { w: 2.1, l: 5.0 },
  },
};
