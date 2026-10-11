import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CARS, CAR_IDS, defaultLook, type CarLook } from '../../src/meta/shop';
import { createCarModel, updateCarModel } from '../../src/render/carFactory';
import { createLookModel, disposeLookModel } from '../../src/render/carLook';
import { attachGunner, updateGunner } from '../../src/render/gunner';
import { createCar } from '../../src/sim/car';

const meshes = (o: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  o.traverse((x) => (x as THREE.Mesh).isMesh && out.push(x as THREE.Mesh));
  return out;
};
const look = (car: CarLook['car'], extra: Partial<CarLook> = {}): CarLook => ({
  car,
  paint: CARS[car].colors[0],
  neon: null,
  plate: null,
  sound: null,
  ...extra,
});

describe('shop car models (spec §4)', () => {
  it.each(CAR_IDS)('%s builds with the parts the game uses', (car) => {
    const role = CARS[car].role;
    const m = createLookModel(role, look(car));
    for (const name of ['body', 'shell', 'greenhouse', 'headlights', 'taillights']) expect(m.getObjectByName(name), name).toBeDefined();
    expect(m.children.filter((c) => c.name === 'wheel').length).toBeGreaterThanOrEqual(2);
    if (role === 'police') {
      expect(m.getObjectByName('lightbar-red')).toBeDefined();
      expect(m.getObjectByName('lightbar-blue')).toBeDefined();
    }
    expect(m.name).toBe(`car-${role}`);
  });

  it.each(CAR_IDS)('%s costs at most 12 meshes more than the default car of its side', (car) => {
    const role = CARS[car].role;
    const base = meshes(createCarModel(role)).length;
    expect(meshes(createLookModel(role, look(car, { neon: 0xff00ff, plate: 'ABC1234' }))).length).toBeLessThanOrEqual(base + 12);
  });

  it('no look = the default car of the side', () => {
    expect(meshes(createLookModel('police')).length).toBe(meshes(createCarModel('police')).length);
    expect(defaultLook('thief').car).toBe('seda');
  });
});

describe('look: paint, neon, plate', () => {
  it('paints only this car: the template and the next car keep the original colour', () => {
    const painted = createLookModel('police', look('esportivo', { paint: 0x1c3fa8 }));
    const shell = (m: THREE.Object3D) => ((m.getObjectByName('shell') as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex();
    expect(shell(painted)).toBe(0x1c3fa8);
    expect(shell(createLookModel('police', look('esportivo')))).toBe(CARS.esportivo.colors[0]);
  });

  it('neon and plate only when chosen', () => {
    const plain = createLookModel('thief', look('van'));
    expect(plain.getObjectByName('neon')).toBeUndefined();
    expect(plain.getObjectByName('plate')).toBeUndefined();
    const full = createLookModel('thief', look('van', { neon: 0x2bff88, plate: 'DIO2026' }));
    const neon = full.getObjectByName('neon') as THREE.Mesh;
    expect((neon.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x2bff88);
    expect((neon.material as THREE.MeshBasicMaterial).blending).toBe(THREE.AdditiveBlending);
    expect(full.getObjectByName('plate')).toBeDefined();
  });

  it('tall cars raise the chase camera; the moto is drawn bigger', () => {
    expect(createLookModel('police', look('caveirao')).userData.camBack).toBeGreaterThan(1);
    expect(createLookModel('police', look('caveirao')).scale.x).toBeLessThan(1); // drawn smaller
    expect(createLookModel('police', look('viatura')).userData.camLift).toBe(0);
    expect(createLookModel('thief', look('moto')).scale.x).toBeCloseTo(1.15);
  });

  it('moto: the shooter is the passenger from the start, unarmed until the thief gets a weapon', () => {
    const moto = createLookModel('thief', look('moto'));
    expect(moto.getObjectByName('passenger')).toBeUndefined(); // no second figure to swap with
    const g = attachGunner(moto, 'thief');
    expect(g.position.toArray()).toEqual([0, 1.0, 0.68]);
    const body = g.getObjectByName('gunner-body') as THREE.Mesh;
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: false }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(true);
    const unarmed = body.geometry.getAttribute('position').count;
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: true }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(true);
    expect(body.geometry.getAttribute('position').count).toBeGreaterThan(unarmed); // now with the gun
  });

  it('picape: the shooter rides in the bed from the start (playtest 2026-10-08)', () => {
    const g = attachGunner(createLookModel('thief', look('picape')), 'thief');
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: false }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(true);
    expect(g.position.z).toBeGreaterThan(0.7); // in the bed, behind the cab (z 0.62)
  });

  it('other cars: the thief gunner still shows only with a weapon; the Caveirão gunner is at the window, not on the roof', () => {
    const g = attachGunner(createLookModel('thief', look('van')), 'thief');
    updateGunner(g, { ...createCar('thief', 1, 0), hasGun: false }, { s: 0, x: 0 }, 0);
    expect(g.visible).toBe(false);
    const cav = attachGunner(createLookModel('police', look('caveirao')), 'police');
    expect(cav.position.y).toBeLessThan(1.8);
    expect(cav.position.x).toBeGreaterThan(0.9);
  });

  it('wheels turn by their own radius', () => {
    const m = createLookModel('police', look('caveirao'));
    updateCarModel(m, { ...createCar('police', 0, 0), s: 5 }, 0, 0);
    const wheel = m.children.find((c) => c.name === 'wheel')!;
    expect(wheel.rotation.x).toBeCloseTo(-5 / (wheel.userData.r as number));
  });
});

describe('thief items on shop cars', () => {
  it.each(['seda', 'picape', 'moto', 'van'] as const)('%s shows the titanium plates picked up in the match', (car) => {
    const m = createLookModel('thief', look(car));
    const thief = { ...createCar('thief', 1, 0), upgrades: { ...createCar('thief', 1, 0).upgrades, plates: 3 } };
    updateCarModel(m, thief, 0, 0);
    for (const name of ['plate-front', 'plate-left', 'plate-right']) expect(m.getObjectByName(name)?.visible, name).toBe(true);
  });

  it('disposeLookModel frees the car copy but not the shared template', () => {
    const a = createLookModel('thief', look('van', { neon: 0xff00ff, plate: 'ABC' }));
    const b = createLookModel('thief', look('van'));
    const shared = (b.getObjectByName('greenhouse') as THREE.Mesh).geometry;
    let disposed = false;
    shared.addEventListener('dispose', () => (disposed = true));
    disposeLookModel(a);
    expect(disposed).toBe(false);
  });
});

describe('car heights (playtest 2026-10-09)', () => {
  const roof = (car: CarLook['car'], role: 'police' | 'thief') => {
    const m = createLookModel(role, look(car));
    m.updateMatrixWorld(true);
    const shell = new THREE.Box3();
    for (const name of ['shell', 'greenhouse', 'roof']) {
      const o = m.getObjectByName(name);
      if (o) shell.expandByObject(o);
    }
    return shell.max.y;
  };
  it('Blazer: a pickup with a closed bed, as tall as the Picape (lightbar apart), well below the Caveirão', () => {
    const blazer = roof('blazer', 'police');
    expect(Math.abs(blazer - roof('picape', 'thief'))).toBeLessThan(0.1);
    expect(blazer).toBeLessThan(roof('caveirao', 'police') - 0.4);
  });

  it('Van: taller than the Picape, smaller than the Caveirão', () => {
    const van = roof('van', 'thief');
    expect(van).toBeGreaterThan(roof('picape', 'thief') + 0.1);
    expect(van).toBeLessThan(roof('caveirao', 'police') - 0.2);
  });
});

describe('finishes and stickers (V2 part 6)', () => {
  const paintMats = (m: THREE.Object3D) => {
    const out = new Set<THREE.MeshPhysicalMaterial>();
    m.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
      if (mat && !Array.isArray(mat) && mat.userData?.paint) out.add(mat);
    });
    return [...out];
  };
  it('each finish changes the paint material (once, even when shared); the legendary one sets its colour', () => {
    const base = paintMats(createLookModel('police', look('esportivo')))[0]!;
    const fosco = paintMats(createLookModel('police', look('esportivo', { finish: 'fosco' })))[0]!;
    expect(fosco.roughness).toBeGreaterThan(base.roughness);
    expect(fosco.clearcoat).toBe(0);
    const metal = paintMats(createLookModel('police', look('esportivo', { finish: 'metalico' })));
    for (const m of metal) expect(m.metalness).toBeCloseTo(0.5);
    expect(metal[0]!.color.r).toBeCloseTo(base.color.r * 1.25, 3); // brightened once, not once per mesh
    const pearl = paintMats(createLookModel('thief', look('seda', { finish: 'perolizado' })))[0]!;
    expect(pearl.iridescence).toBe(1);
    const gold = paintMats(createLookModel('thief', look('seda', { finish: 'lendaria' })))[0]!;
    expect(gold.color.getHex()).toBe(new THREE.Color(0xd4a32a).getHex());
    // the template keeps its material: the next plain car is unchanged
    expect(paintMats(createLookModel('police', look('esportivo')))[0]!.roughness).toBeCloseTo(base.roughness);
  });

  it('a sticker without a canvas (tests) is skipped without errors; the mesh budget holds', () => {
    const m = createLookModel('thief', look('picape', { sticker: { kind: 'chamas', number: 3 } }));
    expect(meshes(m).length).toBeLessThanOrEqual(meshes(createLookModel('thief', look('picape'))).length + 2);
  });
});

describe('sticker layout (playtest 2026-10-09: car by car, never over the car decals)', () => {
  it('every car has a place for each sticker of its side; police cars take them on top (POLÍCIA is on the sides; the Rocam is a bike)', async () => {
    const { STICKER_LAYOUT } = await import('../../src/render/stickers');
    const { STICKERS } = await import('../../src/meta/mastery');
    for (const car of CAR_IDS) {
      const layout = STICKER_LAYOUT[car]!;
      for (const kind of STICKERS[CARS[car].role]) expect(layout[kind]?.length, `${car} ${kind}`).toBeGreaterThan(0);
      if (CARS[car].role === 'police' && car !== 'rocam')
        for (const spots of Object.values(layout)) for (const s of spots!) expect(s.at, car).toBe('top');
    }
  });
});

describe('wheels and accessories (V2 part 6 delivery 2, spec §3.3 and §3.5)', () => {
  const wheels = (m: THREE.Object3D) => m.children.filter((c) => c.name === 'wheel') as THREE.Mesh[];

  it.each(['viatura', 'caveirao', 'seda', 'van'] as const)('%s: a wheel style replaces every wheel, same place and radius', (car) => {
    const role = CARS[car].role;
    const plain = createLookModel(role, look(car));
    const m = createLookModel(role, look(car, { wheels: 'rodao' }));
    const before = wheels(plain);
    const after = wheels(m);
    expect(after.length).toBe(before.length);
    after.forEach((w, i) => {
      expect(w.position.toArray()).toEqual(before[i]!.position.toArray());
      expect(w.geometry).not.toBe(before[i]!.geometry);
      expect(Array.isArray(w.material)).toBe(true);
      expect(w.geometry.groups.length).toBe(2); // tire, rim
    });
    expect(meshes(m).length).toBe(meshes(plain).length);
  });

  it('moto: keeps its wheels and recolours the rim', () => {
    const plain = createLookModel('thief', look('moto'));
    const m = createLookModel('thief', look('moto', { wheels: 'cromadas' }));
    wheels(m).forEach((w, i) => {
      expect(w.geometry).toBe(wheels(plain)[i]!.geometry);
      const rim = w.getObjectByName('rim') as THREE.Mesh;
      expect((rim.material as THREE.MeshStandardMaterial).color.getHex()).not.toBe(
        ((wheels(plain)[i]!.getObjectByName('rim') as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex(),
      );
    });
    expect(meshes(m).length).toBe(meshes(plain).length);
  });

  it.each(['seda', 'picape', 'van'] as const)('%s: all four accessories, within the mesh budget', (car) => {
    const all = ['aerofolio', 'rack', 'antena', 'escapamento'] as const;
    const m = createLookModel('thief', look(car, { acc: [...all] }));
    for (const name of ['acc-wing', 'acc-wing-struts', 'acc-rack', 'acc-rack-lamps', 'acc-antenna', 'acc-pennant', 'acc-pipe', 'acc-flame'])
      expect(m.getObjectByName(name), name).toBeDefined();
    if (car === 'seda') expect(m.getObjectByName('spoiler')).toBeDefined(); // keeps its own spoiler under the wing
    expect(meshes(m).length).toBeLessThanOrEqual(meshes(createLookModel('thief', look(car))).length + 10);
    expect((m.userData.flames as THREE.Object3D[]).length).toBe(2);
  });

  it('moto: only the antenna and the exhaust', () => {
    const m = createLookModel('thief', look('moto', { acc: ['aerofolio', 'rack', 'antena', 'escapamento'] }));
    expect(m.getObjectByName('acc-wing')).toBeUndefined();
    expect(m.getObjectByName('acc-rack')).toBeUndefined();
    expect(m.getObjectByName('acc-antenna')).toBeDefined();
    expect(m.getObjectByName('acc-flame')).toBeDefined();
  });

  it('the flame always flickers and grows while the car speeds up', () => {
    const m = createLookModel('thief', look('seda', { acc: ['escapamento'] }));
    const flame = (m.userData.flames as THREE.Object3D[])[0]!;
    const car = { ...createCar('thief', 1), speed: 20 };
    const sizes = [0.1, 0.2, 0.3].map((t) => (updateCarModel(m, car, t), flame.scale.z));
    expect(new Set(sizes).size).toBe(3);
    updateCarModel(m, car, 0.4);
    const steady = flame.scale.z;
    updateCarModel(m, { ...car, speed: 21 }, 0.4);
    expect(flame.scale.z).toBeGreaterThan(steady * 1.5);
  });

  it('disposing a car leaves the shared wheel and accessory materials', () => {
    const m = createLookModel('thief', look('seda', { wheels: 'cromadas', acc: ['rack'] }));
    const shared = [
      ...(wheels(m)[0]!.material as THREE.Material[]),
      (m.getObjectByName('acc-rack') as THREE.Mesh).material as THREE.Material,
    ];
    const spies = shared.map((mat) => {
      let n = 0;
      mat.addEventListener('dispose', () => n++);
      return () => n;
    });
    disposeLookModel(m);
    expect(spies.map((f) => f())).toEqual([0, 0, 0]);
  });
});
