// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { itemToast } from '../../src/itemsFx';
import { createMysteryHud, mysteryText } from '../../src/ui/mysteryHud';

afterEach(() => vi.useRealTimers());

describe('yellow box roulette', () => {
  it('texts: green luck with the item, red bad luck with the effect', () => {
    expect(mysteryText({ good: true, item: 'nitro' })).toBe('Sorte! + Nitro');
    expect(mysteryText({ good: true, item: null })).toBe('Sorte! Itens no máximo');
    expect(mysteryText({ good: false, effect: 'slow' })).toBe('Azar! Motor falhando');
    expect(mysteryText({ good: false, effect: 'noBrake' })).toBe('Azar! Sem freio');
  });

  it('spins below the time pill until the game reveals the result (red when bad), then hides; cancel hides at once', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const hud = createMysteryHud(root);
    hud.spin();
    const box = root.querySelector<HTMLElement>('.hud-roulette')!;
    expect(box.hidden).toBe(false);
    expect(box.classList.contains('is-spinning')).toBe(true);
    vi.advanceTimersByTime(5000); // paused game: still spinning, no result by itself
    expect(hud.spinning).toBe(true);
    expect(box.classList.contains('is-spinning')).toBe(true);
    hud.reveal({ good: false, effect: 'double' });
    expect(box.classList.contains('is-bad')).toBe(true);
    expect(box.textContent).toContain('Azar! Dano dobrado');
    vi.advanceTimersByTime(2000);
    expect(box.hidden).toBe(true);
    hud.spin();
    hud.cancel();
    expect(box.hidden).toBe(true);
    expect(hud.spinning).toBe(false);
    hud.dispose();
    expect(root.querySelector('.hud-roulette')).toBeNull();
  });

  it('warnings for oil, spikes and smoke', () => {
    expect(itemToast({ type: 'oilSkid', role: 'police', s: 0, x: 0 }, 'police')).toBe('Óleo!');
    expect(itemToast({ type: 'tirePop', role: 'police', s: 0, x: 0 }, 'police')).toBe('Pneu furado!');
    expect(itemToast({ type: 'special', role: 'thief', kind: 'smoke', s: 0, x: 0 }, 'police')).toBe('Fumaça!');
    expect(itemToast({ type: 'special', role: 'thief', kind: 'oil', s: 0, x: 0 }, 'police')).toBeUndefined();
  });
});
