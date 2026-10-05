// Regras do service worker (puras e testáveis): o que vem da rede e o que vem do cache.
export const CACHE_PREFIX = 'pl-';

export type Strategy = 'network-first' | 'cache-first' | 'network-only';

export const cacheName = (buildId: string) => `${CACHE_PREFIX}${buildId}`;

export function strategyFor(url: string, mode: string, origin: string): Strategy {
  const u = new URL(url);
  if (u.origin !== origin) return 'network-only';
  if (u.pathname === '/sw.js') return 'network-only';
  if (mode === 'navigate') return 'network-first'; // HTML: versão nova sempre que houver rede
  if (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/icons/') || u.pathname === '/manifest.webmanifest') return 'cache-first';
  return 'network-first';
}

/** caches desta app de builds anteriores (os de outras apps na mesma origem ficam) */
export function staleCaches(keys: string[], current: string): string[] {
  return keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== current);
}

/** marcador trocado no build pela lista de arquivos (separados por vírgula) */
export const PRECACHE_TOKEN = '__PL_PRECACHE__';
const STATIC = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

/** tudo o que o jogo precisa para abrir sem rede: a página, o manifest, ícones e os JS/CSS do build */
export function precacheList(fileNames: string[]): string[] {
  const built = fileNames.filter((f) => /^assets\/.+\.(js|css)$/.test(f)).map((f) => `/${f}`);
  return [...STATIC, ...built];
}

export function injectPrecache(code: string, list: string[]): string {
  return code.split(PRECACHE_TOKEN).join(list.join(','));
}
