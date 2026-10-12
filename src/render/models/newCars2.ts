// V2 part 6, delivery 4 (mockups approved 2026-10-12): police Camburão, thief Sedã clássico and Carro-forte (the
// Rodoviária PRF is in prf.ts). Body coordinates: front at -z; side profiles have the front at +x (shellFrom / sidePoly). Visual only.
import type * as THREE from 'three';
import {
  AMBER,
  CHROME,
  GLASS,
  HEAD,
  PLASTIC,
  TAIL,
  TINT,
  addArmorPlates,
  addEmergency,
  addWheels,
  both,
  box,
  cyl,
  lamps,
  mainPaint,
  matte,
  merge,
  mesh,
  metal,
  paint,
  rb,
  shellFrom,
  sidePoly,
  type P,
} from './kit';

type B = (root: THREE.Group, body: THREE.Group) => void;

// ======================================================================
// Police: Camburão (white police van, blue band, caged rear windows, big lightbar)
// ======================================================================
export const buildCamburao: B = (root, body) => {
  // playtest 2026-10-12: not too tall (Van 1.75 m, Caveirão 2.1 m): roof at 1.68 m
  const W = 1.9,
    HALF = W / 2,
    R = 0.36;
  const WHITE = mainPaint(0xf1f2f4, 0.4);
  const top: P[] = [
    [2.4, 0.5],
    [2.42, 0.92],
    [2.15, 1.08],
    [1.65, 1.5],
    [1.35, 1.68],
    [-2.35, 1.68],
    [-2.45, 1.56],
    [-2.45, 0.5],
  ];
  body.add(
    mesh(
      shellFrom(top, {
        rear: -2.45,
        front: 2.42,
        axleR: -1.55,
        axleF: 1.6,
        floor: 0.4,
        arch: 0.47,
        wheelR: R + 0.02,
        width: W,
        bevel: 0.1,
      }),
      WHITE,
      'shell',
    ),
  );
  body.add(
    mesh(
      merge([
        box(W - 0.3, 0.5, 0.03)
          .rotateX(0.6)
          .translate(0, 1.33, -1.92),
        ...both((sd) => box(0.03, 0.34, 0.6, sd * (HALF + 0.005), 1.3, -1.05)),
      ]),
      TINT,
      'greenhouse',
    ),
  );
  body.add(mesh(merge(both((sd) => box(0.02, 0.2, 4.0, sd * (HALF + 0.01), 0.95, 0.1))), paint(0x1c4ac2), 'band'));
  const bars: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) bars.push(box(0.03, 0.34, 0.04, sd * (HALF + 0.015), 1.3, -0.3 + i * 0.22));
  for (const sd of [-1, 1]) bars.push(box(0.03, 0.04, 1.2, sd * (HALF + 0.015), 1.3, 0.25));
  bars.push(...[-0.3, 0, 0.3].map((x) => box(0.04, 0.5, 0.03, x, 1.2, 2.47)));
  body.add(mesh(merge(bars), matte(0x222428, 0.5), 'cage'));
  body.add(
    mesh(
      merge([...both((sd) => box(0.03, 0.3, 1.2, sd * (HALF + 0.004), 1.3, 0.25)), box(0.9, 0.5, 0.03, 0, 1.2, 2.455)]),
      TINT,
      'cage-glass',
    ),
  );
  body.add(mesh(rb(1.5, 0.08, 0.3, 0.03, 0, 1.72, -1.0), PLASTIC, 'lightbar-base'));
  addEmergency(body, [rb(0.6, 0.12, 0.26, 0.04, -0.4, 1.8, -1.0)], [rb(0.6, 0.12, 0.26, 0.04, 0.4, 1.8, -1.0)]);
  lamps(body, HALF, 2.42, 2.46, 0.8, 0.78, 0.42, 0.3);
  addWheels(root, { r: R, width: 0.3, rim: metal(0x8a9099, 0.35), spokes: 6, rimR: 0.6 }, HALF - 0.12, [-1.6, 1.55]);
};

// ======================================================================
// Thief: Sedã clássico anos 70 (long hood, vinyl roof, chrome, yellow stripes)
// ======================================================================
export const buildClassico: B = (root, body) => {
  const W = 1.86,
    HALF = W / 2,
    R = 0.36;
  const BODY = mainPaint(0x101114, 0.3);
  const top: P[] = [
    [2.5, 0.42],
    [2.5, 0.78],
    [0.85, 0.88],
    [-1.25, 0.9],
    [-2.5, 0.86],
    [-2.52, 0.44],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.52, front: 2.5, axleR: -1.6, axleF: 1.55, floor: 0.26, arch: 0.46, wheelR: R, width: W }),
      BODY,
      'shell',
    ),
  );
  body.add(
    mesh(
      sidePoly(
        [
          [-1.3, 0.88],
          [-0.65, 1.32],
          [0.35, 1.34],
          [0.85, 0.88],
        ],
        1.6,
      ),
      GLASS,
      'greenhouse',
    ),
  );
  body.add(mesh(rb(1.52, 0.06, 1.05, 0.03, 0, 1.35, 0.17), matte(0x2a2c30, 0.8), 'vinyl'));
  body.add(
    mesh(
      merge([
        box(W + 0.06, 0.12, 0.12, 0, 0.42, -2.55),
        box(W + 0.06, 0.12, 0.12, 0, 0.42, 2.55),
        ...both((sd) => box(0.02, 0.04, 4.8, sd * (HALF + 0.01), 0.72, 0.0)),
        ...both((sd) =>
          cyl(0.05, 0.3, 10)
            .rotateX(Math.PI / 2)
            .translate(sd * 0.55, 0.3, 2.6),
        ),
      ]),
      CHROME,
      'chrome',
    ),
  );
  body.add(mesh(merge([...both((sd) => box(0.04, 0.2, 1.05, sd * (HALF + 0.004), 0.6, -0.525))]), paint(0xf2c014), 'stripes'));
  body.add(
    mesh(
      merge(
        both((sd) =>
          cyl(0.1, 0.06, 16)
            .rotateX(Math.PI / 2)
            .translate(sd * 0.68, 0.64, -2.53),
        ),
      ),
      HEAD,
      'headlights',
    ),
  );
  body.add(mesh(merge(both((sd) => rb(0.5, 0.14, 0.05, 0.02, sd * 0.55, 0.66, 2.52))), TAIL, 'taillights'));
  addArmorPlates(body, { halfW: HALF, rearZ: 2.56, y: 0.6, w: 1.6, h: 0.4, sideLen: 2.6, sideZ: 0 });
  addWheels(root, { r: R, width: 0.3, rim: CHROME, spokes: 8, rimR: 0.62 }, HALF - 0.08, [-1.55, 1.6]);
};

// ======================================================================
// Thief: Carro-forte roubado (armored truck: rivets, gun ports, small windows)
// ======================================================================
export const buildCarroForte: B = (root, body) => {
  // playtest 2026-10-12: not too tall: roof at 1.74 m, like the Van
  const W = 2.0,
    HALF = W / 2,
    R = 0.42;
  const BODY = mainPaint(0xd9dadc, 0.5);
  const top: P[] = [
    [2.55, 0.55],
    [2.55, 1.12],
    [2.35, 1.25],
    [2.0, 1.72],
    [-2.45, 1.74],
    [-2.55, 1.64],
    [-2.55, 0.55],
  ];
  body.add(
    mesh(
      shellFrom(top, {
        rear: -2.55,
        front: 2.55,
        axleR: -1.6,
        axleF: 1.65,
        floor: 0.5,
        arch: 0.52,
        wheelR: R + 0.02,
        width: W,
        bevel: 0.06,
      }),
      BODY,
      'shell',
    ),
  );
  body.add(
    mesh(
      merge([
        box(W - 0.5, 0.32, 0.03)
          .rotateX(0.65)
          .translate(0, 1.47, -2.2),
        ...both((sd) => box(0.03, 0.2, 0.4, sd * (HALF + 0.005), 1.45, -1.75)),
      ]),
      TINT,
      'greenhouse',
    ),
  );
  body.add(mesh(merge(both((sd) => box(0.02, 0.26, 4.4, sd * (HALF + 0.005), 1.1, 0.05))), paint(0x1f5a3a), 'band'));
  const studs: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) for (let i = 0; i < 9; i++) studs.push(box(0.03, 0.04, 0.04, sd * (HALF + 0.015), 1.5, -1.3 + i * 0.42));
  for (const sd of [-1, 1]) for (const z of [-0.6, 0.4, 1.4]) studs.push(box(0.03, 0.1, 0.16, sd * (HALF + 0.015), 1.38, z));
  studs.push(box(0.03, 0.7, 0.02, 0, 1.27, 2.56)); // rear door seam, above the plate
  body.add(mesh(merge(studs), matte(0x26282c, 0.6), 'studs'));
  body.add(mesh(merge([box(W + 0.06, 0.18, 0.2, 0, 0.55, -2.6), box(W + 0.06, 0.18, 0.2, 0, 0.55, 2.6)]), PLASTIC, 'bumpers'));
  body.add(mesh(merge([box(W - 0.2, 0.08, 0.04, 0, 1.72, -2.03)]), AMBER, 'beacon'));
  lamps(body, HALF, 2.55, 2.57, 0.85, 0.8, 0.36, 0.28);
  addArmorPlates(body, { halfW: HALF, rearZ: 2.62, y: 0.8, w: 1.6, h: 0.45, sideLen: 2.8, sideZ: 0 });
  addWheels(root, { r: R, width: 0.36, rim: metal(0x2a2c30, 0.3), spokes: 8, rimR: 0.55, tread: true }, HALF - 0.12, [-1.65, 1.6]);
};
