import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { injectPrecache, precacheList } from './src/pwa/strategy';
import { assetLinks, parseFingerprints } from './src/pwa/assetlinks';

/** writes the build's file list into /sw.js for precaching (offline from the 1st visit) */
const swPrecache = (): Plugin => ({
  name: 'pl-sw-precache',
  apply: 'build',
  generateBundle(_, bundle) {
    const list = precacheList(Object.keys(bundle));
    const sw = Object.values(bundle).find((f) => f.type === 'chunk' && f.fileName === 'sw.js');
    if (sw && sw.type === 'chunk') sw.code = injectPrecache(sw.code, list);
  },
});

/** V3 delivery 4: /.well-known/assetlinks.json for the Play app, from ANDROID_SHA256_FINGERPRINTS (only when set) */
const androidAssetLinks = (): Plugin => ({
  name: 'pl-assetlinks',
  apply: 'build',
  generateBundle() {
    const fingerprints = parseFingerprints(process.env.ANDROID_SHA256_FINGERPRINTS);
    if (fingerprints.length) this.emitFile({ type: 'asset', fileName: '.well-known/assetlinks.json', source: assetLinks(fingerprints) });
  },
});

export default defineConfig({
  plugins: [swPrecache(), androidAssetLinks()],
  // build version: service worker cache name (a new build clears the old cache)
  // app version shown on the title screen (package.json)
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
    __APP_VERSION__: JSON.stringify(
      (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version,
    ),
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // V3 delivery 3: the /admin panel (its own page; the game's bundle does not load it)
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
        sw: fileURLToPath(new URL('./src/pwa/sw.ts', import.meta.url)),
      },
      output: {
        // the service worker needs a fixed name at the root (/sw.js) to control the whole site
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
