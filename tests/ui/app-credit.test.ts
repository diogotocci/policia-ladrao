// @vitest-environment jsdom
// The coins of a match are credited once, saved before the end screen shows, and survive a reload.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type OnEnd = (r: {
  winner: 'police' | 'thief';
  time: number;
  reason?: 'escape';
  hp: number;
  level: number;
  stats: { damageDealt: number; rightBoxes: number };
}) => void;
const ends: OnEnd[] = [];
vi.mock('../../src/game', () => ({
  startGame: (_c: HTMLElement, o: { onEnd: OnEnd }) => {
    ends.push(o.onEnd);
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
