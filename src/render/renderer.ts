import * as THREE from 'three';

export type QualityTier = 'high' | 'medium' | 'low' | 'lowest';

/**
 * Per tier: pixel density cap, shadow map size and multisample antialiasing. 'lowest' draws fewer pixels than the
 * screen has (0.75 per CSS pixel) and the browser scales the picture up: the last step for weak phone GPUs.
 */
export const QUALITY: Record<QualityTier, { maxPixelRatio: number; shadowMapSize: number; antialias: boolean }> = {
  high: { maxPixelRatio: 2, shadowMapSize: 2048, antialias: true },
  medium: { maxPixelRatio: 1.5, shadowMapSize: 1024, antialias: true },
  low: { maxPixelRatio: 1, shadowMapSize: 0, antialias: false },
  lowest: { maxPixelRatio: 0.75, shadowMapSize: 0, antialias: false },
};

export const QUALITY_TIERS: readonly QualityTier[] = ['high', 'medium', 'low', 'lowest'];
const ORDER = QUALITY_TIERS;

/** the tier this device settled on in earlier matches, and how many matches started there since ("low|3") */
export const QUALITY_KEY = 'pl.quality.v1';
/** every this many matches on a remembered tier, one starts a tier higher to see whether the phone copes now */
export const PROBE_EVERY = 5;

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function readTier(storage: Store | undefined): { tier?: QualityTier; matches: number } {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(QUALITY_KEY) ?? null;
  } catch {
    // storage blocked: as if nothing was saved
  }
  const [tier, n] = (raw ?? '').split('|');
  return QUALITY_TIERS.includes(tier as QualityTier) ? { tier: tier as QualityTier, matches: Number(n) || 0 } : { matches: 0 };
}

const write = (storage: Store | undefined, value: string) => {
  try {
    storage?.setItem(QUALITY_KEY, value);
  } catch {
    // only a convenience
  }
};

/**
 * Where a match starts. The governor only ever goes down within a match, so the tier it settles on is remembered and
 * the next match does not start too high again (and stutter for its first seconds). Every few matches one starts a
 * tier higher, so a bad match (a hot phone, a download in the background) does not keep the picture low for good:
 * if the phone copes, that tier is remembered instead (see saveTier). Without anything saved: medium on a phone
 * (touch screen), high on a computer.
 */
export function startTier(storage: Store | undefined, phone: boolean): QualityTier {
  const saved = readTier(storage);
  if (!saved.tier) return phone ? 'medium' : 'high';
  const probe = saved.matches + 1 >= PROBE_EVERY && saved.tier !== ORDER[0];
  write(storage, `${saved.tier}|${probe ? 0 : saved.matches + 1}`);
  return probe ? ORDER[ORDER.indexOf(saved.tier) - 1]! : saved.tier;
}

/** The tier this device holds now: the governor dropped to it, or a match ran on it without dropping. */
export function saveTier(storage: Store | undefined, tier: QualityTier): void {
  if (readTier(storage).tier !== tier) write(storage, `${tier}|0`);
}

/** Canvas size = CSS size; density capped by the quality level. */
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
const WARMUP_SECONDS = 2; // shader compilation and page loading
const GRACE_SECONDS = 1; // after switching level or returning to the tab
const MIN_FPS = 45;
const MAX_FRAME = 0.5;
const CAP_30HZ = 1 / 30;

/**
 * Drops one level if the average FPS stays below 45 over a 3 s window, down to 'lowest'. Never goes up on its own.
 * Ignores the first 2 s, and 1 s after each switch or reset(). A device locked
 * at a steady 30 Hz (battery saving) is not downgraded: lowering quality would not help.
 */
export function createQualityGovernor(initial: QualityTier): {
  readonly tier: QualityTier;
  /** `target`: the frame rate the game aims for (the pacer's; half the screen's rate on a slow 90/120 Hz phone) */
  sample(dt: number, target?: number): QualityTier;
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
    sample(dt, target = 60) {
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
        // aiming at 45 fps (a 90 Hz screen drawn every second refresh) is fine: only clearly below the aim drops
        const min = Math.min(MIN_FPS, target * 0.9);
        if (frames / time < min && !cappedAt30 && tier !== ORDER[ORDER.length - 1]) {
          tier = ORDER[ORDER.indexOf(tier) + 1]!;
          ignore = GRACE_SECONDS;
        }
        clearWindow();
      }
      return tier;
    },
  };
}

/** Smooth texture: linear filter, mipmaps and anisotropy. */
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
  // multisampling is chosen when the context is made: a match that starts on a low tier draws without it (on a weak
  // phone GPU it costs about as much as the rest of the frame); a match that drops to low mid-way keeps it until the next
  const renderer = new THREE.WebGLRenderer({ antialias: QUALITY[initial].antialias, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap was removed in r186
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
