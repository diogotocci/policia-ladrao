// Track center in the world: integrates the sim's curvature (heading θ(s) = ∫κ ds) and converts (s, x) to a position.
// Render convention: θ = 0 points to −z (the old straight road); κ > 0 turns toward +x (right).
// Positions are always relative to the moving origin (originS), in small numbers — no jitter far from the start.
import { curvatureAt } from '../sim/curves';

const STEP = 1; // m between samples

export interface TrackFrame {
  toWorld(s: number, x: number, originS: number): { x: number; z: number; heading: number };
  headingAt(s: number): number;
}

export function createTrackFrame(seed: number, curvesOn: boolean): TrackFrame {
  // samples every 1 m: heading and absolute position of the center
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
    if (s < 0) return { x: 0, z: -s, heading: 0 }; // before the start the road is straight (camera and rearview behind the car)
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
    // straight: same as the old mapping, at no cost
    return { toWorld: (s, x, o) => ({ x, z: -(s - o), heading: 0 }), headingAt: () => 0 };
  }
  let lastO = NaN;
  let o = { x: 0, z: 0, heading: 0 };
  return {
    toWorld(s, x, originS) {
      const c = center(s);
      if (originS !== lastO) {
        lastO = originS; // the origin changes every 50 m: hundreds of calls per frame reuse it
        o = center(originS);
      }
      return { x: c.x - o.x + Math.cos(c.heading) * x, z: c.z - o.z + Math.sin(c.heading) * x, heading: c.heading };
    },
    headingAt: (s) => center(s).heading,
  };
}

// Active frame of the match (one game at a time): the render modules position everything through it.
let active: TrackFrame = createTrackFrame(0, false);
export function setActiveTrackFrame(frame: TrackFrame): void {
  active = frame;
}
/** world position of (s, x) with the moving origin; heading = road direction there (0 = −z) */
export function trackPos(s: number, x: number, originS: number): { x: number; z: number; heading: number } {
  return active.toWorld(s, x, originS);
}
