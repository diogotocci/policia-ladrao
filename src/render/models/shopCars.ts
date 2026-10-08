// Shop cars (V2 part 4): police Esportivo and Blazer, thief Picape, Moto com carona and Van preta.
// The Caveirão (police 3) lives in caveirao.ts. Visual only: every car keeps the same hitbox in the sim.
import * as THREE from 'three';
import {
  AMBER,
  CHROME,
  GLASS,
  HEAD,
  PLASTIC,
  RUBBER,
  TAIL,
  TINT,
  POLICIA,
  addArmorPlates,
  addEmergency,
  addWheels,
  both,
  box,
  cyl,
  decal,
  matte,
  merge,
  mesh,
  mainPaint,
  metal,
  paint,
  rb,
  shellFrom,
  sideDecals,
  sidePoly,
  type P,
} from './kit';

const lamps = (
  body: THREE.Object3D,
  halfW: number,
  front: number,
  rear: number,
  yHead: number,
  yTail: number,
  wHead = 0.42,
  wTail = 0.5,
) => {
  body.add(mesh(merge(both((sd) => rb(wHead, 0.13, 0.08, 0.03, sd * (halfW - wHead / 2 - 0.12), yHead, -front))), HEAD, 'headlights'));
  body.add(mesh(merge(both((sd) => rb(wTail, 0.2, 0.08, 0.03, sd * (halfW - wTail / 2 - 0.1), yTail, rear))), TAIL, 'taillights'));
};

// ======================================================================
// Police 1: Esportivo (interceptor coupe, black and white)
// ======================================================================
export function buildEsportivo(root: THREE.Group, body: THREE.Group): void {
  const W = 1.94;
  const HALF = W / 2;
  const BLACK = mainPaint(0x111316, 0.35);
  const WHITE = paint(0xf3f4f6);
  const BLUE = paint(0x1c4ac2);
  const R = 0.36;
  const top: P[] = [
    [2.34, 0.46],
    [2.28, 0.68],
    [1.9, 0.78],
    [0.95, 0.86],
    [-1.7, 0.88],
    [-2.22, 0.86],
    [-2.32, 0.5],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.3, front: 2.3, axleR: -1.45, axleF: 1.45, floor: 0.26, arch: 0.47, wheelR: R, width: W }),
      BLACK,
      'shell',
    ),
  );
  // low fastback greenhouse + black roof
  body.add(
    mesh(
      sidePoly(
        [
          [-1.75, 0.84],
          [-0.55, 1.27],
          [0.2, 1.29],
          [0.98, 0.84],
        ],
        1.6,
      ),
      GLASS,
      'greenhouse',
    ),
  );
  body.add(mesh(rb(1.42, 0.06, 0.9, 0.03, 0, 1.3, 0.1), BLACK, 'roof'));
  // white doors (panda), blue pinstripe, POLÍCIA on the doors
  body.add(mesh(merge(both((sd) => rb(0.03, 0.42, 1.75, 0.015, sd * (HALF + 0.004), 0.6, 0.1))), WHITE, 'doors'));
  body.add(mesh(merge(both((sd) => box(0.02, 0.04, 1.75, sd * (HALF + 0.012), 0.42, 0.1))), BLUE, 'pinstripe'));
  sideDecals(body, () => POLICIA('#14171c', 96), 1.45, 0.36, HALF + 0.02, 0.62, 0.1, 'decal-side');
  // hood scoop, splitter, wing, diffuser
  const plastic = [
    rb(0.6, 0.1, 0.55, 0.04, 0, 0.88, -1.35), // scoop
    box(W - 0.05, 0.05, 0.25, 0, 0.27, -2.3), // splitter
    rb(1.8, 0.05, 0.3, 0.02, 0, 1.12, 2.1), // wing
    ...both((sd) => box(0.06, 0.24, 0.12, sd * 0.68, 1.0, 2.1)),
    box(1.4, 0.12, 0.2, 0, 0.32, 2.3), // diffuser
    rb(1.0, 0.18, 0.06, 0.03, 0, 0.5, -2.34), // grille
  ];
  body.add(mesh(merge(plastic), PLASTIC, 'spoiler'));
  body.add(
    mesh(
      merge(
        both((sd) =>
          cyl(0.06, 0.16, 10)
            .rotateX(Math.PI / 2)
            .translate(sd * 0.45, 0.3, 2.36),
        ),
      ),
      CHROME,
      'chrome',
    ),
  );
  lamps(body, HALF, 2.32, 2.3, 0.64, 0.7, 0.4, 0.55);
  // slim lightbar
  body.add(mesh(rb(1.2, 0.06, 0.26, 0.02, 0, 1.34, 0.05), PLASTIC, 'lightbar-base'));
  addEmergency(
    body,
    [rb(0.52, 0.1, 0.22, 0.04, -0.3, 1.41, 0.05), rb(0.24, 0.06, 0.04, 0.02, -0.2, 0.5, -2.37)],
    [rb(0.52, 0.1, 0.22, 0.04, 0.3, 1.41, 0.05), rb(0.24, 0.06, 0.04, 0.02, 0.2, 0.5, -2.37)],
  );
  addWheels(root, { r: R, width: 0.3, rim: metal(0x2a2c30, 0.3), spokes: 5, rimR: 0.7 }, HALF - 0.1, [-1.45, 1.45]);
}

// ======================================================================
// Police 2: Blazer (boxy patrol SUV, white with grey band)
// ======================================================================
export function buildBlazer(root: THREE.Group, body: THREE.Group): void {
  const W = 1.88;
  const HALF = W / 2;
  const WHITE = mainPaint(0xf1f2f4);
  const GREY = paint(0x5b6470);
  const R = 0.39;
  const top: P[] = [
    [2.38, 0.5],
    [2.36, 0.98],
    [1.3, 1.04],
    [-2.3, 1.06],
    [-2.36, 0.5],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.36, front: 2.36, axleR: -1.45, axleF: 1.45, floor: 0.4, arch: 0.5, wheelR: R + 0.02, width: W }),
      WHITE,
      'shell',
    ),
  );
  // tall, nearly square greenhouse
  body.add(
    mesh(
      sidePoly(
        [
          [-2.28, 1.02],
          [-2.24, 1.74],
          [0.75, 1.78],
          [1.22, 1.02],
        ],
        W - 0.1,
      ),
      GLASS,
      'greenhouse',
    ),
  );
  // white roof and pillars over the glass
  const white = [
    rb(W - 0.06, 0.08, 3.05, 0.03, 0, 1.79, 0.75),
    ...both((sd) => box(0.04, 0.72, 0.16, sd * (HALF - 0.04), 1.4, 0.1)), // B pillar
    ...both((sd) => box(0.04, 0.72, 0.5, sd * (HALF - 0.04), 1.4, 1.95)), // D pillar
    box(W - 0.1, 0.72, 0.04, 0, 1.4, 2.27), // tailgate
  ];
  body.add(mesh(merge(white), WHITE, 'roof'));
  body.add(mesh(merge(both((sd) => box(0.03, 0.28, 4.4, sd * (HALF + 0.003), 0.74, 0))), GREY, 'band'));
  sideDecals(body, () => POLICIA('#f2f2f2', 92), 1.4, 0.26, HALF + 0.02, 0.74, 0.25, 'decal-side');
  const back = decal(POLICIA('#14171c', 92), 1.0, 0.22, 'decal-rear');
  back.position.set(0, 1.18, 2.395);
  body.add(back);
  // black bumpers, push bar, roof rack, spare tire
  const dark = [
    rb(W + 0.06, 0.24, 0.24, 0.05, 0, 0.5, -2.38),
    rb(W + 0.06, 0.24, 0.24, 0.05, 0, 0.5, 2.38),
    box(1.3, 0.06, 0.06, 0, 1.0, -2.6),
    ...both((sd) => box(0.06, 0.55, 0.06, sd * 0.55, 0.75, -2.58)),
    box(1.1, 0.06, 0.06, 0, 0.7, -2.6),
    ...both((sd) => box(0.04, 0.04, 2.6, sd * (HALF - 0.12), 1.9, 0.7)),
    ...[-0.4, 0.7, 1.8].map((z) => box(W - 0.24, 0.04, 0.04, 0, 1.9, z)),
    ...both((sd) => box(0.18, 0.04, 4.0, sd * (HALF - 0.0), 0.36, 0)), // running boards
    rb(1.3, 0.26, 0.06, 0.02, 0, 0.82, -2.36), // grille
  ];
  body.add(mesh(merge(dark), PLASTIC, 'bumpers'));
  const spare = merge([
    cyl(0.36, 0.24, 20)
      .rotateX(Math.PI / 2)
      .translate(0, 1.15, 2.55),
  ]);
  body.add(mesh(spare, RUBBER, 'spare'));
  body.add(
    mesh(
      merge([
        cyl(0.2, 0.26, 14)
          .rotateX(Math.PI / 2)
          .translate(0, 1.15, 2.55),
      ]),
      metal(0x9aa0a8, 0.4),
      'spare-rim',
    ),
  );
  lamps(body, HALF, 2.38, 2.37, 0.85, 0.95, 0.36, 0.22);
  body.add(mesh(merge(both((sd) => box(0.12, 0.09, 0.05, sd * (HALF - 0.12), 0.68, -2.39))), AMBER, 'indicators'));
  // long lightbar
  body.add(mesh(rb(1.5, 0.08, 0.32, 0.03, 0, 1.87, -0.2), PLASTIC, 'lightbar-base'));
  addEmergency(body, [rb(0.66, 0.16, 0.28, 0.06, -0.38, 1.98, -0.2)], [rb(0.66, 0.16, 0.28, 0.06, 0.38, 1.98, -0.2)]);
  addWheels(root, { r: R, width: 0.3, rim: metal(0x9aa0a8, 0.4), spokes: 6, tread: true, rimR: 0.55 }, HALF - 0.08, [-1.45, 1.45]);
}

// ======================================================================
// Thief 1: Picape de caçamba (compact pickup, orange, loaded bed)
// ======================================================================
export function buildPicape(root: THREE.Group, body: THREE.Group): void {
  const W = 1.8;
  const HALF = W / 2;
  const ORANGE = mainPaint(0xe0731c);
  const R = 0.37;
  const BED = -0.62; // cab back (profile x)
  const top: P[] = [
    [2.26, 0.5],
    [2.18, 0.8],
    [0.95, 0.92],
    [BED, 0.94],
    [BED, 0.6],
    [-2.22, 0.6],
    [-2.26, 0.5],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.25, front: 2.25, axleR: -1.45, axleF: 1.4, floor: 0.32, arch: 0.48, wheelR: R + 0.02, width: W }),
      ORANGE,
      'shell',
    ),
  );
  body.add(
    mesh(
      sidePoly(
        [
          [BED + 0.02, 0.9],
          [BED + 0.05, 1.5],
          [0.4, 1.52],
          [0.98, 0.9],
        ],
        W - 0.14,
      ),
      GLASS,
      'greenhouse',
    ),
  );
  // bed walls and tailgate (orange), cab roof
  const bedLen = 2.25 + BED; // 1.63
  const bedZ = -BED + bedLen / 2; // center along z
  const walls = [
    rb(W - 0.1, 0.06, 1.0, 0.02, 0, 1.53, 0.08),
    ...both((sd) => box(0.07, 0.38, bedLen, sd * (HALF - 0.035), 0.8, bedZ)),
    box(W - 0.02, 0.38, 0.07, 0, 0.8, 2.22), // tailgate
  ];
  body.add(mesh(merge(walls), ORANGE, 'bed'));
  // load: crates, a tarp lump, a spare tire
  const WOOD = matte(0x9a6b3a, 0.85);
  body.add(
    mesh(
      merge([box(0.55, 0.42, 0.5, -0.4, 0.82, 1.0), box(0.5, 0.36, 0.45, 0.35, 0.79, 1.15), box(0.45, 0.3, 0.4, -0.35, 1.18, 1.05)]),
      WOOD,
      'crates',
    ),
  );
  body.add(mesh(new THREE.SphereGeometry(0.42, 12, 8).scale(1.3, 0.6, 0.9).translate(0.1, 0.72, 1.8), matte(0x33573a, 0.9), 'tarp'));
  body.add(mesh(cyl(0.3, 0.2, 16).translate(0.45, 0.72, 1.85), RUBBER, 'bed-tire'));
  // roll bar with two lights
  const bar = [box(W - 0.2, 0.06, 0.06, 0, 1.38, 0.72), ...both((sd) => box(0.06, 0.78, 0.06, sd * (HALF - 0.12), 1.0, 0.72))];
  body.add(mesh(merge(bar), PLASTIC, 'rollbar'));
  body.add(
    mesh(
      merge(
        both((sd) =>
          cyl(0.08, 0.08, 12)
            .rotateX(Math.PI / 2)
            .translate(sd * 0.35, 1.47, 0.72),
        ),
      ),
      HEAD,
      'roll-lights',
    ),
  );
  const dark = [
    rb(W + 0.04, 0.2, 0.2, 0.05, 0, 0.45, -2.26),
    rb(W + 0.04, 0.16, 0.16, 0.04, 0, 0.42, 2.27),
    rb(1.1, 0.2, 0.05, 0.02, 0, 0.66, -2.27),
    ...both((sd) => box(0.04, 0.28, 0.25, sd * (HALF - 0.1), 0.35, 1.9)), // mud flaps
  ];
  body.add(mesh(merge(dark), PLASTIC, 'bumpers'));
  lamps(body, HALF, 2.26, 2.27, 0.66, 0.75, 0.4, 0.14);
  addArmorPlates(body, { halfW: HALF, rearZ: 2.26, y: 0.62, w: 1.6, h: 0.36, sideLen: 2.4, sideZ: 0.1 });
  addWheels(root, { r: R, width: 0.3, rim: metal(0x8d939b, 0.4), spokes: 5, tread: true, rimR: 0.55 }, HALF - 0.08, [-1.4, 1.45]);
}

// ======================================================================
// Thief 2: Moto com carona (motorcycle with a driver and a passenger)
// ======================================================================
const RIDER_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });

/** Paints a geometry with one colour (vertex colours: the whole rider is one mesh, one draw call). */
function tinted(g: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  geo.deleteAttribute('uv');
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** A seated rider (hips at the origin, facing -z), torso leaning forward by `lean` rad. */
function rider(jacket: number, helmet: number, lean: number, armsForward: number, name: string): THREE.Mesh {
  const PANTS = 0x23324a;
  const lean_ = new THREE.Matrix4().makeRotationX(-lean);
  const torso = [
    tinted(rb(0.42, 0.55, 0.26, 0.08, 0, 0.3, 0), jacket),
    tinted(new THREE.SphereGeometry(0.17, 14, 10).translate(0, 0.74, 0), helmet),
    tinted(box(0.22, 0.08, 0.04, 0, 0.75, -0.16), 0x050608),
    ...both((sd) => tinted(box(0.11, 0.11, armsForward, sd * 0.24, 0.48, -armsForward / 2), jacket)),
    ...both((sd) => tinted(box(0.1, 0.1, 0.1, sd * 0.24, 0.48, -armsForward), 0xc89a72)),
  ].map((g) => g.applyMatrix4(lean_));
  const legs = [
    ...both((sd) => tinted(box(0.15, 0.15, 0.45, sd * 0.16, 0, -0.2), PANTS)),
    ...both((sd) => tinted(box(0.13, 0.42, 0.14, sd * 0.2, -0.22, -0.42), PANTS)),
    ...both((sd) => tinted(box(0.13, 0.1, 0.24, sd * 0.2, -0.43, -0.48), 0x1a1b1e)),
  ];
  const m = mesh(merge([...torso, ...legs]), RIDER_MAT, name);
  m.geometry.computeVertexNormals();
  return m;
}

export function buildMoto(root: THREE.Group, body: THREE.Group): void {
  const RED = mainPaint(0xd0151c);
  const R = 0.34;
  const FRONT = -0.78; // wheel z
  const REAR = 0.78;
  // frame, tank, seat, tail, fairing
  body.add(
    mesh(
      merge([
        new THREE.SphereGeometry(0.26, 16, 10).scale(0.9, 0.7, 1.4).translate(0, 0.95, -0.3), // tank
        sidePoly(
          [
            [0.55, 0.85],
            [0.95, 1.18],
            [0.75, 1.32],
            [0.45, 1.18],
          ],
          0.34,
          0.04,
        ), // front fairing (profile x = -z)
        sidePoly(
          [
            [-0.5, 0.9],
            [-1.05, 1.08],
            [-1.1, 0.98],
            [-0.6, 0.78],
          ],
          0.3,
          0.04,
        ), // tail
        box(0.36, 0.25, 0.5, 0, 0.6, 0.05), // engine cover
      ]),
      RED,
      'shell',
    ),
  );
  body.add(mesh(rb(0.32, 0.1, 0.95, 0.04, 0, 0.98, 0.4), matte(0x17181a, 0.6), 'seat'));
  body.add(mesh(box(0.3, 0.2, 0.06, 0, 1.32, -0.82).rotateX(0), TINT, 'greenhouse')); // windscreen
  const steel = [
    box(0.08, 0.08, 1.2, 0, 0.62, 0.15), // frame
    ...both((sd) => box(0.05, 0.7, 0.05, sd * 0.12, 0.7, -0.68).rotateX(0)), // fork
    box(0.7, 0.04, 0.04, 0, 1.18, -0.62), // handlebar
    box(0.3, 0.3, 0.35, 0, 0.5, 0.0), // engine
  ];
  body.add(mesh(merge(steel), metal(0x3b3f45, 0.35), 'frame'));
  body.add(
    mesh(
      cyl(0.06, 0.8, 10)
        .rotateX(Math.PI / 2)
        .translate(0.2, 0.45, 0.55),
      CHROME,
      'chrome',
    ),
  ); // exhaust
  body.add(
    mesh(
      cyl(0.09, 0.06, 14)
        .rotateX(Math.PI / 2)
        .translate(0, 1.04, -1.02),
      HEAD,
      'headlights',
    ),
  );
  body.add(mesh(rb(0.18, 0.08, 0.05, 0.02, 0, 1.0, 1.1), TAIL, 'taillights'));
  body.add(mesh(merge([box(0.24, 0.02, 0.5, 0, 0.75, 0.95), box(0.2, 0.02, 0.4, 0, 0.75, -0.9)]), PLASTIC, 'fenders'));
  addArmorPlates(body, { halfW: 0.2, rearZ: 1.12, y: 0.62, w: 0.36, h: 0.3, sideLen: 0.9, sideZ: 0.1 });
  // driver
  const driver = rider(0xb01818, 0x111113, 0.55, 0.42, 'driver');
  driver.position.set(0, 1.08, 0.25);
  body.add(driver);
  // the passenger is the gunner figure itself (gunner.ts), on the back seat from the start
  // single-track wheels (named 'wheel' so they spin)
  for (const z of [FRONT, REAR]) {
    const parts = [cyl(R, 0.16, 26).rotateZ(Math.PI / 2)];
    const w = mesh(merge(parts), RUBBER, 'wheel');
    const rim = mesh(
      merge([
        cyl(R * 0.62, 0.17, 18).rotateZ(Math.PI / 2),
        ...[0, 1, 2, 3, 4].map((i) =>
          box(0.18, R * 0.55, 0.05)
            .translate(0, R * 0.3, 0)
            .applyMatrix4(new THREE.Matrix4().makeRotationX((i / 5) * Math.PI * 2)),
        ),
      ]),
      metal(0x2a2c30, 0.3),
      'rim',
    );
    w.add(rim);
    w.position.set(0, R, z);
    w.castShadow = false;
    w.userData.r = R;
    root.add(w);
  }
}

// ======================================================================
// Thief 3: Van preta (black panel van, tinted glass)
// ======================================================================
export function buildVan(root: THREE.Group, body: THREE.Group): void {
  // high-roof panel van (playtest 2026-10-08, reference photos): long and plain, short sloped nose, windows only in
  // the cab, grey lower trim, blank rear doors with tall lamps. Not armoured: smaller and smoother than the Caveirão.
  const W = 1.9;
  const HALF = W / 2;
  const BLACK = mainPaint(0x101114, 0.3);
  const TRIM = matte(0x4a4d53, 0.6);
  const R = 0.36;
  const top: P[] = [
    [2.45, 0.48],
    [2.45, 0.86],
    [2.3, 1.02], // nose
    [1.95, 1.12], // short hood
    [1.38, 1.74], // raked windshield
    [1.15, 1.9],
    [0.9, 1.95],
    [-2.32, 1.95],
    [-2.45, 1.82],
    [-2.45, 0.48],
  ];
  body.add(
    mesh(
      shellFrom(top, {
        rear: -2.45,
        front: 2.45,
        axleR: -1.6,
        axleF: 1.55,
        floor: 0.38,
        arch: 0.47,
        wheelR: R + 0.02,
        width: W,
        bevel: 0.12,
      }),
      BLACK,
      'shell',
    ),
  );
  const lean = Math.atan2(1.95 - 1.38, 1.74 - 1.12);
  const glass = [
    box(W - 0.3, 0.78, 0.03)
      .rotateX(lean)
      .translate(0, 1.43, -1.66 - 0.03), // windshield
    ...both((sd) => box(0.03, 0.42, 0.62, sd * (HALF + 0.004), 1.5, -0.95)), // cab door
    ...both((sd) => box(0.03, 0.34, 0.22, sd * (HALF + 0.004), 1.46, -1.38)), // small front quarter window
  ];
  body.add(mesh(merge(glass), TINT, 'greenhouse'));
  const SEAMS = matte(0x050506, 0.9);
  const seams = [
    ...both((sd) => box(0.012, 1.35, 0.025, sd * (HALF + 0.004), 1.12, -0.55)), // cab door
    ...both((sd) => box(0.012, 1.35, 0.025, sd * (HALF + 0.004), 1.12, 0.65)), // sliding door
    ...both((sd) => box(0.012, 0.025, 3.7, sd * (HALF + 0.004), 1.12, 0.6)), // character line
    ...both((sd) => box(0.012, 0.025, 2.6, sd * (HALF + 0.004), 1.72, 1.0)), // sliding door rail
    box(0.025, 1.3, 0.012, 0, 1.15, 2.452), // rear doors split
  ];
  body.add(mesh(merge(seams), SEAMS, 'seams'));
  // grey lower trim, bumpers and big mirrors
  const trim = [
    ...both((sd) => box(0.03, 0.2, 4.3, sd * (HALF + 0.006), 0.52, 0.0)),
    rb(W + 0.04, 0.28, 0.22, 0.05, 0, 0.55, -2.45),
    rb(W + 0.04, 0.24, 0.2, 0.05, 0, 0.52, 2.45),
  ];
  body.add(mesh(merge(trim), TRIM, 'bumpers'));
  const dark = [
    rb(1.2, 0.26, 0.05, 0.03, 0, 0.88, -2.46), // grille
    ...both((sd) => rb(0.06, 0.3, 0.16, 0.02, sd * (HALF + 0.14), 1.48, -1.45)), // mirrors
    ...both((sd) => box(0.14, 0.03, 0.03, sd * (HALF + 0.07), 1.48, -1.45)),
  ];
  body.add(mesh(merge(dark), PLASTIC, 'grille'));
  // angled headlights at the nose corners; tall lamps on the rear corners
  body.add(
    mesh(
      merge(
        both((sd) =>
          rb(0.34, 0.14, 0.12, 0.04)
            .rotateY(sd * 0.25)
            .translate(sd * (HALF - 0.24), 0.98, -2.43),
        ),
      ),
      HEAD,
      'headlights',
    ),
  );
  body.add(mesh(merge(both((sd) => rb(0.14, 0.5, 0.06, 0.03, sd * (HALF - 0.08), 1.02, 2.46))), TAIL, 'taillights'));
  body.add(mesh(merge(both((sd) => box(0.12, 0.08, 0.04, sd * (HALF - 0.16), 0.78, -2.47))), AMBER, 'indicators'));
  addArmorPlates(body, { halfW: HALF, rearZ: 2.45, y: 0.85, w: 1.5, h: 0.42, sideLen: 2.8, sideZ: 0.3 });
  addWheels(root, { r: R, width: 0.27, rim: metal(0xb5b9bf, 0.35), spokes: 8, rimR: 0.62 }, HALF - 0.1, [-1.55, 1.6]);
}
