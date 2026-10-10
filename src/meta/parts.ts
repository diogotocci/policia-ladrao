// V2 part 6 delivery 2: wheels and coloured smoke per side, and the thief's accessories. Data only.
export const WHEEL_STYLES = ['cromadas', 'esportivas', 'rodao'] as const;
export type WheelStyle = (typeof WHEEL_STYLES)[number];
export const WHEEL_NAMES: Record<WheelStyle, string> = { cromadas: 'Cromadas', esportivas: 'Esportivas pretas', rodao: 'Rodão' };
/** rank of that side that unlocks each wheel style */
export const WHEEL_RANK: Record<WheelStyle, number> = { cromadas: 2, esportivas: 4, rodao: 6 };

export const SMOKE_COLORS = ['azul', 'vermelha', 'verde', 'rosa', 'amarela'] as const;
export type SmokeColor = (typeof SMOKE_COLORS)[number];
export const SMOKES: Record<SmokeColor, { name: string; color: number }> = {
  azul: { name: 'Azul', color: 0x3f8bff },
  vermelha: { name: 'Vermelha', color: 0xff3b3b },
  verde: { name: 'Verde', color: 0x3be07a },
  rosa: { name: 'Rosa', color: 0xff5fc8 },
  amarela: { name: 'Amarela', color: 0xffd23a },
};

export const ACCESSORY_IDS = ['aerofolio', 'rack', 'antena', 'escapamento'] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];
export const ACCESSORY_NAMES: Record<AccessoryId, string> = {
  aerofolio: 'Aerofólio',
  rack: 'Rack de teto',
  antena: 'Antena com bandeirinha',
  escapamento: 'Escapamento com chama',
};
