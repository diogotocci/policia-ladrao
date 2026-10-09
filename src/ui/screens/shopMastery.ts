// Shop parts of V2 part 6: the finish rows of a car and the mastery bar on the showcase.
import type { Role } from '../../config/balance';
import { FINISHES, FINISH_NAMES, LEGENDARY, MASTERY_XP, masteryLevel, nextMasteryXp, type FinishId } from '../../meta/mastery';
import type { Profile } from '../../meta/profile';
import { CARS, PRICES, owns, type CarId } from '../../meta/shop';
import { h } from './dom';
import type { Row } from './shop';

const n = (v: number) => v.toLocaleString('pt-BR');
export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** CSS background that suggests a finish on a colour (shop rows, Garagem icons). */
export function finishSwatch(finish: FinishId | 'normal', color: number, role: Role): string {
  const c = hex(color);
  switch (finish) {
    case 'metalico':
      return `radial-gradient(circle at 35% 30%, #ffffffaa, ${c} 45%, #000000aa)`;
    case 'perolizado':
      return `conic-gradient(from 40deg, ${c}, #a58cff, #7fe3ff, ${c})`;
    case 'camuflado':
      return `radial-gradient(circle at 30% 30%, #00000088 0 22%, transparent 23%), radial-gradient(circle at 70% 65%, #ffffff44 0 25%, transparent 26%), ${c}`;
    case 'lendaria':
      return role === 'police'
        ? 'linear-gradient(135deg, #fff, #9aa4b1 45%, #fff 60%, #7b8592)'
        : 'linear-gradient(135deg, #fff3b0, #d4a32a 45%, #fff0a0 60%, #a8781a)';
    default:
      return c;
  }
}

/** Finishes of the car on the showcase: normal, the 4 to buy and the legendary one once owned. */
export function finishRowsFor(profile: Profile, side: Role, car: CarId): Row[] {
  const color = CARS[car].colors[profile.equipped.paint[car] ?? 0]!;
  const legendary = `finish:${car}:lendaria`;
  return [
    { id: `finish:${car}:normal`, name: 'Normal', swatch: finishSwatch('normal', color, side), price: 0, section: 'Acabamento' },
    ...FINISHES.map((f) => ({
      id: `finish:${car}:${f}`,
      name: FINISH_NAMES[f],
      swatch: finishSwatch(f, color, side),
      price: PRICES.finish,
    })),
    ...(owns(profile, legendary)
      ? [{ id: legendary, name: `Lendária ${LEGENDARY[side].name.toLowerCase()}`, swatch: finishSwatch('lendaria', color, side), price: 0 }]
      : []),
  ];
}

/** "Maestria N" pill, the bar and the XP; hidden for a car not owned. */
export function drawMasteryBar(el: HTMLElement, profile: Profile, car: CarId): void {
  const owned = owns(profile, `car:${car}`);
  el.hidden = !owned;
  if (!owned) return;
  const xp = profile.career.carXp[car] ?? 0;
  const level = masteryLevel(xp);
  const next = nextMasteryXp(xp);
  const from = MASTERY_XP[level - 1] ?? 0;
  const bar = h('span', 'shop-mastery-bar');
  const fill = h('i', '');
  fill.style.width = `${next === null ? 100 : Math.round(((xp - from) / (next - from)) * 100)}%`;
  bar.append(fill);
  el.replaceChildren(
    h('span', 'shop-mastery-level', `Maestria ${level}`),
    bar,
    h('span', 'shop-mastery-xp', next === null ? 'máxima' : `${n(xp)} / ${n(next)} XP`),
  );
  el.setAttribute('aria-label', next === null ? `Maestria ${level}, máxima` : `Maestria ${level}: ${n(xp)} de ${n(next)} XP`);
}
