// The map picked on the side choice (maps, 2026-10-17). Kept on the device, like the mode and the difficulty.
// Never throws; unknown or still locked: the city.
import { DEFAULT_MAP, isMapId, mapUnlocked, type MapId } from '../meta/maps';
import { readPref, writePref } from './prefs';

export const MAP_KEY = 'pl.map.v1';

export function loadMap(storage: Storage | undefined, wins: number): MapId {
  const v = readPref(storage, MAP_KEY);
  return isMapId(v) && mapUnlocked(v, wins) ? v : DEFAULT_MAP;
}

export function saveMap(storage: Storage | undefined, map: MapId): void {
  writePref(storage, MAP_KEY, map);
}
