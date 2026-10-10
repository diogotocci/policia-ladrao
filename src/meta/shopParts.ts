// Shop rules for the per-side parts (V2 part 6 delivery 2, spec §3.3-3.5): wheels and smoke colour per side, the
// thief's accessories. Kept apart from shop.ts so each file stays small; shop.ts calls these from its own rules.
import type { Role } from '../config/balance';
import { ACCESSORY_IDS, SMOKES, SMOKE_COLORS, WHEEL_STYLES, type AccessoryId, type SmokeColor, type WheelStyle } from './parts';
import type { ShopItem } from './shop';

export interface PartsEquip {
  /** per side (none = standard wheels, white smoke) */
  wheels?: Partial<Record<Role, WheelStyle>>;
  smoke?: Partial<Record<Role, SmokeColor>>;
  /** the thief's accessories in use (none = no field) */
  acc?: AccessoryId[];
}

const ROLES: readonly Role[] = ['police', 'thief'];
const isRole = (x: string | undefined): x is Role => x === 'police' || x === 'thief';
const isAccessory = (x: string | undefined): x is AccessoryId => (ACCESSORY_IDS as readonly string[]).includes(x ?? '');
const FREE = { wheels: 'padrao', smoke: 'branca' } as const;

export const PART_PRICES = { wheels: 1500, smoke: 1000, acc: 1200 } as const;

/** What the renderer gets: wheel style (null = standard), smoke colour (null = white), accessories (thief only). */
export interface PartsLook {
  wheels: WheelStyle | null;
  smoke: number | null;
  acc: AccessoryId[];
}

/** The catalog group (appended after the mastery group): wheels and smoke per side, then the accessories. */
export const partItems = (price: { wheels: number; smoke: number; acc: number }): ShopItem[] => [
  ...ROLES.flatMap((r): ShopItem[] => [
    ...WHEEL_STYLES.map((w): ShopItem => ({ id: `wheels:${r}:${w}`, kind: 'wheels', price: price.wheels, role: r })),
    ...SMOKE_COLORS.map((c): ShopItem => ({ id: `smoke:${r}:${c}`, kind: 'smoke', price: price.smoke, role: r })),
  ]),
  ...ACCESSORY_IDS.map((a): ShopItem => ({ id: `acc:${a}`, kind: 'acc', price: price.acc, role: 'thief' })),
];

/** Only what is owned; an empty accessory list is left out. */
export function sanitizeParts(owned: readonly string[], eq: Partial<PartsEquip> | undefined): PartsEquip {
  const out: PartsEquip = {};
  for (const field of ['wheels', 'smoke'] as const) {
    const raw = eq?.[field] as Record<string, unknown> | undefined;
    for (const role of ROLES) {
      const v = raw?.[role];
      if (typeof v === 'string' && owned.includes(`${field}:${role}:${v}`)) (out[field] ??= {})[role] = v as never;
    }
  }
  if (Array.isArray(eq?.acc)) {
    const list = eq.acc as unknown[];
    const acc = ACCESSORY_IDS.filter((a) => list.includes(a) && owned.includes(`acc:${a}`));
    if (acc.length) out.acc = acc;
  }
  return out;
}

/**
 * `wheels:<role>:<style>` / `smoke:<role>:<colour>` (free: `padrao` / `branca`), `acc:<id>` puts it on and
 * `acc:<id>:off` takes it off. Returns the new equipped object, `undefined` when the id is not one of these, or the
 * same object when the item is not owned.
 */
export function useParts<E extends PartsEquip>(eq: E, owned: readonly string[], id: string): E | undefined {
  const [kind, a, b] = id.split(':');
  if ((kind === 'wheels' || kind === 'smoke') && isRole(a) && b) {
    if (b !== FREE[kind] && !owned.includes(id)) return eq;
    const rest = Object.fromEntries(Object.entries(eq[kind] ?? {}).filter(([r]) => r !== a));
    return { ...eq, [kind]: b === FREE[kind] ? rest : { ...rest, [a]: b } };
  }
  if (kind === 'acc' && isAccessory(a)) return useAccessory(eq, owned, a, b !== 'off');
  return undefined;
}

function useAccessory<E extends PartsEquip>(eq: E, owned: readonly string[], a: AccessoryId, on: boolean): E {
  const rest = (eq.acc ?? []).filter((x) => x !== a);
  if (on) return owned.includes(`acc:${a}`) ? { ...eq, acc: ACCESSORY_IDS.filter((x) => x === a || rest.includes(x)) } : eq;
  const { acc: _drop, ...others } = eq;
  return rest.length ? { ...eq, acc: rest } : (others as E);
}

/** In use (same ids as `useParts`); `undefined` when the id is not a part. */
export function partInUse(eq: PartsEquip, id: string): boolean | undefined {
  const [kind, a, b] = id.split(':');
  if ((kind === 'wheels' || kind === 'smoke') && isRole(a)) return (eq[kind]?.[a] ?? FREE[kind]) === b;
  if (kind === 'acc' && a) return (eq.acc ?? []).includes(a as AccessoryId) === (b !== 'off');
  return undefined;
}

/** The free choices: standard wheels, white smoke, no accessory. */
export const freePart = (id: string): boolean => {
  const [kind, , b] = id.split(':');
  return (kind === 'wheels' && b === FREE.wheels) || (kind === 'smoke' && b === FREE.smoke) || (kind === 'acc' && b === 'off');
};

/** What the renderer needs for a car of this side. */
export function partsLook(eq: PartsEquip, role: Role): PartsLook {
  const smoke = eq.smoke?.[role];
  return {
    wheels: eq.wheels?.[role] ?? null,
    smoke: smoke && smoke in SMOKES ? SMOKES[smoke].color : null,
    acc: role === 'thief' ? [...(eq.acc ?? [])] : [],
  };
}
