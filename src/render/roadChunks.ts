import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LOOPS, segmentAt, segmentStart, type MapId, type Segment } from '../meta/maps';
import { DECOR_GEOMETRY, DECOR_MAX, makeBillboardTexture } from './mapDecor';
import { SEGMENT_LOOKS, buildingsFor, decorFor, type DecorKind, type Facade, type Outer, type Street } from './mapThemes';
import { createTrackFrame, type TrackFrame } from './trackFrame';
import {
  FACADE_TILE_METERS,
  GROUND_HALF_WIDTH,
  OUTER_HALF_WIDTH,
  makeFacadeTexture,
  makeGroundTexture,
  makeOuterTexture,
} from './textures';

export const CHUNK_LENGTH = 50; // m

/** Indices of the chunks that must exist around the camera. */
export function visibleChunkRange(cameraS: number, ahead = 250, behind = 50): { first: number; last: number } {
  return {
    first: Math.floor((cameraS - behind) / CHUNK_LENGTH),
    last: Math.floor((cameraS + ahead) / CHUNK_LENGTH),
  };
}

/** Render origin: s rounded down to the chunk grid (small coordinates on the GPU). */
export function renderOrigin(s: number): number {
  return Math.floor(s / CHUNK_LENGTH) * CHUNK_LENGTH;
}

const MAX_BUILDINGS_PER_CHUNK = 16;
/** prop kinds each segment can use (the meshes are made only for the map's own kinds) */
const DECOR_FOR: Record<Segment, readonly DecorKind[]> = {
  city: [],
  'paris-avenue': ['mansard', 'tree'],
  'paris-park': ['mansard', 'tree', 'hedge', 'railing'],
  rio: ['palm', 'umbrella'],
  'ny-brooklyn': ['waterTower', 'tree'],
  'ny-times': ['billboard'],
  'ny-park': ['wall', 'tree', 'rock'],
  'ny-bridge': ['railing', 'suspender', 'bridgeTower'],
};
const LAMPS_PER_CHUNK = 4;

interface Slot {
  index: number;
  group: THREE.Group;
  buildings: THREE.InstancedMesh;
  ground: THREE.Mesh;
  lamps: THREE.InstancedMesh;
  /** maps: the wide ground beyond the sidewalks (beach, grass, river) */
  outer: THREE.Mesh | null;
  /** maps: the chunk's props (matrices relative to the chunk), drawn by one shared mesh per kind */
  decor: { kind: DecorKind; matrix: THREE.Matrix4; color: number }[];
}

const SEGMENT = 2; // m: each chunk's ground is bent by the road in 2 m segments

export function createRoad(
  scene: THREE.Scene,
  seed: number,
  frame: TrackFrame = createTrackFrame(seed, false),
  map: MapId = 'city',
  /** debug only (?lap=N): the scenery starts N m into the loop, to look at a later stretch right away */
  lapOffset = 0,
): { update(cameraS: number): void } {
  const { first, last } = visibleChunkRange(0);
  const poolSize = last - first + 1;
  const looks = LOOPS[map].map(([seg]) => SEGMENT_LOOKS[seg]);

  const groundMats = new Map<Street, THREE.MeshStandardMaterial>();
  for (const look of looks)
    if (!groundMats.has(look.street))
      groundMats.set(
        look.street,
        new THREE.MeshStandardMaterial({ map: makeGroundTexture(CHUNK_LENGTH, look.street), roughness: 0.92, metalness: 0 }),
      );
  const groundMat = groundMats.get(looks[0]!.street)!;
  // gridded ground (1 column × 25 segments), bent by the road when the chunk is (re)occupied: each chunk has its own copy
  const groundTemplate = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2, CHUNK_LENGTH, 1, CHUNK_LENGTH / SEGMENT);
  groundTemplate.rotateX(-Math.PI / 2);
  groundTemplate.translate(0, 0, -CHUNK_LENGTH / 2); // chunk grows toward -z (front)
  const flat = Float32Array.from(groundTemplate.getAttribute('position').array as ArrayLike<number>);

  // UV in meters (from the instance scale): windows do not stretch on buildings of different sizes
  const meterUv = (shader: THREE.WebGLProgramParametersWithUniforms) => {
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
  const facadeMat = (style: Facade) => {
    const tex = makeFacadeTexture(style);
    // Times Square at dusk: the lit windows glow
    const m =
      style === 'night'
        ? new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            emissive: 0xffffff,
            emissiveIntensity: 0.55,
            roughness: 0.8,
            metalness: 0.05,
          })
        : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.05 });
    m.onBeforeCompile = meterUv;
    m.customProgramCacheKey = () => `facade-${style}`;
    return m;
  };
  const facadeMats = new Map<Facade, THREE.MeshStandardMaterial>();
  for (const look of looks) if (look.facade && !facadeMats.has(look.facade)) facadeMats.set(look.facade, facadeMat(look.facade));
  const buildingMat = facadeMats.get(looks.find((l) => l.facade)?.facade ?? 'city') ?? facadeMat('city');
  const outerMats = new Map<Outer, THREE.MeshStandardMaterial>();
  for (const look of looks)
    if (look.outer && !outerMats.has(look.outer))
      outerMats.set(
        look.outer,
        new THREE.MeshStandardMaterial({ map: makeOuterTexture(look.outer), roughness: look.outer === 'river' ? 0.35 : 0.95 }),
      );
  const decorKinds = new Set<DecorKind>();
  for (const [seg] of LOOPS[map]) for (const k of DECOR_FOR[seg]) decorKinds.add(k);
  const decorMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  const billboardMat = decorKinds.has('billboard') ? new THREE.MeshBasicMaterial({ map: makeBillboardTexture() }) : decorMat;
  const decorGeo = new Map<DecorKind, THREE.BufferGeometry>();
  for (const k of decorKinds) decorGeo.set(k, DECOR_GEOMETRY[k]());
  const OUTER_SEGMENTS = CHUNK_LENGTH / SEGMENT;
  const outerTemplate = new THREE.PlaneGeometry(OUTER_HALF_WIDTH * 2, CHUNK_LENGTH, 4, OUTER_SEGMENTS);
  outerTemplate.rotateX(-Math.PI / 2);
  outerTemplate.translate(0, -0.04, -CHUNK_LENGTH / 2); // just under the street
  const outerFlat = Float32Array.from(outerTemplate.getAttribute('position').array as ArrayLike<number>);
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
    lamps.castShadow = false; // thin poles: shadow almost invisible, costs 7 draw calls
    group.add(lamps);

    const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, MAX_BUILDINGS_PER_CHUNK);
    buildings.frustumCulled = false;
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    group.add(buildings);
    let outer: THREE.Mesh | null = null;
    if (outerMats.size) {
      outer = new THREE.Mesh(outerTemplate.clone(), [...outerMats.values()][0]!);
      outer.name = 'outer';
      outer.receiveShadow = true;
      outer.frustumCulled = false;
      group.add(outer);
    }
    const decor: Slot['decor'] = [];
    scene.add(group);
    slots.push({ index: Number.NaN, group, buildings, ground, lamps, outer, decor });
  }
  // the props: one instanced mesh per kind for all chunks (a few draw calls, not one per kind and chunk). Their
  // matrices are relative to the render origin and rebuilt when a chunk is refilled or the origin moves (every 50 m).
  const decorMeshes = new Map<DecorKind, THREE.InstancedMesh>();
  for (const [k, geo] of decorGeo) {
    const m = new THREE.InstancedMesh(geo, k === 'billboard' ? billboardMat : decorMat, DECOR_MAX[k] * poolSize);
    m.name = `decor-${k}`;
    m.frustumCulled = false;
    m.castShadow = k === 'tree' || k === 'palm' || k === 'bridgeTower';
    m.setColorAt(0, color.set(0xffffff)); // creates the colour buffer: every kind takes a tint
    m.count = 0;
    scene.add(m);
    decorMeshes.set(k, m);
  }
  const placed = new THREE.Matrix4();
  const shift = new THREE.Matrix4();
  const layoutDecor = () => {
    for (const m of decorMeshes.values()) m.count = 0;
    for (const slot of slots) {
      if (Number.isNaN(slot.index)) continue;
      shift.makeTranslation(slot.group.position.x, 0, slot.group.position.z);
      for (const d of slot.decor) {
        const m = decorMeshes.get(d.kind);
        if (!m || m.count >= m.instanceMatrix.count) continue;
        m.setMatrixAt(m.count, placed.multiplyMatrices(shift, d.matrix));
        m.setColorAt(m.count, color.setHex(d.color));
        m.count++;
      }
    }
    for (const m of decorMeshes.values()) {
      m.visible = m.count > 0; // an empty instanced mesh still costs a draw call per pass
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  };
  let laidOrigin = Number.NaN;

  // Shader warm-up (warmup.ts compiles hidden objects too): one hidden user of each look the map can switch to, so
  // reaching the next segment never compiles a shader mid-match.
  if (looks.length > 1) {
    const bank = new THREE.Group();
    bank.name = 'map-material-bank';
    bank.visible = false;
    for (const m of facadeMats.values()) {
      const im = new THREE.InstancedMesh(buildingGeo, m, 1);
      im.setColorAt(0, color.set(0xffffff)); // same shader variant as the chunk buildings (they have instance colours)
      bank.add(im);
    }
    for (const m of groundMats.values()) bank.add(new THREE.Mesh(groundTemplate, m));
    for (const m of outerMats.values()) bank.add(new THREE.Mesh(outerTemplate, m));
    scene.add(bank);
  }

  /** position in the chunk (relative to the chunk start, in world orientation) */
  const local = (start: number, ds: number, x: number) => frame.toWorld(start + ds, x, start);

  const fillBuildings = (slot: Slot, index: number) => {
    const start = index * CHUNK_LENGTH;
    const segment = segmentAt(map, start + lapOffset);
    const look = SEGMENT_LOOKS[segment];
    slot.ground.material = groundMats.get(look.street) ?? groundMat;
    slot.lamps.visible = look.lamps;
    slot.buildings.material = (look.facade && facadeMats.get(look.facade)) || buildingMat;
    if (slot.outer) {
      slot.outer.visible = look.outer !== null;
      if (look.outer) {
        slot.outer.material = outerMats.get(look.outer)!;
        const op = slot.outer.geometry.getAttribute('position') as THREE.BufferAttribute;
        const oa = op.array as Float32Array;
        for (let i = 0; i < oa.length; i += 3) {
          const p = local(start, -outerFlat[i + 2]!, outerFlat[i]!);
          oa[i] = p.x;
          oa[i + 1] = outerFlat[i + 1]!;
          oa[i + 2] = p.z;
        }
        op.needsUpdate = true;
      }
    }
    // ground bent by the road
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
    // poles on both sidewalks, rotated with the road
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

    const specs = buildingsFor(look, seed, index, CHUNK_LENGTH);
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
    // props of the segment
    slot.decor.length = 0;
    if (decorMeshes.size) {
      const counts = new Map<DecorKind, number>();
      for (const d of decorFor(segment, seed, index, CHUNK_LENGTH, specs, segmentStart(map, start + lapOffset) - lapOffset, start)) {
        const n = counts.get(d.kind) ?? 0;
        if (!decorMeshes.has(d.kind) || n >= DECOR_MAX[d.kind]) continue;
        counts.set(d.kind, n + 1);
        const p = local(start, d.s, d.x);
        tmp.position.set(p.x, d.y ?? 0, p.z);
        tmp.rotation.set(0, -p.heading + (d.turn ?? 0), 0);
        tmp.scale.set(...d.scale);
        tmp.updateMatrix();
        slot.decor.push({ kind: d.kind, matrix: tmp.matrix.clone(), color: d.color ?? 0xffffff });
      }
    }
    slot.index = index;
  };

  return {
    update(cameraS: number) {
      const origin = renderOrigin(cameraS);
      const range = visibleChunkRange(cameraS);
      let refilled = false;
      for (let k = range.first; k <= range.last; k++) {
        const slot = slots[((k % poolSize) + poolSize) % poolSize]!;
        if (slot.index !== k) {
          fillBuildings(slot, k);
          refilled = true;
        }
        const p = frame.toWorld(k * CHUNK_LENGTH, 0, origin);
        slot.group.position.set(p.x, 0, p.z);
      }
      if (decorMeshes.size && (refilled || origin !== laidOrigin)) {
        laidOrigin = origin;
        layoutDecor();
      }
    },
  };
}
