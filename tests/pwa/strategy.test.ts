import { describe, expect, it } from 'vitest';
import { CACHE_PREFIX, PRECACHE_TOKEN, cacheName, injectPrecache, precacheList, staleCaches, strategyFor } from '../../src/pwa/strategy';

const o = 'https://jogo.example';
describe('service worker strategy', () => {
  it('pages (navigation) go to the network first, falling back to the cached copy offline', () => {
    expect(strategyFor(`${o}/`, 'navigate', o)).toBe('network-first');
    expect(strategyFor(`${o}/?app`, 'navigate', o)).toBe('network-first');
  });
  it('hashed assets, icons and the manifest are cache-first (they never change under the same name)', () => {
    expect(strategyFor(`${o}/assets/index-BotXNC93.js`, 'no-cors', o)).toBe('cache-first');
    expect(strategyFor(`${o}/icons/icon-192.png`, 'no-cors', o)).toBe('cache-first');
    expect(strategyFor(`${o}/manifest.webmanifest`, 'cors', o)).toBe('cache-first');
  });
  it('the service worker itself and other origins are never cached', () => {
    expect(strategyFor(`${o}/sw.js`, 'same-origin', o)).toBe('network-only');
    expect(strategyFor('https://outro.site/x.js', 'cors', o)).toBe('network-only');
  });
  it('a new build gets a new cache name and the old caches are deleted on activate (not other apps)', () => {
    const now = cacheName('b2');
    expect(now).toBe(`${CACHE_PREFIX}b2`);
    expect(staleCaches([`${CACHE_PREFIX}b1`, now, 'outra-app'], now)).toEqual([`${CACHE_PREFIX}b1`]);
  });

  it('precaches the whole build at install (first visit already works offline)', () => {
    const list = precacheList(['assets/main-abc.js', 'assets/main-def.css', 'sw.js', 'index.html', 'assets/sw-x.js.map']);
    expect(list).toEqual([
      '/',
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/assets/main-abc.js',
      '/assets/main-def.css',
    ]);
  });

  it('injects the list into the built worker in place of the token, whatever the quotes', () => {
    for (const q of ['"', "'", '`']) {
      const code = `const A=${q}${PRECACHE_TOKEN}${q}.split(",");`;
      const out = injectPrecache(code, ['/', '/assets/a.js']);
      expect(out).toBe(`const A=${q}/,/assets/a.js${q}.split(",");`);
    }
  });
});
