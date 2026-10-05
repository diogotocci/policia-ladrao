// Carros girando nos cards da tela de escolha. Um renderer só (canvas próprio) desenhando os dois carros
// em metades separadas com scissor; liberado ao sair da tela.
import * as THREE from 'three';
import type { Role } from '../config/balance';
import { createCar } from '../sim/car';
import { createCarModel, updateCarModel } from './carFactory';
import { attachGunner, updateGunner } from './gunner';

export function createCarPreview(slots: Record<Role, HTMLElement>): { dispose(): void } {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return { dispose() {} }; // sem WebGL: os cards ficam só com texto
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const canvases: Record<Role, HTMLCanvasElement> = { police: document.createElement('canvas'), thief: document.createElement('canvas') };
  const ctx2d: Record<Role, CanvasRenderingContext2D | null> = { police: null, thief: null };
  for (const role of ['police', 'thief'] as Role[]) {
    slots[role].append(canvases[role]);
    ctx2d[role] = canvases[role].getContext('2d');
  }

  const scenes = {} as Record<Role, { scene: THREE.Scene; model: THREE.Group; gunner: THREE.Group }>;
  for (const role of ['police', 'thief'] as Role[]) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x30333a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 6, 3);
    scene.add(sun);
    const model = createCarModel(role);
    const gunner = attachGunner(model, role);
    scene.add(model);
    scenes[role] = { scene, model, gunner };
  }
  const camera = new THREE.PerspectiveCamera(32, 2, 0.1, 50);
  camera.position.set(0, 2.6, 7.5);
  camera.lookAt(0, 0.6, 0);
  const car = { police: { ...createCar('police', 1, 0), x: 0, hasGun: true }, thief: { ...createCar('thief', 1, 0), x: 0, hasGun: true } };

  let raf = 0;
  let t0 = performance.now();
  const frame = (now: number) => {
    const t = (now - t0) / 1000;
    for (const role of ['police', 'thief'] as Role[]) {
      const slot = slots[role];
      const w = Math.max(1, slot.clientWidth);
      const hgt = Math.max(1, slot.clientHeight);
      const pr = renderer.getPixelRatio();
      if (renderer.domElement.width !== Math.round(w * pr) || renderer.domElement.height !== Math.round(hgt * pr)) renderer.setSize(w, hgt, false);
      const c = canvases[role];
      if (c.width !== renderer.domElement.width || c.height !== renderer.domElement.height) {
        c.width = renderer.domElement.width;
        c.height = renderer.domElement.height;
      }
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
      const { scene, model, gunner } = scenes[role];
      updateCarModel(model, car[role], t, 0);
      updateGunner(gunner, car[role], { s: 30, x: 0 }, t);
      model.rotation.y = t * 0.6 + (role === 'thief' ? Math.PI : 0);
      renderer.render(scene, camera);
      const g = ctx2d[role];
      if (g) {
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(renderer.domElement, 0, 0);
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  t0 = performance.now();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      for (const role of ['police', 'thief'] as Role[]) canvases[role].remove();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
