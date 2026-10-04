// Retrovisor: câmera traseira renderizada numa textura e desenhada espelhada (como um espelho de verdade)
// num retângulo pequeno no canto superior direito. O passe do espelho não recalcula o mapa de sombras.
import * as THREE from 'three';
import type { CarState } from '../sim/car';

const MARGIN_TOP = 10; // px (alinha com as barras do HUD)
const MARGIN_RIGHT = 14;

/** Pequeno, no canto superior direito: não cobre a pista (tráfego, caixinhas, quebra-molas). */
export function rearviewRect(cssW: number, cssH: number): { x: number; y: number; w: number; h: number } {
  const w = Math.round(cssW * 0.22);
  const h = Math.round(w / 3);
  return { x: cssW - MARGIN_RIGHT - w, y: Math.min(MARGIN_TOP, Math.max(0, cssH - h)), w, h };
}

export function isBehind(player: CarState, foe: CarState): boolean {
  return foe.s < player.s - 2;
}

export function createRearview(): {
  camera: THREE.PerspectiveCamera;
  place(car: CarState, originS: number): void;
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, cssW: number, cssH: number): void;
  mirrorTexture(): THREE.Texture;
} {
  const camera = new THREE.PerspectiveCamera(50, 3, 0.5, 140);
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  // espelho: inverte a textura na horizontal (u → 1 − u)
  target.texture.repeat.set(-1, 1);
  target.texture.offset.set(1, 0);

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture, toneMapped: false })));

  return {
    camera,
    place(car, originS) {
      const z = -(car.s - originS);
      camera.position.set(car.x, 1.6, z);
      camera.lookAt(car.x, 1.1, z + 20);
    },
    render(renderer, scene, cssW, cssH) {
      const r = rearviewRect(cssW, cssH);
      const pr = renderer.getPixelRatio();
      const tw = Math.max(1, Math.round(r.w * pr));
      const th = Math.max(1, Math.round(r.h * pr));
      if (target.width !== tw || target.height !== th) target.setSize(tw, th);
      camera.aspect = r.w / r.h;
      camera.updateProjectionMatrix();

      const autoShadow = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false; // reaproveita as sombras do passe principal
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.shadowMap.autoUpdate = autoShadow;

      const glY = cssH - r.y - r.h; // viewport do WebGL começa embaixo
      renderer.setScissorTest(true);
      renderer.setScissor(r.x, glY, r.w, r.h);
      renderer.setViewport(r.x, glY, r.w, r.h);
      renderer.render(quadScene, quadCam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, cssW, cssH);
    },
    mirrorTexture() {
      return target.texture;
    },
  };
}
