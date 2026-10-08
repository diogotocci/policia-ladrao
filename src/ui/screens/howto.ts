// "Como jogar": pages of tips drawn as yellow road signs, with the numbers from BALANCE.
import { BALANCE } from '../../config/balance';
import { gameDelta } from '../mobileShell';
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
  {
    // V2 part 3: the Sobrevivência page (the new items join it in the next releases)
    tips: [
      {
        icon: 'skull',
        title: 'Sobrevivência',
        text: `Sem relógio e mais vida (${BALANCE.survival.hp.easy} no Fácil, ${BALANCE.survival.hp.normal} no Médio, ${BALANCE.survival.hp.hard} no Difícil): ganha quem zerar a vida do outro primeiro.`,
      },
      {
        icon: 'clock',
        title: 'O caos sobe',
        text: `A cada ${BALANCE.survival.chaosEvery} s, até ${BALANCE.survival.chaosMax}: mais tráfego, mais caixas e todo dano ${Math.round(BALANCE.survival.damagePerChaos * 100)}% maior por nível.`,
      },
      {
        icon: 'cone',
        title: 'Obras na pista',
        text: `A partir do caos ${BALANCE.survival.worksFromChaos}, uma faixa fechada por cones. Bater tira vida como a calçada.`,
      },
      { icon: 'flag', title: 'Ranking', text: 'Polícia: a vitória mais rápida. Ladrão: o maior tempo vivo, mesmo perdendo.' },
    ],
  },
  {
    // V2 part 3: the yellow box and the thief's specials (both modes)
    tips: [
      {
        icon: 'mystery',
        title: 'Caixa amarela ?',
        text: 'Boa: um item do seu lado. Ruim: motor falhando, dano dobrado, lama na tela ou sem freio.',
      },
      {
        icon: 'bomb',
        title: 'Especial do ladrão',
        text: `Um botão só: bomba, óleo, miguelito ou fumaça, até ${BALANCE.items.thief.specialMax} cargas. Outro tipo troca o guardado.`,
      },
      {
        icon: 'oil',
        title: 'Óleo e miguelito',
        text: 'Ficam na pista atrás do ladrão. A viatura derrapa ou fura o pneu e fica para trás.',
      },
      {
        icon: 'smoke',
        title: 'Fumaça',
        text: `Por ${BALANCE.items.smoke.time} s os tiros da polícia erram mais e o helicóptero não atira.`,
      },
    ],
  },
  {
    // V2 part 3: the police items (blue boxes)
    tips: [
      {
        icon: 'barrier',
        title: 'Bloqueio',
        text: `A polícia aperta o especial: uma viatura atravessada ${BALANCE.items.roadblock.ahead} m à frente do ladrão, com miguelito ao lado.`,
      },
      {
        icon: 'shot',
        title: 'Metralhadora',
        text: `Por ${BALANCE.items.machineGun.time} s a polícia atira muito mais rápido, com tiros mais fracos.`,
      },
      {
        icon: 'siren',
        title: 'Reforço',
        text: `Uma segunda viatura chega por trás e bate na lateral do ladrão por ${BALANCE.items.wingman.time} s.`,
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
  let start: { x: number; y: number } | undefined;
  let dx = 0;
  view.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
    dx = 0;
    strip.style.transition = 'none';
    if ('pointerId' in e) view.setPointerCapture?.((e as PointerEvent).pointerId);
  });
  view.addEventListener('pointermove', (e) => {
    if (!start) return;
    // in the game's axes: with the phone upright the game is rotated and "sideways" is up/down the screen
    dx = gameDelta(e.clientX - start.x, e.clientY - start.y).dx;
    strip.style.transform = `translateX(calc(${-page() * 100}% + ${dx}px))`;
  });
  const end = () => {
    if (!start) return;
    start = undefined;
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
