// Service worker rules (pure and testable): what comes from the network and what comes from the cache.
export const CACHE_PREFIX = 'pl-';

export type Strategy = 'network-first' | 'cache-first' | 'network-only';

export const cacheName = (buildId: string) => `${CACHE_PREFIX}${buildId}`;

export function strategyFor(url: string, mode: string, origin: string): Strategy {
  const u = new URL(url);
  if (u.origin !== origin) return 'network-only';
  if (u.pathname === '/sw.js') return 'network-only';
  if (mode === 'navigate') return 'network-first'; // HTML: new version whenever there is network
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
