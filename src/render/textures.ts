import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { createRng } from '../sim/rng';
import { smoothTexture } from './renderer';

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
export function makeGroundTexture(chunkLength: number): THREE.CanvasTexture {
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
export function makeFacadeTexture(): THREE.CanvasTexture {
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
