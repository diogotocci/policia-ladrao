// Last difficulty chosen on the side choice (V2 part 2). Never throws; anything unknown is Médio.
import { DIFFICULTIES, type Difficulty } from '../config/balance';

export const DIFFICULTY_KEY = 'pl.difficulty';

export function loadDifficulty(storage: Storage | undefined): Difficulty {
  try {
    const v = storage?.getItem(DIFFICULTY_KEY);
    return DIFFICULTIES.includes(v as Difficulty) ? (v as Difficulty) : 'normal';
  } catch {
    return 'normal';
  }
}

export function saveDifficulty(storage: Storage | undefined, difficulty: Difficulty): void {
  try {
    storage?.setItem(DIFFICULTY_KEY, difficulty);
  } catch {
    // storage full or blocked: the choice only lasts this session
  }
}
