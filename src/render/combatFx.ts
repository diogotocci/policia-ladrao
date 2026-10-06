// Combat effects with fixed pools: shot tracers, sparks on hits and camera shake on impacts.
import * as THREE from 'three';
import type { GameEvent, WorldState } from '../sim/types';
import { HELI_Y } from './heli';
import { trackPos } from './trackFrame';

const TRACERS = 32;
const SPARKS = 64;
const SPARK_LIFE = 0.3; // s
const SHAKE_TIME = 0.2; // s
const SHAKE_AMP = 0.15; // m
const TRACER_LEN = 2.2; // m
const TRACER_Y = 0.9; // shot height

/** round dot: without it each spark becomes a huge square when passing near the camera */
function dotTexture(): THREE.DataTexture {
  const N = 16;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot((x + 0.5) / N - 0.5, (y + 0.5) / N - 0.5) * 2;
      data.set([255, 255, 255, d <= 1 ? Math.round(255 * (1 - d * d)) : 0], (y * N + x) * 4);
    }
  const t = new THREE.DataTexture(data, N, N);
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** tracer height: from the helicopter (air = distance to the target) descends to car height */
export function tracerHeight(travelled: number, air?: number): number {
  if (!air) return TRACER_Y;
  return TRACER_Y + (HELI_Y - TRACER_Y) * Math.max(0, 1 - travelled / air);
}

export function createCombatFx(scene: THREE.Scene): {
  update(w: WorldState, events: GameEvent[], originS: number, dt: number): void;
  activeSparks(): number;
  /** a few sparks coming off a heavily damaged car */
  sparkAt(s: number, x: number): void;
  /** camera offset of the current shake (zero when still) */
  shake(): THREE.Vector3;
} {
  // tracers: a single InstancedMesh (1 draw call), color per instance
  const tracerGeo = new THREE.CylinderGeometry(0.05, 0.05, TRACER_LEN, 6).rotateX(Math.PI / 2);
  const tracers = new THREE.InstancedMesh(tracerGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), TRACERS);
  tracers.name = 'tracers';
  tracers.count = 0;
  tracers.frustumCulled = false;
  const colors = { police: new THREE.Color(0xffe07a), thief: new THREE.Color(0xff8a3d) };
  for (let i = 0; i < TRACERS; i++) tracers.setColorAt(i, colors.police);
  scene.add(tracers);
  const tmp = new THREE.Object3D();

  // sparks (positions in track coordinates: s, y, x)
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkWorld = new Float32Array(SPARKS * 3); // s, y, x
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: 0xffc860,
      size: 0.1,
      map: dotTexture(),
      alphaTest: 0.5,
      toneMapped: false,
      transparent: true,
      depthWrite: false,
    }),
  );
  sparks.name = 'sparks';
  sparks.frustumCulled = false;
  scene.add(sparks);
  let nextSpark = 0;
  let seed = 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const burst = (s: number, x: number, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const k = nextSpark;
      nextSpark = (nextSpark + 1) % SPARKS;
      sparkWorld.set([s, TRACER_Y, x], k * 3);
      sparkVel.set([(rand() - 0.5) * speed, rand() * speed, (rand() - 0.5) * speed], k * 3);
      sparkLife[k] = SPARK_LIFE;
    }
  };

  let shakeLeft = 0;
  const shakeVec = new THREE.Vector3();
  const dir = new THREE.Vector3();

  return {
    update(w, events, originS, dt) {
      // tracers
      const n = w.match.over ? 0 : Math.min(TRACERS, w.projectiles.length);
      for (let i = 0; i < n; i++) {
        const p = w.projectiles[i]!;
        // tracer direction in the world: from where it is to where it will be (follows the curve)
        const a = trackPos(p.s, p.x, originS);
        const b = trackPos(p.s + p.vs * 0.01, p.x + p.vx * 0.01, originS);
        // helicopter shot: descends diagonally from above to the target height
        const ya = tracerHeight(p.travelled, p.air);
        const yb = tracerHeight(p.travelled + Math.hypot(p.vs, p.vx) * 0.01, p.air);
        tmp.position.set(a.x, ya, a.z);
        dir.set(b.x - a.x, yb - ya, b.z - a.z).normalize();
        tmp.lookAt(tmp.position.x + dir.x, tmp.position.y + dir.y, tmp.position.z + dir.z);
        tmp.updateMatrix();
        tracers.setMatrixAt(i, tmp.matrix);
        tracers.setColorAt(i, colors[p.from]);
      }
      tracers.count = n;
      tracers.visible = n > 0;
      tracers.instanceMatrix.needsUpdate = true;
      if (tracers.instanceColor) tracers.instanceColor.needsUpdate = true;

      // events
      for (const e of events) {
        if (e.type === 'hit') burst(e.s, e.x, 10, 6);
        else if (e.type === 'crash') {
          burst(e.s, e.x, 18, 9);
          shakeLeft = SHAKE_TIME;
        }
      }

      // sparks
      for (let k = 0; k < SPARKS; k++) {
        if (sparkLife[k]! > 0) {
          sparkLife[k] = Math.max(0, sparkLife[k]! - dt);
          sparkWorld[k * 3] = sparkWorld[k * 3]! + sparkVel[k * 3]! * dt;
          sparkWorld[k * 3 + 1] = Math.max(0.02, sparkWorld[k * 3 + 1]! + sparkVel[k * 3 + 1]! * dt);
          sparkWorld[k * 3 + 2] = sparkWorld[k * 3 + 2]! + sparkVel[k * 3 + 2]! * dt;
          sparkVel[k * 3 + 1] = sparkVel[k * 3 + 1]! - 20 * dt; // gravity
        }
        const alive = sparkLife[k]! > 0;
        const sp = alive ? trackPos(sparkWorld[k * 3]!, sparkWorld[k * 3 + 2]!, originS) : undefined;
        sparkPos[k * 3] = sp ? sp.x : 0;
        sparkPos[k * 3 + 1] = alive ? sparkWorld[k * 3 + 1]! : -1000;
        sparkPos[k * 3 + 2] = sp ? sp.z : 0;
      }
      sparkGeo.attributes.position!.needsUpdate = true;

      // shake
      shakeLeft = Math.max(0, shakeLeft - dt);
      if (shakeLeft > 0) {
        const a = SHAKE_AMP * (shakeLeft / SHAKE_TIME);
        shakeVec.set((rand() - 0.5) * 2 * a, (rand() - 0.5) * 2 * a, 0);
      } else shakeVec.set(0, 0, 0);
    },
    sparkAt(s, x) {
      burst(s, x, 4, 4);
    },
    activeSparks() {
      let n = 0;
      for (let k = 0; k < SPARKS; k++) if (sparkLife[k]! > 0) n++;
      return n;
    },
    shake() {
      return shakeVec;
    },
  };
}
