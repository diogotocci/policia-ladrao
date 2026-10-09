// Still pictures of cars for the Garagem cards (V2 part 6): one renderer draws a car in 3/4 view and gives a PNG
// data URL. Cached per look; without WebGL (tests, old devices) there is no picture.
import * as THREE from 'three';
import type { Role } from '../config/balance';
import type { CarLook } from '../meta/shop';
import { createLookModel, disposeLookModel } from './carLook';
import { addPreviewLighting } from './scene';

const cache = new Map<string, string>();
let shared: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null | undefined;

function setup() {
  if (shared !== undefined) return shared;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(320, 200, false);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    addPreviewLighting(scene, renderer);
    scene.background = null;
    shared = { renderer, scene, camera: new THREE.PerspectiveCamera(30, 320 / 200, 0.1, 100) };
  } catch {
    shared = null;
  }
  return shared;
}

export function carThumb(role: Role, look: CarLook): string | undefined {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  const s = setup();
  if (!s) return undefined;
  const model = createLookModel(role, look);
  const box = new THREE.Box3().setFromObject(model);
  const h = box.max.y;
  s.scene.add(model);
  s.camera.position.set(4.6, 1.7 + h * 0.35, -5.0);
  s.camera.lookAt(0, h * 0.42, 0);
  s.renderer.render(s.scene, s.camera);
  const url = s.renderer.domElement.toDataURL('image/png');
  s.scene.remove(model);
  disposeLookModel(model);
  cache.set(key, url);
  return url;
}
