// Police helicopter ("Helicóptero" item): appears above and ahead of the patrol car while it lasts
// and, when it ends, leaves by climbing away (no blinking). Low-poly: body (1 mesh) + rotor (1 mesh) + ground shadow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';
import type { CarState } from '../sim/car';
import { trackPos } from './trackFrame';

export const HELI_Y = 5.5; // m above the road
export const HELI_EXIT = 1.6; // s leaving
const ARRIVE = 0.8; // s descending
const BEHIND = -16; // m: slightly ahead of the patrol car, to show up in the rear camera
const SIDE = 2; // m to the right

export interface HeliPose {
  visible: boolean;
  height: number;
  /** meters behind the patrol car (negative = ahead) */
  behind: number;
}

/** since: when it arrived (picking up another helicopter while it is airborne only extends the time, it does not replay the arrival) */
export function heliPose(time: number, until: number, since?: number): HeliPose {
  const start = Math.min(until - BALANCE.items.police.heliTime, since ?? Infinity);
  const off: HeliPose = { visible: false, height: HELI_Y, behind: BEHIND };
  if (until <= 0 || time < start || time > until + HELI_EXIT) return off;
  if (time >= until) {
    const e = (time - until) / HELI_EXIT;
    return { visible: true, height: HELI_Y + 22 * e * e, behind: BEHIND - 40 * e };
  }
  const k = Math.min(1, (time - start) / ARRIVE);
  const height = HELI_Y + 16 * (1 - k) * (1 - k);
  return { visible: true, height, behind: BEHIND }; // no blinking (playtest): at the end it just leaves
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, hex: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed();
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

export function createHeli(scene: THREE.Scene): {
  update(police: CarState, time: number, originS: number, dt: number): void;
  group: THREE.Group;
} {
  const BLUE = 0x1d2f5c;
  const WHITE = 0xe8ecf2;
  const GLASS = 0x2a3a4a;
  const DARK = 0x1a1b1e;
  const bodyGeo = mergeGeometries([
    box(1.5, 1.3, 2.6, 0, 0, 0, BLUE), // cabin
    box(1.3, 0.8, 1.0, 0, 0.1, -1.6, GLASS), // front glass (−z)
    box(1.52, 0.25, 2.62, 0, -0.35, 0, WHITE), // stripe
    box(0.35, 0.35, 3.2, 0, 0.2, 2.9, BLUE), // tail
    box(0.12, 0.9, 0.5, 0, 0.6, 4.4, BLUE), // fin
    box(0.1, 0.1, 2.6, -0.6, -0.95, 0, DARK), // skids
    box(0.1, 0.1, 2.6, 0.6, -0.95, 0, DARK),
    box(0.25, 0.35, 0.25, 0, 0.8, 0, DARK), // rotor mast
  ])!;
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }));
  body.name = 'heli-body';
  const rotor = new THREE.Mesh(
    mergeGeometries([new THREE.BoxGeometry(7, 0.05, 0.28), new THREE.BoxGeometry(0.28, 0.05, 7)])!,
    new THREE.MeshBasicMaterial({ color: 0x15161a, transparent: true, opacity: 0.75 }),
  );
  rotor.name = 'heli-rotor';
  rotor.position.y = 1.0;
  const group = new THREE.Group();
  group.name = 'heli';
  group.scale.setScalar(1.5);
  group.add(body, rotor);
  group.visible = false;
  // shadow: a dark circle on the ground (the sun's would fall outside the shadow box)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.name = 'heli-shadow';
  shadow.visible = false;
  scene.add(group, shadow);

  let since: number | undefined;
  let lastUntil = -Infinity;
  return {
    group,
    update(police, time, originS, dt) {
      const until = police.upgrades.heliUntil;
      // new helicopter (the previous one had already left): new arrival; with it airborne, only extends the time
      if (until !== lastUntil) {
        if (time > lastUntil + HELI_EXIT) since = until - BALANCE.items.police.heliTime;
        lastUntil = until;
      }
      const pose = heliPose(time, until, since);
      group.visible = pose.visible;
      shadow.visible = pose.visible;
      if (!pose.visible) return;
      const p = trackPos(police.s - pose.behind, police.x + SIDE, originS);
      group.position.set(p.x, pose.height, p.z);
      group.rotation.set(0.12, -p.heading, Math.sin(time * 1.7) * 0.05); // nose slightly down, swaying
      rotor.rotation.y += dt * 38;
      shadow.position.set(p.x, 0.04, p.z);
      const fade = Math.max(0, 1 - (pose.height - HELI_Y) / 20);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.28 * fade;
    },
  };
}
