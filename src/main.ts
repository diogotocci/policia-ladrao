import type { Role } from './config/balance';
import { startGame } from './game';
import type { QualityTier } from './render/renderer';

const params = new URLSearchParams(location.search);
const role: Role = params.get('role') === 'thief' ? 'thief' : 'police';
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && params.has('seed') ? seedParam : Date.now() >>> 0;

const app = document.getElementById('app');
const q = params.get('quality');
const quality = q === 'high' || q === 'medium' || q === 'low' ? (q as QualityTier) : undefined;

if (app) startGame(app, { role, seed, debug: params.has('debug'), quality });
