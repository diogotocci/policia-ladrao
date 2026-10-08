// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile, type Profile } from '../../src/meta/profile';
import { buy, setPlate, use, type CarLook } from '../../src/meta/shop';
import { renderChoose, renderShop, renderTitle } from '../../src/ui/screens/screens';
import type { Role } from '../../src/config/balance';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const button = (label: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)!;
const row = (name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('.shop-row')].find((b) => b.querySelector('.shop-row-name')!.textContent === name)!;
const action = () => root.querySelector<HTMLButtonElement>('.shop-action')!;

/** the shop with the same rules the app uses, keeping the profile in a variable */
function open(start: Profile, side: Role = 'police') {
  let profile = start;
  const shown: CarLook[] = [];
  const listen = vi.fn();
  const view = renderShop(root, {
    profile,
    side,
    onSide: vi.fn(),
    onBack: vi.fn(),
    onBuy: (id) => (profile = buy(profile, id).profile),
    onUse: (id) => (profile = use(profile, id)),
    onPlate: (t) => (profile = setPlate(profile, t)),
    onListen: listen,
    mountPreview: () => ({ show: (_r, look) => void shown.push(look), dispose() {} }),
  });
  return {
    view,
    get profile() {
      return profile;
    },
    shown,
    listen,
  };
}

describe('shop screen (spec §6)', () => {
  it('cars tab: the free car in use, the others with prices; a row only selects and shows it on the car', () => {
    const s = open({ ...emptyProfile(), coins: 1000 });
    expect(row('Viatura').textContent).toContain('Em uso');
    expect(row('Esportivo').textContent).toContain('800');
    expect(action().textContent).toBe('Em uso');
    row('Caveirão').click();
    expect(s.shown.at(-1)!.car).toBe('caveirao'); // tried on before buying
    expect(action().textContent).toBe('Faltam 2.000');
    expect(action().disabled).toBe(true);
    expect(s.profile.coins).toBe(1000);
  });

  it('buying asks first, shows the balance after, then puts it in use', () => {
    const s = open({ ...emptyProfile(), coins: 1000 });
    row('Esportivo').click();
    expect(action().textContent).toBe('Comprar · 800');
    action().click();
    const dialog = root.querySelector('.shop-confirm')!;
    expect(dialog.textContent).toContain('Comprar Esportivo?');
    expect(dialog.textContent).toContain('Saldo depois: 200');
    button('Cancelar').click();
    expect(s.profile.coins).toBe(1000);
    action().click();
    button('Comprar e usar').click();
    expect(s.profile.coins).toBe(200);
    expect(s.profile.equipped.police.car).toBe('esportivo');
    expect(row('Esportivo').textContent).toContain('Em uso');
    expect(root.querySelector('.shop-wallet')!.textContent).toBe('200');
  });

  it('paint tab: paints of the car on the showcase; locked until the car is bought', () => {
    const s = open({ ...emptyProfile(), coins: 5000 });
    row('Blazer').click();
    button('Pintura').click();
    row('Prata').click();
    expect(action().textContent).toBe('Compre o carro primeiro');
    button('Carros').click();
    row('Viatura').click();
    button('Pintura').click();
    row('Azul-marinho').click();
    expect(s.shown.at(-1)!.paint).toBe(0x1b2a4a);
    action().click();
    button('Comprar e usar').click();
    expect(s.profile.equipped.paint.viatura).toBe(3);
  });

  it('sound tab: Sirene for the police, Buzina for the thief, each with Ouvir', () => {
    const s = open({ ...emptyProfile(), coins: 5000 }, 'thief');
    button('Buzina').click();
    expect([...root.querySelectorAll('.shop-row-name')].map((e) => e.textContent)).toEqual(['Buzina padrão', 'Corneta', 'Grave', 'Dupla']);
    button('Ouvir Grave').click();
    expect(s.listen).toHaveBeenCalledWith('thief', 'grave');
    button('Ouvir Buzina padrão').click();
    expect(s.listen).toHaveBeenLastCalledWith('thief', null);
  });

  it('plate tab: buy once, then save and remove for free', async () => {
    const s = open({ ...emptyProfile(), coins: 1000 });
    button('Placa').click();
    const input = root.querySelector<HTMLInputElement>('.shop-plate-input')!;
    input.value = 'dio-2026';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('DIO2026');
    await new Promise((r) => setTimeout(r, 250)); // the showcase waits for a pause in typing
    expect(s.shown.at(-1)!.plate).toBe('DIO2026');
    root.querySelector<HTMLButtonElement>('.shop-plate .is-primary')!.click();
    expect(root.querySelector('.shop-confirm')!.textContent).toContain('Comprar a placa?');
    button('Comprar e usar').click();
    expect(s.profile.coins).toBe(600);
    expect(s.profile.equipped.plate).toBe('DIO2026');
    button('Tirar placa').click();
    expect(s.profile.equipped.plate).toBe('');
    expect(s.profile.coins).toBe(600);
  });
});

describe('shop entry points', () => {
  it('title has a Loja button', () => {
    const onShop = vi.fn();
    renderTitle(root, { onPlay: vi.fn(), onRanking: vi.fn(), onShop, mountToggle: () => ({ dispose() {} }) });
    button('Loja').click();
    expect(onShop).toHaveBeenCalledOnce();
  });

  it('side choice shows the car in use with "trocar", opening the shop on that side', () => {
    const onShop = vi.fn();
    const onChoose = vi.fn();
    renderChoose(root, { onChoose, onBack: vi.fn(), cars: { police: 'Caveirão', thief: 'Sedã' }, onShop });
    button('Sedã: trocar carro na loja').click();
    expect(onShop).toHaveBeenCalledWith('thief');
    expect(onChoose).not.toHaveBeenCalled();
    expect(root.querySelector('.choose-swap')!.textContent).toContain('Caveirão · trocar');
  });
});
