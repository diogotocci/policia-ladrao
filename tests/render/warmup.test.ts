// Setting the match up before the countdown: shaders compiled, then everything drawn once (hidden or off camera).
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PREPARE_LIMIT_MS, prepareMatch } from '../../src/render/warmup';

function fakeRenderer(compile: () => Promise<unknown> = () => Promise.resolve()) {
  const seen: { visible: boolean; culled: boolean }[][] = [];
  let target: unknown = null;
  const r = {
    extensions: { has: () => true },
    compileAsync: vi.fn(compile),
    compile: vi.fn(),
    getRenderTarget: () => target,
    setRenderTarget: (t: unknown) => (target = t),
    render: vi.fn((scene: THREE.Scene) => {
      const all: { visible: boolean; culled: boolean }[] = [];
      scene.traverse((o) => all.push({ visible: o.visible, culled: o.frustumCulled }));
      seen.push(all);
    }),
  };
  return { r: r as unknown as THREE.WebGLRenderer, raw: r, seen, target: () => target };
}

describe('prepareMatch', () => {
  it('compiles, then draws once with every object shown and nothing culled, and puts everything back', async () => {
    const scene = new THREE.Scene();
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    hidden.visible = false;
    scene.add(hidden, new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
    const f = fakeRenderer();
    const dispose = vi.fn();
    const p = prepareMatch(f.r, scene, new THREE.PerspectiveCamera(), [], () => ({ dispose }) as unknown as THREE.WebGLRenderTarget);
    expect(p.progress()).toBeLessThan(0.85);
    await p.ready;
    expect(p.progress()).toBe(1);
    expect(f.raw.compileAsync).toHaveBeenCalled();
    expect(f.seen).toHaveLength(1);
    expect(f.seen[0]!.every((o) => o.visible && !o.culled)).toBe(true);
    expect(hidden.visible).toBe(false);
    expect(hidden.frustumCulled).toBe(true);
    expect(f.target()).toBeNull();
    expect(dispose).toHaveBeenCalled();
  });

  it('a match left meanwhile is not drawn again; a setup that never ends still lets the match start', async () => {
    vi.useFakeTimers();
    const f = fakeRenderer(() => new Promise(() => undefined)); // compile never finishes
    const p = prepareMatch(
      f.r,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      [],
      () => ({ dispose() {} }) as never,
      () => false,
    );
    let ready = false;
    void p.ready.then(() => (ready = true));
    await vi.advanceTimersByTimeAsync(PREPARE_LIMIT_MS - 10);
    expect(ready).toBe(false);
    await vi.advanceTimersByTimeAsync(20);
    expect(ready).toBe(true);
    expect(f.raw.render).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('compiles that finish after the time limit do not draw anything (the match already moved on)', async () => {
    vi.useFakeTimers();
    let finishCompile: () => void = () => undefined;
    const f = fakeRenderer(() => new Promise<void>((r) => (finishCompile = r)));
    const p = prepareMatch(f.r, new THREE.Scene(), new THREE.PerspectiveCamera(), [], () => ({ dispose() {} }) as never);
    await vi.advanceTimersByTimeAsync(PREPARE_LIMIT_MS + 10);
    await p.ready;
    finishCompile();
    await vi.advanceTimersByTimeAsync(10);
    expect(f.raw.render).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
