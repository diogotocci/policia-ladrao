// @vitest-environment jsdom
// Prestige on screen (mockup approved 2026-10-16): Carreira › Patente, the end screen and the global ranking.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyCareer, prestige, type Career, type CareerEvent } from '../../src/meta/career';
import { careerStrip } from '../../src/ui/screens/careerScreen';
import { fillGlobal } from '../../src/ui/screens/rankingGlobal';
import { renderCareer } from '../../src/ui/screens/screens';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());
const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label))!;
const open = (career: Career, onPrestige = vi.fn((side: 'police' | 'thief') => ({ ...prestige(career, side), coins: 7200 }))) => {
  renderCareer(root, { career, coins: 4200, today: '2026-10-16', onBack: vi.fn(), onClaim: vi.fn(), onPrestige, tab: 'ranks' });
  return onPrestige;
};
const col = (side: string) => root.querySelector(`.career-rank-col.is-${side}`)!;

describe('Carreira › Patente with prestige', () => {
  it('the top rank shows Prestigiar with the next star and its coins; a confirmation first', () => {
    const onPrestige = open({ ...emptyCareer(), xp: { police: 12_500, thief: 4100 } });
    expect(col('thief').querySelector('.career-prestige')).toBeNull();
    const go = col('police').querySelector<HTMLButtonElement>('.career-prestige')!;
    expect(go.textContent).toBe('Prestigiar ★1+3.000 moedas');
    go.click();
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Prestigiar a polícia?');
    expect(dialog.textContent).toContain('Você volta para Recruta');
    expect(dialog.textContent).toContain('Subir de patente de novo não paga moedas outra vez');
    expect(document.activeElement).toBe(button('Agora não'));
    button('Agora não').click();
    expect(onPrestige).not.toHaveBeenCalled();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    go.click();
    [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Prestigiar')!.click();
    expect(onPrestige).toHaveBeenCalledWith('police');
    // drawn again: Recruta with the star, the new balance
    expect(col('police').querySelector('.career-star')!.textContent).toBe('★1');
    expect(col('police').querySelector('.career-rank-side')!.textContent).toBe('POLÍCIA · PRESTÍGIO ★1');
    expect(col('police').querySelector('.career-rank-info b')!.textContent).toBe('Recruta');
    expect(root.querySelector('.career-wallet')!.textContent).toBe('7.200');
    expect(document.activeElement).toBe(col('police').querySelector('.career-rank-card'));
  });

  it('after a prestige the next rank says only its name (no coins, items already unlocked); ★10 is the end', () => {
    open({ ...emptyCareer(), xp: { police: 650, thief: 0 }, prestige: { police: 1, thief: 0 } });
    expect(col('police').querySelector('.career-note')!.textContent).toBe('Próxima: Cabo');
    expect(col('thief').querySelector('.career-note')!.textContent).toContain('+');
    root.replaceChildren();
    open({ ...emptyCareer(), xp: { police: 20_000, thief: 0 }, prestige: { police: 10, thief: 0 } });
    expect(col('police').querySelector('.career-prestige')).toBeNull();
    expect(col('police').textContent).toContain('prestígio máximo');
  });
});

describe('end screen', () => {
  const xp = (stars: number): CareerEvent => ({ kind: 'xp', side: 'police', gained: 600, xp: 12_100, stars });
  it('reaching the top rank says a prestige is waiting in Carreira', () => {
    const strip = careerStrip([xp(0), { kind: 'rank', side: 'police', rank: 7, coins: 2000 }], 'police')!;
    expect(strip.querySelector('.end-career-prestige')!.textContent).toBe(
      '★ Patente máxima! Na Carreira você pode prestigiar: ★1 e +3.000 moedas.',
    );
    expect(
      careerStrip([xp(10), { kind: 'rank', side: 'police', rank: 7, coins: 0, again: true }], 'police')!.querySelector(
        '.end-career-prestige',
      ),
    ).toBeNull();
  });

  it('climbing again after a prestige: "Nova patente!" with nothing to claim', () => {
    const strip = careerStrip([xp(1), { kind: 'rank', side: 'police', rank: 3, coins: 0, again: true }], 'police')!;
    expect(strip.querySelector('.end-career-note')!.textContent).toBe('Nova patente!');
  });
});

describe('global ranking', () => {
  it('the stars come before the rank name', async () => {
    const list = document.createElement('ol');
    root.append(list);
    fillGlobal(
      list,
      () =>
        Promise.resolve({
          rows: [
            { pos: 1, username: 'turbo_br', time: 38, hp: 90, car: 'caveirao', rank: 7, prestige: 3 },
            { pos: 2, username: 'pmdorj', time: 39, hp: 90, car: 'prf', rank: 6 },
          ],
        }),
      { mode: 'pursuit', side: 'police', difficulty: 'normal' },
    );
    await vi.waitFor(() => expect(list.querySelectorAll('.ranking-rankname')).toHaveLength(2));
    const names = [...list.querySelectorAll('.ranking-rankname')];
    expect(names[0]!.querySelector('[aria-hidden="true"]')!.textContent).toBe('★3');
    expect(names[0]!.querySelector('.sr-only')!.textContent).toBe(' prestígio 3,');
    expect(names[0]!.textContent).toContain('Delegado');
    expect(names[1]!.textContent).toBe('Capitão');
  });
});
