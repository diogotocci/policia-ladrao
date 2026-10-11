// V2 part 6 delivery 3: police Rocam and Viatura descaracterizada, thief Kombi and Fusca envenenado.
// Body coordinates: front at -z; side profiles have the front at +x (shellFrom / sidePoly). Visual only.
import * as THREE from 'three';
import { buildBike } from './moto';
import {
  CHROME,
  GLASS,
  HEAD,
  PLASTIC,
  TINT,
  addArmorPlates,
  addEmergency,
  addWheels,
  both,
  box,
  cyl,
  mainPaint,
  matte,
  merge,
  mesh,
  metal,
  paint,
  rb,
  shellFrom,
  sidePoly,
  lamps,
  type P,
} from './kit';

// ======================================================================
// Police: Moto da Rocam (white bike, grey rider, white helmet, lights on the crash bars and under the tail)
// ======================================================================
export function buildRocam(root: THREE.Group, body: THREE.Group): void {
  buildBike(root, body, { paint: 0xf1f2f4, jacket: 0x4a4f57, helmet: 0xf4f5f7 });
  // crash bars with the front strobes, and a strobe pair under the tail (seen from the chase camera)
  body.add(
    mesh(
      merge([...both((sd) => box(0.04, 0.04, 0.3, sd * 0.24, 0.62, -0.42)), ...both((sd) => box(0.04, 0.3, 0.04, sd * 0.24, 0.5, -0.56))]),
      CHROME,
      'crash-bars',
    ),
  );
  addEmergency(
    body,
    [rb(0.1, 0.07, 0.05, 0.02, -0.26, 0.7, -0.58), rb(0.08, 0.06, 0.05, 0.02, -0.12, 0.74, 1.1)],
    [rb(0.1, 0.07, 0.05, 0.02, 0.26, 0.7, -0.58), rb(0.08, 0.06, 0.05, 0.02, 0.12, 0.74, 1.1)],
  );
  // black side panels under the seat, like the real ones
  body.add(mesh(merge(both((sd) => rb(0.03, 0.22, 0.55, 0.02, sd * 0.19, 0.82, 0.55))), matte(0x111214, 0.5), 'panels'));
}

// ======================================================================
// Police: Viatura descaracterizada (plain dark sedan; strobes hidden in the grille, on the dash and, since the
// player sees it from behind, on the rear shelf and in the rear bumper)
// ======================================================================
/** A flat strobe lying on the windscreen or the rear glass (tilted like it; the glass itself is opaque). */
type GlassSpot = { y: number; z: number; tilt: number; w: number };
const DASH: GlassSpot = { y: 0.995, z: -1.05, tilt: -0.59, w: 0.36 };
const SHELF: GlassSpot = { y: 1.115, z: 1.3, tilt: 0.69, w: 0.42 };
const onGlass = (x: number, g: GlassSpot) => rb(g.w, 0.04, 0.12, 0.015).rotateX(g.tilt).translate(x, g.y, g.z);

export function buildDescaracterizada(root: THREE.Group, body: THREE.Group): void {
  const W = 1.84;
  const HALF = W / 2;
  const BODY = mainPaint(0x16181c, 0.35);
  const R = 0.34;
  const top: P[] = [
    [2.3, 0.5],
    [2.28, 0.76],
    [1.25, 0.86],
    [-1.55, 0.9],
    [-2.25, 0.88],
    [-2.32, 0.52],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.3, front: 2.3, axleR: -1.42, axleF: 1.42, floor: 0.28, arch: 0.45, wheelR: R, width: W }),
      BODY,
      'shell',
    ),
  );
  const cabin: P[] = [
    [-1.55, 0.88],
    [-0.95, 1.38],
    [0.4, 1.4],
    [1.2, 0.86],
  ];
  body.add(mesh(sidePoly(cabin, 1.62), TINT, 'greenhouse'));
  body.add(mesh(rb(1.5, 0.05, 1.2, 0.03, 0, 1.4, 0.27), BODY, 'roof'));
  // grey door handles, black mirrors, chrome strip: an ordinary sedan
  body.add(
    mesh(
      merge([
        ...both((sd) => rb(0.06, 0.16, 0.12, 0.02, sd * (HALF + 0.07), 1.0, -0.98)),
        rb(1.0, 0.16, 0.05, 0.03, 0, 0.62, -2.33), // grille
        box(W + 0.02, 0.14, 0.18, 0, 0.36, -2.26), // front bumper
        box(W + 0.02, 0.14, 0.18, 0, 0.38, 2.26), // rear bumper
      ]),
      PLASTIC,
      'trim',
    ),
  );
  body.add(mesh(merge(both((sd) => box(0.01, 0.02, 2.9, sd * (HALF + 0.004), 0.72, 0.0))), CHROME, 'chrome'));
  lamps(body, HALF, 2.32, 2.31, 0.68, 0.74, 0.44, 0.52);
  // hidden strobes: grille and dash (front), rear shelf and rear bumper (seen by the player)
  addEmergency(
    body,
    [
      rb(0.22, 0.06, 0.03, 0.02, -0.22, 0.62, -2.36),
      onGlass(-0.25, DASH),
      onGlass(-0.28, SHELF),
      rb(0.2, 0.06, 0.03, 0.02, -0.6, 0.38, 2.36),
    ],
    [rb(0.22, 0.06, 0.03, 0.02, 0.22, 0.62, -2.36), onGlass(0.25, DASH), onGlass(0.28, SHELF), rb(0.2, 0.06, 0.03, 0.02, 0.6, 0.38, 2.36)],
  );
  addWheels(root, { r: R, width: 0.27, rim: metal(0x6a7078, 0.35), spokes: 6, rimR: 0.66 }, HALF - 0.1, [-1.42, 1.42]);
}

// ======================================================================
// Thief: Kombi (two-tone bus: white top, colour below with the V on the nose, round lamps, split windscreen)
// ======================================================================
export function buildKombi(root: THREE.Group, body: THREE.Group): void {
  const W = 1.82;
  const HALF = W / 2;
  const LOWER = mainPaint(0x6fa8d6, 0.4);
  const WHITE = paint(0xf2efe6, 0.45);
  const R = 0.33;
  const top: P[] = [
    [2.18, 0.42],
    [2.24, 0.95],
    [2.14, 1.5],
    [1.95, 1.72],
    [-1.98, 1.72],
    [-2.18, 1.5],
    [-2.2, 0.42],
  ];
  const shellOpts = { rear: -2.2, front: 2.24, axleR: -1.3, axleF: 1.45, floor: 0.32, arch: 0.42, wheelR: R, width: W, bevel: 0.14 };
  body.add(mesh(shellFrom(top, shellOpts), LOWER, 'shell'));
  // white upper half (a slightly wider skin over the shell from the belt line up) and the white V on the nose
  const upper: P[] = [
    [2.23, 1.12],
    [2.15, 1.5],
    [1.96, 1.73],
    [-1.99, 1.73],
    [-2.19, 1.5],
    [-2.21, 1.12],
  ];
  const vNose = new THREE.Shape();
  vNose.moveTo(-0.9, 1.12);
  vNose.lineTo(0, 0.78);
  vNose.lineTo(0.9, 1.12);
  vNose.lineTo(-0.9, 1.12);
  const v = new THREE.ShapeGeometry(vNose).rotateY(Math.PI).translate(0, 0, -2.262);
  body.add(mesh(merge([sidePoly(upper, W + 0.02, 0.15), v]), WHITE, 'upper'));
  // split windscreen, a row of side windows, rear window
  const glass = [
    // split windscreen leaning back with the nose
    ...both((sd) =>
      box(0.74, 0.42, 0.03)
        .rotateX(0.36)
        .translate(sd * 0.42, 1.42, -2.17),
    ),
    ...both((sd) => box(0.03, 0.36, 3.1, sd * (HALF + 0.012), 1.38, 0.05)),
    box(1.1, 0.3, 0.03, 0, 1.4, 2.215),
  ];
  body.add(mesh(merge(glass), GLASS, 'greenhouse'));
  // window pillars over the side glass
  body.add(
    mesh(merge([0.65, -0.15, -0.95].flatMap((z) => both((sd) => box(0.02, 0.38, 0.1, sd * (HALF + 0.02), 1.38, z)))), WHITE, 'pillars'),
  );
  // round headlights low on the nose, a plain round badge, bumpers, small rear lamps, roof gutter
  body.add(
    mesh(
      merge(
        both((sd) =>
          cyl(0.13, 0.06, 18)
            .rotateX(Math.PI / 2)
            .translate(sd * 0.62, 0.9, -2.25),
        ),
      ),
      HEAD,
      'headlights',
    ),
  );
  body.add(
    mesh(
      merge([
        cyl(0.13, 0.03, 20)
          .rotateX(Math.PI / 2)
          .translate(0, 1.0, -2.27),
        box(W + 0.06, 0.1, 0.12, 0, 0.42, -2.28),
        box(W + 0.06, 0.1, 0.12, 0, 0.44, 2.27),
      ]),
      CHROME,
      'chrome',
    ),
  );
  body.add(mesh(merge(both((sd) => rb(0.1, 0.2, 0.05, 0.03, sd * 0.78, 0.92, 2.22))), TAIL_SMALL, 'taillights'));
  addArmorPlates(body, { halfW: HALF, rearZ: 2.25, y: 0.7, w: 1.5, h: 0.4, sideLen: 2.4, sideZ: 0.1 });
  addWheels(root, { r: R, width: 0.24, rim: WHITE, spokes: 0, rimR: 0.55 }, HALF - 0.08, [-1.45, 1.3]);
}

// ======================================================================
// Thief: Fusca envenenado (lowered, bigger rear wheels, separate round fenders, twin exhaust, engine lid open a bit)
// ======================================================================
export function buildFusca(root: THREE.Group, body: THREE.Group): void {
  const W = 1.42;
  const HALF = W / 2;
  const BODY = mainPaint(0xff7a12, 0.35);
  const RF = 0.31;
  const RR = 0.37;
  const ZF = -1.22; // body z (front at -z)
  const ZR = 1.2;
  const XW = HALF + 0.03; // wheel and fender centre, out of the narrow tub
  // lower tub to the belt line: short hood dropping to the nose, round engine lid
  const tub: P[] = [
    [1.98, 0.36],
    [2.02, 0.56],
    [1.8, 0.76],
    [1.4, 0.88],
    [1.0, 0.93],
    [-1.05, 0.93],
    [-1.55, 0.84],
    [-1.9, 0.66],
    [-2.0, 0.48],
    [-2.0, 0.36],
  ];
  // separate round fenders (side profile, front at +x): a thick arc over each wheel
  const fender = (z: number, r: number, front: boolean) => {
    const n = 14;
    const arc = (rad: number, a0: number, a1: number) =>
      Array.from({ length: n + 1 }, (_, i): P => {
        const a = a0 + (i / n) * (a1 - a0);
        return [-z + Math.cos(a) * rad, r + Math.sin(a) * rad];
      });
    // front fender runs further forward and lower (where the headlight sits), the rear one further back
    const [a0, a1] = front ? [0.05, Math.PI - 0.35] : [0.35, Math.PI - 0.05];
    return both((sd) => sidePoly([...arc(r + 0.17, a0, a1), ...arc(r + 0.04, a0, a1).reverse()], 0.28, 0.05).translate(sd * XW, 0, 0));
  };
  body.add(
    mesh(
      merge([
        shellFrom(tub, { rear: -2.0, front: 2.0, axleR: -ZR, axleF: -ZF, floor: 0.32, arch: RR + 0.05, wheelR: RR, width: W, bevel: 0.14 }),
        ...fender(ZF, RF, true),
        ...fender(ZR, RR, false),
      ]),
      BODY,
      'shell',
    ),
  );
  // narrow rounded cabin: dark glass all round, a painted roof cap and the pillars
  const cabin: P[] = [
    [1.0, 0.92],
    [0.62, 1.27],
    [0.3, 1.36],
    [-0.3, 1.37],
    [-0.75, 1.3],
    [-1.15, 1.06],
    [-1.3, 0.92],
  ];
  body.add(mesh(sidePoly(cabin, 1.2, 0.12), GLASS, 'greenhouse'));
  const cap: P[] = [
    [0.55, 1.3],
    [0.3, 1.385],
    [-0.3, 1.395],
    [-0.72, 1.33],
    [-0.62, 1.28],
    [0.45, 1.28],
  ];
  body.add(mesh(merge([sidePoly(cap, 1.22, 0.1), ...both((sd) => box(0.04, 0.38, 0.1, sd * 0.6, 1.1, 0.02))]), BODY, 'roof'));
  body.add(mesh(merge(both((sd) => box(0.16, 0.05, 1.3, sd * XW, 0.36, 0.0))), PLASTIC, 'boards'));
  // round headlights on top of the front fenders, small lamps on the rear fenders
  body.add(
    mesh(
      merge(
        both((sd) =>
          cyl(0.1, 0.1, 16)
            .rotateX(Math.PI / 2 - 0.35)
            .translate(sd * XW, RF + 0.36, ZF - 0.32),
        ),
      ),
      HEAD,
      'headlights',
    ),
  );
  body.add(mesh(merge(both((sd) => rb(0.1, 0.18, 0.08, 0.03, sd * XW, RR + 0.3, ZR + 0.32))), TAIL_SMALL, 'taillights'));
  // chrome bumpers, twin exhaust out of the back, engine lid propped open (the "envenenado" look)
  body.add(
    mesh(
      merge([
        box(W + 0.36, 0.07, 0.08, 0, 0.4, -2.05),
        box(W + 0.36, 0.07, 0.08, 0, 0.4, 2.05),
        ...both((sd) =>
          cyl(0.06, 0.34, 12)
            .rotateX(Math.PI / 2)
            .translate(sd * 0.28, 0.3, 2.1),
        ),
      ]),
      CHROME,
      'chrome',
    ),
  );
  body.add(mesh(rb(0.78, 0.04, 0.48, 0.02, 0, 0.94, 1.55).rotateX(0), BODY, 'lid'));
  body.add(mesh(merge(both((sd) => box(0.03, 0.1, 0.03, sd * 0.33, 0.9, 1.36))), CHROME, 'lid-stays'));
  addArmorPlates(body, { halfW: XW + 0.14, rearZ: 2.08, y: 0.6, w: 1.3, h: 0.34, sideLen: 1.6, sideZ: 0.0 });
  addWheels(root, { r: RF, width: 0.2, rim: CHROME, spokes: 5, rimR: 0.6 }, XW, [ZF]);
  addWheels(root, { r: RR, width: 0.26, rim: CHROME, spokes: 5, rimR: 0.66 }, XW, [ZR]);
}

const TAIL_SMALL = new THREE.MeshStandardMaterial({ color: 0x7a0a0f, emissive: 0xff1a1a, emissiveIntensity: 1.8 });
