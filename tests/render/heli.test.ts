import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { HELI_EXIT, HELI_Y, heliPose, createHeli } from '../../src/render/heli';
import { tracerHeight } from '../../src/render/combatFx';
import * as THREE from 'three';
import { createCar } from '../../src/sim/car';

const T = BALANCE.items.police.heliTime;

describe('helicopter pose (visible while the power-up lasts, blinks at the end, flies away)', () => {
  it('hidden when never picked up', () => {
    expect(heliPose(10, 0).visible).toBe(false);
  });
  it('comes down when picked up, then hovers above the police, a bit ahead so the chase camera sees it', () => {
    const until = 20;
    const start = until - T;
    const arriving = heliPose(start + 0.1, until);
    const hovering = heliPose(start + 3, until);
    expect(arriving.visible).toBe(true);
    expect(arriving.height).toBeGreaterThan(hovering.height);
    expect(hovering.height).toBeCloseTo(HELI_Y, 5);
    expect(hovering.behind).toBeLessThan(0);
  });
  it('picking another one while it flies only extends the time (no second arrival)', () => {
    const first = 20;
    const extended = first + 5;
    expect(heliPose(first - 1, extended, first - T).height).toBeCloseTo(HELI_Y, 5);
  });
  it('no blinking (playtest): visible the whole time, then it just flies away', () => {
    const until = 20;
    for (let t = until - T + 0.5; t < until; t += 0.05) expect(heliPose(t, until).visible).toBe(true);
  });
  it('after it ends it rises and flies ahead, then disappears', () => {
    const until = 20;
    const a = heliPose(until + 0.2, until);
    const b = heliPose(until + HELI_EXIT * 0.8, until);
    expect(a.visible && b.visible).toBe(true);
    expect(b.height).toBeGreaterThan(a.height);
    expect(b.behind).toBeLessThan(a.behind);
    expect(heliPose(until + HELI_EXIT + 0.01, until).visible).toBe(false);
  });
});
describe('helicopter tracers', () => {
  it('start up at the helicopter and come down to the target; normal shots stay level', () => {
    expect(tracerHeight(0, 40)).toBeCloseTo(HELI_Y, 5);
    expect(tracerHeight(20, 40)).toBeLessThan(HELI_Y);
    expect(tracerHeight(40, 40)).toBeCloseTo(tracerHeight(0), 5);
    expect(tracerHeight(10)).toBe(tracerHeight(0));
  });
});
describe('createHeli', () => {
  it('arrives when picked, keeps hovering when picked again, never visible without the item', () => {
    const scene = new THREE.Scene();
    const heli = createHeli(scene);
    const car = createCar('police', 1, 0);
    heli.update(car, 5, 0, 1 / 60);
    expect(heli.group.visible).toBe(false);
    const on = { ...car, upgrades: { ...car.upgrades, heliUntil: 10 + T } };
    heli.update(on, 10.05, 0, 1 / 60);
    expect(heli.group.position.y).toBeGreaterThan(HELI_Y + 1); // descendo
    heli.update(on, 13, 0, 1 / 60);
    expect(heli.group.position.y).toBeCloseTo(HELI_Y, 3);
    const again = { ...car, upgrades: { ...car.upgrades, heliUntil: 13 + T } };
    heli.update(again, 13.02, 0, 1 / 60);
    expect(heli.group.position.y).toBeCloseTo(HELI_Y, 3);
  });
});
