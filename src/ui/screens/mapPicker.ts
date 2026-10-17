// Map choice on the side screen (option B, approved 2026-10-17): a "Mapa: Rio de Janeiro · trocar" pill under the
// difficulty opens a sheet with the maps; a locked one shows what it takes. The pick is remembered (storage/map.ts).
import { MAPS, MAP_IDS, mapNeed, mapUnlocked, type MapId } from '../../meta/maps';
import { btn, h, openModal } from './dom';
import { SCREEN_ICONS } from './icons';

const thumb = (m: MapId, cls: string) => {
  const t = h('span', cls);
  t.style.backgroundImage = `url(/maps/${m}.jpg)`;
  return t;
};

export function mapChip(host: HTMLElement, p: { map: MapId; wins: number; onPick(map: MapId): void }): HTMLElement {
  let current = p.map;
  const chip = btn('', 'choose-map', () => openSheet());
  const draw = () => {
    chip.replaceChildren(
      thumb(current, 'choose-map-thumb'),
      h('span', '', `Mapa: ${MAPS[current].name}`),
      h('span', 'choose-map-swap', 'trocar'),
    );
    chip.setAttribute('aria-label', `Mapa: ${MAPS[current].name}. Trocar mapa`);
  };
  function openSheet() {
    const sheet = h('div', 'map-sheet');
    const box = h('div', 'map-sheet-box');
    const list = h('div', 'map-sheet-list');
    list.setAttribute('role', 'radiogroup');
    list.setAttribute('aria-label', 'Mapa');
    let first: HTMLElement | undefined;
    for (const m of MAP_IDS) {
      const open = mapUnlocked(m, p.wins);
      const card = h('button', `map-card${m === current ? ' is-on' : ''}${open ? '' : ' is-locked'}`);
      card.type = 'button';
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', String(m === current));
      // locked: still focusable (aria-disabled), so the keyboard reaches what it takes to unlock it
      if (!open) card.setAttribute('aria-disabled', 'true');
      const pic = thumb(m, 'map-card-pic');
      if (!open) pic.innerHTML = SCREEN_ICONS.lock;
      card.append(pic, h('b', 'map-card-name', MAPS[m].name));
      if (!open) card.append(h('small', 'map-card-need', `${mapNeed(m)} (${Math.min(p.wins, MAPS[m].wins)}/${MAPS[m].wins})`));
      card.addEventListener('click', () => {
        if (!open) return;
        current = m;
        p.onPick(m);
        draw();
        close();
      });
      if (m === current) first = card;
      list.append(card);
    }
    const head = h('div', 'map-sheet-head');
    head.append(
      h('h3', '', 'Escolha o mapa'),
      btn('Fechar', 'is-quiet map-sheet-close', () => close()),
    );
    box.append(head, list);
    sheet.append(box);
    sheet.addEventListener('click', (e) => e.target === sheet && close());
    const close = openModal(host, sheet, 'Escolha o mapa', () => chip.focus());
    first?.focus();
  }
  draw();
  return chip;
}
