// Shop cars (V2 part 4): police Esportivo and Blazer, thief Picape.
// The Caveirão (police 3) lives in caveirao.ts, the Moto com carona (thief 2) in moto.ts and the Van preta (thief 3) in van.ts. Visual only: every car keeps the same hitbox in the sim.
import * as THREE from 'three';
import {
  AMBER,
  CHROME,
  GLASS,
  HEAD,
  PLASTIC,
  RUBBER,
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
  lamps,
} from './kit';

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
// Police 2: Blazer (double-cab patrol pickup with a closed bed, white with grey band). Playtest 2026-10-09: it was
// as big as the Caveirao; it is a pickup, as tall as the thief's Picape, with a canopy over the bed.
// ======================================================================
export function buildBlazer(root: THREE.Group, body: THREE.Group): void {
  const W = 1.84;
  const HALF = W / 2;
  const WHITE = mainPaint(0xf1f2f4);
  const GREY = paint(0x5b6470);
  const R = 0.37;
  const CAB = -0.5; // cab back (profile x): the bed and its canopy behind it
  const top: P[] = [
    [2.32, 0.5],
    [2.26, 0.82],
    [1.0, 0.94],
    [CAB, 0.96],
    [-2.3, 0.96],
    [-2.34, 0.5],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.33, front: 2.32, axleR: -1.5, axleF: 1.42, floor: 0.34, arch: 0.48, wheelR: R + 0.02, width: W }),
      WHITE,
      'shell',
    ),
  );
  // double cab and canopy windows, the same height as the Picape (roof 1.52)
  body.add(
    mesh(
      merge([
        sidePoly(
          [
            [CAB + 0.02, 0.92],
            [CAB + 0.05, 1.5],
            [0.42, 1.52],
            [1.02, 0.92],
          ],
          W - 0.12,
        ),
        sidePoly(
          [
            [-2.24, 0.94],
            [-2.22, 1.42],
            [CAB - 0.04, 1.44],
            [CAB - 0.04, 0.94],
          ],
          W - 0.1,
        ),
      ]),
      GLASS,
      'greenhouse',
    ),
  );
  // white cab roof, canopy roof and pillars over the glass
  const white = [
    rb(W - 0.08, 0.06, 1.02, 0.02, 0, 1.53, 0.04),
    rb(W - 0.06, 0.06, 1.86, 0.02, 0, 1.45, 1.38),
    ...both((sd) => box(0.04, 0.56, 0.12, sd * (HALF - 0.04), 1.22, 0.1)), // B pillar
    ...both((sd) => box(0.04, 0.5, 0.1, sd * (HALF - 0.035), 1.2, 0.58)), // cab back / canopy front
    ...both((sd) => box(0.04, 0.5, 0.14, sd * (HALF - 0.035), 1.2, 1.5)), // canopy middle pillar
    box(W - 0.1, 0.5, 0.04, 0, 1.2, 2.3), // canopy rear door
  ];
  body.add(mesh(merge(white), WHITE, 'roof'));
  body.add(mesh(merge(both((sd) => box(0.03, 0.24, 4.5, sd * (HALF + 0.003), 0.72, 0))), GREY, 'band'));
  sideDecals(body, () => POLICIA('#f2f2f2', 92), 1.3, 0.22, HALF + 0.02, 0.72, 0.2, 'decal-side');
  const back = decal(POLICIA('#14171c', 92), 0.8, 0.16, 'decal-rear');
  back.position.set(0, 0.82, 2.34);
  body.add(back);
  body.add(mesh(rb(W - 0.42, 0.28, 0.02, 0.02, 0, 1.25, 2.33), GLASS, 'canopy-rear-glass'));
  // black bumpers, push bar, rear step
  const dark = [
    rb(W + 0.04, 0.22, 0.22, 0.05, 0, 0.47, -2.32),
    rb(W + 0.04, 0.18, 0.2, 0.04, 0, 0.44, 2.34),
    box(1.2, 0.06, 0.06, 0, 0.92, -2.52),
    ...both((sd) => box(0.06, 0.5, 0.06, sd * 0.5, 0.7, -2.5)),
    box(1.0, 0.06, 0.06, 0, 0.64, -2.52),
    ...both((sd) => box(0.16, 0.04, 2.0, sd * HALF, 0.36, -0.4)), // running boards
    rb(1.2, 0.22, 0.06, 0.02, 0, 0.7, -2.32), // grille
  ];
  body.add(mesh(merge(dark), PLASTIC, 'bumpers'));
  lamps(body, HALF, 2.32, 2.33, 0.72, 0.8, 0.38, 0.16);
  body.add(mesh(merge(both((sd) => box(0.12, 0.08, 0.05, sd * (HALF - 0.12), 0.6, -2.33))), AMBER, 'indicators'));
  // lightbar on the cab roof
  body.add(mesh(rb(1.4, 0.07, 0.3, 0.03, 0, 1.59, -0.02), PLASTIC, 'lightbar-base'));
  addEmergency(body, [rb(0.62, 0.14, 0.26, 0.06, -0.36, 1.69, -0.02)], [rb(0.62, 0.14, 0.26, 0.06, 0.36, 1.69, -0.02)]);
  addWheels(root, { r: R, width: 0.3, rim: metal(0x9aa0a8, 0.4), spokes: 6, tread: true, rimR: 0.55 }, HALF - 0.08, [-1.42, 1.5]);
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
  // load at the rear corners: the front of the bed is where the shooter rides (playtest 2026-10-08)
  const WOOD = matte(0x9a6b3a, 0.85);
  body.add(mesh(merge([box(0.5, 0.4, 0.45, -0.52, 0.8, 1.85), box(0.4, 0.3, 0.38, -0.52, 1.15, 1.85)]), WOOD, 'crates'));
  body.add(mesh(new THREE.SphereGeometry(0.42, 12, 8).scale(0.8, 0.5, 0.8).translate(0.52, 0.68, 1.4), matte(0x33573a, 0.9), 'tarp'));
  body.add(mesh(cyl(0.3, 0.2, 16).translate(0.5, 0.72, 1.92), RUBBER, 'bed-tire'));
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
