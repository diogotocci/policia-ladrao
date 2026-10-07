// "Escolha o modo" (V2 part 3): Perseguição (1:30 clock) or Sobrevivência (no clock, chaos rises).
import { BALANCE, type Mode } from '../../config/balance';
import { btn, h, mount, type Disposable } from './dom';
import { ESCAPE } from './howto';
import { SCREEN_ICONS } from './icons';

const MODE_INFO: Record<Mode, { title: string; icon: keyof typeof SCREEN_ICONS; text: string; lines: string[] }> = {
  pursuit: {
    title: 'Perseguição',
    icon: 'clock',
    text: `Relógio de ${ESCAPE}. O ladrão foge até o tempo acabar; a polícia precisa prender antes.`,
    lines: ['Partidas curtas', 'Itens no poder normal'],
  },
  survival: {
    title: 'Sobrevivência',
    icon: 'skull',
    text: 'Sem relógio. Ganha quem zerar a vida do outro primeiro.',
    lines: [`A cada ${BALANCE.survival.chaosEvery} s o caos sobe: mais dano, mais tráfego, obras na pista`, 'Paga mais moedas por tempo'],
  },
};

export function renderMode(root: HTMLElement, p: { mode: Mode; onPick(m: Mode): void; onBack(): void }): Disposable {
  const s = h('section', 'screen screen-mode');
  const top = h('div', 'choose-top');
  top.append(btn('Voltar', 'is-quiet choose-back', p.onBack, SCREEN_ICONS.back), h('h2', 'screen-heading', 'Escolha o modo'));
  const cards = h('div', 'mode-cards');
  let focus: HTMLElement | undefined;
  for (const mode of ['pursuit', 'survival'] as Mode[]) {
    const info = MODE_INFO[mode];
    const card = h('div', `mode-card is-${mode}`);
    const icon = h('div', 'mode-icon');
    icon.innerHTML = SCREEN_ICONS[info.icon];
    const list = h('ul', 'mode-lines');
    list.append(...info.lines.map((l) => h('li', '', l)));
    const play = btn(`Jogar ${info.title}`, mode === 'survival' ? 'is-primary' : '', () => p.onPick(mode));
    card.append(icon, h('h3', 'mode-title', info.title), h('p', 'mode-text', info.text), list, play);
    cards.append(card);
    if (mode === p.mode) focus = play;
  }
  s.append(top, cards);
  return mount(root, s, focus);
}
