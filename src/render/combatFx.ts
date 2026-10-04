// Efeitos de combate com pools fixos: traçadores dos tiros, faíscas nos acertos e tremor de câmera nas batidas.
import * as THREE from 'three';
import type { GameEvent, WorldState } from '../sim/types';

const TRACERS = 32;
const SPARKS = 64;
const SPARK_LIFE = 0.3; // s
const SHAKE_TIME = 0.2; // s
const SHAKE_AMP = 0.15; // m
const TRACER_LEN = 2.2; // m
const TRACER_Y = 0.9; // altura dos tiros

/** ponto redondo: sem isso cada faísca vira um quadrado enorme quando passa perto da câmera */
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

export function createCombatFx(scene: THREE.Scene): {
  update(w: WorldState, events: GameEvent[], originS: number, dt: number): void;
  activeSparks(): number;
  /** algumas faíscas saindo de um carro muito danificado */
  sparkAt(s: number, x: number): void;
  /** deslocamento de câmera do tremor atual (zero quando parado) */
  shake(): THREE.Vector3;
} {
  // traçadores: um InstancedMesh só (1 draw call), cor por instância
  const tracerGeo = new THREE.CylinderGeometry(0.05, 0.05, TRACER_LEN, 6).rotateX(Math.PI / 2);
  const tracers = new THREE.InstancedMesh(tracerGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), TRACERS);
  tracers.name = 'tracers';
  tracers.count = 0;
  tracers.frustumCulled = false;
  const colors = { police: new THREE.Color(0xffe07a), thief: new THREE.Color(0xff8a3d) };
  for (let i = 0; i < TRACERS; i++) tracers.setColorAt(i, colors.police);
  scene.add(tracers);
  const tmp = new THREE.Object3D();

  // faíscas (posições em coordenadas de pista: s, y, x)
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkWorld = new Float32Array(SPARKS * 3); // s, y, x
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ color: 0xffc860, size: 0.1, map: dotTexture(), alphaTest: 0.5, toneMapped: false, transparent: true, depthWrite: false }),
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
      // traçadores
      const n = w.match.over ? 0 : Math.min(TRACERS, w.projectiles.length);
      for (let i = 0; i < n; i++) {
        const p = w.projectiles[i]!;
        tmp.position.set(p.x, TRACER_Y, -(p.s - originS));
        dir.set(p.vx, 0, -p.vs).normalize();
        tmp.lookAt(tmp.position.x + dir.x, tmp.position.y, tmp.position.z + dir.z);
        tmp.updateMatrix();
        tracers.setMatrixAt(i, tmp.matrix);
        tracers.setColorAt(i, colors[p.from]);
      }
      tracers.count = n;
      tracers.visible = n > 0;
      tracers.instanceMatrix.needsUpdate = true;
      if (tracers.instanceColor) tracers.instanceColor.needsUpdate = true;

      // eventos
      for (const e of events) {
        if (e.type === 'hit') burst(e.s, e.x, 10, 6);
        else if (e.type === 'crash') {
          burst(e.s, e.x, 18, 9);
          shakeLeft = SHAKE_TIME;
        }
      }

      // faíscas
      for (let k = 0; k < SPARKS; k++) {
        if (sparkLife[k]! > 0) {
          sparkLife[k] = Math.max(0, sparkLife[k]! - dt);
          sparkWorld[k * 3] = sparkWorld[k * 3]! + sparkVel[k * 3]! * dt;
          sparkWorld[k * 3 + 1] = Math.max(0.02, sparkWorld[k * 3 + 1]! + sparkVel[k * 3 + 1]! * dt);
          sparkWorld[k * 3 + 2] = sparkWorld[k * 3 + 2]! + sparkVel[k * 3 + 2]! * dt;
          sparkVel[k * 3 + 1] = sparkVel[k * 3 + 1]! - 20 * dt; // gravidade
        }
        const alive = sparkLife[k]! > 0;
        sparkPos[k * 3] = alive ? sparkWorld[k * 3 + 2]! : 0;
        sparkPos[k * 3 + 1] = alive ? sparkWorld[k * 3 + 1]! : -1000;
        sparkPos[k * 3 + 2] = alive ? -(sparkWorld[k * 3]! - originS) : 0;
      }
      sparkGeo.attributes.position!.needsUpdate = true;

      // tremor
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
