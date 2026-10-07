// Things on the road that are not cars (V2 part 3): roadworks cones and their "Obras" sign.
import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import type { WorldState } from '../sim/types';
import { worksLaneX } from '../sim/works';
import { trackPos } from './trackFrame';

const MAX_WORKS = 8; // the list runs ~80 m behind to ~500 m ahead: up to 6 at chaos 5
const LANE_HALF = 1.5;
/** cones along both edges of the closed lane, every 6 m, plus a diagonal taper at the entry */
const ALONG = 11;
const TAPER = 4;
export const CONES_PER_WORKS = ALONG * 2 + TAPER;

function signTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.translate(64, 64);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#ff8a1a';
    g.fillRect(-42, -42, 84, 84);
    g.strokeStyle = '#1a1a1a';
    g.lineWidth = 5;
    g.strokeRect(-38, -38, 76, 76);
    g.rotate(-Math.PI / 4);
    g.fillStyle = '#1a1a1a';
    g.font = 'bold 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('OBRAS', 0, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorksView(scene: THREE.Scene): { update(w: WorldState, originS: number): void } {
  const coneGeo = new THREE.ConeGeometry(0.28, 0.75, 10);
  coneGeo.translate(0, 0.375, 0);
  const cones = new THREE.InstancedMesh(
    coneGeo,
    new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.6 }),
    MAX_WORKS * CONES_PER_WORKS,
  );
  cones.name = 'works-cones';
  cones.count = 0;
  cones.frustumCulled = false;
  scene.add(cones);
  const hasCanvas = typeof document !== 'undefined';
  const signMat = new THREE.MeshBasicMaterial({ map: hasCanvas ? signTexture() : null, transparent: true });
  const signs = Array.from({ length: MAX_WORKS }, (_, i) => {
    const g = new THREE.Group();
    g.name = `works-sign-${i}`;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), signMat);
    board.position.y = 2.1;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a8f99 }));
    pole.position.y = 0.8;
    g.add(board, pole);
    g.visible = false;
    scene.add(g);
    return g;
  });
  const m = new THREE.Matrix4();
  return {
    update(w, originS) {
      let n = 0;
      const place = (s: number, x: number) => {
        const p = trackPos(s, x, originS);
        m.makeRotationY(-p.heading).setPosition(p.x, 0, p.z);
        cones.setMatrixAt(n++, m);
      };
      const list = w.works.slice(0, MAX_WORKS);
      list.forEach((wk) => {
        const x = worksLaneX(wk);
        for (let k = 0; k < ALONG; k++) {
          const s = wk.s + (k * wk.length) / (ALONG - 1);
          place(s, x - LANE_HALF + 0.3);
          place(s, x + LANE_HALF - 0.3);
        }
        // entry taper: from the lane edge towards its middle, before the closed stretch
        for (let k = 0; k < TAPER; k++) place(wk.s - 12 + k * 3, x + (k / (TAPER - 1) - 0.5) * 2 * (LANE_HALF - 0.4));
      });
      cones.count = n;
      cones.instanceMatrix.needsUpdate = true;
      signs.forEach((g, i) => {
        const wk = list[i];
        g.visible = !!wk;
        if (!wk) return;
        const side = worksLaneX(wk) >= 0 ? 1 : -1;
        const p = trackPos(wk.s - BALANCE.survival.worksSign, side * (BALANCE.road.halfWidth + 0.8), originS);
        g.position.set(p.x, 0, p.z);
        g.rotation.y = -p.heading;
      });
    },
  };
}
