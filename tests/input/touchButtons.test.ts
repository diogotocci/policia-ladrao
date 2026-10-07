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
    const labels = { left: 'Esquerda', right: 'Direita', brake: 'Freio', fire: 'Atirar', bomb: 'Especial' };
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

  it('dropTaps() forgets taps made during the countdown/pause; a finger still down keeps holding', () => {
    ptr(btn('bomb'), 'pointerdown', 1);
    ptr(btn('bomb'), 'pointerup', 1);
    ptr(btn('left'), 'pointerdown', 2);
    tb.dropTaps();
    const r = tb.read();
    expect(r.bomb).toBe(false);
    expect(r.left).toBe(true);
    ptr(btn('left'), 'pointerup', 2);
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

  it('a quick tap between two reads is still seen once (latched)', () => {
    ptr(btn('brake'), 'pointerdown', 5);
    ptr(btn('brake'), 'pointerup', 5);
    expect(tb.read().brake).toBe(true);
    expect(tb.read().brake).toBe(false);
  });

  it('a tap is kept when the browser fires pointerleave right after pointerup (touch)', () => {
    ptr(btn('bomb'), 'pointerdown', 6);
    ptr(btn('bomb'), 'pointerup', 6);
    ptr(btn('bomb'), 'pointerleave', 6);
    expect(tb.read().bomb).toBe(true);
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

describe('bomb and thief fire state', () => {
  it('special button shows the charges and hides without a special; fire can be locked', () => {
    const r = document.createElement('div');
    document.body.append(r);
    const t = createTouchButtons(r, { role: 'thief' });
    t.setSpecial({ kind: 'bomb', charges: 2 });
    const bomb = r.querySelector<HTMLElement>('button[data-intent="bomb"]')!;
    expect(bomb.hidden).toBe(false);
    expect(bomb.querySelector('.touch-count')!.textContent).toBe('2');
    t.setSpecial(null);
    expect(bomb.hidden).toBe(true);
    t.setVisible('fire', true);
    t.setLocked('fire', true);
    expect(r.querySelector('button[data-intent="fire"]')!.classList.contains('locked')).toBe(true);
    t.dispose();
    r.remove();
  });
});

describe('special button (V2 part 3)', () => {
  it('shows the kind kept with its icon, charges and label; hidden without a special', () => {
    const b = btn('bomb') as HTMLButtonElement;
    expect(b.hidden).toBe(true);
    tb.setSpecial({ kind: 'oil', charges: 2 });
    expect(b.hidden).toBe(false);
    expect(b.getAttribute('aria-label')).toBe('Especial: óleo (2)');
    expect(b.querySelector('.touch-count')!.textContent).toBe('2');
    expect(b.dataset.kind).toBe('oil');
    tb.setSpecial({ kind: 'smoke', charges: 1 });
    expect(b.getAttribute('aria-label')).toBe('Especial: fumaça (1)');
    expect(b.querySelector('svg')).not.toBeNull();
    tb.setSpecial(null);
    expect(b.hidden).toBe(true);
  });

  it('the brake can be locked (yellow box: no brake)', () => {
    tb.setLocked('brake', true);
    expect(btn('brake').classList.contains('locked')).toBe(true);
    tb.setLocked('brake', false);
    expect(btn('brake').classList.contains('locked')).toBe(false);
  });
});

describe('stuck button safety net (playtest 2026-10-07)', () => {
  const touchEnd = (type: 'touchend' | 'touchcancel', touches: number) => {
    const ev = new Event(type, { bubbles: true }) as Event & { touches: unknown[] };
    Object.defineProperty(ev, 'touches', { value: Array.from({ length: touches }, (_, i) => ({ clientX: i, clientY: i })) });
    document.dispatchEvent(ev);
  };

  it('a touch that ended without pointerup (system gesture) is released when no finger is left on the screen', () => {
    ptr(btn('right'), 'pointerdown', 1);
    tb.read();
    expect(tb.read().right).toBe(true); // still held
    const under = (el: Element | null) => Object.defineProperty(document, 'elementFromPoint', { value: () => el, configurable: true });
    under(btn('right'));
    touchEnd('touchend', 1); // a finger is still on this arrow: keeps it
    expect(tb.read().right).toBe(true);
    under(btn('fire'));
    ptr(btn('right'), 'pointerdown', 9);
    tb.read();
    touchEnd('touchend', 1); // the other thumb is on another button, none on the arrow: released
    expect(tb.read().right).toBe(false);
    ptr(btn('right'), 'pointerdown', 1);
    tb.read();
    under(btn('right'));
    touchEnd('touchend', 0); // no pointerup ever came, but no finger is on the screen
    expect(tb.read().right).toBe(false);
    expect(btn('right').classList.contains('is-down')).toBe(false);
    delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
  });

  it('touchcancel with no fingers and losing focus also release everything; a quick tap still counts once', () => {
    ptr(btn('left'), 'pointerdown', 2);
    touchEnd('touchcancel', 0);
    expect(tb.read().left).toBe(true); // the tap made before still counts once
    expect(tb.read().left).toBe(false);
    ptr(btn('left'), 'pointerdown', 3);
    tb.read();
    window.dispatchEvent(new Event('blur'));
    expect(tb.read().left).toBe(false);
  });
});
