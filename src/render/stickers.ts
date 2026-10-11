// Stickers (V2 part 6, playtest 2026-10-09): placed car by car, never on top of the car's own decals (POLÍCIA,
// the Caveirão badges, the Sedã racing stripe). Spots are in the body's own coordinates (front at -z):
// - top: lying on the hood, roof or trunk, from z0 (front) to z1, rising from y0 to y1, `w` wide;
// - side: on both sides at |x| = x, from z0 (front) to z1, centred at y, `h` tall.
import * as THREE from 'three';
import { canvasTex } from './models/kit';

type Top = { at: 'top'; z0: number; z1: number; y0: number; y1: number; w: number };
type Side = { at: 'side'; z0: number; z1: number; y: number; h: number; x: number };
export type Spot = Top | Side;
type Layout = Partial<Record<string, Spot[]>>;

const top = (z0: number, z1: number, y0: number, y1: number, w: number): Top => ({ at: 'top', z0, z1, y0, y1, w });
const side = (z0: number, z1: number, y: number, h: number, x: number): Side => ({ at: 'side', z0, z1, y, h, x });
/** square spot of size s centred at z */
const topSq = (z: number, y: number, s: number): Top => top(z - s / 2, z + s / 2, y, y, s);
const sideSq = (z: number, y: number, s: number, x: number): Side => side(z - s / 2, z + s / 2, y, s, x);

/** Where each sticker goes, per car. Police cars carry POLÍCIA on the sides: their stickers go on top. */
export const STICKER_LAYOUT: Record<string, Layout> = {
  viatura: {
    faixas: [top(-2.05, -1.15, 0.97, 1.02, 1.0), top(0.4, 0.8, 1.51, 1.51, 1.0), top(1.3, 2.2, 1.02, 1.0, 1.0)],
    brasao: [topSq(-1.78, 0.99, 0.46)], // on the blue hood panel
    numero: [top(0.4, 0.8, 1.51, 1.51, 1.1)],
    xadrez: [top(-2.08, -1.86, 0.97, 0.98, 1.5), top(1.95, 2.18, 1.0, 1.0, 1.5)],
  },
  esportivo: {
    faixas: [top(-2.2, -1.05, 0.71, 0.93, 1.1), top(-0.33, -0.1, 1.34, 1.34, 1.1), top(0.22, 0.52, 1.34, 1.34, 1.1)],
    brasao: [top(-2.15, -1.75, 0.72, 0.81, 0.42)],
    numero: [top(0.21, 0.53, 1.34, 1.34, 0.95)],
    xadrez: [top(-2.24, -2.06, 0.7, 0.74, 1.4), top(1.76, 1.96, 0.89, 0.89, 1.5)],
  },
  blazer: {
    faixas: [top(-2.2, -1.06, 0.84, 0.94, 1.0), top(0.66, 2.26, 1.49, 1.49, 1.0)],
    brasao: [topSq(-1.6, 0.9, 0.6)],
    numero: [top(0.8, 1.9, 1.49, 1.49, 1.2)],
    xadrez: [top(-2.22, -2.0, 0.84, 0.85, 1.5), top(2.0, 2.26, 1.49, 1.49, 1.5)],
  },
  // drawn 12% smaller in the game: the numbers are in its own (unscaled) size
  caveirao: {
    faixas: [top(-0.88, 0.16, 2.36, 2.36, 1.0), top(0.98, 2.3, 2.36, 2.36, 1.0)],
    brasao: [topSq(-0.45, 2.36, 0.7)],
    numero: [top(1.15, 2.15, 2.36, 2.36, 1.3)],
    xadrez: [top(2.02, 2.3, 2.36, 2.36, 1.7)],
  },
  // the Sedã already has a racing stripe on top: its stickers go on the sides
  seda: {
    faixas: [side(-2.2, 2.2, 0.82, 0.12, 0.945)],
    chamas: [side(-2.34, -0.92, 0.72, 0.44, 0.945)], // 3.2 : 1, like the art
    numero: [sideSq(0.15, 0.68, 0.42, 0.945)],
    caveira: [sideSq(0.88, 0.7, 0.4, 0.945)],
  },
  picape: {
    faixas: [side(-2.15, 2.2, 0.76, 0.1, 0.905)],
    chamas: [side(-2.24, -0.86, 0.73, 0.4, 0.905)],
    numero: [sideSq(-0.72, 0.68, 0.36, 0.905)],
    caveira: [top(-2.1, -1.2, 0.75, 0.91, 0.8)],
  },
  // drawn 15% bigger in the game: on the tank and the tail
  moto: {
    faixas: [side(-0.85, -0.35, 1.13, 0.07, 0.2)],
    chamas: [side(-0.95, -0.31, 1.13, 0.2, 0.2)],
    numero: [sideSq(0.95, 0.97, 0.2, 0.15)],
    caveira: [sideSq(-0.6, 1.13, 0.18, 0.2)],
  },
  van: {
    faixas: [side(-0.5, 2.38, 1.3, 0.16, 0.955)],
    chamas: [side(-1.1, 0.12, 0.85, 0.38, 0.955)], // from the front arch along the cab door, between the trim and the character line (playtest 2026-10-10)
    numero: [sideSq(1.55, 1.3, 0.45, 0.955)],
    caveira: [topSq(0.6, 1.76, 0.9)],
  },
  // V2 part 6 delivery 3. The Rocam is drawn 15% bigger, like the thief's moto: fairing, tank and tail
  rocam: {
    faixas: [side(-0.85, -0.35, 1.13, 0.07, 0.2)],
    brasao: [sideSq(-0.6, 1.13, 0.18, 0.2)],
    numero: [sideSq(0.95, 0.97, 0.2, 0.15)],
    xadrez: [side(-0.95, -0.55, 1.1, 0.12, 0.2)],
  },
  // a plain car with no POLÍCIA on the sides; its stickers still go on top like the other police cars
  descaracterizada: {
    faixas: [top(-2.2, -1.3, 0.77, 0.86, 1.0), top(-0.25, 0.8, 1.43, 1.43, 1.0), top(1.6, 2.2, 0.9, 0.88, 1.0)],
    brasao: [top(-2.0, -1.5, 0.79, 0.83, 0.5)],
    numero: [top(0.0, 0.75, 1.43, 1.43, 1.1)],
    xadrez: [top(-2.26, -2.04, 0.77, 0.78, 1.5), top(2.0, 2.24, 0.89, 0.88, 1.5)],
  },
  // Kombi: the stripe on the belt line under the white top, flames above the front arch, skull on the roof
  kombi: {
    faixas: [side(-2.0, 2.0, 1.02, 0.1, 0.915)],
    chamas: [side(-2.05, -1.09, 0.92, 0.3, 0.915)],
    numero: [sideSq(0.4, 0.8, 0.4, 0.915)],
    caveira: [topSq(0.3, 1.74, 0.9)],
  },
  // Fusca: on the doors between the fenders (they stand out of the narrow body), skull on the hood
  fusca: {
    faixas: [side(-0.85, 0.78, 0.8, 0.08, 0.715)],
    chamas: [side(-0.85, 0.3, 0.64, 0.36, 0.715)],
    numero: [sideSq(0.0, 0.64, 0.4, 0.715)],
    caveira: [top(-1.7, -1.2, 0.79, 0.91, 0.5)],
  },
};

// ---------- art ----------
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, n: number, onLight: boolean) => void;
const INK = '#111317';
const WHITE = '#f4f4f4';
/** directional art (front on the right edge of the texture) is mirrored on the left side */
const DIRECTIONAL = new Set(['chamas']);

const ART: Record<string, { size: [number, number]; draw: Draw }> = {
  // on top: two stripes along the car; on the side: one band
  faixas: {
    size: [256, 256],
    draw: (g, w, h, _n, onLight) => {
      g.fillStyle = onLight ? '#1b2a4a' : WHITE;
      g.fillRect(w * 0.14, 0, w * 0.2, h);
      g.fillRect(w * 0.66, 0, w * 0.2, h);
      g.fillStyle = onLight ? WHITE : INK;
      g.fillRect(w * 0.12, 0, w * 0.02, h);
      g.fillRect(w * 0.34, 0, w * 0.02, h);
      g.fillRect(w * 0.64, 0, w * 0.02, h);
      g.fillRect(w * 0.86, 0, w * 0.02, h);
    },
  },
  faixasLado: {
    size: [512, 64],
    draw: (g, w, h, _n, onLight) => {
      g.fillStyle = onLight ? WHITE : INK;
      g.fillRect(0, 0, w, h);
      g.fillStyle = onLight ? '#1b2a4a' : WHITE;
      g.fillRect(0, h * 0.18, w, h * 0.26);
      g.fillRect(0, h * 0.56, w, h * 0.26);
    },
  },
  chamas: {
    size: [512, 160],
    draw: (g, w, h) => {
      // 5 fat tongues from the front (right edge) licking backwards (left), back ones first
      const grad = g.createLinearGradient(w, 0, 0, 0);
      grad.addColorStop(0, '#ffe14a');
      grad.addColorStop(0.45, '#ff8a1a');
      grad.addColorStop(1, '#d4161c');
      g.fillStyle = grad;
      g.strokeStyle = INK;
      g.lineWidth = 5;
      const tongues: [number, number, number][] = [
        // [top, bottom, tip x] in fractions of the texture
        [0.0, 0.5, 0.32],
        [0.5, 1.0, 0.38],
        [0.25, 0.75, 0.12],
        [0.08, 0.46, 0.56],
        [0.54, 0.92, 0.6],
      ];
      for (const [t, b, tip] of tongues) {
        const mid = ((t + b) / 2) * h;
        const half = ((b - t) / 2) * h;
        g.beginPath();
        g.moveTo(w, t * h);
        // a fat flame: swells out, then curls to a point
        g.bezierCurveTo(w * (tip + 0.35), t * h - half * 0.5, w * (tip + 0.05), mid - half * 1.1, w * tip, mid - half * 0.15);
        g.bezierCurveTo(w * (tip + 0.12), mid + half * 0.5, w * (tip + 0.3), b * h + half * 0.3, w, b * h);
        g.closePath();
        g.fill();
        g.stroke();
      }
    },
  },
  numero: {
    size: [256, 256],
    draw: (g, w, h, n) => {
      g.fillStyle = INK;
      g.beginPath();
      g.roundRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92, w * 0.12);
      g.fill();
      g.fillStyle = WHITE;
      g.beginPath();
      g.roundRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8, w * 0.08);
      g.fill();
      g.fillStyle = INK;
      g.font = `900 ${Math.round(h * 0.62)}px Arial, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n).padStart(2, '0'), w / 2, h * 0.54, w * 0.74);
    },
  },
  caveira: {
    size: [256, 256],
    draw: (g, w, h) => {
      const cx = w / 2;
      const r = h * 0.32;
      g.fillStyle = WHITE;
      g.strokeStyle = INK;
      g.lineWidth = 8;
      g.beginPath();
      g.arc(cx, h * 0.42, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillRect(cx - r * 0.55, h * 0.62, r * 1.1, h * 0.24);
      g.strokeRect(cx - r * 0.55, h * 0.62, r * 1.1, h * 0.24);
      g.fillStyle = INK;
      for (const dx of [-0.42, 0.42]) {
        g.beginPath();
        g.arc(cx + dx * r, h * 0.44, r * 0.27, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.moveTo(cx, h * 0.52);
      g.lineTo(cx - r * 0.12, h * 0.6);
      g.lineTo(cx + r * 0.12, h * 0.6);
      g.fill();
      for (const dx of [-0.25, 0, 0.25]) g.fillRect(cx + dx * r - 3, h * 0.66, 6, h * 0.18);
    },
  },
  brasao: {
    size: [256, 256],
    draw: (g, w, h) => {
      const cx = w / 2;
      const shield = (s: number) => {
        g.beginPath();
        g.moveTo(cx - w * 0.38 * s, h * (0.5 - 0.42 * s));
        g.lineTo(cx + w * 0.38 * s, h * (0.5 - 0.42 * s));
        g.lineTo(cx + w * 0.38 * s, h * (0.5 + 0.02 * s));
        g.quadraticCurveTo(cx + w * 0.32 * s, h * (0.5 + 0.34 * s), cx, h * (0.5 + 0.46 * s));
        g.quadraticCurveTo(cx - w * 0.32 * s, h * (0.5 + 0.34 * s), cx - w * 0.38 * s, h * (0.5 + 0.02 * s));
        g.closePath();
      };
      g.fillStyle = '#d9b23a';
      shield(1);
      g.fill();
      g.fillStyle = '#1b2a4a';
      shield(0.8);
      g.fill();
      g.fillStyle = '#d9b23a';
      g.font = `900 ${Math.round(h * 0.42)}px Arial, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('★', cx, h * 0.48);
    },
  },
  xadrez: {
    size: [512, 64],
    draw: (g, w, h) => {
      const s = h / 2;
      for (let x = 0; x * s < w; x++)
        for (let y = 0; y < 2; y++) {
          g.fillStyle = (x + y) % 2 ? INK : WHITE;
          g.fillRect(x * s, y * s, s, s);
        }
    },
  },
};

function material(tex: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.3,
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

/** Sticker `kind` on the car `car` (its own layout); nothing without a canvas (tests) or a spot for it. */
export function addSticker(root: THREE.Object3D, car: string, kind: string, number: number, paint = 0x808080): void {
  // stripes in a colour that shows on the paint: dark on a light car, white on a dark one
  const light = new THREE.Color(paint).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
  const body = root.getObjectByName('body');
  const spots = STICKER_LAYOUT[car]?.[kind];
  if (!body || !spots) return;
  for (const spot of spots) {
    const art = ART[kind === 'faixas' && spot.at === 'side' ? 'faixasLado' : kind];
    if (!art) continue;
    const tex = canvasTex(art.size[0], art.size[1], (g) => art.draw(g, art.size[0], art.size[1], number, light));
    if (!tex) return;
    tex.userData.own = true;
    if (spot.at === 'top') {
      const len = Math.hypot(spot.z1 - spot.z0, spot.y1 - spot.y0);
      // lying flat, the top of the art towards the front (numbers read from behind, where the camera is)
      const geo = new THREE.PlaneGeometry(spot.w, len).rotateX(-Math.PI / 2);
      geo.userData.own = true;
      const m = new THREE.Mesh(geo, material(tex));
      m.name = 'sticker';
      m.rotation.x = -Math.atan2(spot.y1 - spot.y0, spot.z1 - spot.z0); // the front edge at y0, the back at y1
      m.position.set(0, (spot.y0 + spot.y1) / 2 + 0.006, (spot.z0 + spot.z1) / 2);
      body.add(m);
      continue;
    }
    const geo = new THREE.PlaneGeometry(spot.z1 - spot.z0, spot.h);
    geo.userData.own = true;
    for (const sd of [1, -1]) {
      let map = tex;
      if (sd < 0 && DIRECTIONAL.has(kind)) {
        // the left side sees the art from the other way: mirror it so the flames still start at the front
        map = tex.clone();
        map.userData.own = true;
        map.wrapS = THREE.RepeatWrapping;
        map.repeat.x = -1;
        map.offset.x = 1;
        map.needsUpdate = true;
      }
      const m = new THREE.Mesh(geo, material(map));
      m.name = 'sticker';
      m.rotation.y = (sd * Math.PI) / 2;
      m.position.set(sd * (spot.x + 0.006), spot.y, (spot.z0 + spot.z1) / 2);
      body.add(m);
    }
  }
}
