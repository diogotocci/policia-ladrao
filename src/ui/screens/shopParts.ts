// Shop tabs of V2 part 6 delivery 2: "Peças" (wheels; accessories on the thief) and "Efeitos" (neon and smoke).
import type { Role } from '../../config/balance';
import {
  ACCESSORY_IDS,
  ACCESSORY_NAMES,
  SMOKES,
  SMOKE_COLORS,
  WHEEL_NAMES,
  WHEEL_STYLES,
  type AccessoryId,
  type WheelStyle,
} from '../../meta/parts';
import type { Profile } from '../../meta/profile';
import { NEONS, NEON_IDS, PRICES, inUse, owns, type CarLook } from '../../meta/shop';
import { hex } from './shopMastery';
import type { Row } from './shop';

const WHEEL_SWATCH: Record<WheelStyle | 'padrao', string> = {
  padrao: 'radial-gradient(circle, #8a8f97 0 30%, #1b1c1f 32%)',
  cromadas: 'radial-gradient(circle, #ffffff 0 12%, #c9ced6 14% 52%, #1b1c1f 55%)',
  esportivas: 'radial-gradient(circle, #3a3d44 0 12%, #141518 14% 55%, #1b1c1f 58%)',
  rodao: 'radial-gradient(circle, #ffffff 0 14%, #c9ced6 16% 70%, #1b1c1f 73%)',
};

export function partsRows(side: Role): Row[] {
  return [
    { id: `wheels:${side}:padrao`, name: 'Padrão', swatch: WHEEL_SWATCH.padrao, price: 0, section: 'Rodas' },
    ...WHEEL_STYLES.map((w) => ({ id: `wheels:${side}:${w}`, name: WHEEL_NAMES[w], swatch: WHEEL_SWATCH[w], price: PRICES.wheels })),
    ...(side === 'thief'
      ? ACCESSORY_IDS.map((a, i) => ({
          id: `acc:${a}`,
          name: ACCESSORY_NAMES[a],
          swatch: '',
          price: PRICES.acc,
          section: i === 0 ? 'Acessórios (a moto só usa antena e escapamento)' : undefined,
        }))
      : []),
  ];
}

export function effectsRows(side: Role): Row[] {
  return [
    { id: `neon:${side}:off`, name: 'Sem neon', swatch: 'transparent', price: 0, section: 'Neon' },
    ...NEON_IDS.map((c) => ({ id: `neon:${side}:${c}`, name: NEONS[c].name, swatch: hex(NEONS[c].color), price: PRICES.neon })),
    { id: `smoke:${side}:branca`, name: 'Branca', swatch: '#e8e8e8', price: 0, section: 'Fumaça (derrapagem e nitro)' },
    ...SMOKE_COLORS.map((c) => ({ id: `smoke:${side}:${c}`, name: SMOKES[c].name, swatch: hex(SMOKES[c].color), price: PRICES.smoke })),
  ];
}

/** An accessory in use: the main button takes it off (several can be on at once, so it is not "Em uso"). */
export const accessoryOn = (profile: Profile, id: string): boolean => id.startsWith('acc:') && owns(profile, id) && inUse(profile, id);

/** The showcase tries the selected part on. */
export function previewPart(look: CarLook, selected: string): void {
  const [kind, , b] = selected.split(':');
  if (kind === 'wheels') look.wheels = b === 'padrao' ? null : (b as WheelStyle);
  if (kind === 'smoke') look.smoke = b === 'branca' ? null : SMOKES[b as keyof typeof SMOKES].color;
  if (kind === 'acc') {
    const a = selected.split(':')[1] as AccessoryId;
    if (!look.acc?.includes(a)) look.acc = ACCESSORY_IDS.filter((x) => x === a || look.acc?.includes(x));
  }
}
