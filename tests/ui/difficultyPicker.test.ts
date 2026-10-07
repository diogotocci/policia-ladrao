// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { coinsLabel, DIFFICULTY_LABEL, difficultyPicker } from '../../src/ui/screens/difficultyPicker';

let root: HTMLElement;
afterEach(() => root?.remove());
const mount = (el: HTMLElement) => {
  root = document.createElement('div');
  root.append(el);
  document.body.append(root);
  return el;
};

describe('difficulty picker', () => {
  it('a radiogroup of three options; the chosen one is checked and the only tab stop', () => {
    const el = mount(difficultyPicker('normal', vi.fn()));
    expect(el.getAttribute('role')).toBe('radiogroup');
    expect(el.getAttribute('aria-label')).toBe('Dificuldade');
    const radios = [...el.querySelectorAll('[role="radio"]')];
    expect(radios.map((r) => r.textContent)).toEqual(['Fácil', 'Médio', 'Difícil']);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('click and arrow keys change it (no wrap) and call back', () => {
    const onChange = vi.fn();
    const el = mount(difficultyPicker('normal', onChange));
    const radios = () => [...el.querySelectorAll<HTMLElement>('[role="radio"]')];
    radios()[2]!.click();
    expect(onChange).toHaveBeenLastCalledWith('hard');
    expect(radios()[2]!.getAttribute('aria-checked')).toBe('true');
    radios()[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(radios()[2]!.getAttribute('aria-checked')).toBe('true');
    radios()[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith('normal');
    expect(document.activeElement).toBe(radios()[1]);
  });

  it('with showCoins each option says its coins multiplier', () => {
    const el = mount(difficultyPicker('hard', vi.fn(), { showCoins: true }));
    expect(el.textContent).toContain('moedas ×0,75');
    expect(el.textContent).toContain('moedas ×1');
    expect(el.textContent).toContain('moedas ×1,5');
    expect(coinsLabel('easy')).toBe('moedas ×0,75');
    expect(DIFFICULTY_LABEL.hard).toBe('Difícil');
  });
});
