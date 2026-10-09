// Mastery per car (V2 part 6, spec §2): every car has its own XP (the coins of the matches played with it) and 10
// levels. Each level unlocks a finish or a sticker of that car in the shop; level 10 gives its legendary paint.
// Pure data: no imports from the shop (the shop and the career both read it).
import type { Role } from '../config/balance';

/** XP to reach each level (index 0 = level 1). */
export const MASTERY_XP = [0, 300, 800, 1500, 2500, 4000, 6000, 8500, 11500, 15000] as const;
export const MASTERY_MAX = MASTERY_XP.length;
/** level 1..10 for an amount of XP */
export const masteryLevel = (xp: number): number => MASTERY_XP.filter((t) => xp >= t).length;
/** XP of the next level (null at the top) */
export const nextMasteryXp = (xp: number): number | null => MASTERY_XP[masteryLevel(xp)] ?? null;

/** Every car that has mastery, in the order the backup code stores it (new cars only at the end). */
export const MASTERY_CARS = ['viatura', 'esportivo', 'blazer', 'caveirao', 'seda', 'picape', 'moto', 'van'] as const;

export const FINISHES = ['metalico', 'fosco', 'perolizado', 'camuflado'] as const;
export type FinishId = (typeof FINISHES)[number] | 'lendaria';
export const FINISH_NAMES: Record<FinishId, string> = {
  metalico: 'Metálico',
  fosco: 'Fosco',
  perolizado: 'Perolizado',
  camuflado: 'Camuflado',
  lendaria: 'Lendária',
};

/** Stickers per side, numbered 1..4 in the shop ids (sticker:<car>:<n>). */
export const STICKERS: Record<Role, readonly string[]> = {
  police: ['faixas', 'brasao', 'numero', 'xadrez'],
  thief: ['faixas', 'chamas', 'numero', 'caveira'],
};
export const STICKER_NAMES: Record<string, string> = {
  faixas: 'Faixas',
  brasao: 'Brasão',
  numero: 'Número',
  xadrez: 'Xadrez',
  chamas: 'Chamas',
  caveira: 'Caveira',
};
export const LEGENDARY: Record<Role, { color: number; name: string }> = {
  police: { color: 0xd8dde3, name: 'Cromada' },
  thief: { color: 0xd4a32a, name: 'Dourada' },
};

export type MasteryReward = { kind: 'finish'; finish: FinishId } | { kind: 'sticker'; n: number };
/** What each level unlocks (index = level; 1 has nothing). */
export const MASTERY_REWARDS: readonly (MasteryReward | null)[] = [
  null,
  null,
  { kind: 'finish', finish: 'metalico' },
  { kind: 'sticker', n: 1 },
  { kind: 'finish', finish: 'fosco' },
  { kind: 'sticker', n: 2 },
  { kind: 'finish', finish: 'perolizado' },
  { kind: 'sticker', n: 3 },
  { kind: 'finish', finish: 'camuflado' },
  { kind: 'sticker', n: 4 },
  { kind: 'finish', finish: 'lendaria' },
];

/** Shop id of a level's reward for a car (null for level 1). */
export const rewardId = (car: string, level: number): string | null => {
  const r = MASTERY_REWARDS[level];
  if (!r) return null;
  return r.kind === 'finish' ? `finish:${car}:${r.finish}` : `sticker:${car}:${r.n}`;
};

/** Player-facing name of a level's reward: "Acabamento fosco", "Adesivo chamas", "Pintura dourada". */
export function rewardName(role: Role, level: number): string {
  const r = MASTERY_REWARDS[level];
  if (!r) return '';
  if (r.kind === 'sticker') return `Adesivo ${STICKER_NAMES[STICKERS[role][r.n - 1]!]!.toLowerCase()}`;
  if (r.finish === 'lendaria') return `Pintura ${LEGENDARY[role].name.toLowerCase()}`;
  return `Acabamento ${FINISH_NAMES[r.finish].toLowerCase()}`;
}

/** Level a shop item (finish or sticker) needs on its car; null when it is not a mastery item. */
export function masteryLevelFor(id: string): { car: string; level: number } | null {
  const [kind, car, x] = id.split(':');
  if (!car) return null;
  const level = MASTERY_REWARDS.findIndex(
    (r) =>
      r !== null &&
      ((kind === 'finish' && r.kind === 'finish' && r.finish === x) || (kind === 'sticker' && r.kind === 'sticker' && String(r.n) === x)),
  );
  return level > 0 ? { car, level } : null;
}
