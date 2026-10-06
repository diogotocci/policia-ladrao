import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCarModel } from '../../src/render/carFactory';
import { applyDamage, damageLook } from '../../src/render/damageView';

const positions = (m: THREE.Object3D, name: string) =>
  Array.from(((m.getObjectByName(name) as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute).array);
const normals = (m: THREE.Object3D, name: string) =>
  Array.from(((m.getObjectByName(name) as THREE.Mesh).geometry.getAttribute('normal') as THREE.BufferAttribute).array);
const meshCount = (m: THREE.Object3D) => {
  let n = 0;
  m.traverse((o) => (o as THREE.Mesh).isMesh && n++);
  return n;
};
const mat = (m: THREE.Object3D, name: string) => (m.getObjectByName(name) as THREE.Mesh).material as THREE.MeshPhysicalMaterial;

describe('damageLook (spec §9 table)', () => {
  it('a healthy car looks new', () => {
    expect(damageLook(100)).toEqual({
      dirt: 0,
      dents: 0,
      tiltedLamp: false,
      whiteSmoke: false,
      hangingBumper: false,
      crackedGlass: false,
      blackSmoke: false,
      sparks: false,
      blinkingHeadlight: false,
    });
  });

  it('≤ 80 dirt grows; ≤ 60 dents and a tilted lamp; ≤ 40 white smoke, hanging bumper, cracked glass; ≤ 20 black smoke, sparks, blinking headlight', () => {
    expect(damageLook(80).dirt).toBe(0);
    expect(damageLook(50).dirt).toBeCloseTo(0.5, 5);
    expect(damageLook(20).dirt).toBe(1);
    expect(damageLook(61).tiltedLamp).toBe(false);
    expect(damageLook(60).tiltedLamp).toBe(true);
    expect(damageLook(60).dents).toBe(0);
    expect(damageLook(30).dents).toBeCloseTo(0.5, 5);
    expect(damageLook(0).dents).toBe(1);
    const l40 = damageLook(40);
    expect([l40.whiteSmoke, l40.hangingBumper, l40.crackedGlass, l40.blackSmoke]).toEqual([true, true, true, false]);
    const l20 = damageLook(20);
    expect([l20.whiteSmoke, l20.blackSmoke, l20.sparks, l20.blinkingHeadlight]).toEqual([false, true, true, true]);
  });

  it('healing reverts the look: 15 → 45 turns off black smoke, sparks and the blinking headlight', () => {
    const l = damageLook(45);
    expect([l.blackSmoke, l.sparks, l.blinkingHeadlight, l.whiteSmoke, l.crackedGlass]).toEqual([false, false, false, false, false]);
  });
});

describe('applyDamage', () => {
  it('denting one car changes neither another car of the same role nor the template', () => {
    const a = createCarModel('thief');
    const b = createCarModel('thief');
    const before = positions(b, 'shell');
    applyDamage(a, damageLook(0), 0);
    expect(positions(a, 'shell')).not.toEqual(before);
    expect(positions(b, 'shell')).toEqual(before);
    expect(positions(createCarModel('thief'), 'shell')).toEqual(before);
  });

  it('with no dents the geometry is identical to the original, and healing restores it', () => {
    const a = createCarModel('police');
    const original = positions(a, 'shell');
    const tail = positions(a, 'taillights');
    applyDamage(a, damageLook(100), 0);
    expect(positions(a, 'shell')).toEqual(original);
    applyDamage(a, damageLook(5), 0);
    applyDamage(a, damageLook(100), 0);
    expect(positions(a, 'shell')).toEqual(original);
    expect(positions(a, 'taillights')).toEqual(tail);
  });

  it('keeps the original (smooth) normals on a healthy car and after healing', () => {
    for (const role of ['police', 'thief'] as const) {
      const a = createCarModel(role);
      const parts = ['shell', 'taillights', role === 'police' ? 'bumpers' : 'chrome'];
      const before = parts.map((p) => normals(a, p));
      applyDamage(a, damageLook(100), 0);
      expect(parts.map((p) => normals(a, p))).toEqual(before);
      applyDamage(a, damageLook(5), 0);
      applyDamage(a, damageLook(100), 0);
      expect(parts.map((p) => normals(a, p))).toEqual(before);
    }
  });

  it('a tilted lamp keeps unit normals (rotated, not recomputed)', () => {
    const a = createCarModel('police');
    applyDamage(a, damageLook(50), 0);
    const n = normals(a, 'taillights');
    for (let i = 0; i < n.length; i += 3) expect(Math.hypot(n[i]!, n[i + 1]!, n[i + 2]!)).toBeCloseTo(1, 4);
  });

  it('healing from 15 to 45 through applyDamage turns the blinking headlight off', () => {
    const a = createCarModel('thief');
    for (let t = 0; t < 1; t += 0.05) applyDamage(a, damageLook(15), t);
    for (let t = 1; t < 2; t += 0.05) {
      applyDamage(a, damageLook(45), t);
      expect(mat(a, 'headlights').emissiveIntensity).toBeCloseTo(0.7, 5);
    }
  });

  it('dirt dulls the paint of that car only, and heals back', () => {
    const a = createCarModel('police');
    const b = createCarModel('police');
    const clean = mat(a, 'shell').color.getHex();
    applyDamage(a, damageLook(20), 0);
    expect(mat(a, 'shell').color.getHex()).not.toBe(clean);
    expect(mat(a, 'shell').clearcoat).toBeLessThan(0.5);
    expect(mat(b, 'shell').color.getHex()).toBe(clean);
    applyDamage(a, damageLook(100), 0);
    expect(mat(a, 'shell').color.getHex()).toBe(clean);
  });

  it('cracked glass and a blinking headlight show up and go away when healed', () => {
    const a = createCarModel('thief');
    applyDamage(a, damageLook(15), 0);
    expect(mat(a, 'greenhouse').emissive.getHex()).not.toBe(0);
    const on = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45].map((t) => {
      applyDamage(a, damageLook(15), t);
      return mat(a, 'headlights').emissiveIntensity;
    });
    expect(new Set(on).size).toBeGreaterThan(1);
    applyDamage(a, damageLook(90), 1);
    expect(mat(a, 'greenhouse').emissive.getHex()).toBe(0);
    expect(mat(a, 'headlights').emissiveIntensity).toBeCloseTo(0.7, 5);
  });

  it('adds no meshes (no extra draw calls)', () => {
    for (const role of ['police', 'thief'] as const) {
      const a = createCarModel(role);
      const n = meshCount(a);
      applyDamage(a, damageLook(0), 0);
      expect(meshCount(a)).toBe(n);
    }
  });
});
