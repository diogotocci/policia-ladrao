import * as THREE from 'three';
import { QUALITY, type QualityTier } from './renderer';
import { makeSkyTexture } from './textures';

/** Céu, neblina, luz ambiente, reflexos e sol com sombra que acompanha o carro. */
export function createLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): { reflections: THREE.Texture; follow(x: number, z: number, heading?: number): void; setQuality(tier: QualityTier): void } {
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xd3dbe2, 110, 300);

  const pmrem = new THREE.PMREMGenerator(renderer);
  // reflexos só nos carros (aplicados por quem cria os carros); prédios e rua ficam com a luz difusa
  const reflections = pmrem.fromScene(makeStreetEnvironment(), 0.02).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xe4eeff, 0x6a6052, 1.7));

  const sun = new THREE.DirectionalLight(0xffe4bd, 3.0);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // Caixa de sombra em volta do carro, alinhada à luz; calculada uma vez (a direção do sol é fixa).
  const basis = new THREE.Matrix4().lookAt(SUN_DIR, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
  const inv = basis.clone().invert();
  const zMid = -(SHADOW_BOX.ahead - SHADOW_BOX.behind) / 2;
  const halfLen = (SHADOW_BOX.ahead + SHADOW_BOX.behind) / 2;
  const cam = sun.shadow.camera;
  let mapSize = 0;
  let texelX = 1;
  let texelY = 1;
  let boxHeading = Number.NaN;
  const corner = new THREE.Vector3();
  const box = new THREE.Box3();
  /** caixa de sombra girada com a direção da pista (nas curvas a rua à frente muda de direção) */
  const fitBox = (heading: number) => {
    boxHeading = heading;
    box.makeEmpty();
    const c = Math.cos(heading);
    const s = Math.sin(heading);
    for (const x of [-SHADOW_BOX.halfWidth, SHADOW_BOX.halfWidth])
      for (const y of [0, SHADOW_BOX.height])
        for (const z of [-halfLen, halfLen]) box.expandByPoint(corner.set(x * c - z * s, y, x * s + z * c).applyMatrix4(inv));
    cam.left = box.min.x;
    cam.right = box.max.x;
    cam.bottom = box.min.y;
    cam.top = box.max.y;
    // a luz fica a SUN_DISTANCE do centro, olhando para ele: profundidade em volta disso
    cam.near = Math.max(0.1, SUN_DISTANCE - box.max.z);
    cam.far = SUN_DISTANCE - box.min.z;
    cam.updateProjectionMatrix();
    if (mapSize > 0) {
      texelX = (cam.right - cam.left) / mapSize;
      texelY = (cam.top - cam.bottom) / mapSize;
    }
  };
  fitBox(0);
  const local = new THREE.Vector3();
  const sunDir = SUN_DIR.clone().normalize();

  return {
    reflections,
    follow(x, z, heading = 0) {
      if (Math.abs(heading - boxHeading) > 0.03) fitBox(heading); // refaz só quando a direção muda de verdade
      // centro da caixa (à frente na direção da pista) em coordenadas da luz, arredondado ao texel
      local.set(x - Math.sin(heading) * zMid, 0, z + Math.cos(heading) * zMid).applyMatrix4(inv);
      local.x = snapToGrid(local.x, texelX);
      local.y = snapToGrid(local.y, texelY);
      local.applyMatrix4(basis);
      sun.target.position.copy(local);
      sun.position.copy(local).addScaledVector(sunDir, SUN_DISTANCE);
    },
    setQuality(tier) {
      const size = QUALITY[tier].shadowMapSize;
      sun.castShadow = size > 0;
      mapSize = size;
      if (size > 0) {
        texelX = (cam.right - cam.left) / size;
        texelY = (cam.top - cam.bottom) / size;
        if (sun.shadow.mapSize.x !== size) {
          sun.shadow.mapSize.set(size, size);
          sun.shadow.map?.dispose();
          sun.shadow.map = null;
        }
      }
    },
  };
}

/** Área coberta por sombras projetadas, relativa ao carro (m). Vai até onde a neblina começa. */
export const SHADOW_BOX = { ahead: 120, behind: 15, halfWidth: 28, height: 48 } as const;
/** Direção de onde vem o sol (alto, atrás e à esquerda da câmera). */
const SUN_DIR = new THREE.Vector3(-30, 50, 12);
const SUN_DISTANCE = 150;

export function snapToGrid(v: number, step: number): number {
  return Math.round(v / step) * step;
}

/**
 * Ambiente para reflexos: céu claro em cima, "prédios" escuros no horizonte e asfalto embaixo.
 * (Um ambiente branco tipo estúdio deixava o carro preto prateado.)
 */
function makeStreetEnvironment(): THREE.Scene {
  const env = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 16);
  const pos = geo.attributes.position!;
  const colors = new Float32Array(pos.count * 3);
  const sky = new THREE.Color(0x9fc2ea);
  const zenith = new THREE.Color(0x4f86cf);
  const city = new THREE.Color(0x3a3c40);
  const ground = new THREE.Color(0x1c1d20);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50; // -1..1
    if (y > 0.35) c.copy(sky).lerp(zenith, (y - 0.35) / 0.65);
    else if (y > -0.05) c.copy(city).lerp(sky, Math.max(0, (y - 0.15) / 0.2));
    else c.copy(ground);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  return env;
}
