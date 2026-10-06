// Opponent marker: floating arrow of fixed on-screen size, drawn on top of everything (no fog),
// to find the other car from afar. Hidden when it is close (≤ 15 m).
import * as THREE from 'three';
import { trackPos } from './trackFrame';
import type { Role } from '../config/balance';
import type { CarState } from '../sim/car';

const SHOW_FROM = 15; // m
const HEIGHT = 2.6; // m above the ground
const COLORS: Record<Role, number> = { thief: 0xff3b3b, police: 0x4d8bff };

let markerTex: THREE.DataTexture | undefined;
/** downward arrow (white, with dark outline), generated in code */
function markerTexture(): THREE.DataTexture {
  if (markerTex) return markerTex;
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  const inside = (x: number, y: number, grow: number) => {
    // triangle pointing down: top at y=0.15, tip at y=0.85 (coords 0..1, y down)
    const top = 0.15 - grow;
    const tip = 0.85 + grow;
    if (y < top || y > tip) return false;
    const half = (0.36 + grow) * (1 - (y - top) / (tip - top));
    return Math.abs(x - 0.5) <= half;
  };
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N;
      const y = 1 - (j + 0.5) / N; // DataTexture origin is at the bottom
      const core = inside(x, y, 0);
      const edge = !core && inside(x, y, 0.06);
      const v = core ? 255 : 20;
      data.set([v, v, v, core || edge ? 255 : 0], (j * N + i) * 4);
    }
  }
  markerTex = new THREE.DataTexture(data, N, N);
  markerTex.magFilter = THREE.LinearFilter;
  markerTex.minFilter = THREE.LinearFilter;
  markerTex.needsUpdate = true;
  return markerTex;
}

export function createOpponentMarker(
  scene: THREE.Scene,
  opponentRole: Role,
): { update(foe: CarState, distance: number, originS: number): void; setVisible(v: boolean): void } {
  const mat = new THREE.SpriteMaterial({
    map: markerTexture(),
    color: COLORS[opponentRole],
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.name = 'opponent-marker';
  sprite.scale.set(0.045, 0.045, 1);
  sprite.renderOrder = 10;
  sprite.visible = false;
  scene.add(sprite);
  return {
    update(foe, distance, originS) {
      sprite.visible = distance > SHOW_FROM;
      const p = trackPos(foe.s, foe.x, originS);
      sprite.position.set(p.x, HEIGHT, p.z);
    },
    setVisible(v) {
      sprite.visible = v;
    },
  };
}
