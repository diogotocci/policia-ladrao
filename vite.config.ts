import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { injectPrecache, precacheList } from './src/pwa/strategy';

/** escreve no /sw.js a lista de arquivos do build para o pré-cache (offline já na 1ª visita) */
const swPrecache = (): Plugin => ({
  name: 'pl-sw-precache',
  apply: 'build',
  generateBundle(_, bundle) {
    const list = precacheList(Object.keys(bundle));
    const sw = Object.values(bundle).find((f) => f.type === 'chunk' && f.fileName === 'sw.js');
    if (sw && sw.type === 'chunk') sw.code = injectPrecache(sw.code, list);
  },
});

export default defineConfig({
  plugins: [swPrecache()],
  // versão do build: nome do cache do service worker (um build novo limpa o cache antigo)
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sw: fileURLToPath(new URL('./src/pwa/sw.ts', import.meta.url)),
      },
      output: {
        // o service worker precisa de nome fixo na raiz (/sw.js) para controlar o site todo
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
