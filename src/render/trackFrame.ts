// Centro da pista no mundo: integra a curvatura da sim (direção θ(s) = ∫κ ds) e converte (s, x) em posição.
// Convenção do render: θ = 0 aponta para −z (a rua reta antiga); κ > 0 vira para +x (direita).
// Posições sempre relativas à origem móvel (originS), em números pequenos — sem tremer longe do início.
import { curvatureAt } from '../sim/curves';

const STEP = 1; // m entre amostras

export interface TrackFrame {
  toWorld(s: number, x: number, originS: number): { x: number; z: number; heading: number };
  headingAt(s: number): number;
}

export function createTrackFrame(seed: number, curvesOn: boolean): TrackFrame {
  // amostras a cada 1 m: direção e posição absoluta do centro
  const th: number[] = [0];
  const px: number[] = [0];
  const pz: number[] = [0];
  const extend = (i: number) => {
    for (let k = th.length; k <= i + 1; k++) {
      const s0 = (k - 1) * STEP;
      const kMid = curvatureAt(seed, s0 + STEP / 2, curvesOn);
      const thMid = th[k - 1]! + kMid * (STEP / 2);
      th.push(th[k - 1]! + kMid * STEP);
      px.push(px[k - 1]! + Math.sin(thMid) * STEP);
      pz.push(pz[k - 1]! - Math.cos(thMid) * STEP);
    }
  };
  const center = (s: number) => {
    if (s < 0) return { x: 0, z: -s, heading: 0 }; // antes da largada a rua é reta (câmera e retrovisor atrás do carro)
    const sc = s;
    const i = Math.floor(sc / STEP);
    extend(i);
    const f = (sc - i * STEP) / STEP;
    const heading = th[i]! + (th[i + 1]! - th[i]!) * f;
    const thMid = th[i]! + (heading - th[i]!) / 2;
    const d = sc - i * STEP;
    return { x: px[i]! + Math.sin(thMid) * d, z: pz[i]! - Math.cos(thMid) * d, heading };
  };

  if (!curvesOn) {
    // reta: igual ao mapeamento antigo, sem custo
    return { toWorld: (s, x, o) => ({ x, z: -(s - o), heading: 0 }), headingAt: () => 0 };
  }
  let lastO = NaN;
  let o = { x: 0, z: 0, heading: 0 };
  return {
    toWorld(s, x, originS) {
      const c = center(s);
      if (originS !== lastO) {
        lastO = originS; // a origem muda a cada 50 m: centenas de chamadas por quadro reaproveitam
        o = center(originS);
      }
      return { x: c.x - o.x + Math.cos(c.heading) * x, z: c.z - o.z + Math.sin(c.heading) * x, heading: c.heading };
    },
    headingAt: (s) => center(s).heading,
  };
}

// Frame ativo da partida (um jogo por vez): os módulos de render posicionam tudo por aqui.
let active: TrackFrame = createTrackFrame(0, false);
export function setActiveTrackFrame(frame: TrackFrame): void {
  active = frame;
}
/** posição no mundo de (s, x) com a origem móvel; heading = direção da pista ali (0 = −z) */
export function trackPos(s: number, x: number, originS: number): { x: number; z: number; heading: number } {
  return active.toWorld(s, x, originS);
}
