// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ITEM_LABEL, createHud, distanceBand, formatTime, pickupToast } from '../../src/ui/hud';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const ended = (w: WorldState, winner: 'police' | 'thief', policeHp: number, thiefHp: number): WorldState => ({
  ...withCar(withCar(w, 'police', { ...policeOf(w), hp: policeHp }), 'thief', { ...thiefOf(w), hp: thiefHp }),
  time: 83.45,
  match: { over: true, winner, endTime: 83.45 },
});

describe('formatTime', () => {
  it('formats mm:ss.d', () => {
    expect(formatTime(83.45)).toBe('01:23.4');
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(600.99)).toBe('10:00.9');
  });
});

describe('pickupToast', () => {
  it('own item, wrong colour, and everything already maxed', () => {
    expect(pickupToast('bomb')).toBe(`+ ${ITEM_LABEL.bomb}`);
    expect(pickupToast('wrong')).toBe('−2 caixinha errada');
    expect(pickupToast('none')).toBe('Itens no máximo');
    expect(pickupToast('ram')).toBe('+ Quebra-mato'); // playtest 2026-10-04: 'aríete' is rarely used
  });
});

describe('distanceBand', () => {
  it('green ≤ 40, yellow ≤ 100, red above', () => {
    expect(distanceBand(40)).toBe('near');
    expect(distanceBand(41)).toBe('mid');
    expect(distanceBand(100)).toBe('mid');
    expect(distanceBand(101)).toBe('far');
  });
});

describe('createHud', () => {
  it('health bars reflect hp', () => {
    const hud = createHud(root, 'police');
    const w = createWorld({ seed: 1, playerRole: 'police' });
    hud.update(withCar(w, 'thief', { ...thiefOf(w), hp: 37 }));
    const fill = root.querySelector<HTMLElement>('.hud-bar--thief .hud-bar-fill')!;
    expect(fill.style.width).toBe('37%');
    // no number (playtest): bar only; the value is left for screen readers
    expect(root.querySelector('.hud-bar-value')).toBeNull();
    expect(root.querySelector('.hud-bar--thief')!.textContent).not.toContain('37');
    expect(root.querySelector('.hud-bar--thief .hud-bar-track')!.getAttribute('aria-valuenow')).toBe('37');
    expect(root.querySelector<HTMLElement>('.hud-bar--police .hud-bar-fill')!.style.width).toBe('100%');
    hud.dispose();
  });

  it('shows timer, coloured distance and level', () => {
    const hud = createHud(root, 'police');
    const w = { ...createWorld({ seed: 1, playerRole: 'police' }), time: 33.45, level: 3 };
    hud.update(w);
    // countdown to the escape (1:30)
    expect(root.querySelector('.hud-time')!.textContent).toBe('00:56.5');
    const dist = root.querySelector('.hud-distance')!;
    expect(dist.textContent).toBe('40 m');
    expect(dist.getAttribute('data-band')).toBe('near');
    expect(root.querySelector('.hud-level')!.textContent).toBe('Nv 3');
    hud.dispose();
  });

  it('end overlay only when the match is over, with the right text per role', () => {
    const w = createWorld({ seed: 1, playerRole: 'police' });
    const hud = createHud(root, 'police');
    hud.update(w);
    expect(root.querySelector<HTMLElement>('.hud-end')!.hidden).toBe(true);
    hud.update(ended(w, 'police', 80, 0));
    const end = root.querySelector<HTMLElement>('.hud-end')!;
    expect(end.hidden).toBe(false);
    expect(end.textContent).toContain('Você venceu!');
    expect(end.textContent).toContain('O ladrão foi detido');
    expect(end.textContent).toContain('01:23.4');
    hud.dispose();

    const hud2 = createHud(root, 'thief');
    hud2.update(ended(createWorld({ seed: 1, playerRole: 'thief' }), 'police', 80, 0));
    expect(root.querySelector('.hud-end')!.textContent).toContain('Você perdeu');
    hud2.dispose();

    const hud3 = createHud(root, 'thief');
    hud3.update(ended(createWorld({ seed: 1, playerRole: 'thief' }), 'thief', 0, 20));
    expect(root.querySelector('.hud-end')!.textContent).toContain('Você venceu!');
    expect(root.querySelector('.hud-end')!.textContent).toContain('A viatura foi destruída');
    hud3.dispose();
  });

  it('with showEnd: false (the app has its own end screen) the HUD never shows its end card', () => {
    const hud = createHud(root, 'police', { showEnd: false });
    hud.update(ended(createWorld({ seed: 1, playerRole: 'police' }), 'police', 80, 0));
    expect(root.querySelector<HTMLElement>('.hud-end')!.hidden).toBe(true);
    hud.dispose();
  });

  it('"Jogar de novo" is an accessible button that calls onRestart', () => {
    let restarted = 0;
    const hud = createHud(root, 'police', { onRestart: () => restarted++ });
    hud.update(ended(createWorld({ seed: 1, playerRole: 'police' }), 'police', 80, 0));
    const btn = root.querySelector<HTMLButtonElement>('.hud-end button')!;
    expect(btn.textContent).toBe('Jogar de novo');
    btn.click();
    expect(restarted).toBe(1);
    hud.dispose();
  });
});

describe('item HUD', () => {
  const withUpgrades = (role: 'police' | 'thief', patch: object, time = 0) => {
    const w = { ...createWorld({ seed: 1, playerRole: role }), time };
    const car = role === 'police' ? policeOf(w) : thiefOf(w);
    return withCar(w, role, { ...car, upgrades: { ...car.upgrades, ...patch } });
  };

  it('shows icons for the player permanent upgrades with counters', () => {
    const hud = createHud(root, 'thief');
    hud.update(withUpgrades('thief', { plates: 2, special: { kind: 'bomb', charges: 1 } }));
    expect(root.querySelector('.hud-item[data-item="plate"] .hud-item-count')!.textContent).toBe('2');
    expect(root.querySelector('.hud-item[data-item="bomb"]')).toBeNull(); // the bomb shows on the button
    hud.dispose();
  });

  it('timed items show a ring with the remaining time', () => {
    const hud = createHud(root, 'police');
    hud.update(withUpgrades('police', { nitroUntil: 3 }, 1.5));
    const ring = root.querySelector<HTMLElement>('.hud-item[data-item="nitro"]')!;
    expect(ring.style.getPropertyValue('--left')).toBe('0.5');
    hud.update(withUpgrades('police', { nitroUntil: 3 }, 3.1));
    expect(root.querySelector('.hud-item[data-item="nitro"]')).toBeNull();
    hud.dispose();
  });

  it('a pickup toast appears and goes away after 1.2 s', async () => {
    const hud = createHud(root, 'police');
    hud.toast('+ Cadência');
    expect(root.querySelector('.hud-toast')!.textContent).toBe('+ Cadência');
    await new Promise((r) => setTimeout(r, 1300));
    expect(root.querySelector<HTMLElement>('.hud-toast')!.hidden).toBe(true);
    hud.dispose();
  });

  it('big toast (bomb hit) is larger and stays longer; a normal toast after it is normal again', async () => {
    const hud = createHud(root, 'thief');
    hud.toast('💥 Bomba acertou! −15', { big: true });
    const el = root.querySelector<HTMLElement>('.hud-toast')!;
    expect(el.classList.contains('is-big')).toBe(true);
    await new Promise((r) => setTimeout(r, 1300));
    expect(el.hidden).toBe(false);
    hud.toast('+ Placa');
    expect(el.classList.contains('is-big')).toBe(false);
    hud.dispose();
  });

  it('escape countdown: label per side, yellow alert in the last 10 s, frozen at 00:00 during the escape', () => {
    const hud = createHud(root, 'thief');
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    hud.update(w);
    expect(root.querySelector('.hud-time-label')!.textContent).toBe('Fuga em');
    expect(root.querySelector('.hud-time')!.textContent).toBe('01:30.0');
    expect(root.querySelector('.hud-time')!.classList.contains('is-alert')).toBe(false);
    hud.update({ ...w, time: 81 });
    expect(root.querySelector('.hud-time')!.classList.contains('is-alert')).toBe(true);
    hud.update({ ...w, time: 91, match: { over: false, escapeAt: 90 } });
    expect(root.querySelector('.hud-time')!.textContent).toBe('00:00.0');
    hud.dispose();
    const hud2 = createHud(root, 'police');
    hud2.update(createWorld({ seed: 1, playerRole: 'police' }));
    expect(root.querySelector('.hud-time-label')!.textContent).toBe('Prenda em');
    hud2.dispose();
  });

  it('end overlay after an escape says the thief got away', () => {
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    const hud = createHud(root, 'thief');
    hud.update({ ...w, time: 92, match: { over: true, winner: 'thief', reason: 'escape', endTime: 90, escapeAt: 90 } });
    expect(root.querySelector('.hud-end')!.textContent).toContain('Fugiu!');
    hud.dispose();
  });

  it('last 10 s: a big number in the middle of the screen (10 … 1), hidden otherwise', () => {
    const hud = createHud(root, 'thief');
    const w = createWorld({ seed: 1, playerRole: 'thief' });
    const big = () => root.querySelector<HTMLElement>('.hud-final')!;
    hud.update({ ...w, time: 70 });
    expect(big().hidden).toBe(true);
    hud.update({ ...w, time: 80.2 });
    expect(big().hidden).toBe(false);
    expect(big().textContent).toBe('10');
    hud.update({ ...w, time: 89.5 });
    expect(big().textContent).toBe('1');
    hud.update({ ...w, time: 90.5, match: { over: false, escapeAt: 90 } });
    expect(big().hidden).toBe(true);
    hud.dispose();
  });

  it('the thief titanium plate shows a shield (the police bull bar too — each player only sees its own side)', () => {
    const hud = createHud(root, 'thief');
    hud.update(createWorld({ seed: 1, playerRole: 'thief', debugGive: ['plate'] }));
    expect(root.querySelector('.hud-item[data-item="plate"] .hud-item-icon')!.textContent).toBe('🛡️');
    hud.dispose();
  });

  it('arrest scene: countdown frozen, no big final number', () => {
    const hud = createHud(root, 'police');
    const w = createWorld({ seed: 1, playerRole: 'police' });
    hud.update({ ...w, time: 83, match: { over: false, arrestAt: 82 } });
    expect(root.querySelector('.hud-time')!.textContent).toBe('00:08.0');
    expect(root.querySelector<HTMLElement>('.hud-final')!.hidden).toBe(true);
    hud.dispose();
  });

  it('paused: the last-10-s alert stops pulsing (class on the HUD root)', () => {
    const hud = createHud(root, 'thief');
    hud.setPaused(true);
    expect(root.querySelector('.hud')!.classList.contains('is-paused')).toBe(true);
    hud.setPaused(false);
    expect(root.querySelector('.hud')!.classList.contains('is-paused')).toBe(false);
    hud.dispose();
  });
});

describe('Sobrevivência HUD', () => {
  it('the time counts up, with "Caos N" and 5 marks; a big notice when chaos rises', () => {
    const hud = createHud(root, 'thief', { showEnd: false });
    const w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival' });
    hud.update({ ...w, time: 30, chaos: 1 });
    expect(root.querySelector('.hud-time-label')!.textContent).toBe('Tempo');
    expect(root.querySelector('.hud-time')!.textContent).toBe('00:30.0');
    const chaos = root.querySelector('.hud-chaos') as HTMLElement;
    expect(chaos.hidden).toBe(false);
    expect(chaos.textContent).toContain('Caos 1');
    hud.update({ ...w, time: 192, chaos: 3 });
    expect(root.querySelector('.hud-time')!.textContent).toBe('03:12.0');
    expect(chaos.textContent).toContain('Caos 3');
    expect(chaos.querySelectorAll('.hud-chaos-mark.is-on')).toHaveLength(3);
    expect(chaos.querySelectorAll('.hud-chaos-mark')).toHaveLength(5);
    const toast = root.querySelector('.hud-toast') as HTMLElement;
    expect(toast.hidden).toBe(false);
    expect(toast.textContent).toBe('Caos 3: obras na pista!');
    expect(toast.classList.contains('is-big')).toBe(true);
    hud.dispose();
  });

  it('Perseguição keeps the countdown and hides the chaos meter', () => {
    const hud = createHud(root, 'thief', { showEnd: false });
    hud.update({ ...createWorld({ seed: 1, playerRole: 'thief' }), time: 30 });
    expect(root.querySelector('.hud-time-label')!.textContent).toBe('Fuga em');
    expect(root.querySelector('.hud-time')!.textContent).toBe('01:00.0');
    expect((root.querySelector('.hud-chaos') as HTMLElement).hidden).toBe(true);
    hud.dispose();
  });
});

describe('life bars with 200 of life', () => {
  it('the bar shows the percentage of the car max', () => {
    const hud = createHud(root, 'thief', { showEnd: false });
    const w = createWorld({ seed: 1, playerRole: 'thief', mode: 'survival', difficulty: 'easy' }); // 200 of life
    hud.update(withCar(w, 'thief', { ...thiefOf(w), hp: 100 }));
    const fills = [...root.querySelectorAll<HTMLElement>('.hud-bar-fill')];
    expect(fills.map((f) => f.style.width)).toEqual(['100%', '50%']);
    hud.dispose();
  });
});

describe('effects on the car (V2 part 3)', () => {
  it('a red chip with the time left for each bad effect; smoke is not red', () => {
    const hud = createHud(root, 'thief');
    const w = { ...createWorld({ seed: 1, playerRole: 'thief' }), time: 1 };
    const t = thiefOf(w);
    hud.update(withCar(w, 'thief', { ...t, effects: { ...t.effects, slowUntil: 3, doubleUntil: 4, smokeUntil: 2 } }));
    const slow = root.querySelector<HTMLElement>('.hud-item[data-item="fxSlow"]')!;
    expect(slow.classList.contains('hud-item--bad')).toBe(true);
    expect(slow.textContent).toContain('Motor');
    expect(Number(slow.style.getPropertyValue('--left'))).toBeCloseTo(0.5);
    expect(root.querySelector('.hud-item[data-item="fxDouble"]')!.textContent).toContain('×2');
    expect(root.querySelector('.hud-item[data-item="fxSmoke"]')!.classList.contains('hud-item--bad')).toBe(false);
    hud.dispose();
  });
});
