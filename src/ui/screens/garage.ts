// Carreira › Garagem (V2 part 6, mockup C "conta-giros"): one card per car owned with its mastery as a rev counter.
// The rewards sit around the dial; tapping one says what it is and at which level (playtest 2026-10-09: an icon
// alone says little). Level 10 has "Resgatar" for the legendary paint.
import type { Role } from '../../config/balance';
import type { Career } from '../../meta/career';
import { LEGENDARY, MASTERY_MAX, MASTERY_REWARDS, MASTERY_XP, STICKERS, masteryLevel, nextMasteryXp, rewardName } from '../../meta/mastery';
import { btn, h } from './dom';
import { finishSwatch } from './shopMastery';

export interface GarageCar {
  id: string;
  name: string;
  role: Role;
  /** colour of the paint in use (the finish swatches use it) */
  color: number;
  /** picture of the car (data URL), drawn when the card shows; absent in tests */
  thumb?: () => string | undefined;
}

const n = (v: number) => v.toLocaleString('pt-BR');
const SVG = 'http://www.w3.org/2000/svg';
const STICKER_ICON: Record<string, string> = {
  faixas: '<path d="M4 9h16M4 15h16" stroke="currentColor" stroke-width="2.6"/>',
  brasao: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" fill="currentColor"/>',
  chamas: '<path d="M12 3c2 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-2-1-4 0-6z" fill="currentColor"/>',
  numero: '<text x="12" y="17" text-anchor="middle" font-size="14" font-weight="900" fill="currentColor">7</text>',
  xadrez:
    '<path d="M4 4h4v4H4zM12 4h4v4h-4zM8 8h4v4H8zM16 8h4v4h-4zM4 12h4v4H4zM12 12h4v4h-4zM8 16h4v4H8zM16 16h4v4h-4z" fill="currentColor"/>',
  caveira: '<path d="M12 3a7 7 0 0 0-7 7c0 3 2 4 2 6h10c0-2 2-3 2-6a7 7 0 0 0-7-7zM9 17v3h6v-3" fill="currentColor"/>',
};

/** Little picture of a level's reward: a paint swatch or a sticker sign. */
function rewardIcon(car: GarageCar, level: number): string {
  const r = MASTERY_REWARDS[level];
  if (!r) return '';
  if (r.kind === 'sticker') {
    const k = STICKERS[car.role][r.n - 1]!;
    return `<span class="garage-ico is-sticker"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${STICKER_ICON[k] ?? ''}</svg></span>`;
  }
  return `<span class="garage-ico" style="background:${finishSwatch(r.finish, car.color, car.role)}"></span>`;
}

/** The rev counter: 10 ticks on a half circle, the filled arc up to the XP and the needle. */
function dial(level: number, frac: number): SVGSVGElement {
  const cx = 120;
  const cy = 100;
  const r = 78;
  const at = (t: number, rr: number) => [cx + Math.cos(Math.PI * (1 - t)) * rr, cy - Math.sin(Math.PI * (1 - t)) * rr] as const;
  const [ex, ey] = at(frac, r);
  const [nx, ny] = at(frac, r - 16);
  let ticks = '';
  for (let l = 1; l <= MASTERY_MAX; l++) {
    const t = (l - 1) / (MASTERY_MAX - 1);
    const [x1, y1] = at(t, r - 8);
    const [x2, y2] = at(t, r + 6);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${l <= level ? 'is-on' : ''}" stroke-width="${l === MASTERY_MAX ? 5 : 3}"/>`;
  }
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '-20 -20 280 140');
  svg.setAttribute('class', 'garage-dial');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" class="garage-arc"/>
    ${frac > 0.001 ? `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}" class="garage-arc is-on"/>` : ''}
    <g class="garage-ticks">${ticks}</g>
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" class="garage-needle"/><circle cx="${cx}" cy="${cy}" r="6" class="garage-hub"/>`;
  return svg;
}

function card(car: GarageCar, career: Career, onClaim: (id: string) => void): HTMLElement {
  const xp = career.carXp[car.id] ?? 0;
  const level = masteryLevel(xp);
  const next = nextMasteryXp(xp);
  const from = MASTERY_XP[level - 1] ?? 0;
  const frac = next === null ? 1 : (level - 1 + (xp - from) / (next - from)) / (MASTERY_MAX - 1);
  const el = h('article', `garage-card is-${car.role}`);
  el.setAttribute('aria-label', `${car.name}: maestria ${level}`);
  el.append(h('h3', 'garage-name', car.name), h('span', 'garage-side', car.role === 'police' ? 'Polícia' : 'Ladrão'));
  const src = car.thumb?.();
  if (src) {
    const img = h('img', 'garage-photo');
    img.src = src;
    img.alt = '';
    el.append(img);
  }
  const gauge = h('div', 'garage-gauge');
  gauge.append(dial(level, frac));
  const info = h('div', 'garage-info');
  const claimId = `mast:${car.id}`;
  // the reward box: the next one by default, or the one tapped on the dial
  const show = (l: number) => {
    info.replaceChildren();
    if (level >= MASTERY_MAX && l === MASTERY_MAX && career.claims.includes(claimId)) {
      info.insertAdjacentHTML('afterbegin', rewardIcon(car, l));
      const t = h('div', 'garage-info-text');
      t.append(h('b', '', `Pintura ${LEGENDARY[car.role].name.toLowerCase()}`), h('span', '', 'liberada'));
      info.append(
        t,
        btn('Resgatar', 'is-primary career-claim', () => onClaim(claimId)),
      );
      return;
    }
    info.insertAdjacentHTML('afterbegin', rewardIcon(car, l));
    const t = h('div', 'garage-info-text');
    const got = l <= level;
    t.append(h('span', '', got ? `Nível ${l} · liberado` : `Nível ${l}`), h('b', '', rewardName(car.role, l)));
    info.append(t);
  };
  // rewards around the dial: buttons that tell what they are
  for (let l = 2; l <= MASTERY_MAX; l++) {
    const t = (l - 1) / (MASTERY_MAX - 1);
    const b = btn('', `garage-reward${l <= level ? ' is-got' : ''}`, () => show(l));
    b.innerHTML = rewardIcon(car, l);
    b.setAttribute('aria-label', `Nível ${l}: ${rewardName(car.role, l)}`);
    // around the arc, in % of the gauge box (viewBox -20 -20 280 140)
    const x = 120 + Math.cos(Math.PI * (1 - t)) * 102;
    const y = 100 - Math.sin(Math.PI * (1 - t)) * 102;
    b.style.left = `${((x + 20) / 280) * 100}%`;
    b.style.top = `${((y + 20) / 140) * 100}%`;
    gauge.append(b);
  }
  const lv = h('p', 'garage-level', String(level));
  lv.append(h('small', '', next === null ? 'Maestria máxima' : `Maestria · ${n(xp)} / ${n(next)} XP`));
  gauge.append(lv);
  el.append(gauge, info);
  show(Math.min(MASTERY_MAX, level + (level >= MASTERY_MAX ? 0 : 1)));
  return el;
}

/** The Garagem tab: owned cars, police first. */
export function garagePanel(cars: readonly GarageCar[], career: Career, onClaim: (id: string) => void): HTMLElement {
  const rail = h('div', 'garage-rail');
  for (const c of cars) rail.append(card(c, career, onClaim));
  if (!cars.length) rail.append(h('p', 'career-note', 'Compre um carro na Loja para começar.'));
  return rail;
}
