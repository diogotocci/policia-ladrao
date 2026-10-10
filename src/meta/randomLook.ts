// The computer's look (playtest 2026-10-08), apart from shop.ts to keep it small.
import type { Role } from '../config/balance';
import { CARS, NEONS, NEON_IDS, SOUNDS, SOUND_IDS, carsOf, type CarLook } from './shop';

/**
 * The computer's car (playtest 2026-10-08): any car of its side with a random paint, neon, plate and siren/horn,
 * drawn once per match. Visual and sound only, like the player's.
 */
export function randomLook(role: Role, rand: () => number = Math.random): CarLook {
  const pick = <T>(list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;
  const car = pick(carsOf(role));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  // Mercosul pattern: 3 letters, digit, letter, 2 digits
  const plate = [letters, letters, letters, digits, letters, digits, digits].map((set) => pick(set.split(''))).join('');
  return {
    car,
    paint: pick(CARS[car].colors),
    neon: rand() < 0.5 ? null : NEONS[pick(NEON_IDS)].color,
    plate: rand() < 0.5 ? plate : null,
    sound: rand() < 0.3 ? null : pick(SOUND_IDS.filter((x) => SOUNDS[x].role === role)),
  };
}
