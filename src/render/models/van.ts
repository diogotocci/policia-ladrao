// Van preta (V2 part 4, thief 3). Visual only: every car keeps the same hitbox in the sim.
import type * as THREE from 'three';
import {
  AMBER,
  HEAD,
  PLASTIC,
  TAIL,
  TINT,
  addArmorPlates,
  addWheels,
  both,
  box,
  matte,
  merge,
  mesh,
  mainPaint,
  metal,
  rb,
  shellFrom,
  type P,
} from './kit';

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
