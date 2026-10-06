import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildingsForChunk } from './buildings';
import { createTrackFrame, type TrackFrame } from './trackFrame';
import { FACADE_TILE_METERS, GROUND_HALF_WIDTH, makeFacadeTexture, makeGroundTexture } from './textures';

export const CHUNK_LENGTH = 50; // m

/** Índices dos blocos que precisam existir em volta da câmera. */
export function visibleChunkRange(cameraS: number, ahead = 250, behind = 50): { first: number; last: number } {
  return {
    first: Math.floor((cameraS - behind) / CHUNK_LENGTH),
    last: Math.floor((cameraS + ahead) / CHUNK_LENGTH),
  };
}

/** Origem do render: s arredondado para baixo na grade dos blocos (coordenadas pequenas no GPU). */
export function renderOrigin(s: number): number {
  return Math.floor(s / CHUNK_LENGTH) * CHUNK_LENGTH;
}

const MAX_BUILDINGS_PER_CHUNK = 16;
const LAMPS_PER_CHUNK = 4;

interface Slot {
  index: number;
  group: THREE.Group;
  buildings: THREE.InstancedMesh;
  ground: THREE.Mesh;
  lamps: THREE.InstancedMesh;
}

const SEGMENT = 2; // m: o chão de cada bloco é dobrado pela pista em segmentos de 2 m

export function createRoad(
  scene: THREE.Scene,
  seed: number,
  frame: TrackFrame = createTrackFrame(seed, false),
): { update(cameraS: number): void } {
  const { first, last } = visibleChunkRange(0);
  const poolSize = last - first + 1;

  const groundMat = new THREE.MeshStandardMaterial({ map: makeGroundTexture(CHUNK_LENGTH), roughness: 0.92, metalness: 0 });
  // chão em grade (1 coluna × 25 segmentos), dobrado pela pista ao (re)ocupar o bloco: cada bloco tem a sua cópia
  const groundTemplate = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2, CHUNK_LENGTH, 1, CHUNK_LENGTH / SEGMENT);
  groundTemplate.rotateX(-Math.PI / 2);
  groundTemplate.translate(0, 0, -CHUNK_LENGTH / 2); // bloco cresce para -z (frente)
  const flat = Float32Array.from(groundTemplate.getAttribute('position').array as ArrayLike<number>);

  const buildingMat = new THREE.MeshStandardMaterial({ map: makeFacadeTexture(), roughness: 0.8, metalness: 0.05 });
  // UV em metros (a partir da escala da instância): janelas não esticam em prédios de tamanhos diferentes
  buildingMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
#ifdef USE_MAP
  vec3 scB = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 pmB = position * scB;
  vec3 anB = abs(normal);
  vec2 wuvB = anB.x > 0.5 ? vec2(pmB.z, pmB.y) : (anB.z > 0.5 ? vec2(pmB.x, pmB.y) : vec2(0.02));
  vMapUv = wuvB / vec2(${FACADE_TILE_METERS.width.toFixed(1)}, ${FACADE_TILE_METERS.height.toFixed(1)});
#endif`,
    );
  };
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  buildingGeo.translate(0, 0.5, 0);

  const pole = new THREE.BoxGeometry(0.2, 5, 0.2).translate(0, 2.5, 0);
  const arm = new THREE.BoxGeometry(1.4, 0.15, 0.2).translate(0.6, 5, 0);
  const head = new THREE.BoxGeometry(0.5, 0.2, 0.35).translate(1.2, 4.9, 0);
  const lampGeo = mergeGeometries([pole, arm, head])!;
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3d4046, roughness: 0.5, metalness: 0.6 });

  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  const slots: Slot[] = [];
  for (let i = 0; i < poolSize; i++) {
    const group = new THREE.Group();
    const ground = new THREE.Mesh(groundTemplate.clone(), groundMat);
    ground.name = 'ground';
    ground.receiveShadow = true;
    group.add(ground);

    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, LAMPS_PER_CHUNK);
    lamps.name = 'lamps';
    lamps.frustumCulled = false;
    lamps.castShadow = false; // postes finos: sombra quase invisível, custo de 7 draw calls
    group.add(lamps);

    const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, MAX_BUILDINGS_PER_CHUNK);
    buildings.frustumCulled = false;
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    group.add(buildings);
    scene.add(group);
    slots.push({ index: Number.NaN, group, buildings, ground, lamps });
  }

  /** posição no bloco (relativa ao início do bloco, na orientação do mundo) */
  const local = (start: number, ds: number, x: number) => frame.toWorld(start + ds, x, start);

  const fillBuildings = (slot: Slot, index: number) => {
    const start = index * CHUNK_LENGTH;
    // chão dobrado pela pista
    const pos = slot.ground.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const p = local(start, -flat[i + 2]!, flat[i]!);
      arr[i] = p.x;
      arr[i + 1] = flat[i + 1]!;
      arr[i + 2] = p.z;
    }
    pos.needsUpdate = true;
    slot.ground.geometry.computeBoundingSphere();
    // postes nas duas calçadas, girados com a pista
    let li = 0;
    for (const side of [-1, 1]) {
      for (const ds of [0, 25]) {
        const p = local(start, ds, side * 6.8);
        tmp.position.set(p.x, 0, p.z);
        tmp.rotation.set(0, (side < 0 ? 0 : Math.PI) - p.heading, 0);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        slot.lamps.setMatrixAt(li++, tmp.matrix);
      }
    }
    slot.lamps.instanceMatrix.needsUpdate = true;
    slot.group.name = `chunk-${index}`;

    const specs = buildingsForChunk(seed, index, CHUNK_LENGTH);
    for (let i = 0; i < MAX_BUILDINGS_PER_CHUNK; i++) {
      const b = specs[i];
      if (b) {
        const p = local(start, b.s, b.x);
        tmp.position.set(p.x, 0, p.z);
        tmp.rotation.set(0, -p.heading, 0);
        tmp.scale.set(b.depth, b.height, b.width);
        color.setHex(b.color);
      } else {
        tmp.position.set(0, -1000, 0);
        tmp.scale.set(0, 0, 0);
        color.setHex(0);
      }
      tmp.updateMatrix();
      slot.buildings.setMatrixAt(i, tmp.matrix);
      slot.buildings.setColorAt(i, color);
    }
    slot.buildings.instanceMatrix.needsUpdate = true;
    if (slot.buildings.instanceColor) slot.buildings.instanceColor.needsUpdate = true;
    slot.index = index;
  };

  return {
    update(cameraS: number) {
      const origin = renderOrigin(cameraS);
      const range = visibleChunkRange(cameraS);
      for (let k = range.first; k <= range.last; k++) {
        const slot = slots[((k % poolSize) + poolSize) % poolSize]!;
        if (slot.index !== k) fillBuildings(slot, k);
        const p = frame.toWorld(k * CHUNK_LENGTH, 0, origin);
        slot.group.position.set(p.x, 0, p.z);
      }
    },
  };
}
