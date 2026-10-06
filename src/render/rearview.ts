// Retrovisor: câmera traseira renderizada numa textura e desenhada espelhada (como um espelho de verdade)
// num retângulo pequeno no canto superior direito. O passe do espelho não recalcula o mapa de sombras.
import * as THREE from 'three';
import { trackPos } from './trackFrame';
import type { CarState } from '../sim/car';
import type { QualityTier } from './renderer';

/** por qualidade: alcance da visão de trás, a cada quantos quadros redesenha a cena e teto de densidade de pixels */
const TIER: Record<QualityTier, { far: number; every: number; maxPr: number }> = {
  high: { far: 140, every: 1, maxPr: 3 },
  medium: { far: 110, every: 1, maxPr: 1.5 },
  low: { far: 80, every: 2, maxPr: 1 },
};

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
  /** celular fraco: espelho mais leve */
  setQuality(tier: QualityTier): void;
} {
  let tier = TIER.high;
  let frame = 0;
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
      // no teto, olhando para trás ao longo da pista (nas curvas, para onde a rua de trás vai)
      const p = trackPos(car.s, car.x, originS);
      const back = trackPos(car.s - 20, car.x, originS);
      camera.position.set(p.x, 1.6, p.z);
      camera.lookAt(back.x, 1.1, back.z);
    },
    render(renderer, scene, cssW, cssH) {
      const r = rearviewRect(cssW, cssH);
      const pr = Math.min(renderer.getPixelRatio(), tier.maxPr);
      const tw = Math.max(1, Math.round(r.w * pr));
      const th = Math.max(1, Math.round(r.h * pr));
      camera.aspect = r.w / r.h;
      camera.updateProjectionMatrix();

      const resized = target.width !== tw || target.height !== th;
      if (resized) target.setSize(tw, th);
      // em low a cena de trás é redesenhada a cada 2 quadros (a textura do quadro anterior continua no espelho)
      if (resized || frame++ % tier.every === 0) {
        const autoShadow = renderer.shadowMap.autoUpdate;
        renderer.shadowMap.autoUpdate = false; // reaproveita as sombras do passe principal
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.shadowMap.autoUpdate = autoShadow;
      }

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
    setQuality(q) {
      tier = TIER[q];
      camera.far = tier.far;
      camera.updateProjectionMatrix();
    },
  };
}
