// Shop (V2 part 4, spec §2-3): catalog, prices and the pure rules to buy and use items. Visual only: nothing here
// reaches the simulation. The catalog order never changes (the backup code stores positions): new items go at the end.
import type { Role } from '../config/balance';
import type { Profile } from './profile';
import { meets, requirementText, unlockOf } from './career';

export type CarId = 'viatura' | 'esportivo' | 'blazer' | 'caveirao' | 'seda' | 'picape' | 'moto' | 'van';
export type NeonColor = 'azul' | 'roxo' | 'verde' | 'rosa';
export type SoundId = 'yelp' | 'choque' | 'corneta' | 'grave' | 'dupla';
export type ItemKind = 'car' | 'paint' | 'neon' | 'sound' | 'plate';

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
};
export const CAR_IDS = Object.keys(CARS) as CarId[];
export const DEFAULT_CAR: Record<Role, CarId> = { police: 'viatura', thief: 'seda' };
export const carsOf = (role: Role): CarId[] => CAR_IDS.filter((c) => CARS[c].role === role);

export const NEONS: Record<NeonColor, { name: string; color: number }> = {
  azul: { name: 'Azul', color: 0x2f7bff },
  roxo: { name: 'Roxo', color: 0xa040ff },
  verde: { name: 'Verde', color: 0x2bff88 },
  rosa: { name: 'Rosa', color: 0xff3fb4 },
};
export const NEON_IDS = Object.keys(NEONS) as NeonColor[];

export const SOUNDS: Record<SoundId, { role: Role; name: string }> = {
  yelp: { role: 'police', name: 'Americana' },
  choque: { role: 'police', name: 'Choque' },
  corneta: { role: 'thief', name: 'Corneta' },
  grave: { role: 'thief', name: 'Grave' },
  dupla: { role: 'thief', name: 'Dupla' },
};
export const SOUND_IDS = Object.keys(SOUNDS) as SoundId[];
export const DEFAULT_SOUND_NAME: Record<Role, string> = { police: 'Sirene padrão', thief: 'Buzina padrão' };

// V2 part 5: ~3x the 0.16 prices, and every item needs to be unlocked first (career.ts unlockOf)
export const PRICES = { paint: 900, neon: 1800, sound: 1500, plate: 1200 } as const;
export const PLATE_MAX = 7;

export interface ShopItem {
  id: string;
  kind: ItemKind;
  price: number;
  role?: Role;
  car?: CarId;
  /** paint: 1..3 */
  index?: number;
  neon?: NeonColor;
  sound?: SoundId;
}

/**
 * Everything that can be bought, in a fixed order (backup positions; a test pins the whole list). Free originals are
 * not items. New items go in a new list appended at the end, never inside these groups.
 */
export const CATALOG: readonly ShopItem[] = [
  ...CAR_IDS.filter((c) => CARS[c].price > 0).map((c): ShopItem => ({
    id: `car:${c}`,
    kind: 'car',
    price: CARS[c].price,
    role: CARS[c].role,
    car: c,
  })),
  ...CAR_IDS.flatMap((c) =>
    [1, 2, 3].map((i): ShopItem => ({ id: `paint:${c}:${i}`, kind: 'paint', price: PRICES.paint, role: CARS[c].role, car: c, index: i })),
  ),
  ...(['police', 'thief'] as Role[]).flatMap((r) =>
    NEON_IDS.map((n): ShopItem => ({ id: `neon:${r}:${n}`, kind: 'neon', price: PRICES.neon, role: r, neon: n })),
  ),
  ...SOUND_IDS.map((s): ShopItem => ({ id: `sound:${s}`, kind: 'sound', price: PRICES.sound, role: SOUNDS[s].role, sound: s })),
  { id: 'plate', kind: 'plate', price: PRICES.plate },
];
const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));
export const itemById = (id: string): ShopItem | undefined => BY_ID.get(id);

// ---------- what is in use ----------
export interface SideEquip {
  car: CarId;
  neon: NeonColor | null;
  sound: SoundId | null;
}
export interface Equipped {
  police: SideEquip;
  thief: SideEquip;
  /** per car: 0 = original colour, 1..3 = paint */
  paint: Partial<Record<CarId, number>>;
  /** '' = no plate */
  plate: string;
}

export const defaultEquipped = (): Equipped => ({
  police: { car: 'viatura', neon: null, sound: null },
  thief: { car: 'seda', neon: null, sound: null },
  paint: {},
  plate: '',
});

/** Uppercase, only A-Z and 0-9, at most 7 characters. */
export const normalizePlate = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, PLATE_MAX);

const has = (owned: readonly string[], id: string) => owned.includes(id);
export const ownsCar = (owned: readonly string[], car: CarId) => CARS[car].price === 0 || has(owned, `car:${car}`);

/**
 * Keeps only known ids and, in `equipped`, only what is owned and fits its side (a tampered profile goes back
 * to the defaults instead of breaking or unlocking items).
 */
export function sanitizeShop(ownedRaw: readonly unknown[], eq: Partial<Equipped> | undefined): { owned: string[]; equipped: Equipped } {
  const owned = [...new Set(ownedRaw.filter((x): x is string => typeof x === 'string' && BY_ID.has(x)))];
  const out = defaultEquipped();
  for (const role of ['police', 'thief'] as Role[]) {
    const side = eq?.[role];
    if (!side || typeof side !== 'object') continue;
    const car = side.car as CarId;
    if (car in CARS && CARS[car].role === role && ownsCar(owned, car)) out[role].car = car;
    const neon = side.neon as NeonColor | null;
    if (neon && neon in NEONS && has(owned, `neon:${role}:${neon}`)) out[role].neon = neon;
    const sound = side.sound as SoundId | null;
    if (sound && sound in SOUNDS && SOUNDS[sound].role === role && has(owned, `sound:${sound}`)) out[role].sound = sound;
  }
  const paint = eq?.paint;
  if (paint && typeof paint === 'object')
    for (const car of CAR_IDS) {
      const i = (paint as Record<string, unknown>)[car];
      if (typeof i === 'number' && Number.isInteger(i) && i >= 1 && i <= 3 && has(owned, `paint:${car}:${i}`)) out.paint[car] = i;
    }
  if (typeof eq?.plate === 'string' && has(owned, 'plate')) out.plate = normalizePlate(eq.plate);
  return { owned, equipped: out };
}

// ---------- buying and using ----------
export type BuyCheck =
  | { ok: true; price: number }
  | { ok: false; reason: 'unknown' | 'owned' | 'coins'; missing?: number }
  /** car not owned yet (paints), or the career requirement is not met; `need` is the player-facing text */
  | { ok: false; reason: 'locked'; need: string };

export function canBuy(p: Profile, id: string): BuyCheck {
  const item = BY_ID.get(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (has(p.owned, id)) return { ok: false, reason: 'owned' };
  if (item.kind === 'paint' && !ownsCar(p.owned, item.car!)) return { ok: false, reason: 'locked', need: 'Compre o carro primeiro' };
  const req = unlockOf(id);
  if (req && !meets(p.career, req)) return { ok: false, reason: 'locked', need: requirementText(p.career, req) };
  if (p.coins < item.price) return { ok: false, reason: 'coins', missing: item.price - p.coins };
  return { ok: true, price: item.price };
}

/** Buys and puts it in use ("Comprar e usar"). Unchanged profile when it cannot. */
export function buy(p: Profile, id: string): { ok: boolean; profile: Profile } {
  const check = canBuy(p, id);
  if (!check.ok) return { ok: false, profile: p };
  const bought: Profile = { ...p, coins: p.coins - check.price, owned: [...p.owned, id] };
  return { ok: true, profile: use(bought, id) };
}

/**
 * Puts an owned item in use. Free choices: `car:<default>`, `paint:<car>:0` (original colour), `neon:<role>:off`,
 * `sound:<role>:padrao`. Anything not owned leaves the profile as it is.
 */
export function use(p: Profile, id: string): Profile {
  const [kind, a, b] = id.split(':');
  const eq = p.equipped;
  if (kind === 'car' && a && a in CARS && ownsCar(p.owned, a as CarId)) {
    const car = a as CarId;
    return { ...p, equipped: { ...eq, [CARS[car].role]: { ...eq[CARS[car].role], car } } };
  }
  if (kind === 'paint' && a && a in CARS && b !== undefined) {
    const i = Number(b);
    if (i === 0 || (i >= 1 && i <= 3 && has(p.owned, id))) return { ...p, equipped: { ...eq, paint: { ...eq.paint, [a]: i } } };
    return p;
  }
  if (kind === 'neon' && (a === 'police' || a === 'thief') && b) {
    if (b === 'off') return { ...p, equipped: { ...eq, [a]: { ...eq[a], neon: null } } };
    if (has(p.owned, id)) return { ...p, equipped: { ...eq, [a]: { ...eq[a], neon: b as NeonColor } } };
    return p;
  }
  if (kind === 'sound' && a) {
    if ((a === 'police' || a === 'thief') && b === 'padrao') return { ...p, equipped: { ...eq, [a]: { ...eq[a], sound: null } } };
    if (a in SOUNDS && has(p.owned, id)) {
      const role = SOUNDS[a as SoundId].role;
      return { ...p, equipped: { ...eq, [role]: { ...eq[role], sound: a as SoundId } } };
    }
    return p;
  }
  return p;
}

/** Is this choice the one in use? (same ids as `use`) */
export function inUse(p: Profile, id: string): boolean {
  const [kind, a, b] = id.split(':');
  const eq = p.equipped;
  if (kind === 'car' && a && a in CARS) return eq[CARS[a as CarId].role].car === a;
  if (kind === 'paint' && a) return a in CARS && ownsCar(p.owned, a as CarId) && (eq.paint[a as CarId] ?? 0) === Number(b);
  if (kind === 'neon' && (a === 'police' || a === 'thief')) return (eq[a].neon ?? 'off') === b;
  if (kind === 'sound' && a) {
    if (a === 'police' || a === 'thief') return b === 'padrao' && eq[a].sound === null;
    return a in SOUNDS && eq[SOUNDS[a as SoundId].role].sound === a;
  }
  return false;
}

/** Owned (or free) choice. */
export function owns(p: Profile, id: string): boolean {
  const [kind, a, b] = id.split(':');
  if (kind === 'car') return a !== undefined && a in CARS && ownsCar(p.owned, a as CarId);
  if (kind === 'paint' && b === '0') return a !== undefined && a in CARS && ownsCar(p.owned, a as CarId); // original colour of an owned car
  if (kind === 'neon' && b === 'off') return true;
  if (kind === 'sound' && b === 'padrao') return true;
  return has(p.owned, id);
}

/** The plate text (needs the plate bought); '' removes it from the car. */
export function setPlate(p: Profile, text: string): Profile {
  if (!has(p.owned, 'plate')) return p;
  return { ...p, equipped: { ...p.equipped, plate: normalizePlate(text) } };
}

// ---------- what the renderer and the audio use ----------
export interface CarLook {
  car: CarId;
  /** main body colour */
  paint: number;
  neon: number | null;
  plate: string | null;
  sound: SoundId | null;
}

export function lookFor(p: Pick<Profile, 'equipped'>, role: Role): CarLook {
  const side = p.equipped[role];
  const info = CARS[side.car];
  const paintIndex = p.equipped.paint[side.car] ?? 0;
  return {
    car: side.car,
    paint: info.colors[paintIndex] ?? info.colors[0],
    neon: side.neon ? NEONS[side.neon].color : null,
    plate: p.equipped.plate || null,
    sound: side.sound,
  };
}

export const defaultLook = (role: Role): CarLook => lookFor({ equipped: defaultEquipped() }, role);
