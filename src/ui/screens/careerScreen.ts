// Carreira (V2 part 5, spec §5): today's challenges and the streak, achievements, ranks per side.
// Plus the pieces shown on the end screen: the career strip and the streak dialog.
import type { Role } from '../../config/balance';
import {
  ACHIEVEMENTS,
  DAILY_COINS,
  claimCoins,
  MAX_RANK,
  RANK_NAMES,
  RANK_XP,
  STREAK_COINS,
  dailiesFor,
  dailyProgress,
  dayBefore,
  progressOf,
  rankOf,
  type Career,
  type CareerEvent,
} from '../../meta/career';
import { CARS, NEONS, SOUNDS, type CarId, type NeonColor, type SoundId } from '../../meta/shop';
import { btn, h, mount, type Disposable } from './dom';
import { SCREEN_ICONS } from './icons';
import { insignia } from './insignia';
import './career.css';
import './garage.css';
import { garagePanel, type GarageCar } from './garage';
import { MASTERY_MAX, rewardName } from '../../meta/mastery';

type Tab = 'today' | 'achievements' | 'ranks' | 'garage';
const n = (v: number) => v.toLocaleString('pt-BR');

/** Player-facing name of a shop item ("Esportivo", "sirene Choque", "neon Rosa"...). */
export function itemName(id: string): string {
  const [kind, a, b] = id.split(':');
  if (kind === 'car') return CARS[a as CarId].name;
  if (kind === 'sound') return `${SOUNDS[a as SoundId].role === 'police' ? 'sirene' : 'buzina'} ${SOUNDS[a as SoundId].name}`;
  if (kind === 'neon') return `neon ${NEONS[b as NeonColor].name}`;
  if (kind === 'paint') return `pintura ${CARS[a as CarId].colorNames[Number(b)]}`;
  if (id === 'plate') return 'placa';
  return id;
}

/** What each rank unlocks on its side (text of the Patente tab and of the end strip). */
export const RANK_UNLOCKS = [
  'carro padrão',
  '+200 · placa e 1ª pintura',
  '+400 · 2 cores de neon',
  '+600 · 2ª pintura',
  '+1.000 · as outras 2 cores de neon',
  '+1.500 · 3ª pintura',
  '+2.000 · patente no ranking',
];

/** Streak still alive today or yesterday (otherwise the next match starts over at 1). */
export const streakDays = (c: Career, today: string) => (c.streak.last === today || c.streak.last === dayBefore(today) ? c.streak.days : 0);

const bar = (value: number, max: number, cls = '') => {
  const b = h('div', `career-bar ${cls}`);
  const fill = h('i');
  fill.style.width = `${Math.round((100 * Math.min(value, max)) / Math.max(1, max))}%`;
  b.append(fill);
  b.setAttribute('role', 'progressbar');
  b.setAttribute('aria-valuemin', '0');
  b.setAttribute('aria-valuemax', String(max));
  b.setAttribute('aria-valuenow', String(Math.min(value, max)));
  return b;
};

type Claim = (id: string) => void;

/** The right side of a row: price while open, "Resgatar +N" when done and waiting, "Recebido"/"Liberado" after. */
function rowTag(done: boolean, claimId: string | null, pending: boolean, coins: number, onClaim: Claim, doneText: string): HTMLElement {
  if (done && pending && claimId) {
    const b = btn(coins ? `Resgatar +${n(coins)}` : 'Resgatar', 'career-claim', () => onClaim(claimId));
    return b;
  }
  const tag = h('span', `career-tag${done ? ' is-done' : ''}`, done ? doneText : coins ? n(coins) : '');
  if (!done && coins) tag.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
  return tag;
}

function challengeRow(title: string, value: number, target: number, sideCls: string, tag: HTMLElement, note?: string): HTMLElement {
  const done = value >= target;
  const row = h('div', `career-row${done ? ' is-done' : ''}`);
  const txt = h('div', 'career-row-text');
  txt.append(h('b', '', title), bar(value, target, done ? 'is-done' : sideCls));
  if (note) txt.append(h('small', '', note));
  else if (target > 1 && !done) txt.append(h('small', '', `${n(value)} de ${n(target)}`));
  row.append(txt, tag);
  return row;
}

function untilMidnight(now: Date): string {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));
  return min >= 60 ? `renovam em ${Math.floor(min / 60)}h ${min % 60}min` : `renovam em ${min} min`;
}

const shortDay = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

function todayPanel(c: Career, today: string, now: Date, onClaim: Claim): HTMLElement {
  const wrap = h('div', 'career-today');
  const left = h('div', 'career-col');
  const head = h('div', 'career-head');
  head.append(h('b', '', 'Desafios do dia'), h('small', '', untilMidnight(now)));
  left.append(head);
  const prog = dailyProgress(c, today);
  dailiesFor(today).forEach((d, i) => {
    const side = d.side === 'police' ? 'is-police' : d.side === 'thief' ? 'is-thief' : '';
    const id = `daily:${today}:${i}`;
    const tag = rowTag(prog[i]! >= d.target, id, c.claims.includes(id), DAILY_COINS[d.tier], onClaim, 'Recebido');
    left.append(
      challengeRow(
        d.title,
        prog[i]!,
        d.target,
        side,
        tag,
        d.side ? `Só jogando de ${d.side === 'police' ? 'polícia' : 'ladrão'}` : undefined,
      ),
    );
  });
  // challenges of earlier days still waiting: they never expire
  for (const id of c.claims.filter((x) => x.startsWith('daily:') && !x.startsWith(`daily:${today}:`))) {
    const [, date, k] = id.split(':');
    const d = dailiesFor(date!)[Number(k)]!;
    left.append(
      challengeRow(d.title, d.target, d.target, '', rowTag(true, id, true, claimCoins(id), onClaim, ''), `Desafio de ${shortDay(date!)}`),
    );
  }
  const right = h('div', 'career-col');
  const days = streakDays(c, today);
  const title = h('b', 'career-streak-title', days > 0 ? `Sequência: ${days} ${days === 1 ? 'dia' : 'dias'}` : 'Sequência de dias');
  title.insertAdjacentHTML('afterbegin', SCREEN_ICONS.flame);
  const strip = h('div', 'career-days');
  STREAK_COINS.forEach((coins, i) => {
    const got = i < days || (days >= STREAK_COINS.length && i === STREAK_COINS.length - 1);
    const day = h(
      'div',
      `career-day${got ? ' is-got' : ''}${c.streak.last === today && i === Math.min(days, STREAK_COINS.length) - 1 ? ' is-today' : ''}`,
    );
    day.append(h('span', '', String(i + 1)), h('b', '', n(coins)));
    strip.append(day);
  });
  right.append(title, strip, h('small', 'career-note', 'Termine uma partida por dia para manter. Pulou um dia, volta ao dia 1.'));
  wrap.append(left, right);
  return wrap;
}

function achievementsPanel(c: Career, side: Role | 'any', onSide: (s: Role | 'any') => void, onClaim: Claim): HTMLElement {
  const wrap = h('div', 'career-col');
  const seg = h('div', 'career-seg');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-label', 'Conquistas de');
  for (const [s, label] of [
    ['police', 'Polícia'],
    ['thief', 'Ladrão'],
    ['any', 'Geral'],
  ] as const) {
    const waiting = ACHIEVEMENTS.some((a) => a.side === s && c.claims.includes(`ach:${a.id}`));
    const b = btn(label, `career-seg-btn is-${s}${waiting ? ' has-claim' : ''}`, () => onSide(s));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(s === side));
    seg.append(b);
  }
  wrap.append(seg);
  const cls = side === 'police' ? 'is-police' : side === 'thief' ? 'is-thief' : '';
  for (const a of ACHIEVEMENTS.filter((x) => x.side === side)) {
    const done = c.achieved.includes(a.id);
    const id = `ach:${a.id}`;
    const what = a.unlock ? `Libera na loja: ${itemName(a.unlock)}` : `+${n(a.coins ?? 0)} moedas`;
    const value = done ? a.target : progressOf(c, a);
    const tag = rowTag(done, id, c.claims.includes(id), a.coins ?? 0, onClaim, a.unlock ? 'Liberado' : 'Recebido');
    wrap.append(challengeRow(a.title, value, a.target, cls, tag, a.target > 1 && !done ? `${n(value)} de ${n(a.target)} · ${what}` : what));
  }
  return wrap;
}

/** One card per side: the insignia, the XP bar, "Resgatar" for ranks reached, and the track of the 7 insignias. */
function rankCard(c: Career, role: Role, onClaim: Claim): HTMLElement {
  const col = h('div', `career-col career-rank-col is-${role}`);
  const xp = c.xp[role];
  const r = rankOf(xp);
  const card = h('div', 'career-rank-card');
  const big = h('div', 'career-rank-big');
  big.innerHTML = insignia(role, r, { label: RANK_NAMES[role][r - 1] });
  const info = h('div', 'career-rank-info');
  info.append(h('small', 'career-rank-side', role === 'police' ? 'POLÍCIA' : 'LADRÃO'), h('b', '', RANK_NAMES[role][r - 1]!));
  if (r < MAX_RANK) {
    info.append(bar(xp - RANK_XP[r - 1]!, RANK_XP[r]! - RANK_XP[r - 1]!, `is-${role}`));
    info.append(h('small', '', `${n(xp)} / ${n(RANK_XP[r]!)} XP para ${RANK_NAMES[role][r]}`));
  } else info.append(h('small', '', `${n(xp)} XP · patente máxima`));
  card.append(big, info);
  const waiting = c.claims.filter((x) => x.startsWith(`rank:${role}:`)).sort();
  if (waiting.length) {
    const coins = waiting.reduce((t, id) => t + claimCoins(id), 0);
    card.append(btn(`Resgatar +${n(coins)}`, 'career-claim', () => waiting.forEach(onClaim)));
  }
  const track = h('ol', 'career-track');
  RANK_NAMES[role].forEach((name, i) => {
    const li = h('li', `career-track-step${i + 1 === r ? ' is-current' : ''}${i + 1 > r ? ' is-locked' : ''}`);
    li.innerHTML = insignia(role, i + 1, { locked: i + 1 > r });
    li.append(h('small', '', name));
    li.title = `${name}: ${RANK_UNLOCKS[i]}`;
    track.append(li);
  });
  const next = r < MAX_RANK ? h('small', 'career-note', `Próxima: ${RANK_NAMES[role][r]} · ${RANK_UNLOCKS[r]}`) : null;
  col.append(card, track);
  if (next) col.append(next);
  return col;
}

export function renderCareer(
  root: HTMLElement,
  p: {
    career: Career;
    coins: number;
    today: string;
    now?: Date;
    onBack(): void;
    /** "Resgatar": the app pays it and returns the new career and balance */
    onClaim(id: string): { career: Career; coins: number };
    tab?: Tab;
    /** V2 part 6: the cars owned, for the Garagem tab (asked on every redraw: a claim changes their paint) */
    cars?: () => readonly GarageCar[];
  },
): Disposable {
  let tab: Tab = p.tab ?? 'today';
  let side: Role | 'any' = 'police';
  let career = p.career;
  let coins = p.coins;
  const s = h('section', 'screen screen-career');
  s.setAttribute('aria-label', 'Carreira');
  const top = h('div', 'career-top');
  const back = btn('Voltar', 'is-quiet career-back', p.onBack, SCREEN_ICONS.back);
  const tabs = h('div', 'career-tabs');
  tabs.setAttribute('role', 'tablist');
  const wallet = h('p', 'career-wallet');
  top.append(back, h('h2', 'screen-heading career-heading', 'Carreira'), tabs, wallet);
  const body = h('div', 'career-body');
  s.append(top, body);
  const onClaim: Claim = (id) => {
    const r = p.onClaim(id);
    career = r.career;
    coins = r.coins;
    draw();
    // keep the keyboard nearby: the next "Resgatar" or the active tab
    (body.querySelector<HTMLElement>('.career-claim') ?? tabs.querySelector<HTMLElement>('.is-on'))?.focus();
  };
  const waitingIn = (t: Tab) =>
    career.claims.some((x) => x.startsWith(t === 'today' ? 'daily:' : t === 'achievements' ? 'ach:' : t === 'garage' ? 'mast:' : 'rank:'));
  function draw() {
    wallet.replaceChildren();
    wallet.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
    wallet.append(n(coins));
    wallet.setAttribute('aria-label', `${n(coins)} moedas`);
    tabs.replaceChildren(
      ...(
        [
          ['today', 'Hoje'],
          ['achievements', 'Conquistas'],
          ['ranks', 'Patente'],
          ['garage', 'Garagem'],
        ] as const
      ).map(([t, label]) => {
        const b = btn(label, `career-tab${t === tab ? ' is-on' : ''}${waitingIn(t) ? ' has-claim' : ''}`, () => {
          tab = t;
          draw();
          tabs.querySelector<HTMLElement>('.is-on')?.focus();
        });
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(t === tab));
        if (waitingIn(t)) b.setAttribute('aria-label', `${label}, prêmios para resgatar`);
        return b;
      }),
    );
    if (tab === 'today') body.replaceChildren(todayPanel(career, p.today, p.now ?? new Date(), onClaim));
    else if (tab === 'achievements')
      body.replaceChildren(
        achievementsPanel(
          career,
          side,
          (x) => {
            side = x;
            draw();
            body.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
          },
          onClaim,
        ),
      );
    else if (tab === 'garage') body.replaceChildren(garagePanel(p.cars?.() ?? [], career, onClaim));
    else {
      const two = h('div', 'career-today');
      two.append(rankCard(career, 'police', onClaim), rankCard(career, 'thief', onClaim));
      body.replaceChildren(two);
    }
  }
  draw();
  return mount(root, s, back);
}

// ---------- end screen ----------
/** XP of the match and up to 3 lines (rank up, challenges, achievements). Empty events: nothing. */
export function careerStrip(events: readonly CareerEvent[], role: Role): HTMLElement | null {
  const xp = events.find((e): e is Extract<CareerEvent, { kind: 'xp' }> => e.kind === 'xp');
  if (!xp) return null;
  const box = h('div', 'end-career');
  const r = rankOf(xp.xp);
  // several ranks in one match: show the last one reached (and everything it unlocked on the way)
  const ups = events.filter((e): e is Extract<CareerEvent, { kind: 'rank' }> => e.kind === 'rank' && e.side === role);
  const up = ups.at(-1);
  const head = h('div', 'end-career-head');
  head.append(
    h('b', '', up ? `${RANK_NAMES[role][ups[0]!.rank - 2]} → ${RANK_NAMES[role][up.rank - 1]}!` : RANK_NAMES[role][r - 1]!),
    h('span', '', `+${n(xp.gained)} XP`),
  );
  box.append(head, bar(r < MAX_RANK ? xp.xp - RANK_XP[r - 1]! : 1, r < MAX_RANK ? RANK_XP[r]! - RANK_XP[r - 1]! : 1, `is-${role}`));
  if (up)
    box.append(h('small', 'end-career-note', `Nova patente! Resgate na Carreira: ${ups.map((u) => RANK_UNLOCKS[u.rank - 1]).join(', ')}`));
  // V2 part 6: the car went up a mastery level (the last one reached)
  const mastery = events.filter((e): e is Extract<CareerEvent, { kind: 'mastery' }> => e.kind === 'mastery').at(-1);
  const lines = events.filter((e) => e.kind === 'daily' || e.kind === 'achievement').slice(0, mastery ? 2 : 3);
  if (mastery) {
    const car = CARS[mastery.car as CarId];
    const line = h('p', 'end-career-line');
    const what = mastery.level >= MASTERY_MAX ? 'Resgate na Garagem' : `${rewardName(car.role, mastery.level)} na Loja`;
    line.append(h('span', '', `${car.name}: maestria ${mastery.level}!`), h('b', '', what));
    box.append(line);
  }
  for (const e of lines) {
    const line = h('p', 'end-career-line');
    // completed here, paid in Carreira ("Resgatar", playtest 2026-10-08)
    if (e.kind === 'daily') line.append(h('span', '', `Desafio completo: ${e.title}`), h('b', '', 'Resgate na Carreira'));
    else if (e.kind === 'achievement') line.append(h('span', '', `Conquista: ${e.title}`), h('b', '', 'Resgate na Carreira'));
    box.append(line);
  }
  return box;
}

/**
 * "N dias seguidos!" over the end screen, once a day (first match). Not modal: a banner that leaves by itself
 * (or on a tap) and never blocks the end screen buttons or the initials.
 */
export function openStreak(host: HTMLElement, e: Extract<CareerEvent, { kind: 'streak' }>): () => void {
  const banner = h('div', 'career-streak');
  banner.setAttribute('role', 'status');
  const title = h('b', 'career-streak-title', e.days === 1 ? 'Primeiro dia da sequência!' : `${e.days} dias seguidos!`);
  title.insertAdjacentHTML('afterbegin', SCREEN_ICONS.flame);
  const coins = h('span', 'career-streak-coins', `+${n(e.coins)}`);
  coins.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
  const next = STREAK_COINS[Math.min(e.days, STREAK_COINS.length - 1)]!;
  // filled in the next frame: screen readers announce a status region whose text changes, not one born full
  requestAnimationFrame(() => banner.append(title, coins, h('small', 'career-note', `Amanhã: +${n(next)}`)));
  const close = () => {
    clearTimeout(timer);
    banner.remove();
  };
  const timer = setTimeout(close, 3500);
  banner.addEventListener('click', close);
  host.append(banner);
  return close;
}
