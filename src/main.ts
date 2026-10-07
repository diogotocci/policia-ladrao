import type { Role } from './config/balance';
import { startApp } from './app';
import { startGame } from './game';
import { installFullscreenOnFirstTap, installNoZoom } from './ui/mobileShell';
import { registerServiceWorker } from './pwa/register';
import { hideSplash } from './ui/splash';
import type { QualityTier } from './render/renderer';
import type { ItemId } from './sim/world';

const params = new URLSearchParams(location.search);
const role: Role = params.get('role') === 'thief' ? 'thief' : 'police';
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && params.has('seed') ? seedParam : Date.now() >>> 0;

const app = document.getElementById('app');
const q = params.get('quality');
const quality = q === 'high' || q === 'medium' || q === 'low' ? (q as QualityTier) : undefined;

const debug = params.has('debug');
/** positive number from the URL, debug only */
const hpParam = (name: string) => {
  const v = Number(params.get(name));
  return debug && params.has(name) && Number.isFinite(v) && v > 0 ? v : undefined;
};
const debugHp = debug ? { police: hpParam('policeHp'), thief: hpParam('thiefHp') } : undefined;

const ITEMS: ItemId[] = ['fireRate', 'power', 'heal', 'nitro', 'ram', 'heli', 'pierce', 'plate', 'bomb', 'gun'];
const debugGive = debug ? (params.get('give') ?? '').split(',').filter((x): x is ItemId => (ITEMS as string[]).includes(x)) : undefined;
const traffic = debug && params.get('traffic') === '0' ? false : undefined;
const curves = params.get('curves') === '0' ? false : undefined;
const escapeParam = Number(params.get('escape'));
const escapeTime = debug && params.has('escape') && Number.isFinite(escapeParam) && escapeParam > 0 ? escapeParam : undefined;

const mute = params.has('mute');
// V2 part 3 (debug only): ?mode=survival and ?chaosEvery=N for e2e
const mode = debug && params.get('mode') === 'survival' ? ('survival' as const) : undefined;
const chaosEvery = hpParam('chaosEvery'); // positive number, debug only

registerServiceWorker(window, { prod: import.meta.env.PROD, debug });
installNoZoom(document);
installFullscreenOnFirstTap(document, window);

// Test/debug parameters (?debug, ?role, ?seed) go straight to the match; without them (or with ?app), the app starts on the title screen.
const direct = !params.has('app') && (debug || params.has('role') || params.has('seed'));
if (app) {
  if (direct) startGame(app, { role, seed, debug, quality, debugHp, debugGive, traffic, mute, curves, escapeTime, mode, chaosEvery });
  else startApp(app, { quality, debug, debugHp, traffic, mute, curves, escapeTime, mode, chaosEvery }); // ?app forces the screens (product e2e)
}
// first screen drawn (2 frames): the splash disappears. In test/debug (?debug) it goes away immediately.
requestAnimationFrame(() => requestAnimationFrame(() => hideSplash(document, { immediate: debug })));
