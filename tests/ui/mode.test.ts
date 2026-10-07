// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderMode } from '../../src/ui/screens/mode';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());
const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

describe('mode screen', () => {
  it('two cards explaining Perseguição and Sobrevivência; picking calls back; Voltar', () => {
    const onPick = vi.fn();
    const onBack = vi.fn();
    const v = renderMode(root, { mode: 'pursuit', onPick, onBack });
    expect(root.querySelector('h2')!.textContent).toBe('Escolha o modo');
    const cards = [...root.querySelectorAll('.mode-card')];
    expect(cards).toHaveLength(2);
    expect(cards[0]!.textContent).toContain('Perseguição');
    expect(cards[0]!.textContent).toContain('1:30');
    expect(cards[1]!.textContent).toContain('Sobrevivência');
    expect(cards[1]!.textContent).toContain('Ganha quem zerar a vida do outro');
    expect(cards[1]!.textContent).toContain('caos');
    button('Jogar Sobrevivência').click();
    expect(onPick).toHaveBeenCalledWith('survival');
    button('Voltar').click();
    expect(onBack).toHaveBeenCalled();
    v.dispose();
    expect(root.children).toHaveLength(0);
  });

  it('focus starts on the remembered mode', () => {
    renderMode(root, { mode: 'survival', onPick: vi.fn(), onBack: vi.fn() });
    expect(document.activeElement).toBe(button('Jogar Sobrevivência'));
  });
});
