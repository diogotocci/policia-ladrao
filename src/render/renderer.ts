import * as THREE from 'three';

export type QualityTier = 'high' | 'medium' | 'low';

export const QUALITY: Record<QualityTier, { maxPixelRatio: number; shadowMapSize: number }> = {
  high: { maxPixelRatio: 2, shadowMapSize: 2048 },
  medium: { maxPixelRatio: 1.5, shadowMapSize: 1024 },
  low: { maxPixelRatio: 1, shadowMapSize: 0 },
};

const ORDER: QualityTier[] = ['high', 'medium', 'low'];

/** Tamanho do canvas = tamanho CSS; densidade limitada pelo nível de qualidade. */
export function computeRenderSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  tier: QualityTier,
): { width: number; height: number; pixelRatio: number } {
  return {
    width: Math.max(1, Math.round(cssWidth)),
    height: Math.max(1, Math.round(cssHeight)),
    pixelRatio: Math.min(Math.max(1, devicePixelRatio || 1), QUALITY[tier].maxPixelRatio),
  };
}

const WINDOW_SECONDS = 3;
const WARMUP_SECONDS = 2; // compilação de shaders e carregamento da página
const GRACE_SECONDS = 1; // depois de trocar de nível ou de voltar para a aba
const MIN_FPS = 45;
const MAX_FRAME = 0.5;
const CAP_30HZ = 1 / 30;

/**
 * Desce um nível se a média de FPS ficar abaixo de 45 numa janela de 3 s. Nunca sobe sozinho.
 * Não conta os primeiros 2 s, nem 1 s depois de cada troca ou de reset(). Um aparelho travado
 * em 30 Hz estáveis (economia de bateria) não é rebaixado: baixar a qualidade não ajudaria.
 */
export function createQualityGovernor(initial: QualityTier): {
  readonly tier: QualityTier;
  sample(dt: number): QualityTier;
  reset(): void;
} {
  let tier = initial;
  let ignore = WARMUP_SECONDS;
  let time = 0;
  let frames = 0;
  let sumSq = 0;
  const clearWindow = () => {
    time = 0;
    frames = 0;
    sumSq = 0;
  };
  return {
    get tier() {
      return tier;
    },
    reset() {
      ignore = GRACE_SECONDS;
      clearWindow();
    },
    sample(dt) {
      if (dt <= 0 || dt > MAX_FRAME) return tier;
      if (ignore > 0) {
        ignore -= dt;
        return tier;
      }
      time += dt;
      frames++;
      sumSq += dt * dt;
      if (time >= WINDOW_SECONDS) {
        const mean = time / frames;
        const std = Math.sqrt(Math.max(0, sumSq / frames - mean * mean));
        const cappedAt30 = Math.abs(mean - CAP_30HZ) < 0.0015 && std < 0.003;
        if (frames / time < MIN_FPS && !cappedAt30 && tier !== 'low') {
          tier = ORDER[ORDER.indexOf(tier) + 1]!;
          ignore = GRACE_SECONDS;
        }
        clearWindow();
      }
      return tier;
    },
  };
}

/** Textura suave: filtro linear, mipmaps e anisotropia. */
export function smoothTexture<T extends THREE.Texture>(tex: T): T {
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRenderer(
  container: HTMLElement,
  initial: QualityTier = 'high',
): { renderer: THREE.WebGLRenderer; resize(): void; setQuality(tier: QualityTier): void; readonly quality: QualityTier } {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap foi removido no r186
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.append(canvas);

  let quality = initial;
  const resize = () => {
    const r = computeRenderSize(container.clientWidth, container.clientHeight, window.devicePixelRatio, quality);
    renderer.setPixelRatio(r.pixelRatio);
    renderer.setSize(r.width, r.height, false);
  };
  const setQuality = (tier: QualityTier) => {
    quality = tier;
    renderer.shadowMap.enabled = QUALITY[tier].shadowMapSize > 0;
    resize();
  };
  setQuality(initial);
  return {
    renderer,
    resize,
    setQuality,
    get quality() {
      return quality;
    },
  };
}
