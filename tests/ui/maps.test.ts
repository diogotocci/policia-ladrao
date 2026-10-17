// @vitest-environment jsdom
// Maps on screen (mockups approved 2026-10-17): Loja › Mapas, the pill and sheet on the side screen, the end screen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settleEnd } from '../../src/appMatch';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { careerStrip } from '../../src/ui/screens/careerScreen';
import { renderChoose, renderShop } from '../../src/ui/screens/screens';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const withWins = (wins: number): Profile => ({ ...emptyProfile(), welcomeGranted: true, stats: { ...emptyProfile().stats, wins } });
const tab = (name: string) => [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) => b.textContent?.trim() === name)!;
const row = (name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('.shop-row')].find(
    (b) => b.querySelector('.shop-row-name')!.firstChild!.textContent === name,
  )!;

describe('Loja › Mapas', () => {
  it('every map with what it takes; no coins; the first locked one is selected with its progress', () => {
    renderShop(root, {
      profile: withWins(24),
      side: 'police',
      onSide: vi.fn(),
      onBack: vi.fn(),
      onBuy: vi.fn(),
      onUse: vi.fn(),
      onPlate: vi.fn(),
      onListen: vi.fn(),
    });
    tab('Mapas').click();
    expect(row('Cidade').textContent).toContain('Liberado');
    expect(row('Paris').textContent).toContain('Liberado');
    expect(row('Rio de Janeiro').textContent).toContain('24/30');
    expect(row('Nova York').textContent).toContain('Vença 40 partidas');
    expect(row('Rio de Janeiro').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('.shop-name')!.textContent).toBe('Rio de Janeiro');
    expect(root.querySelector('.shop-map-need')!.textContent).toContain('Vença 30 partidas (24/30)');
    const action = root.querySelector<HTMLButtonElement>('.shop-action')!;
    expect(action.textContent).toBe('Faltam 6 vitórias');
    expect(action.disabled).toBe(true);
    expect(root.querySelector<HTMLElement>('.shop-3d')!.hidden).toBe(true);
    row('Paris').click();
    expect(root.querySelector('.shop-map-pic')!.classList.contains('is-locked')).toBe(false);
  });
});

describe('the map pill on the side screen', () => {
  it('shows the map, opens the sheet, a locked map cannot be picked, picking calls back and closes', () => {
    const onPick = vi.fn();
    renderChoose(root, { onChoose: vi.fn(), onBack: vi.fn(), map: { current: 'city', wins: 21, onPick } });
    expect(root.querySelector('h2')!.textContent).toBe('Escolha seu lado'); // kept for screen readers
    const chip = root.querySelector<HTMLButtonElement>('.choose-map')!;
    expect(chip.textContent).toBe('Mapa: Cidadetrocar');
    chip.click();
    const cards = [...root.querySelectorAll<HTMLButtonElement>('[role="dialog"] [role="radio"]')];
    expect(cards.map((c) => [c.textContent, c.getAttribute('aria-disabled') === 'true'])).toEqual([
      ['Cidade', false],
      ['Paris', false],
      ['Rio de JaneiroVença 30 partidas (21/30)', true],
      ['Nova YorkVença 40 partidas (21/40)', true],
    ]);
    expect(document.activeElement).toBe(cards[0]);
    cards[2]!.click(); // locked: nothing happens
    expect(onPick).not.toHaveBeenCalled();
    cards[1]!.click();
    expect(onPick).toHaveBeenCalledWith('paris');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(chip.textContent).toBe('Mapa: Paristrocar');
    expect(document.activeElement).toBe(chip);
  });
});

describe('the win that unlocks a map', () => {
  const end = { winner: 'police' as const, time: 40, hp: 80, hpFrac: 0.8, level: 2, stats: { damageDealt: 10, rightBoxes: 1 } };
  it('settleEnd says so, and the end screen tells to pick it', () => {
    const r = settleEnd(withWins(19), end, { role: 'police', mode: 'pursuit', difficulty: 'normal', today: '2026-10-17' });
    expect(r.events).toContainEqual({ kind: 'map', map: 'paris' });
    expect(
      settleEnd(withWins(20), end, { role: 'police', mode: 'pursuit', difficulty: 'normal', today: '2026-10-17' }).events.some(
        (e) => e.kind === 'map',
      ),
    ).toBe(false);
    expect(careerStrip(r.events, 'police')!.textContent).toContain('Novo mapa liberado: Paris!');
  });
});
