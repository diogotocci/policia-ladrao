// Maps (mockups approved 2026-10-17): the same road, rules, curves and speed bumps in a different scenery. A map is
// unlocked by winning matches (any map, any side; no coins) and picked on the side choice. One global ranking for all.
// Pure data: the render side (render/mapThemes.ts) turns each segment into buildings, ground and props.

export const MAP_IDS = ['city', 'paris', 'rio', 'ny'] as const;
export type MapId = (typeof MAP_IDS)[number];

export interface MapInfo {
  name: string;
  /** one line for the map sheet and the shop */
  text: string;
  /** wins (profile.stats.wins) to unlock it */
  wins: number;
}

export const MAPS: Record<MapId, MapInfo> = {
  city: { name: 'Cidade', text: 'O mapa de sempre: prédios, quebra-molas e curvas.', wins: 0 },
  paris: { name: 'Paris', text: 'Prédios clássicos, árvores, o parque do Champ de Mars e a Torre Eiffel ao fundo.', wins: 20 },
  rio: { name: 'Rio de Janeiro', text: 'Orla com prédios baixos, praia do lado e o Cristo Redentor ao fundo.', wins: 30 },
  ny: { name: 'Nova York', text: 'Brooklyn, Times Square, Central Park e a ponte do Brooklyn, em looping.', wins: 40 },
};

export const DEFAULT_MAP: MapId = 'city';

/** The stretches a map is made of; the road walks through them in order and starts over (a loop with no end). */
export type Segment = 'city' | 'paris-avenue' | 'paris-park' | 'rio' | 'ny-brooklyn' | 'ny-times' | 'ny-park' | 'ny-bridge';

/** [segment, length in m]; lengths are multiples of 50 m (a render chunk). New York: one lap ≈ 3 km ≈ 90 s. */
export const LOOPS: Record<MapId, readonly (readonly [Segment, number])[]> = {
  city: [['city', 1000]],
  paris: [
    ['paris-avenue', 700],
    ['paris-park', 500],
  ],
  rio: [['rio', 1000]],
  ny: [
    ['ny-brooklyn', 800],
    ['ny-times', 800],
    ['ny-park', 800],
    ['ny-bridge', 600],
  ],
};

export const loopLength = (map: MapId): number => LOOPS[map].reduce((t, [, len]) => t + len, 0);

/** The segment at distance `s` along the road (before the start: the first one). */
export function segmentAt(map: MapId, s: number): Segment {
  const loop = LOOPS[map];
  let d = ((Math.max(0, s) % loopLength(map)) + loopLength(map)) % loopLength(map);
  for (const [seg, len] of loop) {
    if (d < len) return seg;
    d -= len;
  }
  return loop[0]![0];
}

/** Where the segment at `s` started (m along the road). */
export function segmentStart(map: MapId, s: number): number {
  const lap = loopLength(map);
  const base = Math.floor(Math.max(0, s) / lap) * lap;
  let d = Math.max(0, s) - base;
  let at = base;
  for (const [, len] of LOOPS[map]) {
    if (d < len) return at;
    d -= len;
    at += len;
  }
  return base;
}

export const isMapId = (x: unknown): x is MapId => typeof x === 'string' && (MAP_IDS as readonly string[]).includes(x);

/** unlocked with that many wins */
export const mapUnlocked = (map: MapId, wins: number): boolean => wins >= MAPS[map].wins;

/** the admin account (testing) has every map, like the whole shop */
export const ADMIN_WINS = Number.POSITIVE_INFINITY;

/** "Vença 20 partidas" */
export const mapNeed = (map: MapId): string => `Vença ${MAPS[map].wins} partidas`;
