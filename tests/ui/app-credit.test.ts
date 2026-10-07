// @vitest-environment jsdom
// The coins of a match are credited once, saved before the end screen shows, and survive a reload.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Opts = { onEnd: OnEnd; difficulty?: string };
type OnEnd = (r: {
  winner: 'police' | 'thief';
  time: number;
  reason?: 'escape';
  hp: number;
  level: number;
  stats: { damageDealt: number; rightBoxes: number };
}) => void;
const ends: OnEnd[] = [];
const gameOpts: Opts[] = [];
vi.mock('../../src/game', () => ({
  startGame: (_c: HTMLElement, o: Opts) => {
    ends.push(o.onEnd);
    gameOpts.push(o);
    return { stop() {}, pause() {}, resume() {} };
  },
}));
vi.mock('../../src/render/carPreview', () => ({ createCarPreview: () => ({ dispose() {} }) }));

// animation frames driven by the test (the 3-2-1 countdown advances on them)
let rafs: FrameRequestCallback[] = [];
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafs.push(cb));
vi.stubGlobal('cancelAnimationFrame', () => {});
let clock = 0;
const frames = (n: number) => {
  for (let i = 0; i < n; i++) {
    const cbs = rafs;
    rafs = [];
    clock += 100;
    cbs.forEach((cb) => cb(performance.now() + clock));
  }
};

const { startApp } = await import('../../src/app');
const { PROFILE_KEY } = await import('../../src/storage/profileStore');

let container: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pl.howto.v1', '1');
  ends.length = 0;
  gameOpts.length = 0;
  container = document.createElement('div');
  document.body.append(container);
});
afterEach(() => container.remove());

const click = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)!.click();
const saved = () => JSON.parse(localStorage.getItem(PROFILE_KEY)!).coins as number;

describe('coins credit', () => {
  it('credits once when the match ends, saved before the end screen; replay does not credit again; reload keeps it', () => {
    const app = startApp(container, { mute: true });
    click('Jogar');
    click('Jogar Perseguição');
    (container.querySelector('[data-role="thief"]') as HTMLButtonElement).click();
    expect(ends).toHaveLength(1);
    frames(60); // countdown over: playing
    // the profile must already be saved when the end screen is drawn
    const setItem = localStorage.setItem.bind(localStorage);
    let endShownBeforeSave = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k: string, v: string) => {
      if (k === PROFILE_KEY && container.querySelector('.screen-end')) endShownBeforeSave = true;
      setItem(k, v);
    });
    ends[0]!({ winner: 'thief', time: 90, reason: 'escape', hp: 50, level: 2, stats: { damageDealt: 20, rightBoxes: 2 } });
    vi.restoreAllMocks();
    expect(container.querySelector('.screen-end')).not.toBeNull();
    expect(endShownBeforeSave).toBe(false);
    // (30 + 5 + 4) x 2 = 78
    expect(saved()).toBe(78);
    expect(container.querySelector('.end-reward-total')!.getAttribute('aria-label')).toBe('+78 moedas');
    click('Ranking');
    click('Voltar'); // back to the same end screen: no new credit
    expect(saved()).toBe(78);
    click('Início');
    expect(container.querySelector('.title-wallet')!.textContent).toContain('78');
    app.stop();
    container.innerHTML = '';
    startApp(container, { mute: true }); // reload
    expect(container.querySelector('.title-wallet')!.textContent).toContain('78');
  });
});

describe('storage that stops saving', () => {
  it('the Progresso dialog warns when saving the coins failed', () => {
    const app = startApp(container, { mute: true });
    click('Jogar');
    click('Jogar Perseguição');
    (container.querySelector('[data-role="police"]') as HTMLButtonElement).click();
    frames(60);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    ends[0]!({ winner: 'police', time: 60, hp: 80, level: 2, stats: { damageDealt: 100, rightBoxes: 1 } });
    vi.restoreAllMocks();
    click('Início');
    click('Progresso');
    expect(container.textContent).toContain('Seu progresso não está sendo salvo neste navegador');
    app.stop();
  });
});

describe('difficulty', () => {
  it('the saved difficulty is preselected, goes to the match, multiplies the coins and picks the ranking', () => {
    localStorage.setItem('pl.difficulty', 'hard');
    const app = startApp(container, { mute: true });
    click('Jogar');
    click('Jogar Perseguição');
    expect(container.querySelector('[role="radio"][aria-checked="true"]')!.textContent).toContain('Difícil');
    (container.querySelector('[data-role="thief"]') as HTMLButtonElement).click();
    expect(gameOpts[0]!.difficulty).toBe('hard');
    frames(60);
    ends[0]!({ winner: 'thief', time: 90, reason: 'escape', hp: 50, level: 6, stats: { damageDealt: 20, rightBoxes: 2 } });
    // (30 + 5 + 4) x 2 x 1.5 = 117
    expect(saved()).toBe(117);
    (container.querySelector('.initials') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const v3 = JSON.parse(localStorage.getItem('pl.ranking.v3')!);
    expect(v3.hard.thief).toHaveLength(1);
    expect(v3.normal.thief).toHaveLength(0);
    click('Ranking');
    expect(container.querySelector('.screen-ranking [role="radio"][aria-checked="true"]')!.textContent).toBe('Difícil');
    app.stop();
  });

  it('changing it on the side choice is remembered', () => {
    const app = startApp(container, { mute: true });
    click('Jogar');
    click('Jogar Perseguição');
    (container.querySelectorAll('.screen-choose [role="radio"]')[0] as HTMLElement).click();
    expect(localStorage.getItem('pl.difficulty')).toBe('easy');
    app.stop();
  });
});
