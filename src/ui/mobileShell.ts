// "App feel" on phones: no double-tap/pinch zoom and fullscreen on first touch (hides the browser bars).
// When installed on the home screen (manifest) it already opens without bars; this is for those playing directly in the browser.

const DOUBLE_TAP_MS = 300;

/** Blocks double-tap and pinch zoom (iOS ignores user-scalable=no). Returns the function that undoes it. */
export function installNoZoom(doc: Document, now: () => number = () => performance.now()): () => void {
  let lastTouchEnd = -Infinity;
  const onTouchEnd = (e: Event) => {
    const t = now();
    if (t - lastTouchEnd < DOUBLE_TAP_MS) e.preventDefault(); // quick 2nd tap: no zoom
    lastTouchEnd = t;
  };
  const block = (e: Event) => e.preventDefault();
  const opts = { passive: false } as AddEventListenerOptions;
  doc.addEventListener('touchend', onTouchEnd, opts);
  doc.addEventListener('gesturestart', block, opts); // pinch on iOS Safari
  doc.addEventListener('dblclick', block, opts);
  return () => {
    doc.removeEventListener('touchend', onTouchEnd, opts);
    doc.removeEventListener('gesturestart', block, opts);
    doc.removeEventListener('dblclick', block, opts);
  };
}

/** Opened as an installed app (home screen)? */
export function isStandalone(win: Window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    win.matchMedia?.('(display-mode: standalone)').matches === true ||
    win.matchMedia?.('(display-mode: fullscreen)').matches === true
  );
}

const lockLandscape = (win: Window): void => {
  try {
    const o = win.screen?.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    o?.lock?.('landscape')?.catch?.(() => {});
  } catch {
    /* iPhone: no rotation lock via the web (the game draws rotated — see styles.css) */
  }
};

/**
 * On the first touch (finger, not mouse) requests fullscreen and locks to landscape.
 * When installed (or without fullscreen), only locks rotation (Android). Needs a user gesture; failures are ignored.
 */
export function installFullscreenOnFirstTap(doc: Document, win: Window): () => void {
  const fullscreen = !isStandalone(win) && doc.fullscreenEnabled;
  const onUp = (e: Event) => {
    if ((e as PointerEvent).pointerType !== 'touch') return;
    win.removeEventListener('pointerup', onUp, true);
    if (!fullscreen) return lockLandscape(win);
    if (doc.fullscreenElement) return;
    const el = doc.documentElement as HTMLElement & { requestFullscreen?: (o?: FullscreenOptions) => Promise<void> };
    el.requestFullscreen?.({ navigationUI: 'hide' })
      .then(() => lockLandscape(win))
      .catch(() => {
        /* no fullscreen/rotation: stays in the browser */
      });
  };
  win.addEventListener('pointerup', onUp, true);
  return () => win.removeEventListener('pointerup', onUp, true);
}

/**
 * HUD button that reacts on touch (pointerdown), not on click: during a match the finger is constantly on the arrows,
 * and the double-tap zoom block swallowed the click of a touch right after (pause "hard to press").
 * Via keyboard (Enter/Space -> click with detail 0) it still works.
 */
export function onTap(el: HTMLElement, fn: () => void): () => void {
  const down = (e: Event) => {
    e.preventDefault();
    fn();
  };
  const click = (e: Event) => {
    if ((e as MouseEvent).detail === 0) fn();
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('click', click);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('click', click);
  };
}
