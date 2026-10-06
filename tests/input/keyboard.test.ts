// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createKeyboardInput } from '../../src/input/keyboard';

const press = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));

let kb: ReturnType<typeof createKeyboardInput> | undefined;
afterEach(() => kb?.dispose());

describe('keyboard input', () => {
  it('dropTaps() forgets quick presses made while paused, but keeps keys still held', () => {
    kb = createKeyboardInput(window);
    press('keydown', 'KeyB');
    press('keyup', 'KeyB');
    press('keydown', 'ArrowLeft');
    kb.dropTaps();
    const r = kb.read();
    expect(r.bomb).toBe(false);
    expect(r.left).toBe(true);
    press('keyup', 'ArrowLeft');
  });

  it('maps arrows and WASD-style keys', () => {
    kb = createKeyboardInput(window);
    press('keydown', 'ArrowLeft');
    expect(kb.read().left).toBe(true);
    press('keyup', 'ArrowLeft');
    expect(kb.read().left).toBe(false);
    press('keydown', 'KeyD');
    expect(kb.read().right).toBe(true);
    press('keydown', 'KeyS');
    expect(kb.read().brake).toBe(true);
    press('keydown', 'Space');
    expect(kb.read().fire).toBe(true);
    press('keydown', 'KeyB');
    expect(kb.read().bomb).toBe(true);
    press('keydown', 'KeyA');
    expect(kb.read().left).toBe(true);
    press('keydown', 'ArrowDown');
    press('keydown', 'ArrowRight');
    expect(kb.read()).toEqual({ left: true, right: true, brake: true, fire: true, bomb: true });
  });

  it('keeps an intent while either of its keys is held', () => {
    kb = createKeyboardInput(window);
    press('keydown', 'ArrowLeft');
    press('keydown', 'KeyA');
    press('keyup', 'ArrowLeft');
    expect(kb.read().left).toBe(true);
    press('keyup', 'KeyA');
    expect(kb.read().left).toBe(false);
  });

  it('releases everything on blur', () => {
    kb = createKeyboardInput(window);
    press('keydown', 'ArrowLeft');
    press('keydown', 'Space');
    window.dispatchEvent(new Event('blur'));
    expect(kb.read()).toEqual({ left: false, right: false, brake: false, fire: false, bomb: false });
  });

  it('Space on a focused button presses the button, not fire', () => {
    kb = createKeyboardInput(window);
    const b = document.createElement('button');
    document.body.append(b);
    b.focus();
    b.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(kb.read().fire).toBe(false);
    b.remove();
  });

  it('a quick tap between two reads is still seen once (latched)', () => {
    kb = createKeyboardInput(window);
    press('keydown', 'KeyB');
    press('keyup', 'KeyB');
    expect(kb.read().bomb).toBe(true);
    expect(kb.read().bomb).toBe(false);
  });

  it('ignores events after dispose', () => {
    kb = createKeyboardInput(window);
    kb.dispose();
    press('keydown', 'ArrowLeft');
    expect(kb.read().left).toBe(false);
  });
});
