// Full app (spec §7): screens + matches + ranking. The flow is the pure state machine in screens/flow.ts;
// here we only wire each state to what appears on screen (and to the game).
import type { Role } from './config/balance';
import { createAudioSession } from './audio/session';
import { startGame, type GameHandle } from './game';
import { createCarPreview } from './render/carPreview';
import type { QualityTier } from './render/renderer';
import { emptyBoard, insert, loadBoard, qualifies, saveBoard, type Board } from './storage/ranking';
import { initialState, reduce, type FlowAction, type FlowState } from './ui/screens/flow';
import { renderChoose, renderCountdown, renderEnd, renderPause, renderRanking, renderTitle } from './ui/screens/screens';

declare const __APP_VERSION__: string | undefined;
/** injected by Vite (package.json version); absent when the module runs outside a Vite build (unit tests) */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;

export function startApp(
  container: HTMLElement,
  opts: {
    quality?: QualityTier;
    debug?: boolean;
    debugHp?: { police?: number; thief?: number };
    traffic?: boolean;
    mute?: boolean;
    curves?: boolean;
    escapeTime?: number;
  } = {},
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
    clearTimeout(goTimer); // the "VAI!" must not linger over the next screen
    goView?.dispose();
    goView = undefined;
  };
  /** action from a button: UI click + action */
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
      escapeTime: opts.escapeTime,
      audio,
      startPaused: true,
      onPauseRequest: () => dispatch({ type: 'pause' }),
      onEnd: (r) => dispatch({ type: 'ended', result: r, qualifies: qualifies(board, role, r.time, r.winner === role, r.hp) }),
    });
    container.append(layer); // screens always above the canvas and the game HUD
  };

  let tabSwitch = false;
  function trap() {
    history.pushState({ pl: true }, '');
  }
  const show = (s: FlowState) => {
    clearView();
    if (s.screen !== 'title' && !(history.state as { pl?: boolean } | null)?.pl) trap(); // Back returns to the app
    switch (s.screen) {
      case 'title':
        stopGame();
        highlight = undefined;
        view = renderTitle(layer, {
          onPlay: () => press({ type: 'play' }),
          onRanking: () => press({ type: 'openRanking' }),
          mountToggle: (p) => audio.mountToggle(p),
          version: APP_VERSION,
        });
        break;
      case 'choose': {
        const c = renderChoose(layer, { onChoose: (role) => press({ type: 'choose', role }), onBack: () => press({ type: 'back' }) });
        const preview = createCarPreview(c.previews);
        view = { dispose: () => (preview.dispose(), c.dispose()) };
        break;
      }
      case 'countdown':
        highlight = undefined; // the record highlight applies only to the match that just ended
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
        game?.pause(); // match is over: stop simulating and draining battery behind the screen
        view = renderEnd(layer, {
          role: s.role,
          result: s.result,
          qualifies: s.qualifies,
          saved: s.saved,
          onSave: (initials) => {
            const thief =
              s.role === 'thief'
                ? {
                    hp: Math.max(0, Math.min(100, s.result.hp ?? 0)),
                    how: s.result.reason === 'escape' ? ('escape' as const) : ('kill' as const),
                  }
                : {};
            const r = insert(board, s.role, { initials, time: s.result.time, date: new Date().toISOString(), ...thief });
            board = r.board;
            if (storage) saveBoard(storage, board);
            if (r.rank > 0) highlight = { role: s.role, rank: r.rank };
            state = reduce(state, { type: 'saved' }); // no redraw: the screen already shows "Recorde salvo!"
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
    // countdown -> game: the countdown disappears with a "VAI!" and the game starts
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
    // ranking <-> ranking (tab switch) and everything else: redraw the screen
    show(next);
  }

  // app clock: countdown and menu music (during a match the game plays the music)
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const portrait = container.clientHeight > container.clientWidth; // phone held upright: the game rotates by itself (styles.css)
    if (state.screen === 'countdown' && !portrait) dispatch({ type: 'tick', dt }); // in portrait the countdown waits
    // menu music on screens with no match running (during a match the game plays; silence while paused)
    if (state.screen === 'title' || state.screen === 'choose' || state.screen === 'end' || state.screen === 'ranking') audio.mixer.menu(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // Esc/P while paused resumes (in-game, the game itself requests the pause)
  const onKey = (e: KeyboardEvent) => {
    if (state.screen === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      e.stopImmediatePropagation(); // the same key must not immediately ask the game to pause again
      press({ type: 'resume' });
    }
  };
  window.addEventListener('keydown', onKey, true); // capture: runs before the game's pause shortcut
  // Android Back button / history: during a match opens the pause instead of leaving
  const onPop = () => {
    if (state.screen === 'playing') dispatch({ type: 'pause' });
    else if (state.screen === 'paused') dispatch({ type: 'resume' });
    else if (state.screen !== 'title') dispatch({ type: 'back' });
    else return; // on the title screen, Back exits normally
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
