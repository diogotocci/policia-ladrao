// How the car is steered on touch screens (Opções, mockup approved 2026-10-16). Kept on the device: it depends on
// the phone and the hands, not on the account. Never throws; anything unknown is the arrows.
import type { Steering } from '../input/touchButtons';
import { openStorage, readPref, writePref } from './prefs';

export const STEERING_KEY = 'pl.steering.v1';

export function loadSteering(storage: Storage | undefined = openStorage()): Steering {
  return readPref(storage, STEERING_KEY) === 'stick' ? 'stick' : 'arrows';
}

export function saveSteering(storage: Storage | undefined, steering: Steering): void {
  writePref(storage, STEERING_KEY, steering);
}
