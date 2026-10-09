// Caveirão (shop, police car 3): black armored truck. Boxy armored body, small windows, big off-road tires,
// push bar, roof hatch and lights. Front at -z, like the other models. Built from merged geometry per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { decalSet } from './kit';
import { word, badge, hazardStripes, decalMesh } from './caveiraoDecals';

export const CAVEIRAO_WHEEL_RADIUS = 0.5;

const ARMOR = new THREE.MeshPhysicalMaterial({
  color: 0x1e2126,
  roughness: 0.5,
  metalness: 0.15,
  clearcoat: 0.35,
  clearcoatRoughness: 0.3,
});
ARMOR.userData.paint = true; // the shop paint recolours it
const SEAM = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.8 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x3b4047, roughness: 0.4, metalness: 0.8 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.7 });
const GLASS = new THREE.MeshPhysicalMaterial({ color: 0x1a2733, roughness: 0.1, metalness: 0.2, clearcoat: 1 });
const RUBBER = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
const RIM = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.45, metalness: 0.7 });
const HEAD = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c4, emissiveIntensity: 0.8 });
const TAIL = new THREE.MeshStandardMaterial({ color: 0x7a0a0f, emissive: 0xff1a1a, emissiveIntensity: 1.8 });
const AMBER = new THREE.MeshStandardMaterial({ color: 0x8a4a00, emissive: 0xff9a1a, emissiveIntensity: 1.2 });

const box = (w: number, h: number, l: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, l).translate(x, y, z);
const rb = (w: number, h: number, l: number, r: number, x = 0, y = 0, z = 0) => new RoundedBoxGeometry(w, h, l, 2, r).translate(x, y, z);
const both = (make: (sd: number) => THREE.BufferGeometry) => [make(-1), make(1)];
const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)))!;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], name: string) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- dimensions ----------
const W = 2.02; // body width
const HALF = W / 2;
const FRONT = 2.45; // body from -FRONT (nose) to +REAR (tail) along z
const REAR = 2.45;
const AX_F = 1.55; // axles (z = -AX_F front, +AX_R rear)
const AX_R = 1.45;
const R = CAVEIRAO_WHEEL_RADIUS;
const FLOOR = 0.68;
const BELT = 1.55; // window line
const ROOF = 2.35; // tall, but the chase camera must still see over it
const HOOD = 1.55;

/** Side profile (x = along the length, front positive) with square armored arches. */
function hullShape(): THREE.Shape {
  const s = new THREE.Shape();
  const arch = 0.68;
  const archTop = 1.22;
  const c = 0.16; // chamfer on the arch corners
  const archAt = (ax: number) => {
    s.lineTo(ax - arch, FLOOR);
    s.lineTo(ax - arch, archTop - c);
    s.lineTo(ax - arch + c, archTop);
    s.lineTo(ax + arch - c, archTop);
    s.lineTo(ax + arch, archTop - c);
    s.lineTo(ax + arch, FLOOR);
  };
  s.moveTo(-REAR, FLOOR);
  archAt(-AX_R);
  archAt(AX_F);
  s.lineTo(FRONT, FLOOR);
  s.lineTo(FRONT, 1.3);
  s.lineTo(FRONT - 0.18, HOOD); // hood edge
  s.lineTo(1.32, HOOD + 0.08);
  s.lineTo(1.05, ROOF - 0.12); // windshield, slightly raked
  s.lineTo(0.9, ROOF);
  s.lineTo(-REAR + 0.1, ROOF);
  s.lineTo(-REAR, ROOF - 0.1);
  s.lineTo(-REAR, FLOOR);
  return s;
}

function hullGeometry(): THREE.BufferGeometry {
  const bevel = 0.04;
  const g = new THREE.ExtrudeGeometry(hullShape(), {
    depth: W - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: 0, // keep the outline exact (parts sit right on the faces); chamfer only on the side edges
    bevelSegments: 1,
    curveSegments: 4,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-(W - bevel * 2) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

// ---------- wheels ----------
function wheelGeometry(): THREE.BufferGeometry[] {
  const width = 0.4;
  const tire = new THREE.CylinderGeometry(R, R, width, 28).rotateZ(Math.PI / 2);
  // tread blocks around the tire (staggered)
  const tread: THREE.BufferGeometry[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const off = (i % 2 === 0 ? 0.09 : 0.11) * side;
      tread.push(
        box(0.15, 0.06, 0.12)
          .translate(off, R + 0.005, 0)
          .applyMatrix4(new THREE.Matrix4().makeRotationX(a)),
      );
    }
  }
  const rubber = merge([tire, ...tread]);
  const rim = merge([
    new THREE.CylinderGeometry(R * 0.6, R * 0.6, width + 0.02, 18).rotateZ(Math.PI / 2),
    new THREE.CylinderGeometry(0.12, 0.12, width + 0.08, 12).rotateZ(Math.PI / 2), // hub
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return box(width + 0.06, 0.05, 0.05).translate(0, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
    }),
  ]);
  return [rubber, rim];
}

function addWheels(root: THREE.Object3D) {
  const [rubber, rim] = wheelGeometry();
  const geo = mergeGeometries([rubber!, rim!], true)!;
  for (const z of [-AX_F, AX_R]) {
    for (const side of [-1, 1]) {
      const wheel = mesh(geo, [RUBBER, RIM], 'wheel');
      wheel.castShadow = false;
      wheel.userData.r = R;
      wheel.position.set(side * (HALF - 0.08), R, z);
      root.add(wheel);
    }
  }
}

// ---------- the truck ----------
export function buildCaveirao(root: THREE.Group, body: THREE.Group): void {
  body.add(mesh(hullGeometry(), ARMOR, 'shell'));

  // chassis under the body, between the wheels
  body.add(mesh(merge([box(1.5, 0.3, 4.4, 0, 0.6, 0.05), box(0.25, 0.25, 0.8, 0, 0.45, 0)]), DARK, 'chassis'));

  // ----- panel seams (thin dark strips) -----
  const seams: THREE.BufferGeometry[] = [];
  const sideSeam = (z: number, y0: number, y1: number) => both((sd) => box(0.012, y1 - y0, 0.03, sd * (HALF + 0.004), (y0 + y1) / 2, z));
  seams.push(...sideSeam(-0.95, 1.25, ROOF - 0.08)); // front door
  seams.push(...sideSeam(-0.05, FLOOR + 0.05, ROOF - 0.08)); // rear door
  seams.push(...sideSeam(0.75, 1.25, ROOF - 0.08)); // box
  seams.push(...both((sd) => box(0.012, 0.03, FRONT + REAR - 0.3, sd * (HALF + 0.004), BELT, 0.05))); // belt line
  seams.push(...both((sd) => box(0.012, 0.03, 3.5, sd * (HALF + 0.004), 1.2, 0.5))); // lower line
  seams.push(box(0.03, ROOF - BELT - 0.1, 0.012, 0, (ROOF + BELT) / 2 - 0.05, REAR + 0.004)); // rear doors split (above the lettering)
  seams.push(box(W - 0.2, 0.03, 0.012, 0, BELT, REAR + 0.004));
  seams.push(box(W - 0.2, 0.03, 0.03, 0, HOOD + 0.06, -1.6)); // hood vent line
  body.add(mesh(merge(seams), SEAM, 'seams'));

  // ----- bolts along the seams -----
  const bolts: THREE.BufferGeometry[] = [];
  const bolt = (x: number, y: number, z: number, nx: number, nz: number) =>
    bolts.push(box(nx ? 0.035 : 0.05, 0.05, nz ? 0.035 : 0.05, x, y, z));
  for (const sd of [-1, 1]) {
    for (let z = -2.2; z <= 2.3; z += 0.22) bolt(sd * (HALF + 0.012), BELT + 0.07, z, 1, 0);
    for (let z = -0.9; z <= 2.3; z += 0.22) bolt(sd * (HALF + 0.012), 1.27, z, 1, 0);
    for (const z of [-0.95, -0.05, 0.75]) for (let y = 1.4; y <= ROOF - 0.15; y += 0.2) bolt(sd * (HALF + 0.012), y, z + 0.07, 1, 0);
  }
  for (let x = -0.85; x <= 0.86; x += 0.17) bolt(x, BELT + 0.07, REAR + 0.012, 0, 1);
  for (let y = 1.7; y <= ROOF - 0.15; y += 0.2) for (const x of [-0.08, 0.08]) bolt(x, y, REAR + 0.012, 0, 1);
  body.add(mesh(merge(bolts), STEEL, 'bolts'));

  // ----- windows -----
  const glass: THREE.BufferGeometry[] = [];
  const lean = Math.atan2(1.32 - 1.05, ROOF - 0.12 - (HOOD + 0.08)); // windshield rake
  for (const sd of [-1, 1]) {
    glass.push(
      box(0.86, 0.62, 0.03)
        .rotateX(lean)
        .translate(sd * 0.47, (HOOD + 0.08 + ROOF - 0.12) / 2, -(1.32 + 1.05) / 2 - 0.03),
    );
    glass.push(box(0.03, 0.5, 0.62, sd * (HALF + 0.01), 1.92, -0.5)); // front door
    glass.push(box(0.03, 0.42, 0.5, sd * (HALF + 0.01), 1.94, 0.35)); // rear door
    glass.push(box(0.03, 0.2, 0.36, sd * (HALF + 0.01), 2.06, 1.25)); // box slits
    glass.push(box(0.03, 0.2, 0.36, sd * (HALF + 0.01), 2.06, 1.85));
    glass.push(box(0.3, 0.34, 0.03, sd * 0.42, 1.96, REAR + 0.01)); // rear doors
  }
  body.add(mesh(merge(glass), GLASS, 'greenhouse'));

  // window frames, windshield guard bars, gun ports
  const steel: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) {
    const frame = (y: number, h: number, z: number, l: number) => {
      const x = sd * (HALF + 0.02);
      steel.push(box(0.03, 0.05, l + 0.1, x, y + h / 2 + 0.025, z), box(0.03, 0.05, l + 0.1, x, y - h / 2 - 0.025, z));
      steel.push(box(0.03, h, 0.05, x, y, z - l / 2 - 0.025), box(0.03, h, 0.05, x, y, z + l / 2 + 0.025));
    };
    frame(1.92, 0.5, -0.5, 0.62);
    frame(1.94, 0.42, 0.35, 0.5);
    frame(2.06, 0.2, 1.25, 0.36);
    frame(2.06, 0.2, 1.85, 0.36);
    // gun ports (small square hatches under the slits)
    steel.push(rb(0.04, 0.18, 0.18, 0.02, sd * (HALF + 0.02), 1.74, 1.25), rb(0.04, 0.18, 0.18, 0.02, sd * (HALF + 0.02), 1.74, 1.85));
    // door handles
    steel.push(box(0.05, 0.05, 0.2, sd * (HALF + 0.04), 1.42, -0.75), box(0.05, 0.05, 0.2, sd * (HALF + 0.04), 1.42, 0.1));
    // grab handle by the rear corner
    steel.push(box(0.04, 0.6, 0.04, sd * (HALF + 0.07), 1.55, 2.3));
    for (const y of [1.27, 1.83]) steel.push(box(0.07, 0.04, 0.04, sd * (HALF + 0.035), y, 2.3));
    // running board
    steel.push(box(0.26, 0.05, 1.65, sd * (HALF + 0.07), FLOOR - 0.05, -0.05));
    // mirrors
    steel.push(box(0.3, 0.03, 0.03, sd * (HALF + 0.15), 1.9, -1.05), rb(0.06, 0.32, 0.18, 0.02, sd * (HALF + 0.3), 1.9, -1.05));
  }
  // windshield guard: horizontal bars over the glass
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4;
    const y = HOOD + 0.08 + t * (ROOF - 0.12 - HOOD - 0.08);
    const z = -(1.32 - t * (1.32 - 1.05)) - 0.08;
    steel.push(box(W - 0.15, 0.035, 0.035, 0, y, z));
  }
  // rear: door handles, bumper step, hinges
  steel.push(box(0.05, 0.22, 0.05, -0.15, 1.68, REAR + 0.04), box(0.05, 0.22, 0.05, 0.15, 1.68, REAR + 0.04));
  for (const sd of [-1, 1]) for (const y of [1.0, 1.9]) steel.push(box(0.1, 0.12, 0.05, sd * (HALF - 0.04), y, REAR + 0.03));
  // roof rails and hatch
  for (const sd of [-1, 1]) {
    steel.push(box(0.04, 0.04, 3.2, sd * (HALF - 0.1), ROOF + 0.14, 0.7));
    for (const z of [-0.8, 0.7, 2.2]) steel.push(box(0.04, 0.14, 0.04, sd * (HALF - 0.1), ROOF + 0.07, z));
  }
  steel.push(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20).translate(0, ROOF + 0.06, 0.6)); // hatch ring
  steel.push(rb(0.8, 0.32, 0.05, 0.02, 0, ROOF + 0.26, 0.15)); // hatch shield
  steel.push(new THREE.CylinderGeometry(0.008, 0.012, 1.1, 5).translate(-HALF + 0.15, ROOF + 0.55, 2.2)); // antenna
  body.add(mesh(merge(steel), STEEL, 'trim'));

  // ----- front: push bar, grille, winch -----
  const bar: THREE.BufferGeometry[] = [
    rb(W + 0.12, 0.26, 0.24, 0.04, 0, 0.82, -FRONT - 0.14), // bumper
    box(W - 0.3, 0.07, 0.07, 0, 1.42, -FRONT - 0.2), // top tube
    ...[-0.75, -0.25, 0.25, 0.75].map((x) => box(0.07, 0.62, 0.07, x, 1.12, -FRONT - 0.2)), // uprights
    new THREE.CylinderGeometry(0.11, 0.11, 0.5, 14).rotateZ(Math.PI / 2).translate(0, 0.84, -FRONT - 0.3), // winch
    ...both((sd) => box(0.08, 0.12, 0.22, sd * 0.55, 0.82, -FRONT - 0.36)), // tow hooks
  ];
  body.add(mesh(merge(bar), DARK, 'bumpers'));
  const grille: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) grille.push(box(0.9, 0.035, 0.02, 0, 1.0 + i * 0.07, -FRONT - 0.005));
  body.add(mesh(merge(grille), SEAM, 'grille'));

  // ----- lights -----
  const head = both((sd) => new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16).rotateX(Math.PI / 2).translate(sd * 0.7, 1.15, -FRONT - 0.02));
  head.push(...both((sd) => box(0.18, 0.1, 0.04, sd * 0.42, ROOF + 0.12, -0.85))); // roof spot lights
  body.add(mesh(merge(head), HEAD, 'headlights'));
  const tail = both((sd) => box(0.18, 0.36, 0.05, sd * (HALF - 0.16), 1.2, REAR + 0.02));
  body.add(mesh(merge(tail), TAIL, 'taillights'));
  const amber = [
    ...both((sd) => box(0.14, 0.07, 0.04, sd * (HALF - 0.16), 1.45, REAR + 0.02)),
    ...both((sd) => box(0.14, 0.08, 0.04, sd * 0.92, 1.12, -FRONT - 0.02)),
  ];
  body.add(mesh(merge(amber), AMBER, 'indicators'));

  // emergency lights: red on the left, blue on the right (front corners of the roof and the rear)
  for (const [name, color, sd] of [
    ['lightbar-red', 0xff2020, -1],
    ['lightbar-blue', 0x2a5bff, 1],
  ] as const) {
    const m = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.2, clearcoat: 1 });
    const g = merge([
      rb(0.3, 0.13, 0.18, 0.04, sd * (HALF - 0.25), ROOF + 0.08, -0.72),
      rb(0.16, 0.1, 0.1, 0.03, sd * (HALF - 0.5), ROOF + 0.07, -0.72),
      rb(0.2, 0.1, 0.06, 0.03, sd * (HALF - 0.2), ROOF - 0.1, REAR + 0.03),
      rb(0.12, 0.08, 0.05, 0.02, sd * 0.35, 1.3, -FRONT - 0.33), // in the push bar
    ]);
    body.add(mesh(g, m, name));
  }

  // ----- rear bumper with hazard stripes -----
  body.add(mesh(rb(W + 0.04, 0.24, 0.22, 0.03, 0, 0.78, REAR + 0.1), DARK, 'rear-bumper'));
  const stripes = decalMesh(hazardStripes(), W, 0.2, 'stripes', false);
  stripes.position.set(0, 0.78, REAR + 0.215);
  body.add(stripes);

  // ----- lettering: one mesh for the words, one for the badges -----
  const side = (sd: number) => ({ ry: sd * (Math.PI / 2), x: sd * (HALF + 0.006) });
  body.add(
    decalSet(
      word(96),
      [
        { w: 1.6, h: 0.4, y: 1.38, z: 1.6, ...side(-1) }, // between the box seam and the tail
        { w: 1.6, h: 0.4, y: 1.38, z: 1.6, ...side(1) },
        { w: 1.5, h: 0.38, x: 0, y: 1.3, z: REAR + 0.006 },
      ],
      'decal-words',
    ),
  );
  body.add(
    decalSet(
      badge(),
      [
        { w: 0.38, h: 0.38, y: 1.42, z: -0.48, ...side(-1) },
        { w: 0.38, h: 0.38, y: 1.42, z: -0.48, ...side(1) },
        { w: 0.5, h: 0.5, x: 0, y: HOOD + 0.05, z: -1.85, rx: -Math.PI / 2 - 0.07 },
      ],
      'decal-badges',
    ),
  );

  addWheels(root);
}
