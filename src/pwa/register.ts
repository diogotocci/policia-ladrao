// Registers the service worker only in the production build and outside tests/debugging (?debug).
export function registerServiceWorker(win: Window, opts: { prod: boolean; debug: boolean }): void {
  if (!opts.prod || opts.debug || !('serviceWorker' in win.navigator)) return;
  win.addEventListener('load', () => {
    win.navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no service worker: the game works, it just isn't available offline */
    });
  });
}
