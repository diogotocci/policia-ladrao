// Shop (V2 part 4, spec §6), layout A "garagem": the selected item on a big 3D showcase on the left, the list with
// tabs on the right. A row only selects (and shows it on the car); the main button buys or uses. Visual only.
import type { Role } from '../../config/balance';
import type { Profile } from '../../meta/profile';
import {
  CARS,
  DEFAULT_SOUND_NAME,
  NEONS,
  NEON_IDS,
  PRICES,
  PLATE_MAX,
  SOUNDS,
  SOUND_IDS,
  canBuy,
  carsOf,
  inUse,
  itemById,
  lookFor,
  normalizePlate,
  owns,
  type CarId,
  type CarLook,
  type SoundId,
} from '../../meta/shop';
import { btn, h, mount, openModal, type Disposable } from './dom';
import { SCREEN_ICONS } from './icons';
import './shop.css';

type Tab = 'cars' | 'paint' | 'neon' | 'sound' | 'plate';
const n = (v: number) => v.toLocaleString('pt-BR');
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export interface ShopProps {
  profile: Profile;
  side: Role;
  onSide(side: Role): void;
  onBack(): void;
  /** buys and puts in use; returns the new profile (already saved by the app) */
  onBuy(id: string): Profile;
  onUse(id: string): Profile;
  onPlate(text: string): Profile;
  /** "Ouvir" */
  onListen(role: Role, sound: SoundId | null): void;
  /** 3D showcase in `slot`; absent in tests */
  mountPreview?(slot: HTMLElement): { show(role: Role, look: CarLook): void; dispose(): void };
}

interface Row {
  id: string;
  name: string;
  swatch: string; // CSS colour or '' (car icon)
  price: number;
}

export function renderShop(root: HTMLElement, p: ShopProps): Disposable {
  let profile = p.profile;
  const side = p.side;
  let tab: Tab = 'cars';
  let stageCar: CarId = profile.equipped[side].car;
  let selected = `car:${stageCar}`;
  let plateDraft = profile.equipped.plate;
  let plateTimer: ReturnType<typeof setTimeout> | undefined;

  const s = h('section', 'screen screen-shop');
  s.setAttribute('aria-label', 'Loja');
  // ----- top bar -----
  const top = h('div', 'shop-top');
  const back = btn('Voltar', 'is-quiet shop-back', p.onBack, SCREEN_ICONS.back);
  const sides = h('div', 'shop-sides');
  sides.setAttribute('role', 'radiogroup');
  sides.setAttribute('aria-label', 'Lado');
  for (const r of ['police', 'thief'] as Role[]) {
    const b = btn(r === 'police' ? 'Polícia' : 'Ladrão', `shop-side is-${r}`, () => r !== side && p.onSide(r));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(r === side));
    sides.append(b);
  }
  const wallet = h('p', 'shop-wallet');
  top.append(back, h('h2', 'screen-heading shop-heading', 'Loja'), sides, wallet);
  // ----- showcase -----
  const stage = h('div', 'shop-stage');
  const view3d = h('div', 'shop-3d');
  const stageName = h('p', 'shop-name');
  const action = btn('', 'is-primary shop-action', () => act());
  stage.append(view3d, stageName, action);
  const preview = p.mountPreview?.(view3d);
  // ----- list -----
  const panel = h('div', 'shop-panel');
  const tabs = h('div', 'shop-tabs');
  tabs.setAttribute('role', 'tablist');
  const list = h('div', 'shop-list');
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Itens');
  panel.append(tabs, list);
  const body = h('div', 'shop-body');
  body.append(stage, panel);
  s.append(top, body);

  const TABS: [Tab, string][] = [
    ['cars', 'Carros'],
    ['paint', 'Pintura'],
    ['neon', 'Neon'],
    ['sound', side === 'police' ? 'Sirene' : 'Buzina'],
    ['plate', 'Placa'],
  ];

  const rows = (): Row[] => {
    switch (tab) {
      case 'cars':
        return carsOf(side).map((c) => ({ id: `car:${c}`, name: CARS[c].name, swatch: '', price: CARS[c].price }));
      case 'paint':
        return CARS[stageCar].colors.map((c, i) => ({
          id: `paint:${stageCar}:${i}`,
          name: CARS[stageCar].colorNames[i]!,
          swatch: hex(c),
          price: i === 0 ? 0 : PRICES.paint,
        }));
      case 'neon':
        return [
          { id: `neon:${side}:off`, name: 'Sem neon', swatch: 'transparent', price: 0 },
          ...NEON_IDS.map((c) => ({ id: `neon:${side}:${c}`, name: NEONS[c].name, swatch: hex(NEONS[c].color), price: PRICES.neon })),
        ];
      case 'sound':
        return [
          { id: `sound:${side}:padrao`, name: DEFAULT_SOUND_NAME[side], swatch: '', price: 0 },
          ...SOUND_IDS.filter((x) => SOUNDS[x].role === side).map((x) => ({
            id: `sound:${x}`,
            name: SOUNDS[x].name,
            swatch: '',
            price: PRICES.sound,
          })),
        ];
      case 'plate':
        return [];
    }
  };

  /** what the showcase shows for the selection (tried on before buying) */
  const lookOf = (): CarLook => {
    const base = lookFor(profile, side);
    const car = stageCar;
    const paintIndex = profile.equipped.paint[car] ?? 0;
    const look: CarLook = { ...base, car, paint: CARS[car].colors[paintIndex]! };
    const [kind, a, b] = selected.split(':');
    if (kind === 'paint' && a === car) look.paint = CARS[car].colors[Number(b)]!;
    if (kind === 'neon') look.neon = b === 'off' ? null : NEONS[b as keyof typeof NEONS].color;
    if (tab === 'plate') look.plate = normalizePlate(plateDraft) || null;
    return look;
  };

  type State = { label: string; enabled: boolean; kind: 'use' | 'buy' | 'none' };
  const stateOf = (id: string): State => {
    if (owns(profile, id))
      return inUse(profile, id) ? { label: 'Em uso', enabled: false, kind: 'none' } : { label: 'Usar', enabled: true, kind: 'use' };
    const c = canBuy(profile, id);
    if (c.ok) return { label: `Comprar · ${n(c.price)}`, enabled: true, kind: 'buy' };
    if (c.reason === 'coins') return { label: `Faltam ${n(c.missing!)}`, enabled: false, kind: 'none' };
    if (c.reason === 'locked') return { label: c.need, enabled: false, kind: 'none' };
    return { label: '', enabled: false, kind: 'none' };
  };

  const nameOf = (id: string) => rows().find((r) => r.id === id)?.name ?? '';

  function act() {
    const st = stateOf(selected);
    if (!st.enabled) return;
    if (st.kind === 'use') {
      profile = p.onUse(selected);
      draw();
    } else if (st.kind === 'buy') confirmBuy(selected, nameOf(selected), () => (profile = p.onBuy(selected)));
  }

  function confirmBuy(id: string, name: string, done: () => void) {
    const price = itemById(id)!.price;
    const dialog = h('div', 'shop-confirm');
    const yes = btn('Comprar e usar', 'is-primary', () => (close(), done(), draw()));
    const row = h('div', 'screen-actions');
    row.append(
      btn('Cancelar', 'is-quiet', () => close()),
      yes,
    );
    dialog.append(
      h('h3', 'shop-confirm-title', `Comprar ${name}?`),
      h('p', 'shop-confirm-price', `${n(price)} moedas`),
      h('p', 'shop-confirm-after', `Saldo depois: ${n(profile.coins - price)}`),
      row,
    );
    // focus back to the main button, or (plate tab, no main button) to the plate field
    const close = openModal(s, dialog, `Comprar ${name}`, () =>
      (action.hidden ? s.querySelector<HTMLElement>('.shop-plate-input') : action)?.focus(),
    );
    yes.focus();
  }

  const rowEl = (r: Row) => {
    const el = h('button', 'shop-row');
    el.type = 'button';
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', String(r.id === selected));
    el.dataset.id = r.id;
    const sw = h('span', r.swatch ? 'shop-swatch' : 'shop-swatch is-icon');
    if (r.swatch) sw.style.background = r.swatch;
    else sw.innerHTML = tab === 'sound' ? SCREEN_ICONS.siren : SCREEN_ICONS.car;
    const st = stateOf(r.id);
    const tag = owns(profile, r.id) ? (inUse(profile, r.id) ? 'Em uso' : 'Seu') : r.price > 0 ? n(r.price) : '';
    const state = h(
      'span',
      `shop-tag${inUse(profile, r.id) ? ' is-on' : ''}${!owns(profile, r.id) && !st.enabled ? ' is-locked' : ''}`,
      tag,
    );
    const name = h('span', 'shop-row-name', r.name);
    // V2 part 5: still locked by the career (or the car not bought): what is missing, under the name
    const check = owns(profile, r.id) ? null : canBuy(profile, r.id);
    const locked = check !== null && !check.ok && check.reason === 'locked';
    if (locked) name.append(h('small', 'shop-row-need', check.need));
    if (!owns(profile, r.id) && r.price > 0) state.insertAdjacentHTML('afterbegin', locked ? SCREEN_ICONS.lock : SCREEN_ICONS.coin);
    el.append(sw, name, state);
    el.addEventListener('click', () => {
      selected = r.id;
      if (tab === 'cars') stageCar = r.id.split(':')[1] as CarId;
      draw();
      list.querySelector<HTMLElement>(`[data-id="${r.id}"]`)?.focus();
    });
    if (tab === 'sound') {
      const listen = btn(
        'Ouvir',
        'shop-listen',
        () => p.onListen(side, r.id.startsWith('sound:police') || r.id.startsWith('sound:thief') ? null : (r.id.split(':')[1] as SoundId)),
        SCREEN_ICONS.play,
      );
      listen.setAttribute('aria-label', `Ouvir ${r.name}`);
      const wrap = h('div', 'shop-row-wrap');
      wrap.append(el, listen);
      return wrap;
    }
    return el;
  };

  const platePanel = () => {
    const wrap = h('div', 'shop-plate');
    const plate = h('div', 'shop-plate-preview');
    const text = h('span', 'shop-plate-text', normalizePlate(plateDraft) || 'ABC1D23');
    plate.append(h('span', 'shop-plate-band', 'BRASIL'), text);
    const label = h('label', 'shop-plate-label', 'Sua placa (aparece no carro e no ranking)');
    const input = h('input', 'shop-plate-input');
    input.id = 'shop-plate-input';
    label.htmlFor = input.id;
    input.maxLength = PLATE_MAX;
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.value = plateDraft;
    input.addEventListener('input', () => {
      plateDraft = normalizePlate(input.value);
      input.value = plateDraft;
      text.textContent = plateDraft || 'ABC1D23';
      clearTimeout(plateTimer); // a new car model per keystroke is wasteful: wait for a pause
      plateTimer = setTimeout(() => preview?.show(side, lookOf()), 200);
    });
    const row = h('div', 'screen-actions');
    if (owns(profile, 'plate')) {
      row.append(
        btn('Salvar', 'is-primary', () => ((profile = p.onPlate(plateDraft)), draw())),
        btn('Tirar placa', 'is-quiet', () => ((plateDraft = ''), (profile = p.onPlate('')), draw())),
      );
    } else {
      const st = stateOf('plate');
      const buy = btn(st.label, 'is-primary', () =>
        confirmBuy('plate', 'a placa', () => {
          profile = p.onBuy('plate');
          profile = p.onPlate(plateDraft);
        }),
      );
      buy.disabled = !st.enabled;
      row.append(buy);
    }
    wrap.append(plate, label, input, row, h('p', 'shop-note', 'Depois de comprar, muda quando quiser sem pagar de novo.'));
    return wrap;
  };

  function draw() {
    wallet.replaceChildren();
    wallet.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
    wallet.append(n(profile.coins));
    wallet.setAttribute('aria-label', `${n(profile.coins)} moedas`);
    tabs.replaceChildren(
      ...TABS.map(([t, label]) => {
        const b = btn(label, `shop-tab${t === tab ? ' is-on' : ''}`, () => {
          tab = t;
          if (t === 'cars') selected = `car:${stageCar}`;
          else if (t === 'plate') selected = 'plate';
          else selected = rows().find((r) => inUse(profile, r.id))?.id ?? rows()[0]!.id;
          draw();
          tabs.querySelector<HTMLElement>('.is-on')?.focus();
        });
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(t === tab));
        return b;
      }),
    );
    list.replaceChildren(...(tab === 'plate' ? [platePanel()] : rows().map(rowEl)));
    const st = stateOf(selected);
    action.hidden = tab === 'plate';
    action.textContent = tab === 'plate' ? '' : st.label; // the plate tab has its own buttons
    action.disabled = !st.enabled;
    const paintName = CARS[stageCar].colorNames[profile.equipped.paint[stageCar] ?? 0];
    stageName.textContent =
      tab === 'cars'
        ? CARS[stageCar].name
        : tab === 'plate'
          ? CARS[stageCar].name
          : `${CARS[stageCar].name} · ${nameOf(selected) || paintName}`;
    preview?.show(side, lookOf());
  }

  draw();
  const m = mount(root, s, back);
  return { dispose: () => (clearTimeout(plateTimer), preview?.dispose(), m.dispose()) };
}
