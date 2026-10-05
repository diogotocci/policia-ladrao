// Service worker: o jogo abre sem internet depois da primeira visita. Gerado como /sw.js no build.
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
// lista preenchida no build (plugin no vite.config): página, ícones e todos os JS/CSS — o 1º acesso já deixa tudo offline
const PRECACHE = PRECACHE_TOKEN.split(',');

sw.addEventListener('install', (e) => {
  // pré-carrega tudo de uma vez (se algo falhar, a instalação falha e tenta de novo na próxima visita)
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
            // clona já: depois que a página lê o corpo, não dá mais para clonar
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
  // rede primeiro; sem rede, a cópia guardada (para navegação, a página principal)
  // rede lenta: depois de 4 s usa a cópia guardada (se houver) em vez de deixar a tela em branco
  const network = fetch(req);
  const slow = new Promise<Response>((resolve, reject) =>
    setTimeout(() => caches.match(req.mode === 'navigate' ? '/' : req, { ignoreVary: true }).then((hit) => (hit ? resolve(hit) : reject(new Error('sem cópia')))), 4000),
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
