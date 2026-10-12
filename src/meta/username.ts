// Usernames (V3 part 1, spec §4.1): 3 to 16 letters, digits or _, unique ignoring case, no swear words, changed at
// most once every 30 days. Shared by the server and the game (the field checks while typing).
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const USERNAME_COOLDOWN_DAYS = 30;

// common Portuguese and English swear words and slurs (kept short so ordinary names like Rolando or Fagner pass); compared without _ and with digits read as letters
const BLOCKED = [
  'porra',
  'caralh',
  'buceta',
  'boceta',
  'cacete',
  'merda',
  'bosta',
  'puta',
  'viado',
  'piroca',
  'xoxota',
  'xereca',
  'cuzao',
  'arrombad',
  'fdp',
  'vsf',
  'pqp',
  'foder',
  'fodase',
  'otario',
  'retardad',
  'nazi',
  'hitler',
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'pussy',
  'nigg',
  'whore',
  'slut',
  'estupr',
];
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g' };

export type UsernameProblem = 'format' | 'blocked';

export function usernameProblem(name: string): UsernameProblem | undefined {
  if (!USERNAME_RE.test(name)) return 'format';
  const plain = name
    .toLowerCase()
    .replace(/_/g, '')
    .replace(/[0-9]/g, (d) => LEET[d] ?? '');
  return BLOCKED.some((w) => plain.includes(w)) ? 'blocked' : undefined;
}

export const USERNAME_TEXT: Record<UsernameProblem | 'taken' | 'cooldown', string> = {
  format: 'Use de 3 a 16 letras, números ou _.',
  blocked: 'Esse nome não é permitido.',
  taken: 'Esse nome já está em uso.',
  cooldown: 'Você trocou de nome há pouco. Só dá para trocar uma vez a cada 30 dias.',
};
