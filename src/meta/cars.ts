// The cars of both sides (V2 part 4; delivery 3 of part 6 added four): side, name, price and the four colours.
// Order matters: the backup code stores positions (new cars only at the end).
import type { Role } from '../config/balance';

export type CarId =
  'viatura' | 'esportivo' | 'blazer' | 'caveirao' | 'seda' | 'picape' | 'moto' | 'van' | 'rocam' | 'descaracterizada' | 'kombi' | 'fusca';
export interface CarInfo {
  role: Role;
  name: string;
  price: number;
  /** [original, paint 1, paint 2, paint 3] */
  colors: [number, number, number, number];
  colorNames: [string, string, string, string];
}

// police: always the four colours of a real patrol car (white, silver, navy, black; playtest 2026-10-08)
export const CARS: Record<CarId, CarInfo> = {
  viatura: {
    role: 'police',
    name: 'Viatura',
    price: 0,
    colors: [0xf4f5f7, 0xb8bec6, 0x1b2a4a, 0x16181c],
    colorNames: ['Branca', 'Prata', 'Azul-marinho', 'Preta'],
  },
  esportivo: {
    role: 'police',
    name: 'Esportivo',
    price: 2500,
    colors: [0x111316, 0xf3f4f6, 0xb8bec6, 0x1b2a4a],
    colorNames: ['Preto', 'Branco', 'Prata', 'Azul-marinho'],
  },
  blazer: {
    role: 'police',
    name: 'Blazer',
    price: 5000,
    colors: [0xf1f2f4, 0xb8bec6, 0x1b2a4a, 0x16181c],
    colorNames: ['Branca', 'Prata', 'Azul-marinho', 'Preta'],
  },
  caveirao: {
    role: 'police',
    name: 'Caveirão',
    price: 10000,
    colors: [0x1e2126, 0xf3f4f6, 0xb8bec6, 0x1b2a4a],
    colorNames: ['Preto', 'Branco', 'Prata', 'Azul-marinho'],
  },
  seda: {
    role: 'thief',
    name: 'Sedã',
    price: 0,
    colors: [0xd0151c, 0xf2c014, 0x1f8a3a, 0x6a2bb0],
    colorNames: ['Vermelho', 'Amarelo', 'Verde', 'Roxo'],
  },
  picape: {
    role: 'thief',
    name: 'Picape',
    price: 2500,
    colors: [0xe0731c, 0x6e1420, 0x1f4fb0, 0x5d6b3c],
    colorNames: ['Laranja', 'Vinho', 'Azul', 'Verde-oliva'],
  },
  moto: {
    role: 'thief',
    name: 'Moto com carona',
    price: 5000,
    colors: [0xd0151c, 0x8fd61a, 0x1f4fb0, 0xf2c014],
    colorNames: ['Vermelha', 'Verde-limão', 'Azul', 'Amarela'],
  },
  van: {
    role: 'thief',
    name: 'Van preta',
    price: 10000,
    colors: [0x101114, 0xeeeff1, 0x6b7380, 0x6e1420],
    colorNames: ['Preta', 'Branca', 'Cinza', 'Vinho'],
  },
  // V2 part 6 delivery 3 (mockups approved 2026-10-10)
  rocam: {
    role: 'police',
    name: 'Moto da Rocam',
    price: 7500,
    colors: [0xf1f2f4, 0xb8bec6, 0x1b2a4a, 0x16181c],
    colorNames: ['Branca', 'Prata', 'Azul-marinho', 'Preta'],
  },
  descaracterizada: {
    role: 'police',
    name: 'Descaracterizada',
    price: 12500,
    colors: [0x16181c, 0xf3f4f6, 0xb8bec6, 0x1b2a4a],
    colorNames: ['Preta', 'Branca', 'Prata', 'Azul-marinho'],
  },
  kombi: {
    role: 'thief',
    name: 'Kombi',
    price: 7500,
    colors: [0x6fa8d6, 0xc8282e, 0x3f8f5a, 0xe8b923],
    colorNames: ['Azul-claro', 'Vermelha', 'Verde', 'Amarela'],
  },
  fusca: {
    role: 'thief',
    name: 'Fusca envenenado',
    price: 12500,
    colors: [0xff7a12, 0x141518, 0x8fd61a, 0x1f4fb0],
    colorNames: ['Laranja', 'Preto', 'Verde-limão', 'Azul'],
  },
};
export const CAR_IDS = Object.keys(CARS) as CarId[];
export const DEFAULT_CAR: Record<Role, CarId> = { police: 'viatura', thief: 'seda' };
export const carsOf = (role: Role): CarId[] => CAR_IDS.filter((c) => CARS[c].role === role);
