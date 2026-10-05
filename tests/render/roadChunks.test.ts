// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// texturas de canvas não existem no jsdom: troca por texturas vazias (aqui só a geometria importa)
vi.mock('../../src/render/textures', async () => {
  const T = await import('three');
  return {
    GROUND_HALF_WIDTH: 11,
    FACADE_TILE_METERS: { width: 8, height: 48 },
    makeGroundTexture: () => new T.Texture(),
    makeFacadeTexture: () => new T.Texture(),
  };
});
import { CHUNK_LENGTH, renderOrigin, visibleChunkRange } from '../../src/render/roadChunks';

describe('visibleChunkRange', () => {
  it('s = 0 → chunks -1..5', () => {
    expect(visibleChunkRange(0)).toEqual({ first: -1, last: 5 });
  });

  it('stays the same inside a chunk', () => {
    expect(visibleChunkRange(49.9)).toEqual({ first: -1, last: 5 });
  });

  it('shifts by one at the chunk boundary', () => {
    expect(visibleChunkRange(50)).toEqual({ first: 0, last: 6 });
  });

  it('works far down the road', () => {
    expect(visibleChunkRange(1e6)).toEqual({ first: 19999, last: 20005 });
  });

  it('always spans 7 chunks', () => {
    for (const s of [0, 12.3, 777.7, 123456.78, 9.99e6]) {
      const { first, last } = visibleChunkRange(s);
      expect(last - first + 1).toBe(7);
    }
  });

  it('CHUNK_LENGTH is 50 m', () => {
    expect(CHUNK_LENGTH).toBe(50);
  });
});

describe('renderOrigin', () => {
  it('snaps s down to the chunk grid so render coords stay small', () => {
    expect(renderOrigin(0)).toBe(0);
    expect(renderOrigin(49.9)).toBe(0);
    expect(renderOrigin(1e6 + 30)).toBe(1e6);
    expect(1e6 + 30 - renderOrigin(1e6 + 30)).toBeLessThan(CHUNK_LENGTH);
  });
});

import * as THREE from 'three';
import { createRoad } from '../../src/render/roadChunks';
import { createTrackFrame } from '../../src/render/trackFrame';
import { curvesBetween } from '../../src/sim/curves';

describe('curved road chunks (Entrega 6)', () => {
  const worldVerts = (scene: THREE.Scene, k: number) => {
    const g = scene.getObjectByName(`chunk-${k}`)!;
    const ground = g.getObjectByName('ground') as THREE.Mesh;
    g.updateMatrixWorld(true);
    const pos = ground.geometry.getAttribute('position') as THREE.BufferAttribute;
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(ground.matrixWorld));
    return out;
  };

  it('consecutive chunks meet without a gap inside a sharp curve', () => {
    const seed = 3;
    const sharp = curvesBetween(seed, 0, 30000).find((c) => c.sharp)!;
    const scene = new THREE.Scene();
    const frame = createTrackFrame(seed, true);
    const road = createRoad(scene, seed, frame);
    const camS = sharp.start + sharp.length / 2;
    road.update(camS);
    const k = Math.floor(camS / 50);
    const a = worldVerts(scene, k);
    const b = worldVerts(scene, k + 1);
    // as duas pontas da emenda (x = ±11 em s = início do bloco k+1) existem nas duas malhas, no mesmo lugar
    const origin = Math.floor(camS / 50) * 50;
    for (const x of [-11, 11]) {
      const e = frame.toWorld((k + 1) * 50, x, origin);
      const p = new THREE.Vector3(e.x, 0, e.z);
      expect(Math.min(...a.map((q) => q.distanceTo(p)))).toBeLessThan(0.02);
      expect(Math.min(...b.map((q) => q.distanceTo(p)))).toBeLessThan(0.02);
    }
  });

  it('the road follows the track: chunk ground center at s is where the frame says', () => {
    const seed = 5;
    const c = curvesBetween(seed, 0, 30000).find((x) => x.sharp)!;
    const scene = new THREE.Scene();
    const frame = createTrackFrame(seed, true);
    createRoad(scene, seed, frame).update(c.start + c.length / 2);
    const s = c.start + c.length / 2;
    const k = Math.floor(s / 50);
    const target = frame.toWorld(s, 0, Math.floor(s / 50) * 50);
    const verts = worldVerts(scene, k);
    // linhas da grade: 2 vértices (bordas); o meio de cada linha é o centro da pista
    const mids = [];
    for (let i = 0; i + 1 < verts.length; i += 2) mids.push(verts[i]!.clone().add(verts[i + 1]!).multiplyScalar(0.5));
    const closest = Math.min(...mids.map((v) => Math.hypot(v.x - target.x, v.z - target.z)));
    expect(closest).toBeLessThan(1.5); // centro de uma linha da grade a no máximo ~um segmento
  });

  it('keeps the same number of meshes per chunk', () => {
    const scene = new THREE.Scene();
    createRoad(scene, 1, createTrackFrame(1, true)).update(800);
    let n = 0;
    scene.traverse((o) => (o as THREE.Mesh).isMesh && n++);
    expect(n).toBe(7 * 3); // chão, postes, prédios por bloco
  });
});
