// Maps (mockups approved 2026-10-17): unlocked by wins, a loop of stretches, the pick kept on the device.
import { describe, expect, it } from 'vitest';
import { LOOPS, MAPS, MAP_IDS, loopLength, mapNeed, mapUnlocked, segmentAt, segmentStart } from '../../src/meta/maps';
import { MAP_KEY, loadMap, saveMap } from '../../src/storage/map';
import { memStorage } from '../account/memStorage';

describe('maps', () => {
  it('four maps, unlocked by wins only: Cidade from the start, Paris 20, Rio 30, Nova York 40', () => {
    expect(MAP_IDS.map((m) => [MAPS[m].name, MAPS[m].wins])).toEqual([
      ['Cidade', 0],
      ['Paris', 20],
      ['Rio de Janeiro', 30],
      ['Nova York', 40],
    ]);
    expect(mapUnlocked('paris', 19)).toBe(false);
    expect(mapUnlocked('paris', 20)).toBe(true);
    expect(mapUnlocked('ny', 39)).toBe(false);
    expect(mapNeed('rio')).toBe('Vença 30 partidas');
  });

  it('New York loops: Brooklyn, Times Square, Central Park, the bridge, and Brooklyn again; one lap is 3 km', () => {
    expect(loopLength('ny')).toBe(3000);
    expect([0, 799, 800, 1600, 2400, 2999, 3000, 3800].map((s) => segmentAt('ny', s))).toEqual([
      'ny-brooklyn',
      'ny-brooklyn',
      'ny-times',
      'ny-park',
      'ny-bridge',
      'ny-bridge',
      'ny-brooklyn',
      'ny-times',
    ]);
    expect(segmentStart('ny', 2450)).toBe(2400);
    expect(segmentStart('ny', 3000 + 2450)).toBe(5400);
    expect(segmentAt('ny', -40)).toBe('ny-brooklyn'); // behind the start
  });

  it('every stretch is a whole number of 50 m chunks (a chunk never mixes two looks)', () => {
    for (const m of MAP_IDS) for (const [, len] of LOOPS[m]) expect(len % 50).toBe(0);
    expect(segmentAt('paris', 700)).toBe('paris-park');
    expect(segmentAt('rio', 12345)).toBe('rio');
  });

  it('the pick is kept on the device; a map still locked (or unknown) falls back to the city', () => {
    const s = memStorage();
    expect(loadMap(s, 100)).toBe('city');
    saveMap(s, 'rio');
    expect(s.getItem(MAP_KEY)).toBe('rio');
    expect(loadMap(s, 30)).toBe('rio');
    expect(loadMap(s, 29)).toBe('city');
    s.setItem(MAP_KEY, 'tokyo');
    expect(loadMap(s, 100)).toBe('city');
  });
});
