// Frame pacing for high-refresh phone screens (90/120 Hz). The browser asks for a frame on every refresh; a phone
// that cannot draw that fast ends up alternating one and two refreshes per frame (55, 70, 48 fps...), which looks
// like stutter even when the average is decent. When that happens, the game draws every second refresh instead
// (45 fps on a 90 Hz screen, 60 on 120 Hz): fewer frames, but evenly spaced. The simulation runs on its own fixed
// step with interpolation, so speeds and timers do not change. 60 Hz screens are left alone (half would be 30 fps;
// the quality governor handles them by drawing less), and so are computers (a 144 Hz monitor is not a weak phone).

/** screens faster than this refresh rate are paced */
const HIGH_REFRESH_HZ = 75;
const WARMUP = 2; // s of play before measuring (shaders, first frames)
const WINDOW = 2; // s of drawn frames per check
/** drawn frames slower than this many refreshes on average: halve */
const SLOW = 1.25;
/** longer gaps are stalls (a compile, a notification), not the steady pace */
const STALL = 0.1;

export interface FramePacer {
  /**
   * Called on every animation frame; false skips drawing this one. `playing`: the match is running (frames during
   * the countdown or a pause are not measured).
   */
  shouldDraw(now: number, playing?: boolean): boolean;
  /** frames per second the quality governor holds the game to: 60, or half the screen's rate once halved */
  readonly target: number;
  readonly halved: boolean;
  /** after the tab comes back (the screen may have changed rate): full rate again, measured from scratch */
  reset(): void;
}

export function createFramePacer(o: { enabled: boolean } = { enabled: true }): FramePacer {
  /** the typical short gap between animation frames: the screen refresh */
  let refresh = 1 / 60;
  const gaps: number[] = [];
  let lastTick = -1;
  let lastDraw = -1;
  let ignore = WARMUP;
  let drawn = 0;
  let drawnTime = 0;
  let halved = false;
  let sinceSort = 0;
  const highRefresh = () => o.enabled && refresh < 1 / HIGH_REFRESH_HZ;
  const measure = (dt: number) => {
    if (dt >= STALL) return;
    if (ignore > 0) {
      ignore -= dt;
      return;
    }
    drawn++;
    drawnTime += dt;
    if (drawnTime < WINDOW) return;
    // checked all match long (traffic and effects grow), but once halved it stays so until reset: switching back and
    // forth would itself look like stutter
    if (drawnTime / drawn > refresh * SLOW) halved = true;
    drawn = 0;
    drawnTime = 0;
  };
  return {
    get target() {
      // a slow 60 Hz phone also only ever sees long gaps; its aim stays 60 so the governor still lowers the quality
      return halved && highRefresh() ? 0.5 / refresh : 60;
    },
    get halved() {
      return halved && highRefresh();
    },
    reset() {
      lastTick = -1;
      lastDraw = -1;
      ignore = 1;
      drawn = 0;
      drawnTime = 0;
      halved = false;
      gaps.length = 0;
    },
    shouldDraw(now, playing = true) {
      const t = now / 1000;
      if (lastTick >= 0) {
        const gap = t - lastTick;
        if (gap > 0.002 && gap < STALL) {
          gaps.push(gap);
          if (gaps.length > 90) gaps.shift();
          // the 10th percentile: the refresh, even when most frames take two (and if the screen changes rate);
          // recomputed every few frames, not on every one
          if (gaps.length < 15 || gaps.length % 15 === 0 || ++sinceSort >= 15) {
            sinceSort = 0;
            const sorted = [...gaps].sort((a, b) => a - b);
            refresh = sorted[Math.floor(sorted.length * 0.1)]!;
          }
        }
      }
      lastTick = t;
      if (!highRefresh()) {
        lastDraw = t;
        return true;
      }
      if (halved && lastDraw >= 0 && t - lastDraw < refresh * 1.5) return false;
      if (playing && lastDraw >= 0) measure(t - lastDraw);
      lastDraw = t;
      return true;
    },
  };
}
