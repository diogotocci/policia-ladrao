// HUD mínimo da partida (vida, tempo, distância, nível) e a tela de fim. Ranking e telas completas: entrega 5.
import type { Role } from '../config/balance';
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

export function createHud(
  root: HTMLElement,
  playerRole: Role,
  opts: { onRestart?: () => void } = {},
): { update(w: WorldState): void; dispose(): void } {
  const hud = el('div', 'hud');
  hud.dataset.role = playerRole;

  const bars = el('div', 'hud-bars');
  const bar = (role: Role, label: string) => {
    const b = el('div', `hud-bar hud-bar--${role}`);
    const name = el('span', 'hud-bar-label', label);
    const track = el('div', 'hud-bar-track');
    const fill = el('div', 'hud-bar-fill');
    track.append(fill);
    const value = el('span', 'hud-bar-value', '100');
    b.append(name, track, value);
    bars.append(b);
    return { fill, value };
  };
  const policeBar = bar('police', 'Polícia');
  const thiefBar = bar('thief', 'Ladrão');

  const center = el('div', 'hud-center');
  const time = el('div', 'hud-time', '00:00.0');
  const dist = el('div', 'hud-distance', '0 m');
  const level = el('div', 'hud-level', 'Nv 1');
  center.append(time, dist, level);

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

  hud.append(bars, center, end);
  root.append(hud);

  const setBar = (b: { fill: HTMLElement; value: HTMLElement }, hp: number) => {
    const v = Math.max(0, Math.round(hp));
    b.fill.style.width = `${v}%`;
    b.value.textContent = String(v);
  };

  return {
    update(w) {
      const police = policeOf(w);
      const thief = thiefOf(w);
      setBar(policeBar, police.hp);
      setBar(thiefBar, thief.hp);
      time.textContent = formatTime(w.match.over ? (w.match.endTime ?? w.time) : w.time);
      const d = Math.abs(thief.s - police.s);
      dist.textContent = `${Math.round(d)} m`;
      dist.dataset.band = distanceBand(d);
      level.textContent = `Nv ${w.level}`;

      if (w.match.over && end.hidden) {
        const won = w.match.winner === playerRole;
        endTitle.textContent = won ? 'Você venceu!' : 'Você perdeu';
        endReason.textContent = w.match.winner === 'police' ? 'O ladrão foi detido' : 'A viatura foi destruída';
        endTime.textContent = `Tempo: ${formatTime(w.match.endTime ?? w.time)}`;
        end.dataset.result = won ? 'win' : 'lose';
        end.hidden = false;
        again.focus?.();
      }
    },
    dispose() {
      hud.remove();
    },
  };
}
