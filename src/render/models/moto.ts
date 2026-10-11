// Moto com carona (V2 part 4, thief 2): a motorcycle with a driver and a passenger. Visual only: same hitbox.
import * as THREE from 'three';
import {
  CHROME,
  HEAD,
  PLASTIC,
  RUBBER,
  TAIL,
  TINT,
  addArmorPlates,
  both,
  box,
  cyl,
  mainPaint,
  matte,
  merge,
  mesh,
  metal,
  rb,
  sidePoly,
} from './kit';

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
  buildBike(root, body, { paint: 0xd0151c, jacket: 0xb01818, helmet: 0x111113 });
}

/** The motorcycle of both sides: the thief's Moto com carona and the police Rocam (V2 part 6 delivery 3). */
export function buildBike(root: THREE.Group, body: THREE.Group, o: { paint: number; jacket: number; helmet: number }): void {
  const RED = mainPaint(o.paint);
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
  const driver = rider(o.jacket, o.helmet, 0.55, 0.42, 'driver');
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
