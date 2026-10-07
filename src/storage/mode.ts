// Last game mode chosen (V2 part 3). Never throws; anything unknown is Perseguição.
import { MODES, type Mode } from '../config/balance';

export const MODE_KEY = 'pl.mode';

export function loadMode(storage: Storage | undefined): Mode {
  try {
    const v = storage?.getItem(MODE_KEY);
    return MODES.includes(v as Mode) ? (v as Mode) : 'pursuit';
  } catch {
    return 'pursuit';
  }
}

export function saveMode(storage: Storage | undefined, mode: Mode): void {
  try {
    storage?.setItem(MODE_KEY, mode);
  } catch {
    // storage full or blocked: the choice only lasts this session
  }
}
