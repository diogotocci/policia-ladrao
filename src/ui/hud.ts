// Minimal match HUD (health, time, distance, level) and the end screen. Ranking and full screens: delivery 5.
import type { Role } from '../config/balance';
import { BALANCE } from '../config/balance';
import { strong } from '../sim/specials';
import type { WorldState } from '../sim/types';
import { hpPct } from '../sim/car';
import { createChaosMeter } from './hudSurvival';
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

/** Short item labels (pickup notice and icon hint). */
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
  oil: 'Óleo',
  spikes: 'Miguelito',
  smoke: 'Fumaça',
  roadblock: 'Bloqueio',
  machineGun: 'Metralhadora',
  wingman: 'Reforço',
  spotlight: 'Holofote',
  fxSpot: 'Holofote em você',
  // effects on the car (V2 part 3)
  fxSkid: 'Derrapando no óleo',
  fxFlat: 'Pneu furado',
  fxSmoke: 'Fumaça',
  fxSlow: 'Motor falhando',
  fxDouble: 'Dano dobrado',
  fxMud: 'Para-brisa sujo',
  fxNoBrake: 'Sem freio',
};
export const ITEM_ICON: Record<string, string> = {
  fireRate: '⚡',
  power: '💥',
  ram: '🛡️',
  nitro: '🔥',
  heli: '🚁',
  pierce: '🎯',
  plate: '🛡️',
  gun: '🔫', // shield for both (each only sees their own side)
  fxSkid: '🛢️',
  fxFlat: '🛞',
  fxSmoke: '💨',
  fxSlow: '🔧',
  fxDouble: '💔',
  fxMud: '🟫',
  fxNoBrake: '🚫',
  machineGun: '🔫',
  wingman: '🚓',
  spotlight: '🔦',
  fxSpot: '🔦',
};
/** bad effects: red chip (yellow box, oil, spikes) */
const BAD = new Set(['fxSkid', 'fxFlat', 'fxSlow', 'fxDouble', 'fxMud', 'fxNoBrake', 'fxSpot']);
/** short text next to the icon of an effect chip */
const FX_TEXT: Record<string, string> = {
  fxSkid: 'Óleo',
  fxFlat: 'Pneu',
  fxSmoke: 'Fumaça',
  fxSlow: 'Motor',
  fxDouble: '×2',
  fxMud: 'Lama',
  fxNoBrake: 'Freio',
  fxSpot: 'Holofote',
};

interface HudItem {
  id: string;
  count?: string;
  left?: number; // remaining fraction (temporary items)
}

function playerItems(w: WorldState, role: Role): HudItem[] {
  const car = role === 'police' ? policeOf(w) : thiefOf(w);
  const u = car.upgrades;
  const out: HudItem[] = [];
  const P = BALANCE.items.police;
  const timed = (id: string, until: number, dur: number) => {
    if (w.time < until) out.push({ id, left: Math.min(1, Math.round(((until - w.time) / dur) * 100) / 100) });
  };
  if (role === 'police') {
    const rate = Math.round((BALANCE.combat.policeFireInterval - u.fireInterval) / P.fireRateStep);
    if (rate > 0) out.push({ id: 'fireRate', count: String(rate) });
    if (u.power > 1) out.push({ id: 'power', count: `×${u.power}` });
    if (u.ramCharges > 0) out.push({ id: 'ram', count: String(u.ramCharges) });
    timed('nitro', u.nitroUntil, P.nitroTime);
    timed('heli', u.heliUntil, P.heliTime);
    timed('pierce', u.pierceUntil, P.pierceTime);
    // V2 part 3 police items (times up to the strong ones; the ring starts a bit short of full when not strong)
    timed('machineGun', u.mgUntil, BALANCE.items.machineGun.timeStrong);
    timed('wingman', u.wingmanUntil, BALANCE.items.wingman.timeStrong);
    timed('spotlight', u.spotUntil, BALANCE.items.spotlight.timeStrong);
  } else {
    if (u.plates > 0) out.push({ id: 'plate', count: String(u.plates) });
    if (car.hasGun) {
      const lvl = 1 + Math.round((BALANCE.combat.thiefFireInterval - u.fireInterval) / BALANCE.items.thief.gunStep);
      out.push({ id: 'gun', count: String(lvl) });
    }
  }
  // effects on the car (V2 part 3): a timed chip each, red when bad
  const fx = car.effects;
  const I = BALANCE.items;
  const M = I.mystery;
  timed('fxSkid', fx.skidUntil, I.oil.skidTime);
  const big = strong(w);
  timed('fxFlat', fx.flatUntil, big ? I.spikes.flatTimeStrong : I.spikes.flatTime);
  timed('fxSmoke', fx.smokeUntil, big ? I.smoke.timeStrong : I.smoke.time);
  timed('fxSlow', fx.slowUntil, M.slow.time);
  timed('fxDouble', fx.doubleUntil, M.double.time);
  timed('fxMud', fx.mudUntil, M.mud.time);
  timed('fxNoBrake', fx.noBrakeUntil, M.noBrake.time);
  if (role === 'thief') timed('fxSpot', policeOf(w).upgrades.spotUntil, BALANCE.items.spotlight.timeStrong);
  return out;
}

/** Short notice when picking up a box. */
export function pickupToast(item: string): string {
  if (item === 'wrong') return '−2 caixinha errada';
  if (item === 'none') return 'Itens no máximo';
  return `+ ${ITEM_LABEL[item] ?? item}`;
}

/** last seconds of the countdown: pulsing yellow + beep */
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
    // bar only (no number — playtest); the value is kept for screen readers
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
  // last 10 s: big number in the middle of the screen
  const finalEl = el('div', 'hud-final');
  finalEl.hidden = true;
  finalEl.setAttribute('aria-hidden', 'true'); // the top timer already announces the time
  let finalShown = '';
  const toastEl = el('div', 'hud-toast');
  toastEl.hidden = true;
  toastEl.setAttribute('role', 'status');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const center = el('div', 'hud-center');
  // countdown to the escape (1:30): "Fuga em" (thief) / "Prenda em" (police)
  const timeBox = el('div', 'hud-time-box');
  const timeLabel = el('span', 'hud-time-label', playerRole === 'thief' ? 'Fuga em' : 'Prenda em');
  const time = el('div', 'hud-time', '00:00.0');
  timeBox.append(timeLabel, time);
  const chaosMeter = createChaosMeter();
  timeBox.append(chaosMeter.el);
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
      setBar(policeBar, hpPct(police));
      setBar(thiefBar, hpPct(thief));
      const at = w.match.escapeAt ?? w.match.arrestAt ?? (w.match.over ? (w.match.endTime ?? w.time) : w.time);
      // Sobrevivência: no clock to beat, the time counts up next to the chaos level
      const survival = w.mode === 'survival';
      const left = survival ? Infinity : Math.max(0, w.escapeTime - at);
      timeLabel.textContent = survival ? 'Tempo' : playerRole === 'thief' ? 'Fuga em' : 'Prenda em';
      time.textContent = formatTime(survival ? at : left);
      const rose = chaosMeter.update(w.mode, w.chaos);
      if (rose) this.toast(rose, { big: true });
      const scene = w.match.escapeAt !== undefined || w.match.arrestAt !== undefined;
      const alert = left > 0 && left <= ALERT_LEFT && !w.match.over && !scene;
      time.classList.toggle('is-alert', alert);
      const n = alert ? String(Math.ceil(left)) : '';
      if (n !== finalShown) {
        finalShown = n;
        finalEl.hidden = !alert;
        finalEl.textContent = n;
        // restarts the "jump" animation every second
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
            if (BAD.has(i.id)) e.classList.add('hud-item--bad');
            if (FX_TEXT[i.id]) e.append(el('span', 'hud-item-count', FX_TEXT[i.id]!));
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
    /** paused: the last-10-s alert stops pulsing behind the pause screen */
    setPaused(paused) {
      hud.classList.toggle('is-paused', paused);
    },
    dispose() {
      clearTimeout(toastTimer);
      hud.remove();
    },
  };
}
