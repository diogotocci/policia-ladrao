import type { Role } from './config/balance';
import { startGame } from './game';
import { installFullscreenOnFirstTap, installNoZoom } from './ui/mobileShell';
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
const debugGive = debug
  ? (params.get('give') ?? '').split(',').filter((x): x is ItemId => (ITEMS as string[]).includes(x))
  : undefined;
const traffic = debug && params.get('traffic') === '0' ? false : undefined;

const mute = params.has('mute');

installNoZoom(document);
installFullscreenOnFirstTap(document, window);

if (app) startGame(app, { role, seed, debug, quality, debugHp, debugGive, traffic, mute });
