// "Como jogar": two pages of tips drawn as yellow road signs, with the numbers from BALANCE.
import { BALANCE } from '../../config/balance';
import { btn, h, openModal } from './dom';
import { SCREEN_ICONS } from './icons';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
/** escape time as shown to players, e.g. "1:30" */
export const ESCAPE = clock(BALANCE.match.escapeTime);

type Tip = { icon: keyof typeof SCREEN_ICONS; title: string; text: string };
const PAGES: { tips: Tip[] }[] = [
  {
    tips: [
      { icon: 'auto', title: 'O carro acelera sozinho', text: 'Use ◀ ▶ para trocar de faixa e o freio quando precisar.' },
      {
        icon: 'curve',
        title: 'Freie nas curvas fechadas',
        text: `Sem freio o carro derrapa, sobe na calçada e perde ${BALANCE.collision.scenery} de vida.`,
      },
      {
        icon: 'box',
        title: 'Só a caixa da sua cor',
        text: `Azul é da polícia, vermelha é do ladrão. A do outro tira ${BALANCE.items.wrongBoxDamage} de vida.`,
      },
      { icon: 'bump', title: 'Quebra-molas', text: 'O carro pula e perde velocidade. No ar, passa por cima das bombas.' },
    ],
  },
  {
    tips: [
      { icon: 'crash', title: 'Calçada e tráfego', text: `Cada batida tira ${BALANCE.collision.scenery} de vida e freia o carro.` },
      { icon: 'shot', title: 'Tiros', text: 'A polícia atira para a frente. O ladrão atira para trás quando pega a arma.' },
      {
        icon: 'bomb',
        title: 'Bombas',
        text: `O ladrão solta bombas atrás do carro. Na viatura, tiram ${BALANCE.items.bomb.damage} de vida.`,
      },
      {
        icon: 'flag',
        title: 'Quem vence',
        text: `A polícia, destruindo o ladrão. O ladrão, aguentando ${ESCAPE} ou destruindo a viatura.`,
      },
    ],
  },
];

function tipEl(t: Tip): HTMLElement {
  const el = h('div', 'howto-tip');
  const sign = h('div', 'road-sign');
  sign.innerHTML = SCREEN_ICONS[t.icon];
  el.append(sign, h('b', 'howto-tip-title', t.title), h('span', 'howto-tip-text', t.text));
  return el;
}

/** Page dots: tapping one goes to that page. */
function pageDots(go: (i: number) => void): HTMLButtonElement[] {
  return PAGES.map((_, i) => {
    const d = btn('', 'howto-dot', () => go(i));
    d.setAttribute('aria-label', `Página ${i + 1} de ${PAGES.length}`);
    return d;
  });
}

/** Horizontal drag on `view` turns the page: past ~15% of the width (at least 40 px) it moves, otherwise it snaps back. */
function dragToTurn(view: HTMLElement, strip: HTMLElement, page: () => number, go: (i: number) => void): void {
  let startX: number | undefined;
  let dx = 0;
  view.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    dx = 0;
    strip.style.transition = 'none';
    if ('pointerId' in e) view.setPointerCapture?.((e as PointerEvent).pointerId);
  });
  view.addEventListener('pointermove', (e) => {
    if (startX === undefined) return;
    dx = e.clientX - startX;
    strip.style.transform = `translateX(calc(${-page() * 100}% + ${dx}px))`;
  });
  const end = () => {
    if (startX === undefined) return;
    startX = undefined;
    strip.style.transition = '';
    const threshold = Math.max(40, view.clientWidth * 0.15);
    go(dx < -threshold ? page() + 1 : dx > threshold ? page() - 1 : page());
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
}

/** "Como jogar" dialog: a carousel of tip pages (drag, Anterior/Próximo, dots, arrow keys). */
export function openHowTo(host: HTMLElement, onClose: () => void): void {
  const dialog = h('div', 'howto');
  const view = h('div', 'howto-view');
  const strip = h('div', 'howto-strip');
  const pages = PAGES.map((pg) => {
    const el = h('div', 'howto-tips');
    el.append(...pg.tips.map(tipEl));
    return el;
  });
  strip.append(...pages);
  view.append(strip);
  let current = 0;
  const prev = btn('Anterior', 'howto-prev', () => go(current - 1), SCREEN_ICONS.back);
  const next = btn('Próximo', 'howto-next', () => go(current + 1));
  next.insertAdjacentHTML('beforeend', SCREEN_ICONS.forward);
  const done = btn('Entendi', 'is-primary', () => close());
  const dots = pageDots((i) => go(i));
  function go(i: number) {
    current = Math.max(0, Math.min(PAGES.length - 1, i));
    strip.style.transform = `translateX(${-current * 100}%)`;
    pages.forEach((pg, k) => pg.toggleAttribute('inert', k !== current));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === current)));
    const lost = document.activeElement;
    prev.hidden = current === 0;
    next.hidden = current === PAGES.length - 1;
    // the pressed button may have just been hidden: keep the keyboard inside the dialog
    if (lost === prev && prev.hidden) next.focus();
    if (lost === next && next.hidden) prev.focus();
  }
  dragToTurn(view, strip, () => current, go);
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    else if (e.key === 'ArrowRight') go(current + 1);
  });
  const dotsRow = h('div', 'howto-dots');
  dotsRow.append(...dots);
  const foot = h('div', 'howto-foot');
  foot.append(dotsRow, prev, next, done);
  dialog.append(h('h2', 'screen-heading', 'Como jogar'), view, foot);
  go(0);
  const close = openModal(host, dialog, 'Como jogar', onClose);
  done.focus();
}
