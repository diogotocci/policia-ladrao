// @vitest-environment jsdom
// Opções (mockup approved 2026-10-16): the steering choice, saved on the device; the title opens it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STEERING_KEY, loadSteering, saveSteering } from '../../src/storage/steering';
import { initialState, reduce } from '../../src/ui/screens/flow';
import { HOWTO_TIPS, openHowTo } from '../../src/ui/screens/howto';
import { renderOptions } from '../../src/ui/screens/options';
import { memStorage } from '../account/memStorage';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  root.remove();
  localStorage.clear();
});
const radio = (name: string) => [...root.querySelectorAll<HTMLElement>('[role="radio"]')].find((r) => r.textContent?.includes(name))!;

describe('Opções', () => {
  it('two choices in a radio group, the saved one checked and focused; picking calls back; Voltar', () => {
    const onSteering = vi.fn();
    const onBack = vi.fn();
    renderOptions(root, { steering: 'arrows', onSteering, onBack });
    expect(root.querySelector('h2')!.textContent).toBe('Opções');
    expect(root.querySelector('[role="radiogroup"]')!.getAttribute('aria-labelledby')).toBe('options-steering');
    expect(radio('Setas').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio('Setas'));
    radio('Analógico').click();
    expect(onSteering).toHaveBeenCalledWith('stick');
    expect(radio('Analógico').getAttribute('aria-checked')).toBe('true');
    expect(radio('Setas').getAttribute('aria-checked')).toBe('false');
    radio('Analógico').click(); // the same again: nothing new to save
    expect(onSteering).toHaveBeenCalledOnce();
    radio('Analógico').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(onSteering).toHaveBeenLastCalledWith('arrows');
    expect(document.activeElement).toBe(radio('Setas'));
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Voltar')!.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('the choice is kept on the device; anything unknown is the arrows', () => {
    const s = memStorage();
    expect(loadSteering(s)).toBe('arrows');
    saveSteering(s, 'stick');
    expect(s.getItem(STEERING_KEY)).toBe('stick');
    expect(loadSteering(s)).toBe('stick');
    s.setItem(STEERING_KEY, 'joystick');
    expect(loadSteering(s)).toBe('arrows');
  });

  it('flow: the title opens Opções, Voltar comes back', () => {
    const s = reduce(initialState(), { type: 'openOptions' });
    expect(s).toEqual({ screen: 'options' });
    expect(reduce(s, { type: 'back' })).toEqual(initialState());
  });

  it('"Como jogar" and the loading tips explain the steering chosen', () => {
    const first = () => {
      root.replaceChildren();
      openHowTo(root, () => {});
      return root.querySelector('.howto-tip-text')!.textContent;
    };
    expect(first()).toContain('◀ ▶');
    expect(HOWTO_TIPS[0]!.text).toContain('◀ ▶');
    localStorage.setItem(STEERING_KEY, 'stick');
    expect(first()).toContain('Arraste o dedo na metade esquerda');
    expect(HOWTO_TIPS[0]!.text).toContain('Arraste o dedo');
  });
});
