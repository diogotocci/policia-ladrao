// V2 part 6, delivery 4 (mockups approved 2026-10-12): police Rodoviária PRF, a long sedan in the PRF livery.
// Body coordinates: front at -z; side profiles have the front at +x (shellFrom / sidePoly). Visual only.
import * as THREE from 'three';
import {
  GLASS,
  PLASTIC,
  addEmergency,
  addWheels,
  both,
  box,
  canvasTex,
  decal,
  decalSet,
  lamps,
  mainPaint,
  matte,
  merge,
  mesh,
  metal,
  paint,
  rb,
  shellFrom,
  sideDecals,
  sidePoly,
  textTex,
  type P,
} from './kit';

type B = (root: THREE.Group, body: THREE.Group) => void;

// ======================================================================
// Police: Rodoviária PRF (long sedan in the PRF livery)
// ======================================================================
export const buildPrf: B = (root, body) => {
  // PRF livery (reference photos, 2026-10-12): navy body, white roof, yellow band with a white pinstripe, PRF in
  // yellow on the doors, the hood and the rear glass, yellow and white chevrons at the back, 191 on the rear quarter
  const W = 1.9,
    HALF = W / 2,
    R = 0.36;
  const NAVY = mainPaint(0x1d2b5c, 0.35);
  const YELLOW = paint(0xf2c418, 0.4);
  const WHITE = paint(0xf3f4f6, 0.4);
  const top: P[] = [
    [2.45, 0.48],
    [2.42, 0.72],
    [1.4, 0.84],
    [-1.75, 0.88],
    [-2.4, 0.86],
    [-2.48, 0.5],
  ];
  body.add(
    mesh(
      shellFrom(top, { rear: -2.48, front: 2.45, axleR: -1.55, axleF: 1.5, floor: 0.26, arch: 0.47, wheelR: R, width: W }),
      NAVY,
      'shell',
    ),
  );
  body.add(
    mesh(
      sidePoly(
        [
          [-1.75, 0.86],
          [-1.0, 1.33],
          [0.5, 1.35],
          [1.35, 0.84],
        ],
        1.64,
      ),
      GLASS,
      'greenhouse',
    ),
  );
  body.add(mesh(rb(1.52, 0.05, 1.35, 0.03, 0, 1.36, 0.25), WHITE, 'roof'));
  // yellow band on the belt line with a white pinstripe under it, from behind the front arch to the tail (broken by
  // the rear arch), and a white pinstripe above the sill between the arches
  const pieces: [number, number][] = [
    [-1.22, 1.27],
    [1.83, 2.4],
  ];
  const along = (y: number, h: number, d: number) =>
    pieces.flatMap(([z0, z1]) => both((sd) => box(0.02, h, z1 - z0, sd * (HALF + d), y, (z0 + z1) / 2)));
  body.add(mesh(merge(along(0.79, 0.1, 0.006)), YELLOW, 'band'));
  body.add(
    mesh(
      merge([...along(0.725, 0.022, 0.008), ...both((sd) => box(0.02, 0.025, 2.0, sd * (HALF + 0.008), 0.34, 0.02))]),
      WHITE,
      'pinstripe',
    ),
  );
  const prf = () => textTex('PRF', '#f2c418', 110);
  sideDecals(body, prf, 1.15, 0.3, HALF + 0.012, 0.52, 0.2, 'decal-prf');
  // hood: readable from the front; rear glass: readable from behind (the chase camera)
  const hood = new THREE.PlaneGeometry(0.95, 0.25)
    .rotateY(Math.PI)
    .rotateX(Math.PI / 2 - 0.12)
    .translate(0, 0.785, -1.95);
  const glassA = Math.atan2(1.75 - 1.0, 1.33 - 0.86);
  const rear = new THREE.PlaneGeometry(1.05, 0.28)
    .rotateX(-glassA)
    .translate(0, 1.1 + 0.02 * Math.sin(glassA), 1.37 + 0.02 * Math.cos(glassA));
  const prfTop = decal(prf(), 1, 1, 'decal-prf-top');
  prfTop.geometry.dispose();
  prfTop.geometry = merge([hood, rear]);
  body.add(prfTop);
  // 191 on the rear quarters, yellow and white chevrons on the back panel and the hood sides
  sideDecals(body, () => textTex('191', '#f3f4f6', 90), 0.36, 0.1, HALF + 0.012, 0.55, 2.2, 'decal-191');
  const chevrons = () =>
    canvasTex(256, 48, (g) => {
      for (let i = -2; i < 14; i++) {
        g.fillStyle = i % 2 ? '#f3f4f6' : '#f2c418';
        g.beginPath();
        g.moveTo(i * 20, 48);
        g.lineTo(i * 20 + 12, 48);
        g.lineTo(i * 20 + 30, 0);
        g.lineTo(i * 20 + 18, 0);
        g.fill();
      }
    });
  body.add(decalSet(chevrons(), [{ w: 0.68, h: 0.12, x: 0, y: 0.56, z: 2.475, ry: 0 }], 'decal-chevrons'));
  body.add(
    mesh(
      merge(
        both((sd) =>
          rb(0.18, 0.02, 1.0, 0.01)
            .rotateX(-0.118)
            .translate(sd * 0.55, 0.805, -1.75),
        ),
      ),
      YELLOW,
      'hood-stripes',
    ),
  );
  // generic gold shield and a small flag on the front doors
  const badge = () =>
    canvasTex(128, 64, (g) => {
      g.fillStyle = '#d6a92a';
      g.beginPath();
      g.moveTo(8, 6);
      g.lineTo(52, 6);
      g.lineTo(52, 36);
      g.lineTo(30, 58);
      g.lineTo(8, 36);
      g.fill();
      g.fillStyle = '#1d2b5c';
      g.fillRect(18, 16, 24, 18);
      g.fillStyle = '#1f9a3a';
      g.fillRect(70, 14, 50, 34);
      g.fillStyle = '#f2c418';
      g.beginPath();
      g.moveTo(95, 17);
      g.lineTo(117, 31);
      g.lineTo(95, 45);
      g.lineTo(73, 31);
      g.fill();
      g.fillStyle = '#1d3f9a';
      g.beginPath();
      g.arc(95, 31, 8, 0, Math.PI * 2);
      g.fill();
    });
  sideDecals(body, badge, 0.5, 0.25, HALF + 0.012, 0.5, -0.75, 'decal-badge');
  // black push bar, lightbar
  body.add(
    mesh(
      merge([
        box(W - 0.3, 0.06, 0.06, 0, 0.62, -2.55),
        box(W - 0.3, 0.06, 0.06, 0, 0.38, -2.55),
        ...both((sd) => box(0.06, 0.34, 0.06, sd * 0.55, 0.5, -2.55)),
      ]),
      matte(0x111214),
      'pushbar',
    ),
  );
  body.add(mesh(rb(1.6, 0.08, 0.3, 0.02, 0, 1.4, 0.0), PLASTIC, 'lightbar-base'));
  addEmergency(
    body,
    [rb(0.72, 0.12, 0.26, 0.04, -0.4, 1.48, 0.0), rb(0.2, 0.06, 0.03, 0.02, -0.3, 0.55, -2.58)],
    [rb(0.72, 0.12, 0.26, 0.04, 0.4, 1.48, 0.0), rb(0.2, 0.06, 0.03, 0.02, 0.3, 0.55, -2.58)],
  );
  lamps(body, HALF, 2.45, 2.47, 0.66, 0.74, 0.42, 0.5);
  addWheels(root, { r: R, width: 0.28, rim: metal(0x1b1d22, 0.3), spokes: 5, rimR: 0.66 }, HALF - 0.1, [-1.5, 1.55]);
};
