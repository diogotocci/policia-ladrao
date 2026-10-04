// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSoundToggle, readSoundPref, writeSoundPref } from '../../src/ui/soundToggle';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  localStorage.clear();
});
afterEach(() => root.remove());

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
};
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } as unknown as Storage;

describe('sound preference', () => {
  it('defaults to sound on, persists, and survives a storage that throws', () => {
    const s = memory();
    expect(readSoundPref(s)).toBe(false);
    writeSoundPref(s, true);
    expect(readSoundPref(s)).toBe(true);
    expect(readSoundPref(broken)).toBe(false);
    expect(() => writeSoundPref(broken, true)).not.toThrow();
  });
});

describe('createSoundToggle', () => {
  it('the button toggles label, icon and state', () => {
    const changes: boolean[] = [];
    const t = createSoundToggle(root, { muted: false, onChange: (m) => changes.push(m), keyTarget: window });
    const btn = root.querySelector('button.sound-toggle') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Som ligado');
    btn.click();
    expect(btn.getAttribute('aria-label')).toBe('Som desligado');
    expect(changes).toEqual([true]);
    t.dispose();
    expect(root.querySelector('button.sound-toggle')).toBeNull();
  });

  it('M toggles too', () => {
    const changes: boolean[] = [];
    const t = createSoundToggle(root, { muted: true, onChange: (m) => changes.push(m), keyTarget: window });
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    expect(changes).toEqual([false]);
    expect((root.querySelector('button.sound-toggle') as HTMLButtonElement).getAttribute('aria-label')).toBe('Som ligado');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', repeat: true })); // segurando M
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', ctrlKey: true }));
    expect(changes).toEqual([false]);
    t.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    expect(changes).toEqual([false]);
  });
});
