// Opções (mockup approved 2026-10-16): how the car is steered on touch screens, the arrows or the analog stick.
// The choice is saved on the device (storage/steering.ts) and used from the next match on.
import type { Steering } from '../../input/touchButtons';
import { btn, h, mount, type Disposable } from './dom';
import { SCREEN_ICONS } from './icons';

const ROAD = '<rect width="150" height="96" fill="#1b1d22"/><path d="M50 96 L68 30 L82 30 L100 96Z" fill="#33363d"/>';
const FIRE = '<circle cx="128" cy="74" r="13" fill="none" stroke="#2f6bff" stroke-width="3"/>';
const PICTURE: Record<Steering, string> = {
  arrows: `${ROAD}<circle cx="22" cy="74" r="14" fill="#3a3f48"/><circle cx="54" cy="74" r="14" fill="#3a3f48"/><path d="M25 68l-6 6 6 6M51 68l6 6-6 6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>${FIRE}`,
  stick: `${ROAD}<circle cx="36" cy="66" r="22" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)" stroke-width="2"/><circle cx="48" cy="66" r="11" fill="#fff"/><path d="M14 66h-6M64 66h6" stroke="#ffc21a" stroke-width="2.5" stroke-linecap="round"/>${FIRE}`,
};
const INFO: Record<Steering, { title: string; text: string }> = {
  arrows: { title: 'Setas', text: 'Toque e segure ◀ ou ▶ para virar. Vira sempre com a mesma força.' },
  stick: {
    title: 'Analógico',
    text: 'Encoste o dedo em qualquer lugar da metade esquerda e arraste para os lados. Quanto mais longe, mais vira.',
  },
};
const ORDER: Steering[] = ['arrows', 'stick'];

export function renderOptions(root: HTMLElement, p: { steering: Steering; onSteering(s: Steering): void; onBack(): void }): Disposable {
  let steering = p.steering;
  const s = h('section', 'screen screen-options');
  const top = h('div', 'choose-top');
  top.append(btn('Voltar', 'is-quiet choose-back', p.onBack, SCREEN_ICONS.back), h('h2', 'screen-heading', 'Opções'));
  const label = h('p', 'options-label', 'Controle do carro (celular)');
  label.id = 'options-steering';
  const group = h('div', 'options-steering');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', label.id);
  const cards = ORDER.map((kind) => {
    const card = h('button', 'options-card');
    card.type = 'button';
    card.setAttribute('role', 'radio');
    card.dataset.steering = kind;
    card.insertAdjacentHTML('afterbegin', `<svg class="options-pic" viewBox="0 0 150 96" aria-hidden="true">${PICTURE[kind]}</svg>`);
    const text = h('span', 'options-text');
    text.append(h('b', '', INFO[kind].title), h('span', '', INFO[kind].text));
    card.append(text, h('span', 'options-check'));
    card.addEventListener('click', () => pick(kind));
    return card;
  });
  const sync = () =>
    cards.forEach((c, i) => {
      const on = ORDER[i] === steering;
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on ? 0 : -1;
    });
  function pick(kind: Steering) {
    if (kind !== steering) {
      steering = kind;
      p.onSteering(kind);
    }
    sync();
    cards[ORDER.indexOf(kind)]!.focus();
  }
  // radio group keys: the arrows move the choice
  group.addEventListener('keydown', (e) => {
    const i = ORDER.indexOf(steering);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pick(ORDER[(i + 1) % ORDER.length]!);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') pick(ORDER[(i + ORDER.length - 1) % ORDER.length]!);
    else return;
    e.preventDefault();
  });
  group.append(...cards);
  sync();
  const note = h(
    'p',
    'options-note',
    'Freio, atirar e especial continuam nos botões da direita. No computador, as setas do teclado funcionam sempre.',
  );
  s.append(top, label, group, note);
  return mount(root, s, cards[ORDER.indexOf(steering)]);
}
