// Service worker: the game opens without internet after the first visit. Emitted as /sw.js in the build.
import { PRECACHE_TOKEN, cacheName, staleCaches, strategyFor } from './strategy';

declare const __BUILD_ID__: string;

interface FetchEventLike extends Event {
  request: Request;
  respondWith(r: Promise<Response>): void;
}
interface ExtendableEventLike extends Event {
  waitUntil(p: Promise<unknown>): void;
}
const sw = self as unknown as {
  addEventListener(type: 'install' | 'activate', cb: (e: ExtendableEventLike) => void): void;
  addEventListener(type: 'fetch', cb: (e: FetchEventLike) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  location: Location;
};

const CACHE = cacheName(__BUILD_ID__);
// list filled in at build time (plugin in vite.config): page, icons and all JS/CSS — the first visit already makes everything offline
const PRECACHE = PRECACHE_TOKEN.split(',');

sw.addEventListener('install', (e) => {
  // precaches everything at once (if anything fails, the install fails and retries on the next visit)
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(staleCaches(keys, CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const how = strategyFor(req.url, req.mode, sw.location.origin);
  if (how === 'network-only') return;
  if (how === 'cache-first') {
    e.respondWith(
      caches.match(req, { ignoreVary: true }).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            // clone now: once the page reads the body, it can no longer be cloned
            if (res.ok) {
              const copy = res.clone();
              void caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  // network first; without network, the stored copy (for navigation, the main page)
  // slow network: after 4 s uses the stored copy (if any) instead of leaving a blank screen
  const network = fetch(req);
  const slow = new Promise<Response>((resolve, reject) =>
    setTimeout(
      () =>
        caches
          .match(req.mode === 'navigate' ? '/' : req, { ignoreVary: true })
          .then((hit) => (hit ? resolve(hit) : reject(new Error('no cached copy')))),
      4000,
    ),
  );
  e.respondWith(
    Promise.race([network, slow.catch(() => network)])
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? '/' : req, { ignoreVary: true }).then((hit) => hit ?? Response.error())),
  );
});
