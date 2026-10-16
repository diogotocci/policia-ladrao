// @vitest-environment jsdom
// "Preparando a partida…" before the 3-2-1 (mockup approved 2026-10-16).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let progress = 0;
let finish: () => void = () => undefined;
vi.mock('../../src/game', () => ({
  startGame: () => {
    const ready = new Promise<void>((resolve) => (finish = resolve));
    return { stop() {}, pause() {}, resume() {}, loadProgress: () => progress, ready: () => ready };
  },
}));
vi.mock('../../src/render/carPreview', () => ({ createCarPreview: () => ({ dispose() {} }) }));
let rafs: (FrameRequestCallback | undefined)[] = [];
let ids = 0;
const byId = new Map<number, number>();
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  byId.set(++ids, rafs.push(cb) - 1);
  return ids;
});
vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  const i = byId.get(id);
  if (i !== undefined) rafs[i] = undefined;
});
let clock = 0;
const frames = (n: number) => {
  for (let i = 0; i < n; i++) {
    const cbs = rafs;
    rafs = [];
    clock += 100;
    byId.clear();
    cbs.forEach((cb) => cb?.(performance.now() + clock));
  }
};
const { startApp } = await import('../../src/app');
const { renderLoading } = await import('../../src/ui/screens/screens');

let container: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pl.howto.v1', '1');
  container = document.createElement('div');
  document.body.append(container);
});
afterEach(() => container.remove());
const click = (label: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();

describe('loading before the countdown', () => {
  it('the screen: title, a progress bar and a tip from "Como jogar"', () => {
    const l = renderLoading(container, { tip: { title: 'Ranking', text: 'Polícia: a vitória mais rápida.' } });
    expect(container.querySelector('.loading-title')!.textContent).toBe('Preparando a partida…');
    expect(container.querySelector('.loading-tip')!.textContent).toBe('Dica: Ranking. Polícia: a vitória mais rápida.');
    l.set(0.42);
    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect((container.querySelector('.loading-fill') as HTMLElement).style.width).toBe('42%');
  });

  it('the app shows it after the side choice and starts the 3-2-1 only when the match is ready', async () => {
    startApp(container, { mute: true });
    click('Jogar');
    click('Jogar Perseguição');
    (container.querySelector('[data-role="thief"]') as HTMLButtonElement).click();
    expect(container.querySelector('.screen-loading')).not.toBeNull();
    expect(container.querySelector('.loading-tip')!.textContent).toMatch(/^Dica: /);
    progress = 0.5;
    frames(30); // time passes: the countdown does not start by itself
    expect(container.querySelector('.screen-countdown')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('50');
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(container.querySelector('.screen-loading')).toBeNull();
    expect(container.querySelector('.screen-countdown')).not.toBeNull();
    // the bar stopped following: no frame callback of the loading screen is left
    progress = 0.7;
    frames(1);
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(rafs.filter(Boolean).length).toBeLessThanOrEqual(1); // only the app's own frame loop
  });

  it('leaving while it loads (Sair) stops the bar and never starts the countdown', async () => {
    const app = startApp(container, { mute: true });
    click('Jogar');
    click('Jogar Perseguição');
    (container.querySelector('[data-role="police"]') as HTMLButtonElement).click();
    expect(container.querySelector('.screen-loading')).not.toBeNull();
    app.stop();
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(container.querySelector('.screen-countdown')).toBeNull();
  });
});
