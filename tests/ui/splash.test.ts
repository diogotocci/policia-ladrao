// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { hideSplash } from '../../src/ui/splash';

describe('splash screen', () => {
  const mount = () => {
    document.body.innerHTML = '<div id="splash"></div>';
    return document.getElementById('splash')!;
  };
  it('fades out (stays at least 0.7 s since the page opened) and then is removed', () => {
    vi.useFakeTimers();
    const el = mount();
    hideSplash(document, { now: 200 });
    vi.advanceTimersByTime(400);
    expect(el.classList.contains('is-gone')).toBe(false);
    vi.advanceTimersByTime(150);
    expect(el.classList.contains('is-gone')).toBe(true);
    expect(document.getElementById('splash')).not.toBeNull();
    vi.advanceTimersByTime(500);
    expect(document.getElementById('splash')).toBeNull();
    vi.useRealTimers();
  });
  it('debug/test mode removes it at once; without a splash nothing happens', () => {
    mount();
    hideSplash(document, { immediate: true });
    expect(document.getElementById('splash')).toBeNull();
    expect(() => hideSplash(document)).not.toThrow();
  });
});
