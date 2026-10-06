// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { installFullscreenOnFirstTap, installNoZoom, isStandalone } from '../../src/ui/mobileShell';

const touchEnd = () => new Event('touchend', { bubbles: true, cancelable: true });

describe('installNoZoom (double tap / pinch never zooms)', () => {
  it('blocks the second tap of a quick double tap, the iOS pinch gesture and dblclick', () => {
    let now = 1000;
    const dispose = installNoZoom(document, () => now);
    const first = touchEnd();
    document.body.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(false); // um toque normal passa
    now += 200;
    const second = touchEnd();
    document.body.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(true);
    now += 1000;
    const later = touchEnd();
    document.body.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
    for (const type of ['gesturestart', 'dblclick']) {
      const e = new Event(type, { bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      expect(e.defaultPrevented, type).toBe(true);
    }
    dispose();
    const after = new Event('dblclick', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

describe('fullscreen on the first touch (browser bars hidden)', () => {
  const setup = (opts: { standalone?: boolean; enabled?: boolean } = {}) => {
    const request = vi.fn(() => Promise.resolve());
    const lock = vi.fn(() => Promise.resolve());
    const doc = {
      fullscreenEnabled: opts.enabled ?? true,
      fullscreenElement: null as Element | null,
      documentElement: { requestFullscreen: request },
    } as unknown as Document;
    const win = new EventTarget() as unknown as Window;
    Object.assign(win, {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') || q.includes('fullscreen') ? !!opts.standalone : false }),
      screen: { orientation: { lock } },
      navigator: {},
    });
    return { doc, win, request, lock };
  };
  const tap = (win: Window, pointerType = 'touch') => {
    const e = new Event('pointerup') as Event & { pointerType: string };
    e.pointerType = pointerType;
    win.dispatchEvent(e);
  };

  it('a touch asks for fullscreen and landscape once', async () => {
    const { doc, win, request, lock } = setup();
    installFullscreenOnFirstTap(doc, win);
    tap(win);
    await Promise.resolve();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledWith('landscape');
    tap(win);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('a mouse click on desktop does not go fullscreen', () => {
    const { doc, win, request } = setup();
    installFullscreenOnFirstTap(doc, win);
    tap(win, 'mouse');
    expect(request).not.toHaveBeenCalled();
  });

  it('installed (standalone) or without fullscreen support: no fullscreen request, but landscape is still locked (Android)', () => {
    for (const o of [{ standalone: true }, { enabled: false }]) {
      const { doc, win, request, lock } = setup(o);
      installFullscreenOnFirstTap(doc, win);
      tap(win);
      expect(request).not.toHaveBeenCalled();
      expect(lock).toHaveBeenCalledWith('landscape');
      tap(win);
      expect(lock).toHaveBeenCalledTimes(1);
    }
    expect(isStandalone(setup({ standalone: true }).win)).toBe(true);
  });

  it('a phone without orientation lock (iPhone) does not throw', () => {
    const { doc, win } = setup({ enabled: false });
    Object.assign(win, {
      screen: {
        orientation: {
          lock: () => {
            throw new Error('nope');
          },
        },
      },
    });
    installFullscreenOnFirstTap(doc, win);
    expect(() => tap(win)).not.toThrow();
  });
});

import { onTap } from '../../src/ui/mobileShell';
describe('onTap (HUD buttons react on touch-down: a tap right after steering is not swallowed by the no-zoom guard)', () => {
  it('fires on pointerdown, ignores the click that follows, still works from the keyboard (click with detail 0)', () => {
    const b = document.createElement('button');
    let n = 0;
    const off = onTap(b, () => n++);
    b.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(n).toBe(1);
    b.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    expect(n).toBe(1);
    b.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })); // Enter/Espaço
    expect(n).toBe(2);
    off();
    b.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(n).toBe(2);
  });
});
