// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderChoose, renderCountdown, renderEnd, renderPause, renderRanking, renderTitle } from '../../src/ui/screens/screens';
import { emptyBoard, insert } from '../../src/storage/ranking';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => root.remove());

const button = (label: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(label) || b.getAttribute('aria-label') === label)!;

describe('title', () => {
  it('Jogar and Ranking buttons, focus on Jogar, sound toggle slot', () => {
    const onPlay = vi.fn();
    const onRanking = vi.fn();
    const s = renderTitle(root, {
      onPlay,
      onRanking,
      mountToggle: (p) => (p.append(Object.assign(document.createElement('button'), { className: 'sound-toggle' })), { dispose() {} }),
    });
    expect(document.activeElement).toBe(button('Jogar'));
    button('Jogar').click();
    button('Ranking').click();
    expect(onPlay).toHaveBeenCalledOnce();
    expect(onRanking).toHaveBeenCalledOnce();
    expect(root.querySelector('.sound-toggle')).not.toBeNull();
    s.dispose();
    expect(root.children).toHaveLength(0);
  });
});

describe('choose', () => {
  it('two cards with 3 rule lines each; choosing calls back with the side; Voltar', () => {
    const onChoose = vi.fn();
    const onBack = vi.fn();
    renderChoose(root, { onChoose, onBack });
    const cards = root.querySelectorAll('.choose-card');
    expect(cards).toHaveLength(2);
    for (const c of cards) expect(c.querySelectorAll('li')).toHaveLength(3);
    (root.querySelector('[data-role="thief"]') as HTMLButtonElement).click();
    expect(onChoose).toHaveBeenCalledWith('thief');
    button('Voltar').click();
    expect(onBack).toHaveBeenCalled();
    expect(root.querySelector('[data-preview="police"]')).not.toBeNull(); // 3D car slot
  });
});

describe('countdown', () => {
  it('shows 3, 2, 1 then VAI!', () => {
    const c = renderCountdown(root);
    c.set(2.4);
    expect(root.textContent).toContain('3');
    c.set(1.5);
    expect(root.textContent).toContain('2');
    c.set(0.2);
    expect(root.textContent).toContain('1');
    c.go();
    expect(root.textContent).toContain('VAI!');
  });
});

describe('pause', () => {
  it('Continuar, Reiniciar, Sair; focus on Continuar; sound toggle (spec §9: on/off in the pause)', () => {
    const cb = {
      onResume: vi.fn(),
      onRestart: vi.fn(),
      onQuit: vi.fn(),
      mountToggle: (p: HTMLElement) => (
        p.append(Object.assign(document.createElement('button'), { className: 'sound-toggle' })),
        { dispose() {} }
      ),
    };
    renderPause(root, cb);
    expect(root.querySelector('.screen-pause .sound-toggle')).not.toBeNull();
    expect(root.querySelector('.screen-pause')!.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(button('Continuar'));
    button('Continuar').click();
    button('Reiniciar').click();
    button('Sair').click();
    expect(cb.onResume).toHaveBeenCalled();
    expect(cb.onRestart).toHaveBeenCalled();
    expect(cb.onQuit).toHaveBeenCalled();
  });
});

describe('end', () => {
  const base = { onAgain: vi.fn(), onRanking: vi.fn(), onTitle: vi.fn() };

  it('without a record: result, reason and time, no initials', () => {
    renderEnd(root, { ...base, role: 'police', result: { winner: 'police', time: 83.45 }, qualifies: false, onSave: vi.fn() });
    expect(root.textContent).toContain('Você venceu!');
    expect(root.textContent).toContain('O ladrão foi detido');
    expect(root.textContent).toContain('01:23.4');
    expect(root.querySelector('.initials')).toBeNull();
  });

  it('record: 3 arcade slots changed with ▲▼ and typing; Enter/Salvar saves once', () => {
    const onSave = vi.fn();
    renderEnd(root, { ...base, role: 'thief', result: { winner: 'police', time: 95 }, qualifies: true, onSave });
    expect(root.textContent).toContain('Você perdeu');
    const slots = () => [...root.querySelectorAll('.initials-slot')].map((x) => x.textContent);
    expect(slots()).toEqual(['A', 'A', 'A']);
    // like an arcade dial: ▼ goes down to the next letter (A → B), ▲ goes back (A → Z)
    (root.querySelector('.initials-down[data-i="0"]') as HTMLButtonElement).click(); // A → B
    (root.querySelector('.initials-up[data-i="1"]') as HTMLButtonElement).click(); // A → Z
    expect(slots()).toEqual(['B', 'Z', 'A']);
    const input = root.querySelector('.initials') as HTMLElement;
    // key still held from the game (auto-repeat) does not write into the initials
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', repeat: true, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: true, bubbles: true }));
    expect(slots()).toEqual(['B', 'Z', 'A']);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); // B → C
    expect(slots()).toEqual(['C', 'Z', 'A']);
    for (const k of ['d', 'i', 'o']) input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    expect(slots()).toEqual(['D', 'I', 'O']);
    const salvar = button('Salvar');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    salvar.click(); // already saved: does not save again
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('DIO');
    expect(root.querySelector('.initials')).toBeNull();
  });

  it('coming back from the ranking after saving: shows "Recorde salvo!" and no initials', () => {
    renderEnd(root, { ...base, role: 'police', result: { winner: 'police', time: 60 }, qualifies: true, saved: true, onSave: vi.fn() });
    expect(root.textContent).toContain('Recorde salvo!');
    expect(root.querySelector('.initials')).toBeNull();
  });

  it('the reason says how it ended: escape (1:30), police destroyed, thief caught', () => {
    renderEnd(root, { ...base, role: 'thief', result: { winner: 'thief', time: 90, reason: 'escape' }, qualifies: false, onSave: vi.fn() });
    expect(root.textContent).toContain('Fugiu!');
    root.innerHTML = '';
    renderEnd(root, {
      ...base,
      role: 'police',
      result: { winner: 'thief', time: 90, reason: 'escape' },
      qualifies: false,
      onSave: vi.fn(),
    });
    expect(root.textContent).toContain('Você perdeu');
    expect(root.textContent).toContain('fugiu');
    root.innerHTML = '';
    renderEnd(root, {
      ...base,
      role: 'thief',
      result: { winner: 'thief', time: 70, reason: 'policeDown' },
      qualifies: false,
      onSave: vi.fn(),
    });
    expect(root.textContent).toContain('A viatura foi destruída');
  });
});

describe('ranking', () => {
  it('tabs, rows with rank, initials, time and date; highlight of the new record; empty state', () => {
    let board = insert(emptyBoard(), 'police', { initials: 'ANA', time: 61.2, date: '2026-10-04T10:00:00Z' }).board;
    board = insert(board, 'police', { initials: 'DIO', time: 55.0, date: '2026-10-05T10:00:00Z' }).board;
    const onTab = vi.fn();
    renderRanking(root, { board, tab: 'police', highlight: { role: 'police', rank: 1 }, onTab, onBack: vi.fn() });
    const rows = [...root.querySelectorAll('.ranking-row')];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain('1');
    expect(rows[0]!.textContent).toContain('DIO');
    expect(rows[0]!.textContent).toContain('00:55.0');
    expect(rows[0]!.textContent).toContain('05/10');
    expect(rows[0]!.classList.contains('is-new')).toBe(true);
    button('Ladrão — mais rápidos a vencer').click();
    expect(onTab).toHaveBeenCalledWith('thief');
    root.innerHTML = '';
    renderRanking(root, { board, tab: 'thief', focusTab: true, onTab, onBack: vi.fn() });
    expect(document.activeElement).toBe(button('Ladrão — mais rápidos a vencer')); // focus stays on the tab after switching
    root.innerHTML = '';
    renderRanking(root, { board, tab: 'thief', onTab, onBack: vi.fn() });
    expect(root.textContent).toContain('Nenhum recorde ainda');
  });

  it('thief rows show how the win came (💥 destroyed the police / 🏁 escaped) and the life left', () => {
    let board = insert(emptyBoard(), 'thief', { initials: 'ESC', time: 90, hp: 42, how: 'escape', date: '2026-10-05' }).board;
    board = insert(board, 'thief', { initials: 'KIL', time: 71, hp: 8, how: 'kill', date: '2026-10-05' }).board;
    renderRanking(root, { board, tab: 'thief', onTab: vi.fn(), onBack: vi.fn() });
    const rows = [...root.querySelectorAll('.ranking-row')].map((r) => r.textContent);
    expect(rows[0]).toContain('💥');
    expect(rows[1]).toContain('🏁');
    expect(rows[1]).toContain('42');
  });
});

describe('focus stays inside the open screen (keyboard)', () => {
  it('Tab on the last button wraps to the first; Shift+Tab on the first goes to the last; focus outside comes back in', () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const v = renderPause(root, { onResume: vi.fn(), onRestart: vi.fn(), onQuit: vi.fn(), mountToggle: () => ({ dispose() {} }) });
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
    const tab = (shiftKey = false) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
    buttons.at(-1)!.focus();
    tab();
    expect(document.activeElement).toBe(buttons[0]);
    tab(true);
    expect(document.activeElement).toBe(buttons.at(-1));
    outside.focus();
    tab();
    expect(document.activeElement).toBe(buttons[0]);
    v.dispose();
    outside.focus();
    tab();
    expect(document.activeElement).toBe(outside); // closed: no longer traps
    outside.remove();
  });
});
