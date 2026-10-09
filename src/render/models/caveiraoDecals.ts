// Caveirão decals drawn on canvases: the POLÍCIA word, the skull badge and the hazard stripes.
import * as THREE from 'three';

/** A canvas texture with white letters (and optional badge), transparent background. */
function decal(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** "POLÍCIA": the accent is drawn by hand (fallback fonts place it badly) over the 5th letter. */
export const word = (size: number) =>
  decal(
    (g, w, h) => {
      g.fillStyle = '#f2f2f2';
      g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      const text = 'POLICIA';
      const x0 = (w - g.measureText(text).width) / 2;
      const y = h / 2 + 12;
      g.fillText(text, x0, y);
      const before = g.measureText('POL').width;
      const iw = g.measureText('I').width;
      const cx = x0 + before + iw / 2;
      const top = y - size * 0.42;
      g.beginPath();
      g.moveTo(cx - size * 0.06, top - size * 0.08);
      g.lineTo(cx + size * 0.12, top - size * 0.26);
      g.lineTo(cx + size * 0.2, top - size * 0.18);
      g.lineTo(cx + size * 0.02, top - size * 0.02);
      g.fill();
    },
    512,
    128,
  );

/** Generic round skull badge (not any real unit's emblem). */
export const badge = () =>
  decal(
    (g, w) => {
      const c = w / 2;
      g.fillStyle = '#f2f2f2';
      g.beginPath();
      g.arc(c, c, c - 4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1e2126';
      g.beginPath();
      g.arc(c, c, c - 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f2f2f2';
      g.beginPath();
      g.arc(c, c - 8, 34, 0, Math.PI * 2); // cranium
      g.fill();
      g.fillRect(c - 22, c + 14, 44, 22); // jaw
      g.fillStyle = '#1e2126';
      g.beginPath();
      g.arc(c - 13, c - 6, 10, 0, Math.PI * 2);
      g.arc(c + 13, c - 6, 10, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(c, c + 4);
      g.lineTo(c - 5, c + 13);
      g.lineTo(c + 5, c + 13);
      g.fill();
      for (let i = -1; i <= 1; i++) g.fillRect(c + i * 11 - 1.5, c + 22, 3, 14); // teeth
    },
    128,
    128,
  );

export const hazardStripes = () =>
  decal(
    (g, w, h) => {
      g.fillStyle = '#f2f2f2';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#111215';
      for (let x = -h; x < w + h; x += 48) {
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 24, h);
        g.lineTo(x + 24 + h, 0);
        g.lineTo(x + h, 0);
        g.fill();
      }
    },
    512,
    64,
  );

export function decalMesh(tex: THREE.Texture | null, w: number, h: number, name: string, transparent = true) {
  const mat = tex
    ? new THREE.MeshStandardMaterial({ map: tex, transparent, alphaTest: transparent ? 0.3 : 0, roughness: 0.6 })
    : new THREE.MeshStandardMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.name = name;
  m.receiveShadow = true;
  return m;
}
