// Side choice: two role cards; the "Como jogar" tips open by themselves on the first visit.
import type { Difficulty, Role } from '../../config/balance';
import { difficultyPicker } from './difficultyPicker';
import { btn, h, mount, type Disposable } from './dom';
import { openHowTo } from './howto';
import { SCREEN_ICONS } from './icons';

const ROLES: Record<Role, { title: string; boxes: string }> = {
  police: {
    title: 'Polícia',
    boxes: 'Pegue as caixas azuis',
  },
  thief: {
    title: 'Ladrão',
    boxes: 'Pegue as caixas vermelhas',
  },
};

function roleCard(role: Role, onClick: () => void): HTMLButtonElement {
  const r = ROLES[role];
  const label = `Jogar de ${r.title.toLowerCase()}`;
  const card = h('button', `choose-card is-${role}`);
  card.type = 'button';
  card.dataset.role = role;
  card.setAttribute('aria-label', label);
  const prev = h('div', 'choose-preview');
  prev.dataset.preview = role; // 3D car slot (carPreview)
  const boxes = h('p', 'choose-boxes');
  boxes.append(h('span', `box-swatch is-${role}`), r.boxes);
  card.append(prev, h('h3', 'choose-title', r.title), boxes, h('span', 'choose-cta', label));
  card.addEventListener('click', onClick);
  return card;
}

export function renderChoose(
  root: HTMLElement,
  p: {
    onChoose(role: Role): void;
    onBack(): void;
    showHowTo?: boolean;
    onHowToSeen?(): void;
    /** V2 part 2: Fácil / Médio / Difícil, chosen here */
    difficulty?: Difficulty;
    onDifficulty?(d: Difficulty): void;
    /** V2 part 4: the name of the car in use on each side and the "trocar" shortcut to the shop */
    cars?: Record<Role, string>;
    onShop?(role: Role): void;
  },
): Disposable & { previews: Record<Role, HTMLElement> } {
  const s = h('section', 'screen screen-choose');
  const top = h('div', 'choose-top');
  const back = btn('Voltar', 'is-quiet choose-back', p.onBack, SCREEN_ICONS.back);
  // focus goes back to whatever opened the tips: the button, or the first card when they opened by themselves
  const closedTo = (el: HTMLElement) => () => {
    p.onHowToSeen?.();
    el.focus();
  };
  const help = btn('Como jogar', 'choose-help', () => openHowTo(s, closedTo(help)), SCREEN_ICONS.help);
  top.append(
    back,
    difficultyPicker(p.difficulty ?? 'normal', (d) => p.onDifficulty?.(d), { showCoins: true }),
    help,
  );
  const cards = h('div', 'choose-cards');
  const previews = {} as Record<Role, HTMLElement>;
  for (const role of ['police', 'thief'] as Role[]) {
    const card = roleCard(role, () => p.onChoose(role));
    previews[role] = card.querySelector<HTMLElement>('.choose-preview')!;
    if (p.cars && p.onShop) {
      // a button cannot sit inside the card (also a button): both go in a slot, the shortcut over the card's corner
      const slot = h('div', 'choose-slot');
      const swap = btn(`${p.cars[role]} · trocar`, 'choose-swap', () => p.onShop!(role), SCREEN_ICONS.car);
      swap.setAttribute('aria-label', `${p.cars[role]}: trocar carro na loja`);
      slot.append(card, swap);
      cards.append(slot);
    } else cards.append(card);
  }
  s.append(top, h('h2', 'screen-heading choose-heading', 'Escolha seu lado'), cards);
  const firstCard = cards.querySelector<HTMLElement>('.choose-card')!;
  const m = mount(root, s, firstCard);
  if (p.showHowTo) openHowTo(s, closedTo(firstCard));
  return { ...m, previews };
}
