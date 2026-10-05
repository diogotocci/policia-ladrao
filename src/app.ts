// App completa (spec §7): telas + partidas + ranking. O fluxo é a máquina pura de screens/flow.ts;
// aqui só se liga cada estado ao que aparece na tela (e ao jogo).
import type { Role } from './config/balance';
import { createAudioSession } from './audio/session';
import { startGame, type GameHandle } from './game';
import { createCarPreview } from './render/carPreview';
import type { QualityTier } from './render/renderer';
import { emptyBoard, insert, loadBoard, qualifies, saveBoard, type Board } from './storage/ranking';
import { initialState, reduce, type FlowAction, type FlowState } from './ui/screens/flow';
import { renderChoose, renderCountdown, renderEnd, renderPause, renderRanking, renderTitle } from './ui/screens/screens';

export function startApp(
  container: HTMLElement,
  opts: { quality?: QualityTier; debug?: boolean; debugHp?: { police?: number; thief?: number }; traffic?: boolean; mute?: boolean; curves?: boolean } = {},
): { stop(): void } {
  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  })();
  const audio = createAudioSession({ forceMute: opts.mute });
  const layer = document.createElement('div');
  layer.className = 'screens-root';
  container.append(layer);

  let state: FlowState = initialState();
  let board: Board = storage ? loadBoard(storage) : emptyBoard();
  let highlight: { role: Role; rank: number } | undefined;
  let game: GameHandle | undefined;
  let view: { dispose(): void } | undefined;
  let countdown: ReturnType<typeof renderCountdown> | undefined;
  let goTimer: ReturnType<typeof setTimeout> | undefined;

  let goView: { dispose(): void } | undefined;
  const clearView = () => {
    view?.dispose();
    view = undefined;
    countdown = undefined;
    clearTimeout(goTimer); // o "VAI!" não fica por cima da próxima tela
    goView?.dispose();
    goView = undefined;
  };
  /** ação vinda de um botão: clique de interface + ação */
  const press = (a: FlowAction) => {
    audio.mixer.cue('ui');
    dispatch(a);
  };
  const stopGame = () => {
    game?.stop();
    game = undefined;
  };
  const newGame = (role: Role) => {
    stopGame();
    game = startGame(container, {
      role,
      seed: Date.now() >>> 0,
      debug: opts.debug === true,
      quality: opts.quality,
      debugHp: opts.debugHp,
      traffic: opts.traffic,
      curves: opts.curves,
      audio,
      startPaused: true,
      onPauseRequest: () => dispatch({ type: 'pause' }),
      onEnd: (r) => dispatch({ type: 'ended', result: r, qualifies: qualifies(board, role, r.time, r.winner === role) }),
    });
    container.append(layer); // telas sempre por cima do canvas e do HUD do jogo
  };

  let tabSwitch = false;
  function trap() {
    history.pushState({ pl: true }, '');
  }
  const show = (s: FlowState) => {
    clearView();
    if (s.screen !== 'title' && !(history.state as { pl?: boolean } | null)?.pl) trap(); // Voltar volta para a app
    switch (s.screen) {
      case 'title':
        stopGame();
        highlight = undefined;
        view = renderTitle(layer, {
          onPlay: () => press({ type: 'play' }),
          onRanking: () => press({ type: 'openRanking' }),
          mountToggle: (p) => audio.mountToggle(p),
        });
        break;
      case 'choose': {
        const c = renderChoose(layer, { onChoose: (role) => press({ type: 'choose', role }), onBack: () => press({ type: 'back' }) });
        const preview = createCarPreview(c.previews);
        view = { dispose: () => (preview.dispose(), c.dispose()) };
        break;
      }
      case 'countdown':
        newGame(s.role);
        countdown = renderCountdown(layer);
        countdown.set(s.left);
        view = countdown;
        audio.mixer.cue('beep');
        break;
      case 'playing':
        break;
      case 'paused':
        game?.pause();
        view = renderPause(layer, {
          onResume: () => press({ type: 'resume' }),
          onRestart: () => press({ type: 'restart' }),
          onQuit: () => press({ type: 'quit' }),
          mountToggle: (p) => audio.mountToggle(p),
        });
        break;
      case 'end':
        game?.pause(); // a partida acabou: para de simular e de gastar bateria atrás da tela
        view = renderEnd(layer, {
          role: s.role,
          result: s.result,
          qualifies: s.qualifies,
          onSave: (initials) => {
            const r = insert(board, s.role, { initials, time: s.result.time, date: new Date().toISOString() });
            board = r.board;
            if (storage) saveBoard(storage, board);
            if (r.rank > 0) highlight = { role: s.role, rank: r.rank };
          },
          onAgain: () => press({ type: 'restart' }),
          onRanking: () => press({ type: 'openRanking' }),
          onTitle: () => press({ type: 'quit' }),
        });
        break;
      case 'ranking':
        view = renderRanking(layer, {
          board,
          tab: s.tab,
          highlight,
          focusTab: tabSwitch,
          onTab: (tab) => ((tabSwitch = true), press({ type: 'tab', tab })),
          onBack: () => press({ type: 'back' }),
        });
        tabSwitch = false;
        break;
    }
  };

  function dispatch(a: FlowAction) {
    const prev = state;
    const next = reduce(state, a);
    if (next === prev) return;
    state = next;
    // contagem → jogo: some a contagem com um "VAI!" e o jogo começa
    if (prev.screen === 'countdown' && next.screen === 'playing') {
      countdown?.go();
      audio.mixer.cue('go');
      game?.resume();
      goView = view;
      view = undefined;
      countdown = undefined;
      goTimer = setTimeout(() => {
        goView?.dispose();
        goView = undefined;
      }, 600);
      return;
    }
    if (prev.screen === 'countdown' && next.screen === 'countdown') {
      const before = Math.ceil(prev.left);
      countdown?.set(next.left);
      if (Math.ceil(next.left) !== before) audio.mixer.cue('beep');
      return;
    }
    if (prev.screen === 'paused' && next.screen === 'playing') {
      clearView();
      game?.resume();
      return;
    }
    // ranking ↔ ranking (troca de aba) e o restante: redesenha a tela
    show(next);
  }

  // relógio da app: contagem e música do menu (durante a partida quem toca é o jogo)
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const portrait = container.clientHeight > container.clientWidth; // celular em pé: o jogo gira sozinho (styles.css)
    if (state.screen === 'countdown' && !portrait) dispatch({ type: 'tick', dt }); // em retrato a contagem espera
    // música do menu nas telas sem partida rolando (durante a partida quem toca é o jogo; na pausa, silêncio)
    if (state.screen === 'title' || state.screen === 'choose' || state.screen === 'end' || state.screen === 'ranking') audio.mixer.menu(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // Esc/P na pausa retoma (no jogo, quem pede a pausa é o próprio jogo)
  const onKey = (e: KeyboardEvent) => {
    if (state.screen === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      e.stopImmediatePropagation(); // a mesma tecla não pode, logo em seguida, pedir a pausa de novo ao jogo
      press({ type: 'resume' });
    }
  };
  window.addEventListener('keydown', onKey, true); // captura: roda antes do atalho de pausa do jogo
  // botão Voltar do Android / histórico: durante a partida abre a pausa em vez de sair
  const onPop = () => {
    if (state.screen === 'playing') dispatch({ type: 'pause' });
    else if (state.screen === 'paused') dispatch({ type: 'resume' });
    else if (state.screen !== 'title') dispatch({ type: 'back' });
    else return; // no título, Voltar sai normalmente
    const now = state as FlowState;
    if (now.screen !== 'title' && !(history.state as { pl?: boolean } | null)?.pl) trap();
  };
  window.addEventListener('popstate', onPop);

  show(state);

  return {
    stop() {
      cancelAnimationFrame(raf);
      clearTimeout(goTimer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('popstate', onPop);
      clearView();
      stopGame();
      layer.remove();
      audio.dispose();
    },
  };
}
