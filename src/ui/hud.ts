// HUD mínimo da partida (vida, tempo, distância, nível) e a tela de fim. Ranking e telas completas: entrega 5.
import type { Role } from '../config/balance';
import { BALANCE } from '../config/balance';
import type { WorldState } from '../sim/types';
import { policeOf, thiefOf } from '../sim/world';
import './hud.css';

export function formatTime(seconds: number): string {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t * 10) % 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
}

export type DistanceBand = 'near' | 'mid' | 'far';
export function distanceBand(d: number): DistanceBand {
  return d <= 40 ? 'near' : d <= 100 ? 'mid' : 'far';
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Rótulos curtos dos itens (aviso ao pegar e dica dos ícones). */
export const ITEM_LABEL: Record<string, string> = {
  fireRate: 'Cadência',
  power: 'Potência',
  heal: 'Vida +3',
  nitro: 'Nitro',
  ram: 'Quebra-mato',
  heli: 'Helicóptero',
  pierce: 'Tiro perfurante',
  plate: 'Titânio',
  bomb: 'Bomba',
  gun: 'Arma traseira',
};
const ITEM_ICON: Record<string, string> = {
  fireRate: '⚡',
  power: '💥',
  ram: '🛡️',
  nitro: '🔥',
  heli: '🚁',
  pierce: '🎯',
  plate: '🛡️',
  gun: '🔫', // escudo nos dois (cada um só vê o seu lado)
};

interface HudItem {
  id: string;
  count?: string;
  left?: number; // fração restante (itens temporários)
}

function playerItems(w: WorldState, role: Role): HudItem[] {
  const car = role === 'police' ? policeOf(w) : thiefOf(w);
  const u = car.upgrades;
  const out: HudItem[] = [];
  const P = BALANCE.items.police;
  const timed = (id: string, until: number, dur: number) => {
    if (w.time < until) out.push({ id, left: Math.round(((until - w.time) / dur) * 100) / 100 });
  };
  if (role === 'police') {
    const rate = Math.round((BALANCE.combat.policeFireInterval - u.fireInterval) / P.fireRateStep);
    if (rate > 0) out.push({ id: 'fireRate', count: String(rate) });
    if (u.power > 1) out.push({ id: 'power', count: `×${u.power}` });
    if (u.ramCharges > 0) out.push({ id: 'ram', count: String(u.ramCharges) });
    timed('nitro', u.nitroUntil, P.nitroTime);
    timed('heli', u.heliUntil, P.heliTime);
    timed('pierce', u.pierceUntil, P.pierceTime);
  } else {
    if (u.plates > 0) out.push({ id: 'plate', count: String(u.plates) });
    if (car.hasGun) {
      const lvl = 1 + Math.round((BALANCE.combat.thiefFireInterval - u.fireInterval) / BALANCE.items.thief.gunStep);
      out.push({ id: 'gun', count: String(lvl) });
    }
  }
  return out;
}

/** Aviso curto ao pegar uma caixinha. */
export function pickupToast(item: string): string {
  if (item === 'wrong') return '−2 caixinha errada';
  if (item === 'none') return 'Itens no máximo';
  return `+ ${ITEM_LABEL[item] ?? item}`;
}

/** últimos segundos da contagem: amarelo pulsando + bip */
export const ALERT_LEFT = 10;

export function createHud(
  root: HTMLElement,
  playerRole: Role,
  opts: { onRestart?: () => void; showEnd?: boolean } = {},
): { update(w: WorldState): void; toast(text: string, opts?: { big?: boolean }): void; setPaused(paused: boolean): void; dispose(): void } {
  const hud = el('div', 'hud');
  hud.dataset.role = playerRole;

  const bars = el('div', 'hud-bars');
  const bar = (role: Role, label: string) => {
    const b = el('div', `hud-bar hud-bar--${role}`);
    const name = el('span', 'hud-bar-label', label);
    // só a barra (sem número — playtest); o valor fica para leitores de tela
    const track = el('div', 'hud-bar-track');
    track.setAttribute('role', 'meter');
    track.setAttribute('aria-label', `Vida — ${label}`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', '100');
    const fill = el('div', 'hud-bar-fill');
    track.append(fill);
    b.append(name, track);
    bars.append(b);
    return { fill, track };
  };
  const policeBar = bar('police', 'Polícia');
  const thiefBar = bar('thief', 'Ladrão');
  const items = el('div', 'hud-items');
  bars.append(items);
  let itemsSig = '';
  // últimos 10 s: número grande no meio da tela
  const finalEl = el('div', 'hud-final');
  finalEl.hidden = true;
  finalEl.setAttribute('aria-hidden', 'true'); // o cronômetro do topo já anuncia o tempo
  let finalShown = '';
  const toastEl = el('div', 'hud-toast');
  toastEl.hidden = true;
  toastEl.setAttribute('role', 'status');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const center = el('div', 'hud-center');
  // contagem regressiva até a fuga (1:30): "Fuga em" (ladrão) / "Prenda em" (polícia)
  const timeBox = el('div', 'hud-time-box');
  const timeLabel = el('span', 'hud-time-label', playerRole === 'thief' ? 'Fuga em' : 'Prenda em');
  const time = el('div', 'hud-time', '00:00.0');
  timeBox.append(timeLabel, time);
  const dist = el('div', 'hud-distance', '0 m');
  const level = el('div', 'hud-level', 'Nv 1');
  center.append(timeBox, dist, level);

  const end = el('div', 'hud-end');
  end.hidden = true;
  end.setAttribute('role', 'dialog');
  end.setAttribute('aria-live', 'assertive');
  const endCard = el('div', 'hud-end-card');
  const endTitle = el('h2', 'hud-end-title');
  const endReason = el('p', 'hud-end-reason');
  const endTime = el('p', 'hud-end-time');
  const again = el('button', 'hud-end-again', 'Jogar de novo');
  again.type = 'button';
  again.addEventListener('click', () => (opts.onRestart ?? (() => location.reload()))());
  endCard.append(endTitle, endReason, endTime, again);
  end.append(endCard);

  hud.append(bars, center, finalEl, toastEl, end);
  root.append(hud);

  const setBar = (b: { fill: HTMLElement; track: HTMLElement }, hp: number) => {
    const v = Math.max(0, Math.round(hp));
    b.fill.style.width = `${v}%`;
    b.track.setAttribute('aria-valuenow', String(v));
  };

  return {
    update(w) {
      const police = policeOf(w);
      const thief = thiefOf(w);
      setBar(policeBar, police.hp);
      setBar(thiefBar, thief.hp);
      const at = w.match.escapeAt ?? w.match.arrestAt ?? (w.match.over ? (w.match.endTime ?? w.time) : w.time);
      const left = Math.max(0, w.escapeTime - at);
      time.textContent = formatTime(left);
      const scene = w.match.escapeAt !== undefined || w.match.arrestAt !== undefined;
      const alert = left > 0 && left <= ALERT_LEFT && !w.match.over && !scene;
      time.classList.toggle('is-alert', alert);
      const n = alert ? String(Math.ceil(left)) : '';
      if (n !== finalShown) {
        finalShown = n;
        finalEl.hidden = !alert;
        finalEl.textContent = n;
        // reinicia a animação de "pulo" a cada segundo
        finalEl.classList.remove('pop');
        void finalEl.offsetWidth;
        if (alert) finalEl.classList.add('pop');
      }
      const d = Math.abs(thief.s - police.s);
      dist.textContent = `${Math.round(d)} m`;
      dist.dataset.band = distanceBand(d);
      level.textContent = `Nv ${w.level}`;

      const list = playerItems(w, playerRole);
      const sig = JSON.stringify(list.map((i) => [i.id, i.count]));
      if (sig !== itemsSig) {
        itemsSig = sig;
        items.replaceChildren(
          ...list.map((i) => {
            const e = el('span', 'hud-item');
            e.dataset.item = i.id;
            e.title = ITEM_LABEL[i.id] ?? i.id;
            e.append(el('span', 'hud-item-icon', ITEM_ICON[i.id] ?? '•'));
            if (i.count) e.append(el('span', 'hud-item-count', i.count));
            if (i.left !== undefined) e.classList.add('hud-item--timed');
            return e;
          }),
        );
      }
      for (const i of list) {
        if (i.left === undefined) continue;
        items.querySelector<HTMLElement>(`.hud-item[data-item="${i.id}"]`)?.style.setProperty('--left', String(i.left));
      }

      if (w.match.over && end.hidden && opts.showEnd !== false) {
        const won = w.match.winner === playerRole;
        endTitle.textContent = won ? 'Você venceu!' : 'Você perdeu';
        endReason.textContent =
          w.match.reason === 'escape'
            ? playerRole === 'thief'
              ? 'Fugiu! Sumiu no horizonte 🏁'
              : 'O ladrão fugiu 🏁'
            : w.match.winner === 'police'
              ? 'O ladrão foi detido'
              : 'A viatura foi destruída';
        endTime.textContent = `Tempo: ${formatTime(w.match.endTime ?? w.time)}`;
        end.dataset.result = won ? 'win' : 'lose';
        end.hidden = false;
        again.focus?.();
      }
    },
    toast(text, opts = {}) {
      toastEl.textContent = text;
      toastEl.hidden = false;
      toastEl.classList.toggle('is-big', opts.big === true);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (toastEl.hidden = true), opts.big ? 2000 : 1200);
    },
    /** pausado: o alerta dos últimos 10 s para de pulsar atrás da tela de pausa */
    setPaused(paused) {
      hud.classList.toggle('is-paused', paused);
    },
    dispose() {
      clearTimeout(toastTimer);
      hud.remove();
    },
  };
}
