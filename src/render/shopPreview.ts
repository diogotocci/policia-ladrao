// Shop showcase (V2 part 4, spec §6): one big car spinning on a dark round floor, swapped as the player
// browses (car, paint, neon, plate). Own renderer, released when the shop closes. No WebGL: text only.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Role } from '../config/balance';
import type { CarLook } from '../meta/shop';
import { createCar } from '../sim/car';
import { updateCarModel } from './carFactory';
import { createLookModel, disposeLookModel } from './carLook';

export interface ShopPreview {
  show(role: Role, look: CarLook): void;
  dispose(): void;
}

export function createShopPreview(slot: HTMLElement): ShopPreview {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return { show() {}, dispose() {} };
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  slot.append(renderer.domElement);
  const scene = new THREE.Scene();
  // soft studio reflections: dark paint reads as glossy instead of a black hole
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x30333a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 6, 3);
  scene.add(sun);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.9 }),
  );
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  let model: THREE.Group | undefined;
  let key = '';
  let lift = 0;
  let angle = 0.6;
  const car = (role: Role) => ({ ...createCar(role, 1, 0), x: 0 });
  let state = car('police');

  const show = (role: Role, look: CarLook) => {
    const k = `${role}|${JSON.stringify(look)}`;
    if (k === key) return;
    key = k;
    if (model) {
      scene.remove(model);
      disposeLookModel(model); // the plate tab swaps models while typing: free each one
    }
    model = createLookModel(role, look);
    lift = (model.userData.camLift as number) ?? 0;
    state = car(role);
    scene.add(model);
  };

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const w = Math.max(1, slot.clientWidth);
    const hgt = Math.max(1, slot.clientHeight);
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    // tall cars: a bit further and higher, so the whole car fits
    camera.position.set(0, 2.4 + lift * 1.2, 8 + lift * 2);
    camera.lookAt(0, 0.7 + lift * 0.6, 0);
    camera.updateProjectionMatrix();
    if (model) {
      updateCarModel(model, state, now / 1000, 0); // wheels, gyrophare (it also resets the heading)
      angle += dt * 0.5;
      model.rotation.y = angle;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    show,
    dispose() {
      cancelAnimationFrame(raf);
      renderer.domElement.remove();
      scene.environment?.dispose();
      if (model) disposeLookModel(model);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
