// "Como jogar": two pages of tips drawn as yellow road signs, with the numbers from BALANCE.
import { BALANCE } from '../../config/balance';
import { btn, h, openModal } from './dom';
import { SCREEN_ICONS } from './icons';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
/** escape time as shown to players, e.g. "1:30" */
export const ESCAPE = clock(BALANCE.match.escapeTime);

type Tip = { icon: keyof typeof SCREEN_ICONS; title: string; text: string };
const PAGES: { tips: Tip[]; next?: string }[] = [
  {
    next: 'Próximo: tráfego e tiros',
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

/** "Como jogar" dialog over the choice screen; the content behind it is inert while it is open. */
export function openHowTo(host: HTMLElement, onClose: () => void): void {
  const dialog = h('div', 'howto');
  const tips = h('div', 'howto-tips');
  const dots = h('div', 'howto-dots');
  dots.setAttribute('aria-hidden', 'true');
  const pager = h('div', 'howto-pager');
  const done = btn('Entendi', 'is-primary', () => close());
  const show = (i: number) => {
    tips.replaceChildren(...PAGES[i]!.tips.map(tipEl));
    dots.replaceChildren(...PAGES.map((_, k) => h('i', k === i ? 'is-on' : '')));
    const next = PAGES[i]!.next;
    const turn = next ? btn(next, 'is-quiet', () => show(i + 1)) : btn('Anterior', 'is-quiet', () => show(i - 1));
    const hadFocus = pager.contains(document.activeElement);
    pager.replaceChildren(turn);
    if (hadFocus) turn.focus(); // the pressed button is gone: keep the keyboard inside the dialog
  };
  const foot = h('div', 'howto-foot');
  foot.append(dots, pager, done);
  dialog.append(h('h2', 'screen-heading', 'Como jogar'), tips, foot);
  show(0);
  const close = openModal(host, dialog, 'Como jogar', onClose);
  done.focus();
}
