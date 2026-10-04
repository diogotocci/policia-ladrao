import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createOpponentMarker } from '../../src/render/opponentMarker';
import { createCar } from '../../src/sim/car';

describe('createOpponentMarker', () => {
  it('is a constant-size sprite drawn on top of everything, ignoring fog', () => {
    const scene = new THREE.Scene();
    const m = createOpponentMarker(scene, 'thief');
    const sprite = scene.getObjectByName('opponent-marker') as THREE.Sprite;
    expect(sprite).toBeDefined();
    const mat = sprite.material as THREE.SpriteMaterial;
    expect(mat.sizeAttenuation).toBe(false);
    expect(mat.depthTest).toBe(false);
    expect(mat.fog).toBe(false);
    expect(m).toBeDefined();
  });

  it('floats above the opponent and only shows when it is more than 15 m away', () => {
    const scene = new THREE.Scene();
    const m = createOpponentMarker(scene, 'thief');
    const sprite = scene.getObjectByName('opponent-marker') as THREE.Sprite;
    const foe = { ...createCar('thief', 2, 140) };
    m.update(foe, 100, 0);
    expect(sprite.visible).toBe(true);
    expect(sprite.position.x).toBe(1.5);
    expect(sprite.position.z).toBe(-140);
    expect(sprite.position.y).toBeGreaterThan(1.8);
    m.update(foe, 10, 0);
    expect(sprite.visible).toBe(false);
  });

  it('uses the opponent colour: red for the thief, blue for the police', () => {
    const red = new THREE.Scene();
    createOpponentMarker(red, 'thief');
    const blue = new THREE.Scene();
    createOpponentMarker(blue, 'police');
    const c = (s: THREE.Scene) => ((s.getObjectByName('opponent-marker') as THREE.Sprite).material as THREE.SpriteMaterial).color;
    expect(c(red).r).toBeGreaterThan(c(red).b);
    expect(c(blue).b).toBeGreaterThan(c(blue).r);
  });
});
