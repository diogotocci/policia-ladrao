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
  it('shows the app version in the footer', () => {
    renderTitle(root, { onPlay: vi.fn(), onRanking: vi.fn(), mountToggle: () => ({ dispose() {} }), version: '0.8.0' });
    expect(root.querySelector('.title-version')!.textContent).toBe('v0.8.0');
  });

  it('street-plate logo with the two cars; Como jogar opens the tips and marks them as seen', () => {
    const onHowToSeen = vi.fn();
    const s = renderTitle(root, { onPlay: vi.fn(), onRanking: vi.fn(), onHowToSeen, mountToggle: () => ({ dispose() {} }) });
    expect(root.querySelector('h1.title-plate')!.textContent).toBe('Polícia × Ladrão');
    expect(root.querySelector('img')).toBeNull(); // the app icon is no longer the logo
    expect(s.previews.police.dataset.preview).toBe('police'); // 3D car slots
    expect(s.previews.thief.dataset.preview).toBe('thief');
    button('Como jogar').click();
    expect(root.querySelector('.howto')).not.toBeNull();
    button('Entendi').click();
    expect(onHowToSeen).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(button('Como jogar'));
    s.dispose();
  });

  it('coin balance (pt-BR digits) and a Progresso button', () => {
    const onProgress = vi.fn();
    const s = renderTitle(root, { onPlay: vi.fn(), onRanking: vi.fn(), onProgress, coins: 1240, mountToggle: () => ({ dispose() {} }) });
    expect(root.querySelector('.title-wallet')!.textContent).toContain('1.240');
    button('Progresso').click();
    expect(onProgress).toHaveBeenCalledOnce();
    s.dispose();
  });

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
  const cb = () => ({ onChoose: vi.fn(), onBack: vi.fn(), onHowToSeen: vi.fn() });
  // each screen installs a document-level focus trap: dispose it so tests do not leak into each other
  const open: { dispose(): void }[] = [];
  const show = (p: Parameters<typeof renderChoose>[1]) => open.push(renderChoose(root, p));
  afterEach(() => open.splice(0).forEach((v) => v.dispose()));

  it('two cards with the goal, the box color and a "Jogar de…" call; choosing calls back with the side; Voltar', () => {
    const p = cb();
    show(p);
    const cards = [...root.querySelectorAll('.choose-card')];
    expect(cards).toHaveLength(2);
    expect(cards[0]!.textContent).toContain('Destrua o carro do ladrão antes de 1:30');
    expect(cards[0]!.textContent).toContain('caixas azuis');
    expect(cards[0]!.textContent).toContain('Jogar de polícia');
    expect(cards[1]!.textContent).toContain('Aguente 1:30');
    expect(cards[1]!.textContent).toContain('caixas vermelhas');
    expect(cards[1]!.textContent).toContain('Jogar de ladrão');
    (root.querySelector('[data-role="thief"]') as HTMLButtonElement).click();
    expect(p.onChoose).toHaveBeenCalledWith('thief');
    button('Voltar').click();
    expect(p.onBack).toHaveBeenCalled();
    expect(root.querySelector('[data-preview="police"]')).not.toBeNull(); // 3D car slot
    expect(root.querySelector('.howto')).toBeNull(); // closed unless asked for
  });

  it('"Como jogar" opens two pages of tips with the real numbers; Entendi closes and marks it as seen', () => {
    const p = cb();
    show(p);
    button('Como jogar').click();
    const dialog = root.querySelector('.howto')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    const page = () => dialog.querySelector('.howto-tips:not([inert])')!.textContent!;
    expect(dialog.querySelectorAll('.howto-tips')).toHaveLength(2);
    expect(page()).toContain('O carro acelera sozinho');
    expect(page()).toContain('Freie nas curvas fechadas');
    expect(page()).toContain('sobe na calçada e perde 5 de vida'); // BALANCE.collision.scenery
    expect(dialog.textContent).not.toContain('muro'); // there is no wall, it is the curb
    expect(page()).toContain('tira 2 de vida'); // BALANCE.items.wrongBoxDamage
    expect(page()).toContain('Quebra-molas');
    expect(page()).not.toContain('Quem vence');
    button('Próximo').click();
    expect(page()).toContain('tiram 15 de vida'); // BALANCE.items.bomb.damage
    expect(page()).toContain('Quem vence');
    button('Anterior').click();
    expect(page()).toContain('O carro acelera sozinho');
    button('Entendi').click();
    expect(root.querySelector('.howto')).toBeNull();
    expect(p.onHowToSeen).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(button('Como jogar'));
  });

  it('carousel: Anterior hidden on the first page, Próximo hidden on the last; dots and arrow keys change page', () => {
    show(cb());
    button('Como jogar').click();
    const dialog = root.querySelector('.howto') as HTMLElement;
    const current = () => [...dialog.querySelectorAll('.howto-dot')].findIndex((d) => d.getAttribute('aria-current') === 'true');
    const prev = dialog.querySelector('.howto-prev') as HTMLButtonElement;
    const next = dialog.querySelector('.howto-next') as HTMLButtonElement;
    expect(current()).toBe(0);
    expect(prev.hidden).toBe(true);
    expect(next.hidden).toBe(false);
    (dialog.querySelector('[aria-label="Página 2 de 2"]') as HTMLButtonElement).click();
    expect(current()).toBe(1);
    expect(prev.hidden).toBe(false);
    expect(next.hidden).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(current()).toBe(0);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); // already first: stays
    expect(current()).toBe(0);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(current()).toBe(1);
  });

  it('carousel: dragging the cards to the side turns the page; a tiny drag snaps back', () => {
    show(cb());
    button('Como jogar').click();
    const dialog = root.querySelector('.howto') as HTMLElement;
    const view = dialog.querySelector('.howto-view') as HTMLElement;
    const current = () => [...dialog.querySelectorAll('.howto-dot')].findIndex((d) => d.getAttribute('aria-current') === 'true');
    const drag = (from: number, to: number) => {
      view.dispatchEvent(new MouseEvent('pointerdown', { clientX: from, clientY: 100, bubbles: true }));
      view.dispatchEvent(new MouseEvent('pointermove', { clientX: (from + to) / 2, clientY: 100, bubbles: true }));
      view.dispatchEvent(new MouseEvent('pointermove', { clientX: to, clientY: 100, bubbles: true }));
      view.dispatchEvent(new MouseEvent('pointerup', { clientX: to, clientY: 100, bubbles: true }));
    };
    drag(400, 380); // 20 px: not enough
    expect(current()).toBe(0);
    drag(400, 250); // drag left: next page
    expect(current()).toBe(1);
    drag(250, 200); // already the last page
    expect(current()).toBe(1);
    drag(200, 400); // drag right: back
    expect(current()).toBe(0);
  });

  it('keyboard: changing page keeps the focus in the dialog; Tab cycles only inside it (cards behind are inert)', () => {
    show(cb());
    button('Como jogar').click();
    const next = button('Próximo');
    next.focus(); // keyboard user on the pager button
    next.click();
    expect(document.activeElement).toBe(button('Anterior')); // Próximo is hidden on the last page
    button('Entendi').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    // wraps to the first control of the dialog (the first page dot), not to the inert Voltar
    expect(document.activeElement).toBe(root.querySelector('[aria-label="Página 1 de 2"]'));
  });

  it('first time: opens by itself; Esc closes it too', () => {
    const p = cb();
    show({ ...p, showHowTo: true });
    const dialog = root.querySelector('.howto')!;
    expect(dialog).not.toBeNull();
    expect(document.activeElement).toBe(button('Entendi'));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('.howto')).toBeNull();
    expect(p.onHowToSeen).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(root.querySelector('.choose-card')); // ready to pick a side
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
  const base = { onAgain: vi.fn(), onRanking: vi.fn(), onHome: vi.fn(), onChangeSide: vi.fn() };

  it('without a record: result, reason, time, own health and level; no initials', () => {
    renderEnd(root, {
      ...base,
      role: 'police',
      result: { winner: 'police', time: 83.45, hp: 64.4, level: 3 },
      qualifies: false,
      onSave: vi.fn(),
    });
    expect(root.textContent).toContain('Você venceu!');
    expect(root.textContent).toContain('O ladrão foi detido');
    expect(root.querySelector('.end-time')!.textContent).toContain('01:23.4');
    expect(root.textContent).toContain('Vida restante 64');
    expect(root.textContent).toContain('Nível 3');
    expect(root.querySelector('.end-reason')!.textContent).toBe('O ladrão foi detido · Nível 3');
    expect(root.querySelector('.initials')).toBeNull();
    expect(root.querySelector('.end-layout.has-record')).toBeNull();
  });

  it('reward breakdown: time, damage, boxes, win x2 and the total (spec example: 112)', () => {
    vi.useFakeTimers();
    try {
      renderEnd(root, {
        ...base,
        role: 'thief',
        result: { winner: 'thief', time: 69.9, reason: 'policeDown', level: 2, stats: { damageDealt: 100, rightBoxes: 4 } },
        reward: { time: 23, damage: 25, boxes: 8, won: true, difficulty: 'normal', total: 112 },
        qualifies: false,
        onSave: vi.fn(),
      });
      const box = root.querySelector('.end-reward')!;
      expect(box.textContent).toContain('Tempo de perseguição');
      expect(box.textContent).toContain('+23');
      expect(box.textContent).toContain('Dano causado (100)');
      expect(box.textContent).toContain('+25');
      expect(box.textContent).toContain('Caixas da sua cor (4)');
      expect(box.textContent).toContain('+8');
      expect(box.textContent).toContain('Vitória');
      expect(box.textContent).toContain('×2');
      expect(root.querySelector('.end-reward-total')!.getAttribute('aria-label')).toBe('+112 moedas');
      vi.advanceTimersByTime(1000); // the total counts up from 0
      expect(root.querySelector('.end-reward-total')!.textContent).toContain('+112 moedas');
      expect(root.querySelector('.end-reason')!.textContent).toBe('A viatura foi destruída · Nível 2');
    } finally {
      vi.useRealTimers();
    }
  });

  it('coming back from the ranking the total shows final at once (no second count-up)', () => {
    renderEnd(root, {
      ...base,
      role: 'thief',
      result: { winner: 'thief', time: 90, reason: 'escape' },
      reward: { time: 30, damage: 0, boxes: 0, won: true, difficulty: 'normal', total: 60 },
      animateReward: false,
      qualifies: false,
      onSave: vi.fn(),
    });
    expect(root.querySelector('.end-reward-total')!.textContent).toContain('+60 moedas');
  });

  it('a loss shows no "Vitória" line; no reward, no box', () => {
    renderEnd(root, {
      ...base,
      role: 'police',
      result: { winner: 'thief', time: 30, reason: 'escape', stats: { damageDealt: 10, rightBoxes: 0 } },
      reward: { time: 10, damage: 2, boxes: 0, won: false, difficulty: 'normal', total: 12 },
      qualifies: false,
      onSave: vi.fn(),
    });
    expect(root.querySelector('.end-reward')!.textContent).not.toContain('Vitória');
    root.innerHTML = '';
    renderEnd(root, { ...base, role: 'police', result: { winner: 'police', time: 60 }, qualifies: false, onSave: vi.fn() });
    expect(root.querySelector('.end-reward')).toBeNull();
  });

  it('a destroyed car does not show "Vida restante 0"', () => {
    renderEnd(root, { ...base, role: 'thief', result: { winner: 'police', time: 50, hp: 0, level: 2 }, qualifies: false, onSave: vi.fn() });
    expect(root.textContent).not.toContain('Vida restante');
    expect(root.textContent).toContain('Nível 2');
  });

  it('actions: Jogar de novo, Trocar de lado, Ranking, Início (no "Título")', () => {
    renderEnd(root, { ...base, role: 'police', result: { winner: 'police', time: 60 }, qualifies: false, onSave: vi.fn() });
    expect(root.textContent).not.toContain('Título');
    button('Jogar de novo').click();
    button('Trocar de lado').click();
    button('Ranking').click();
    button('Início').click();
    expect(base.onAgain).toHaveBeenCalled();
    expect(base.onChangeSide).toHaveBeenCalled();
    expect(base.onRanking).toHaveBeenCalled();
    expect(base.onHome).toHaveBeenCalled();
  });

  it('record: a plate with 3 slots; tap a slot, then ▲▼ change it and ◀ ▶ move; typing; Enter/Salvar saves once', () => {
    const onSave = vi.fn();
    renderEnd(root, { ...base, role: 'thief', result: { winner: 'police', time: 95 }, qualifies: true, onSave });
    expect(root.textContent).toContain('Você perdeu');
    expect(root.querySelector('.end-layout.has-record')).not.toBeNull();
    expect(root.querySelector('.plate')!.textContent).toContain('BRASIL');
    const slots = () => [...root.querySelectorAll('.initials-slot')].map((x) => x.textContent);
    const current = () => [...root.querySelectorAll('.initials-slot')].findIndex((x) => x.classList.contains('is-current'));
    expect(slots()).toEqual(['A', 'A', 'A']);
    expect(current()).toBe(0);
    // like an arcade dial: ▼ goes down to the next letter (A → B), ▲ goes back (A → Z)
    button('Próxima letra').click(); // A → B
    button('Próximo espaço').click();
    expect(current()).toBe(1);
    button('Letra anterior').click(); // A → Z
    expect(slots()).toEqual(['B', 'Z', 'A']);
    (root.querySelectorAll('.initials-slot')[2] as HTMLElement).click();
    expect(current()).toBe(2);
    button('Espaço anterior').click();
    expect(current()).toBe(1);
    (root.querySelectorAll('.initials-slot')[0] as HTMLElement).click();
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
    expect(root.textContent).toContain('Recorde salvo!');
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
