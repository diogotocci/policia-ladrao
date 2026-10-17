// @vitest-environment jsdom
// Opções › Analógico (mockup approved 2026-10-16): the floating stick on the left half of the screen.
import { afterEach, describe, expect, it } from 'vitest';
import { createTouchButtons } from '../../src/input/touchButtons';
import { STICK_DEAD, STICK_RADIUS, stickValue } from '../../src/input/touchStick';

const ptr = (el: Element, type: string, pointerId: number, clientX = 0, clientY = 0) => {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & Record<string, number>;
  for (const [k, v] of Object.entries({ pointerId, clientX, clientY })) Object.defineProperty(ev, k, { value: v });
  el.dispatchEvent(ev);
};

describe('stickValue', () => {
  it('nothing inside the dead zone, then linear up to full lock at the edge, clamped beyond', () => {
    expect(stickValue(0)).toBe(0);
    expect(stickValue(STICK_RADIUS * STICK_DEAD)).toBe(0);
    expect(stickValue(STICK_RADIUS)).toBe(1);
    expect(stickValue(-STICK_RADIUS * 3)).toBe(-1);
    expect(stickValue(STICK_RADIUS * (STICK_DEAD + (1 - STICK_DEAD) / 2))).toBeCloseTo(0.5, 10);
  });
});

describe('touch controls with the analog stick', () => {
  let root: HTMLElement;
  let tb: ReturnType<typeof createTouchButtons>;
  const make = () => {
    root = document.createElement('div');
    document.body.append(root);
    tb = createTouchButtons(root, { steering: 'stick' });
    return root.querySelector('.touch-stick-zone')!;
  };
  afterEach(() => {
    tb.dispose();
    root.remove();
  });

  it('no arrow buttons; brake and the others stay', () => {
    make();
    expect(root.querySelector('[data-intent="left"]')).toBeNull();
    expect(root.querySelector('[data-intent="right"]')).toBeNull();
    expect(root.querySelector('[data-intent="brake"]')).not.toBeNull();
  });

  it('the finger lands anywhere, dragging sideways steers; letting go centres it', () => {
    const zone = make();
    ptr(zone, 'pointerdown', 7, 200, 250);
    expect(tb.read().steer).toBe(0);
    ptr(zone, 'pointermove', 7, 200 + STICK_RADIUS, 230); // vertical movement does not matter
    expect(tb.read()).toMatchObject({ steer: 1, left: false, right: false });
    ptr(zone, 'pointermove', 7, 200 - STICK_RADIUS * 2, 250);
    expect(tb.read().steer).toBe(-1);
    expect(root.querySelector('.touch-stick')!.classList.contains('is-on')).toBe(true);
    ptr(zone, 'pointerup', 7);
    expect(tb.read().steer).toBe(0);
    expect(root.querySelector('.touch-stick')!.classList.contains('is-on')).toBe(false);
  });

  it('a second finger (on the brake) does not move the stick', () => {
    const zone = make();
    ptr(zone, 'pointerdown', 1, 100, 250);
    ptr(zone, 'pointermove', 2, 500, 250);
    expect(tb.read().steer).toBe(0);
  });

  it('the page hidden lets go of the stick', () => {
    const zone = make();
    ptr(zone, 'pointerdown', 1, 100, 250);
    ptr(zone, 'pointermove', 1, 100 + STICK_RADIUS, 250);
    window.dispatchEvent(new Event('blur'));
    expect(tb.read().steer).toBe(0);
  });

  it('a system gesture that ends the stick finger without pointerup lets go (the other thumb still on the brake)', () => {
    const zone = make();
    ptr(zone, 'pointerdown', 1, 100, 250);
    const touch = (type: string, target: EventTarget, changed: number[], still: number[]) => {
      const ev = new Event(type, { bubbles: true });
      Object.defineProperty(ev, 'changedTouches', { value: changed.map((identifier) => ({ identifier })) });
      Object.defineProperty(ev, 'touches', { value: still.map((identifier) => ({ identifier, clientX: 700, clientY: 300 })) });
      target.dispatchEvent(ev);
    };
    touch('touchstart', zone, [5], [5]);
    ptr(zone, 'pointermove', 1, 100 + STICK_RADIUS, 250);
    expect(tb.read().steer).toBe(1);
    touch('touchend', document, [], [9]); // only the brake finger (9) is left
    expect(tb.read().steer).toBe(0);
  });

  it('with the arrows (default) there is no stick and no steer value', () => {
    root = document.createElement('div');
    document.body.append(root);
    tb = createTouchButtons(root);
    expect(root.querySelector('.touch-stick-zone')).toBeNull();
    expect(tb.read().steer).toBeUndefined();
  });
});
