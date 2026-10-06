// Splash: drawn directly in index.html (shown before the JS); fades out when the first screen is ready.
const MIN_MS = 700; // does not flash too quickly
const FADE_MS = 400;

export function hideSplash(doc: Document, opts: { now?: number; immediate?: boolean } = {}): void {
  const el = doc.getElementById('splash');
  if (!el) return;
  if (opts.immediate) {
    el.remove();
    return;
  }
  const wait = Math.max(0, MIN_MS - (opts.now ?? performance.now()));
  setTimeout(() => {
    el.classList.add('is-gone');
    setTimeout(() => el.remove(), FADE_MS + 50);
  }, wait);
}
