// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS, emptyCareer } from '../../src/meta/career';
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
  [...root.querySelectorAll<HTMLButtonElement>('.shop-row')].find(
    (b) => b.querySelector('.shop-row-name')!.firstChild!.textContent === name,
  )!;
/** a profile with everything unlocked by the career (part 5), so these tests look at buying only */
const unlocked = (coins: number): Profile => ({
  ...emptyProfile(),
  coins,
  career: { ...emptyCareer(), xp: { police: 99_999, thief: 99_999 }, achieved: ACHIEVEMENTS.map((a) => a.id) },
});
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
    const s = open(unlocked(3000));
    expect(row('Viatura').textContent).toContain('Em uso');
    expect(row('Esportivo').textContent).toContain('2.500');
    expect(action().textContent).toBe('Em uso');
    row('Caveirão').click();
    expect(s.shown.at(-1)!.car).toBe('caveirao'); // tried on before buying
    expect(action().textContent).toBe('Faltam 7.000');
    expect(action().disabled).toBe(true);
    expect(s.profile.coins).toBe(3000);
  });

  it('buying asks first, shows the balance after, then puts it in use', () => {
    const s = open(unlocked(3000));
    row('Esportivo').click();
    expect(action().textContent).toBe('Comprar · 2.500');
    action().click();
    const dialog = root.querySelector('.shop-confirm')!;
    expect(dialog.textContent).toContain('Comprar Esportivo?');
    expect(dialog.textContent).toContain('Saldo depois: 500');
    button('Cancelar').click();
    expect(s.profile.coins).toBe(3000);
    action().click();
    button('Comprar e usar').click();
    expect(s.profile.coins).toBe(500);
    expect(s.profile.equipped.police.car).toBe('esportivo');
    expect(row('Esportivo').textContent).toContain('Em uso');
    expect(root.querySelector('.shop-wallet')!.textContent).toBe('500');
  });

  it('paint tab: paints of the car on the showcase; locked until the car is bought', () => {
    const s = open(unlocked(50_000));
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
    expect(s.profile.equipped.paint.viatura).toBe(2);
  });

  it('sound tab: Sirene for the police, Buzina for the thief, each with Ouvir', () => {
    const s = open(unlocked(50_000), 'thief');
    button('Buzina').click();
    expect([...root.querySelectorAll('.shop-row-name')].map((e) => e.textContent)).toEqual(['Buzina padrão', 'Corneta', 'Grave', 'Dupla']);
    button('Ouvir Grave').click();
    expect(s.listen).toHaveBeenCalledWith('thief', 'grave');
    button('Ouvir Buzina padrão').click();
    expect(s.listen).toHaveBeenLastCalledWith('thief', null);
  });

  it('Peças tab (V2 part 6 delivery 2): wheels on both sides, accessories only on the thief, put on and taken off', () => {
    open(unlocked(50_000));
    button('Peças').click();
    expect([...root.querySelectorAll('.shop-section')].map((e) => e.textContent)).toEqual(['Rodas']);
    root.replaceChildren();
    const s = open(unlocked(50_000), 'thief');
    button('Peças').click();
    expect([...root.querySelectorAll('.shop-section')].map((e) => e.textContent)).toEqual([
      'Rodas',
      'Acessórios (a moto só usa antena e escapamento)',
    ]);
    row('Rodão').click();
    expect(s.shown.at(-1)!.wheels).toBe('rodao'); // tried on before buying
    row('Aerofólio').click();
    expect(s.shown.at(-1)!.acc).toEqual(['aerofolio']);
    expect(action().textContent).toBe('Comprar · 1.200');
    action().click();
    button('Comprar e usar').click();
    expect(s.profile.equipped.acc).toEqual(['aerofolio']);
    expect(action().textContent).toBe('Tirar');
    action().click();
    expect(s.profile.equipped.acc).toBeUndefined();
    expect(action().textContent).toBe('Usar');
  });

  it('Efeitos tab: neon and smoke of the side', () => {
    const s = open(unlocked(50_000));
    button('Efeitos').click();
    expect([...root.querySelectorAll('.shop-section')].map((e) => e.textContent)).toEqual(['Neon', 'Fumaça (derrapagem e nitro)']);
    expect(row('Branca').textContent).toContain('Em uso');
    row('Vermelha').click();
    expect(s.shown.at(-1)!.smoke).toBe(0xff3b3b);
    action().click();
    button('Comprar e usar').click();
    expect(s.profile.equipped.smoke).toEqual({ police: 'vermelha' });
  });

  it('plate tab: buy once, then save and remove for free', async () => {
    const s = open(unlocked(3000));
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
    expect(s.profile.coins).toBe(1800);
    expect(s.profile.equipped.plate).toBe('DIO2026');
    button('Tirar placa').click();
    expect(s.profile.equipped.plate).toBe('');
    expect(s.profile.coins).toBe(1800);
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

describe('locked items (part 5)', () => {
  it('a car still locked shows what is missing under its name and on the main button', () => {
    open({ ...emptyProfile(), coins: 50_000 });
    expect(row('Blazer').textContent).toContain('Prenda 30 ladrões (0/30)');
    row('Blazer').click();
    expect(action().textContent).toBe('Prenda 30 ladrões (0/30)');
    expect(action().disabled).toBe(true);
  });
});

describe('admin shop (playtest 2026-10-09)', () => {
  it('shows the admin tag; a locked car with no coins can be taken for free', () => {
    let profile: Profile = { ...emptyProfile(), coins: 0 };
    renderShop(root, {
      profile,
      side: 'police',
      admin: true,
      onSide: vi.fn(),
      onBack: vi.fn(),
      onBuy: (id) => (profile = buy(profile, id, { admin: true }).profile),
      onUse: (id) => (profile = use(profile, id)),
      onPlate: (t) => (profile = setPlate(profile, t)),
      onListen: vi.fn(),
    });
    expect(root.querySelector('.shop-admin')?.textContent).toBe('admin');
    row('Caveirão').click();
    expect(action().textContent).toContain('Pegar (admin)');
    expect(action().disabled).toBe(false);
    action().click();
    expect(profile.owned).toContain('car:caveirao');
    expect(profile.coins).toBe(0);
  });
});
