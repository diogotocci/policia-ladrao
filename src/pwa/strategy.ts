// Service worker rules (pure and testable): what comes from the network and what comes from the cache.
export const CACHE_PREFIX = 'pl-';

export type Strategy = 'network-first' | 'cache-first' | 'network-only';

export const cacheName = (buildId: string) => `${CACHE_PREFIX}${buildId}`;

export function strategyFor(url: string, mode: string, origin: string): Strategy {
  const u = new URL(url);
  if (u.origin !== origin) return 'network-only';
  if (u.pathname === '/sw.js') return 'network-only';
  // the account API (V3) answers per person and must never come from a cache
  if (u.pathname.startsWith('/api/')) return 'network-only';
  // HTML: new version whenever there is network. Only the game itself ('/') falls back to the cached page; the other pages
  // (privacy, terms, delete account) need the network instead of showing the game in their place.
  if (mode === 'navigate') return u.pathname === '/' || u.pathname === '/index.html' ? 'network-first' : 'network-only';
  if (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/icons/') || u.pathname === '/manifest.webmanifest') return 'cache-first';
  return 'network-first';
}

/** this app's caches from previous builds (other apps' caches on the same origin are kept) */
export function staleCaches(keys: string[], current: string): string[] {
  return keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== current);
}

/** placeholder replaced at build time by the file list (comma-separated) */
export const PRECACHE_TOKEN = '__PL_PRECACHE__';
const STATIC = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

/** everything the game needs to open without network: the page, manifest, icons and the build's JS/CSS */
export function precacheList(fileNames: string[]): string[] {
  const built = fileNames.filter((f) => /^assets\/.+\.(js|css)$/.test(f)).map((f) => `/${f}`);
  return [...STATIC, ...built];
}

export function injectPrecache(code: string, list: string[]): string {
  return code.split(PRECACHE_TOKEN).join(list.join(','));
}
