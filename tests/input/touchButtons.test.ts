// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTouchButtons } from '../../src/input/touchButtons';

const ptr = (el: Element, type: string, pointerId: number) => {
  const ev = new Event(type, { bubbles: true }) as Event & { pointerId: number };
  Object.defineProperty(ev, 'pointerId', { value: pointerId });
  el.dispatchEvent(ev);
};
const btn = (name: string) => document.querySelector(`button[data-intent="${name}"]`)!;

let root: HTMLElement;
let tb: ReturnType<typeof createTouchButtons>;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  tb = createTouchButtons(root);
});
afterEach(() => {
  tb.dispose();
  root.remove();
});

describe('touch buttons', () => {
  it('renders 5 icon buttons with accessible Portuguese labels', () => {
    const labels = { left: 'Esquerda', right: 'Direita', brake: 'Freio', fire: 'Atirar', bomb: 'Bomba' };
    for (const [name, label] of Object.entries(labels)) {
      const b = btn(name);
      expect(b.getAttribute('aria-label')).toBe(label);
      expect(b.querySelector('svg')).not.toBeNull();
      expect(b.textContent?.trim()).toBe('');
    }
  });

  it('vibrates briefly on press when the device supports it', () => {
    const calls: unknown[] = [];
    Object.defineProperty(navigator, 'vibrate', { value: (p: unknown) => (calls.push(p), true), configurable: true });
    ptr(btn('brake'), 'pointerdown', 1);
    expect(calls).toEqual([10]);
    ptr(btn('brake'), 'pointerup', 1);
  });

  it('works when vibrate is not available', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    ptr(btn('left'), 'pointerdown', 1);
    expect(tb.read().left).toBe(true);
  });

  it('tags the controls with the player role for the accent colour', () => {
    tb.dispose();
    tb = createTouchButtons(root, { role: 'thief' });
    expect(document.querySelector('.touch-controls')?.getAttribute('data-role')).toBe('thief');
  });

  it('hides fire and bomb by default and can toggle them', () => {
    expect((btn('fire') as HTMLElement).hidden).toBe(true);
    expect((btn('bomb') as HTMLElement).hidden).toBe(true);
    tb.setVisible('fire', true);
    expect((btn('fire') as HTMLElement).hidden).toBe(false);
  });

  it('pointerdown activates, pointerup releases', () => {
    ptr(btn('left'), 'pointerdown', 1);
    expect(tb.read().left).toBe(true);
    ptr(btn('left'), 'pointerup', 1);
    expect(tb.read().left).toBe(false);
  });

  it('supports multi-touch: two fingers on two buttons', () => {
    ptr(btn('left'), 'pointerdown', 1);
    ptr(btn('brake'), 'pointerdown', 2);
    expect(tb.read()).toMatchObject({ left: true, brake: true });
    ptr(btn('left'), 'pointerup', 1);
    expect(tb.read()).toMatchObject({ left: false, brake: true });
  });

  it('releases on pointercancel and pointerleave', () => {
    ptr(btn('right'), 'pointerdown', 3);
    ptr(btn('right'), 'pointercancel', 3);
    expect(tb.read().right).toBe(false);
    ptr(btn('brake'), 'pointerdown', 4);
    ptr(btn('brake'), 'pointerleave', 4);
    expect(tb.read().brake).toBe(false);
  });

  it('a button stays held while another finger is still on it', () => {
    ptr(btn('left'), 'pointerdown', 1);
    ptr(btn('left'), 'pointerdown', 2);
    ptr(btn('left'), 'pointerup', 1);
    expect(tb.read().left).toBe(true);
  });

  it('sliding a finger from ◀ onto ▶ switches the intent', () => {
    ptr(btn('left'), 'pointerdown', 1);
    ptr(btn('left'), 'pointerleave', 1);
    ptr(btn('right'), 'pointerenter', 1);
    expect(tb.read()).toMatchObject({ left: false, right: true });
    ptr(document.body, 'pointerup', 1);
    expect(tb.read().right).toBe(false);
  });

  it('a finger that never pressed a button does not activate one by sliding in', () => {
    ptr(btn('right'), 'pointerenter', 9);
    expect(tb.read().right).toBe(false);
  });

  it('dispose removes the buttons', () => {
    tb.dispose();
    expect(document.querySelector('button[data-intent]')).toBeNull();
  });
});

describe('fire button feedback', () => {
  it('flashNoTarget adds .no-target briefly', async () => {
    const r = document.createElement('div');
    document.body.append(r);
    const t = createTouchButtons(r);
    t.setVisible('fire', true);
    t.flashNoTarget();
    const b = r.querySelector('button[data-intent="fire"]')!;
    expect(b.classList.contains('no-target')).toBe(true);
    await new Promise((res) => setTimeout(res, 350));
    expect(b.classList.contains('no-target')).toBe(false);
    t.dispose();
    r.remove();
  });
});
