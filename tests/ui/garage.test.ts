// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyCareer, type Career, type CareerEvent } from '../../src/meta/career';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { buy, setPlate, use } from '../../src/meta/shop';
import { careerStrip } from '../../src/ui/screens/careerScreen';
import { renderCareer, renderShop } from '../../src/ui/screens/screens';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const cars = [
  { id: 'esportivo', name: 'Esportivo', role: 'police' as const, color: 0x111316, thumb: () => 'data:image/png;base64,AAAA' },
  { id: 'seda', name: 'Sedã', role: 'thief' as const, color: 0xd0151c },
];
const career = (o: Partial<Career> = {}): Career => ({
  ...emptyCareer(),
  carXp: { esportivo: 1100, seda: 15000 },
  claims: ['mast:seda'],
  ...o,
});

describe('Carreira › Garagem (V2 part 6, mockup C)', () => {
  it('one card per car: picture, level on the dial, XP and the next reward named', () => {
    renderCareer(root, {
      career: career(),
      coins: 0,
      today: '2026-10-09',
      onBack: vi.fn(),
      onClaim: vi.fn(),
      tab: 'garage',
      cars: () => cars,
    });
    const cards = [...root.querySelectorAll('.garage-card')];
    expect(cards.map((c) => c.querySelector('.garage-name')!.textContent)).toEqual(['Esportivo', 'Sedã']);
    expect(cards[0]!.querySelector('img')).not.toBeNull();
    expect(cards[1]!.querySelector('img')).toBeNull(); // no picture without WebGL
    expect(cards[0]!.querySelector('.garage-level')!.textContent).toContain('3');
    expect(cards[0]!.textContent).toContain('1.100 / 1.500 XP');
    expect(cards[0]!.querySelector('.garage-info')!.textContent).toContain('Acabamento fosco');
    expect(cards[0]!.querySelectorAll('.garage-reward')).toHaveLength(9);
    expect(cards[0]!.querySelectorAll('.garage-reward.is-got')).toHaveLength(2);
  });

  it('tapping a reward on the dial tells what it is and at which level (an icon alone says little)', () => {
    renderCareer(root, {
      career: career(),
      coins: 0,
      today: '2026-10-09',
      onBack: vi.fn(),
      onClaim: vi.fn(),
      tab: 'garage',
      cars: () => cars,
    });
    const card = root.querySelector('.garage-card')!;
    card.querySelector<HTMLButtonElement>('[aria-label="Nível 9: Adesivo xadrez"]')!.click();
    expect(card.querySelector('.garage-info')!.textContent).toBe('Nível 9Adesivo xadrez');
    card.querySelector<HTMLButtonElement>('[aria-label="Nível 2: Acabamento metálico"]')!.click();
    expect(card.querySelector('.garage-info')!.textContent).toContain('liberado');
  });

  it('level 10: Resgatar the legendary paint; the tab shows the waiting dot', () => {
    const onClaim = vi.fn(() => ({ career: career({ claims: [] }), coins: 0 }));
    renderCareer(root, { career: career(), coins: 0, today: '2026-10-09', onBack: vi.fn(), onClaim, tab: 'garage', cars: () => cars });
    expect(root.querySelector('.career-tab.is-on')!.classList.contains('has-claim')).toBe(true);
    const seda = root.querySelectorAll('.garage-card')[1]!;
    expect(seda.textContent).toContain('Pintura dourada');
    seda.querySelector<HTMLButtonElement>('.career-claim')!.click();
    expect(onClaim).toHaveBeenCalledWith('mast:seda');
    expect(root.querySelectorAll('.garage-card')[1]!.querySelector('.career-claim')).toBeNull();
  });

  it('end screen: the car went up a mastery level and what it frees', () => {
    const events: CareerEvent[] = [
      { kind: 'xp', side: 'police', gained: 300, xp: 1300 },
      { kind: 'mastery', car: 'esportivo', level: 4, gained: 300, unlock: 'finish:esportivo:fosco' },
    ];
    expect(careerStrip(events, 'police')!.textContent).toContain('Esportivo: maestria 4!Acabamento fosco na Loja');
  });
});

describe('shop with mastery (V2 part 6)', () => {
  function open(start: Profile, side: 'police' | 'thief' = 'police') {
    let profile = start;
    renderShop(root, {
      profile,
      side,
      onSide: vi.fn(),
      onBack: vi.fn(),
      onBuy: (id) => (profile = buy(profile, id).profile),
      onUse: (id) => (profile = use(profile, id)),
      onPlate: (t) => (profile = setPlate(profile, t)),
      onListen: vi.fn(),
    });
    return () => profile;
  }
  const tab = (name: string) => [...root.querySelectorAll<HTMLButtonElement>('.shop-tab')].find((b) => b.textContent === name)!.click();
  const rowNames = () => [...root.querySelectorAll('.shop-row-name')].map((e) => e.firstChild!.textContent);

  it('Pintura: colours, then finishes; locked ones say the level; the showcase shows the mastery', () => {
    const p: Profile = {
      ...emptyProfile(),
      coins: 5000,
      owned: ['car:esportivo'],
      career: { ...emptyCareer(), carXp: { esportivo: 900 } },
    };
    p.equipped = { ...p.equipped, police: { car: 'esportivo', neon: null, sound: null } };
    const get = open(p);
    expect(root.querySelector('.shop-mastery')!.textContent).toBe('Maestria 3900 / 1.500 XP');
    tab('Pintura');
    expect([...root.querySelectorAll('.shop-section')].map((e) => e.textContent)).toEqual(['Cor', 'Acabamento']);
    expect(rowNames().slice(4)).toEqual(['Normal', 'Metálico', 'Fosco', 'Perolizado', 'Camuflado']);
    const fosco = [...root.querySelectorAll('.shop-row')].find((r) => r.textContent?.includes('Fosco'))!;
    expect(fosco.textContent).toContain('Maestria 4');
    [...root.querySelectorAll<HTMLElement>('.shop-row')].find((r) => r.textContent?.includes('Metálico'))!.click();
    root.querySelector<HTMLButtonElement>('.shop-action')!.click();
    [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Comprar e usar')!.click();
    expect(get().owned).toContain('finish:esportivo:metalico');
    expect(get().equipped.finish).toEqual({ esportivo: 'metalico' });
  });

  it('Adesivos: none or the 4 of the side; the shop hides the mastery bar for a car not owned', () => {
    open({ ...emptyProfile(), coins: 5000 }, 'thief');
    expect(root.querySelector<HTMLElement>('.shop-mastery')!.hidden).toBe(false); // the Sedã is free: owned
    tab('Adesivos');
    expect(rowNames()).toEqual(['Sem adesivo', 'Faixas', 'Chamas', 'Número', 'Caveira']);
  });
});
