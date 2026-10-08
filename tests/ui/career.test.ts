// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dailiesFor, emptyCareer, type Career } from '../../src/meta/career';
import { careerStrip, streakDays } from '../../src/ui/screens/careerScreen';
import { renderCareer, renderEnd, renderTitle } from '../../src/ui/screens/screens';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const DAY = '2026-10-08';
const button = (label: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)!;

const onClaim = vi.fn((_id: string) => ({ career: emptyCareer(), coins: 0 }));

describe('Carreira screen (spec §5)', () => {
  const career: Career = {
    ...emptyCareer(),
    xp: { police: 1580, thief: 360 },
    counters: { ...emptyCareer().counters, arrests: 14 },
    achieved: ['arrest10'],
    daily: { date: DAY, progress: [dailiesFor(DAY)[0]!.target, 0, 0] },
    streak: { last: DAY, days: 3 },
  };

  it('Hoje: the 3 challenges of the day with progress and coins, and the streak', () => {
    renderCareer(root, { career, coins: 3420, today: DAY, now: new Date(2026, 9, 8, 18, 48), onBack: vi.fn(), onClaim });
    const rows = [...root.querySelectorAll('.career-today .career-col:first-child .career-row')];
    expect(rows.map((r) => r.querySelector('b')!.textContent)).toEqual(dailiesFor(DAY).map((d) => d.title));
    expect(rows[0]!.classList.contains('is-done')).toBe(true);
    expect(rows[0]!.textContent).toContain('Recebido'); // claimed already (no claim in the list)
    expect(root.textContent).toContain('renovam em 5h 12min');
    expect(root.textContent).toContain('Sequência: 3 dias');
    expect(root.querySelectorAll('.career-day.is-got')).toHaveLength(3);
  });

  it('Conquistas: by side with progress and what each unlocks; Patente: both ladders', () => {
    renderCareer(root, { career, coins: 0, today: DAY, onBack: vi.fn(), onClaim });
    button('Conquistas').click();
    expect(root.textContent).toContain('Libera na loja: Esportivo');
    expect(root.textContent).toContain('14 de 30 · Libera na loja: Blazer');
    button('Ladrão').click();
    expect(root.textContent).toContain('Fuja 10 vezes');
    button('Patente').click();
    expect(root.textContent).toContain('Cabo');
    expect(root.textContent).toContain('1.580 / 2.000 XP para Sargento');
    expect(root.textContent).toContain('Trombadinha');
  });

  it('streak shown only while alive (today or yesterday)', () => {
    expect(streakDays({ ...emptyCareer(), streak: { last: '2026-10-07', days: 4 } }, DAY)).toBe(4);
    expect(streakDays({ ...emptyCareer(), streak: { last: '2026-10-05', days: 4 } }, DAY)).toBe(0);
  });
});

describe('career on other screens', () => {
  it('title: Carreira button with the badge and the streak next to the coins', () => {
    const onCareer = vi.fn();
    renderTitle(root, {
      onPlay: vi.fn(),
      onRanking: vi.fn(),
      onCareer,
      careerBadge: 2,
      streak: 3,
      coins: 10,
      mountToggle: () => ({ dispose() {} }),
    });
    button('Carreira, 2 novidades').click();
    expect(onCareer).toHaveBeenCalledOnce();
    expect(root.querySelector('.title-streak')!.textContent).toBe('3 dias');
  });

  it('end screen: XP, rank up, challenge and achievement lines; the streak banner the first time', async () => {
    const events = [
      { kind: 'streak', days: 3, coins: 150 },
      { kind: 'xp', side: 'thief', gained: 124, xp: 920 },
      { kind: 'rank', side: 'thief', rank: 3, coins: 0 },
      { kind: 'daily', title: 'Fuja 1 vez', coins: 250 },
      { kind: 'achievement', title: 'Fuja 10 vezes', unlock: 'car:picape', coins: 0 },
    ] as const;
    expect(careerStrip([], 'thief')).toBeNull();
    renderEnd(root, {
      role: 'thief',
      result: { winner: 'thief', time: 90, reason: 'escape' },
      qualifies: false,
      career: [...events],
      onSave: vi.fn(),
      onAgain: vi.fn(),
      onChangeSide: vi.fn(),
      onRanking: vi.fn(),
      onHome: vi.fn(),
    });
    const strip = root.querySelector('.end-career')!;
    expect(strip.textContent).toContain('Trombadinha → Batedor!');
    expect(strip.textContent).toContain('+124 XP');
    expect(strip.textContent).toContain('Desafio completo: Fuja 1 vezResgate na Carreira');
    expect(strip.textContent).toContain('Conquista: Fuja 10 vezes');
    await new Promise((r) => requestAnimationFrame(r));
    const banner = root.querySelector<HTMLElement>('.career-streak')!;
    expect(banner.textContent).toContain('3 dias seguidos!');
    expect(banner.getAttribute('role')).toBe('status'); // not modal: the end screen buttons keep working
    banner.click();
    expect(root.querySelector('.career-streak')).toBeNull();
  });
});

describe('end strip with several ranks in one match (review)', () => {
  it('shows the first rank left and the last reached, with every unlock', () => {
    const strip = careerStrip(
      [
        { kind: 'xp', side: 'police', gained: 1000, xp: 1000 },
        { kind: 'rank', side: 'police', rank: 2, coins: 0 },
        { kind: 'rank', side: 'police', rank: 3, coins: 0 },
      ],
      'police',
    )!;
    expect(strip.textContent).toContain('Recruta → Cabo!');
    expect(strip.textContent).toContain('Resgate na Carreira: +200 · placa e 1ª pintura, +400 · 2 cores de neon');
  });
});

describe('Resgatar and insignias (playtest 2026-10-08)', () => {
  it('a done challenge waiting shows "Resgatar +N"; tapping pays it through the app and redraws', () => {
    const waiting: Career = {
      ...emptyCareer(),
      daily: { date: DAY, progress: [dailiesFor(DAY)[0]!.target, 0, 0] },
      claims: [`daily:${DAY}:0`],
    };
    const pay = vi.fn((_id: string) => ({ career: { ...waiting, claims: [] }, coins: 150 }));
    renderCareer(root, { career: waiting, coins: 0, today: DAY, onBack: vi.fn(), onClaim: pay });
    expect(button('Hoje, prêmios para resgatar')).toBeDefined();
    button('Resgatar +150').click();
    expect(pay).toHaveBeenCalledWith(`daily:${DAY}:0`);
    expect(root.querySelector('.career-wallet')!.textContent).toBe('150');
    expect(root.textContent).toContain('Recebido');
  });

  it('Patente: insignia per side, the track of 7 (the ones not reached greyed) and Resgatar for ranks reached', () => {
    const c: Career = { ...emptyCareer(), xp: { police: 950, thief: 0 }, claims: ['rank:police:2', 'rank:police:3'] };
    const pay = vi.fn((_id: string) => ({ career: c, coins: 0 }));
    renderCareer(root, { career: c, coins: 0, today: DAY, onBack: vi.fn(), onClaim: pay, tab: 'ranks' });
    expect(root.querySelector('svg[aria-label="Cabo"]')).not.toBeNull();
    expect(root.querySelectorAll('.career-track-step')).toHaveLength(14);
    expect(root.querySelectorAll('.career-track .insignia.is-locked')).toHaveLength(4 + 6);
    button('Resgatar +600').click(); // 200 + 400
    expect(pay.mock.calls.map((x) => x[0])).toEqual(['rank:police:2', 'rank:police:3']);
  });
});
