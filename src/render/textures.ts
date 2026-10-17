import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { createRng } from '../sim/rng';
import { smoothTexture } from './renderer';
import type { Facade, Outer, Street } from './mapThemes';

/** pixels per meter in the ground texture */
export const GROUND_PPM = 16;
/** half-width of the ground (road + curb + sidewalk), in meters */
export const GROUND_HALF_WIDTH = 11;
/** meters covered by one repeat of the facade texture (width, height) */
export const FACADE_TILE_METERS = { width: 8, height: 48 } as const;

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { c, ctx };
};

/** Street cross-section for a chunk: paved sidewalk, curb, asphalt, tire marks and lane stripes. */
export function makeGroundTexture(chunkLength: number, street: Street = 'city'): THREE.CanvasTexture {
  const ppm = GROUND_PPM;
  const w = GROUND_HALF_WIDTH * 2 * ppm;
  const h = chunkLength * ppm;
  const { c, ctx } = canvas(w, h);
  const rng = createRng(1234);
  const px = (xm: number) => (xm + GROUND_HALF_WIDTH) * ppm;
  const road = BALANCE.road.halfWidth;

  ctx.fillStyle = '#a9a59c';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(60,55,50,0.35)';
  ctx.lineWidth = 1.5;
  const walks: [number, number][] = [
    [0, px(-road - 0.4)],
    [px(road + 0.4), w],
  ];
  for (const [x0, x1] of walks) {
    for (let y = 0; y < h; y += ppm * 2) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    for (let x = x0; x < x1; x += ppm * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }
  if (street === 'promenade') {
    // Rio: Copacabana's black and white waves on the beach side
    const x0 = px(road + 0.4);
    ctx.fillStyle = '#f2efe8';
    ctx.fillRect(x0, 0, w - x0, h);
    ctx.strokeStyle = '#26262a';
    ctx.lineWidth = 0.55 * ppm;
    for (let y = -ppm * 2; y < h + ppm * 2; y += ppm * 1.6) {
      ctx.beginPath();
      for (let x = x0; x <= w; x += 4) ctx.lineTo(x, y + Math.sin(((x - x0) / ppm) * 1.3) * ppm * 0.55);
      ctx.stroke();
    }
  }
  if (street === 'bridge') {
    // wooden walkways
    for (const [x0, x1] of walks) {
      ctx.fillStyle = '#8a6e4e';
      ctx.fillRect(x0, 0, x1 - x0, h);
      ctx.fillStyle = 'rgba(40,25,10,0.35)';
      for (let y = 0; y < h; y += ppm * 0.6) ctx.fillRect(x0, y, x1 - x0, 2);
    }
  }
  for (let i = 0; i < 4000; i++) {
    const v = 140 + rng.next() * 50;
    ctx.fillStyle = `rgba(${v},${v - 4},${v - 10},0.25)`;
    ctx.fillRect(rng.next() * w, rng.next() * h, 2, 2);
  }
  ctx.fillStyle = '#34363b';
  ctx.fillRect(px(-road), 0, px(road) - px(-road), h);
  for (let i = 0; i < 26000; i++) {
    const v = 35 + rng.next() * 40;
    ctx.fillStyle = `rgba(${v},${v},${v + 3},0.6)`;
    ctx.fillRect(px(-road) + rng.next() * road * 2 * ppm, rng.next() * h, 1.5, 1.5);
  }
  for (const xm of BALANCE.road.laneCenters) {
    for (const off of [-0.8, 0.8]) {
      const g = ctx.createLinearGradient(px(xm + off - 0.3), 0, px(xm + off + 0.3), 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(10,10,12,0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px(xm + off - 0.3), 0, 0.6 * ppm, h);
    }
  }
  ctx.fillStyle = '#cfcac0';
  ctx.fillRect(px(-road - 0.4), 0, 0.4 * ppm, h);
  ctx.fillRect(px(road), 0, 0.4 * ppm, h);
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(px(-road + 0.2), 0, 0.15 * ppm, h);
  ctx.fillRect(px(road - 0.35), 0, 0.15 * ppm, h);
  for (const xm of [-3, 0, 3]) {
    for (let s = 0; s < chunkLength; s += 10) ctx.fillRect(px(xm - 0.07), s * ppm, 0.14 * ppm, 4 * ppm);
  }
  return smoothTexture(new THREE.CanvasTexture(c));
}

/** Facade with framed windows, sills and reflection; repeats according to building size. */
export function makeFacadeTexture(style: Facade = 'city'): THREE.CanvasTexture {
  if (style !== 'city') return makeStyledFacade(style);
  const { c, ctx } = canvas(256, 512);
  const rng = createRng(77);
  ctx.fillStyle = '#e4e2dc';
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rng.next() * 0.05})`;
    ctx.fillRect(rng.next() * 256, rng.next() * 512, 3, 3);
  }
  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y + 28, 256, 4);
    for (let x = 8; x < 250; x += 40) {
      const lit = rng.next() < 0.18;
      ctx.fillStyle = '#5b6068';
      ctx.fillRect(x - 2, y + 4, 28, 22);
      const g = ctx.createLinearGradient(0, y + 6, 0, y + 24);
      if (lit) {
        g.addColorStop(0, '#ffe7a8');
        g.addColorStop(1, '#f2c66b');
      } else {
        g.addColorStop(0, '#9fb6cc');
        g.addColorStop(1, '#2f3c4c');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x, y + 6, 24, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 2, y + 7, 6, 16);
      ctx.fillStyle = '#4a4f57';
      ctx.fillRect(x + 11, y + 6, 2, 18);
      ctx.fillStyle = '#c9c5bb';
      ctx.fillRect(x - 3, y + 25, 30, 3);
    }
  }
  const t = smoothTexture(new THREE.CanvasTexture(c));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Sky in a vertical gradient (scene background). */
export function makeSkyTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(2, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5f8fcf');
  g.addColorStop(0.55, '#a9c8e6');
  g.addColorStop(1, '#e6dccb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Facades of the other maps (same tile: 8 m × 48 m, 16 floors of 3 m, 6 windows per tile). */
function makeStyledFacade(style: Exclude<Facade, 'city'>): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 512);
  const rng = createRng(style.length * 131 + 7);
  const S = {
    pastel: { wall: '#f4f0e8', frame: '#ffffff', glass: ['#7f9fb8', '#5e7c96'], lit: 0.06, band: 'rgba(255,255,255,0.95)' },
    brick: { wall: '#9a4732', frame: '#efe6d6', glass: ['#3a4250', '#252b35'], lit: 0.22, band: '' },
    night: { wall: '#1d1e27', frame: '#2c2e3a', glass: ['#3a3f55', '#2a2e40'], lit: 0.38, band: '' },
    stone: { wall: '#ece3cf', frame: '#f6f0e2', glass: ['#4a5566', '#323a47'], lit: 0.08, band: '' },
    prewar: { wall: '#cdbfa6', frame: '#efe8da', glass: ['#556070', '#3a4452'], lit: 0.14, band: '' },
  }[style];
  ctx.fillStyle = S.wall;
  ctx.fillRect(0, 0, 256, 512);
  if (style === 'brick') {
    ctx.strokeStyle = 'rgba(40,15,10,0.28)';
    ctx.lineWidth = 1;
    for (let y = 0; y < 512; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      for (let x = (y / 5) % 2 ? 0 : 6; x < 256; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
      }
    }
  } else {
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rng.next() * 0.05})`;
      ctx.fillRect(rng.next() * 256, rng.next() * 512, 3, 3);
    }
  }
  for (let y = 0; y < 512; y += 32) {
    if (S.band) {
      ctx.fillStyle = S.band;
      ctx.fillRect(0, y + 27, 256, 5); // Rio: a balcony line on every floor
    }
    if (style === 'stone' && (y / 32) % 4 === 1) {
      ctx.fillStyle = '#1e1e1e'; // Paris: the long iron balcony
      ctx.fillRect(0, y + 24, 256, 2);
      for (let x = 0; x < 256; x += 5) ctx.fillRect(x, y + 20, 1, 6);
    }
    for (let x = 6; x < 250; x += 42) {
      const lit = rng.next() < S.lit;
      const tall = style === 'stone';
      ctx.fillStyle = S.frame;
      ctx.fillRect(x - 3, y + (tall ? 2 : 4), 30, tall ? 26 : 22);
      const g = ctx.createLinearGradient(0, y + 6, 0, y + 26);
      if (lit) {
        g.addColorStop(0, '#ffe7a8');
        g.addColorStop(1, '#f2c66b');
      } else {
        g.addColorStop(0, S.glass[0]!);
        g.addColorStop(1, S.glass[1]!);
      }
      ctx.fillStyle = g;
      ctx.fillRect(x, y + (tall ? 4 : 6), 24, tall ? 22 : 18);
      ctx.fillStyle = S.frame;
      ctx.fillRect(x + 11, y + 6, 2, tall ? 20 : 18);
    }
  }
  const t = smoothTexture(new THREE.CanvasTexture(c));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** half-width of the plane beyond the sidewalks (m) */
export const OUTER_HALF_WIDTH = 130;

/** The wide ground of a segment, across the road (x from -130 to 130 m), one chunk long. */
export function makeOuterTexture(kind: Outer): THREE.CanvasTexture {
  const ppm = 2;
  const w = OUTER_HALF_WIDTH * 2 * ppm;
  const h = 50 * ppm;
  const { c, ctx } = canvas(w, h);
  const rng = createRng(kind.length * 977);
  const px = (xm: number) => (xm + OUTER_HALF_WIDTH) * ppm;
  const noise = (n: number, rgba: () => string, x0 = 0, x1 = w) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rgba();
      ctx.fillRect(x0 + rng.next() * (x1 - x0), rng.next() * h, 2, 2);
    }
  };
  if (kind === 'grass') {
    ctx.fillStyle = '#5f9e47';
    ctx.fillRect(0, 0, w, h);
    noise(6000, () => `rgba(${30 + rng.next() * 40},${90 + rng.next() * 60},${30 + rng.next() * 30},0.5)`);
  } else if (kind === 'river') {
    ctx.fillStyle = '#3c5a6e';
    ctx.fillRect(0, 0, w, h);
    noise(3000, () => `rgba(200,220,235,${rng.next() * 0.25})`);
  } else {
    // Rio: pavement under the buildings, then sand, the foam line and the sea
    ctx.fillStyle = '#b8b2a6';
    ctx.fillRect(0, 0, px(0), h);
    ctx.fillStyle = '#eed49a';
    ctx.fillRect(px(0), 0, px(52) - px(0), h);
    noise(4000, () => `rgba(170,140,80,${rng.next() * 0.3})`, px(0), px(52));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px(52), 0, 3 * ppm, h);
    ctx.fillStyle = '#1f8fc4';
    ctx.fillRect(px(55), 0, w - px(55), h);
    noise(2500, () => `rgba(255,255,255,${rng.next() * 0.3})`, px(55), w);
  }
  return smoothTexture(new THREE.CanvasTexture(c));
}

/** Sky of a map, in a vertical gradient. */
export function makeMapSky(top: string, mid: string, bottom: string): THREE.CanvasTexture {
  const { c, ctx } = canvas(2, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
