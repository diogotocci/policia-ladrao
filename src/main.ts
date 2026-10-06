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

registerServiceWorker(window, { prod: import.meta.env.PROD, debug });
installNoZoom(document);
installFullscreenOnFirstTap(document, window);

// Parâmetros de teste/depuração (?debug, ?role, ?seed) vão direto para a partida; sem eles (ou com ?app), a app começa no título.
const direct = !params.has('app') && (debug || params.has('role') || params.has('seed'));
if (app) {
  if (direct) startGame(app, { role, seed, debug, quality, debugHp, debugGive, traffic, mute, curves, escapeTime });
  else startApp(app, { quality, debug, debugHp, traffic, mute, curves, escapeTime }); // ?app força as telas (e2e do produto)
}
// primeira tela desenhada (2 quadros): some a splash. Em teste/depuração (?debug) sai na hora.
requestAnimationFrame(() => requestAnimationFrame(() => hideSplash(document, { immediate: debug })));
