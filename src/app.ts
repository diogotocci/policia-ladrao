// Full app (spec §7): screens + matches + ranking. The flow is the pure state machine in screens/flow.ts;
// here we only wire each state to what appears on screen (and to the game).
import type { Difficulty, Mode, Role } from './config/balance';
import { createAudioSession } from './audio/session';
import { startGame, type GameHandle } from './game';
import { createCarPreview } from './render/carPreview';
import type { QualityTier } from './render/renderer';
import { grantWelcome, settleMatch } from './meta/profile';
import { loadProfile, saveProfile } from './storage/profileStore';
import { loadDifficulty, saveDifficulty } from './storage/difficulty';
import { loadMode, saveMode } from './storage/mode';
import { renderMode } from './ui/screens/mode';
import { countModeRecords, insert, loadModeBoards, qualifies, recordEntry, saveModeBoards, type ModeBoards } from './storage/ranking';
import { initialState, reduce, type FlowAction, type FlowState } from './ui/screens/flow';
import { openProgress } from './ui/screens/progress';
import { renderChoose, renderCountdown, renderEnd, renderPause, renderRanking, renderTitle } from './ui/screens/screens';

declare const __APP_VERSION__: string | undefined;
/** injected by Vite (package.json version); absent when the module runs outside a Vite build (unit tests) */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;
/** "Como jogar" already closed once on this device */
const HOWTO_KEY = 'pl.howto.v1';

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
    /** debug/e2e only */
    mode?: Mode;
    chaosEvery?: number;
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
  let boards: ModeBoards = loadModeBoards(storage);
  // V2 part 2: the last difficulty chosen on the side choice; every match, reward and record uses it
  let difficulty = loadDifficulty(storage);
  // V2 part 3: last mode chosen (the debug ?mode= overrides it for e2e)
  let mode: Mode = opts.mode ?? loadMode(storage);
  // coins and stats (V2 part 1); the welcome bonus is credited once, from the records already in the ranking
  const loaded = loadProfile(storage);
  let profile = grantWelcome(loaded.profile, countModeRecords(boards));
  // false once any save fails (full or blocked storage): the Progresso dialog then warns that nothing is kept
  let persistent = loaded.persistent;
  const persist = () => (persistent = saveProfile(storage, profile) && persistent);
  if (profile !== loaded.profile) persist();
  // "Como jogar" opens by itself until the player closes it once
  const howToSeen = () => {
    try {
      return storage?.getItem(HOWTO_KEY) === '1';
    } catch {
      return false;
    }
  };
  const markHowToSeen = () => {
    try {
      storage?.setItem(HOWTO_KEY, '1');
    } catch {
      // storage full or blocked: the tips just open again next time
    }
  };
  // "Seu progresso" over the title screen; restoring a code replaces the profile and redraws the balance
  const openProgressDialog = () => {
    const host = layer.querySelector<HTMLElement>('.screen-title');
    if (!host) return;
    openProgress(host, {
      profile,
      persistent,
      onRestore: (next) => {
        profile = next;
        persist();
        show(state);
      },
      onClose: () => host.querySelector<HTMLElement>('.title-progress')?.focus(),
    });
  };
  let highlight: { mode: Mode; difficulty: Difficulty; role: Role; rank: number } | undefined;
  /** the reward of the last match already counted up on screen once */
  let rewardShown = false;
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
      difficulty,
      mode,
      chaosEvery: opts.chaosEvery,
      audio,
      startPaused: true,
      onPauseRequest: () => dispatch({ type: 'pause' }),
      onEnd: (r) => {
        // credited and saved before the end screen shows: a reload right after cannot lose or repeat it
        const settled = settleMatch(profile, r, role, difficulty, mode);
        profile = settled.profile;
        persist();
        rewardShown = false;
        dispatch({
          type: 'ended',
          result: r,
          qualifies: qualifies(boards[mode][difficulty], role, r.time, r.winner === role, r.hp, mode),
          reward: settled.reward,
        });
      },
    });
    container.append(layer); // screens always above the canvas and the game HUD
  };

  let tabSwitch = false;
  let difficultySwitch = false;
  let modeSwitch = false;
  function trap() {
    history.pushState({ pl: true }, '');
  }
  const show = (s: FlowState) => {
    clearView();
    if (s.screen !== 'title' && !(history.state as { pl?: boolean } | null)?.pl) trap(); // Back returns to the app
    switch (s.screen) {
      case 'title': {
        stopGame();
        highlight = undefined;
        const t = renderTitle(layer, {
          onPlay: () => press({ type: 'play' }),
          onRanking: () => press({ type: 'openRanking', difficulty, mode }),
          onHowToSeen: markHowToSeen,
          coins: profile.coins,
          onProgress: openProgressDialog,
          mountToggle: (p) => audio.mountToggle(p),
          version: APP_VERSION,
        });
        const preview = createCarPreview(t.previews);
        view = { dispose: () => (preview.dispose(), t.dispose()) };
        break;
      }
      case 'mode':
        stopGame();
        view = renderMode(layer, {
          mode,
          onPick: (m) => {
            mode = m;
            saveMode(storage, m);
            press({ type: 'pickMode' });
          },
          onBack: () => press({ type: 'back' }),
        });
        break;
      case 'choose': {
        stopGame(); // coming from the end screen ("Trocar de lado")
        const c = renderChoose(layer, {
          onChoose: (role) => press({ type: 'choose', role }),
          onBack: () => press({ type: 'back' }),
          showHowTo: !howToSeen(),
          difficulty,
          onDifficulty: (d) => {
            difficulty = d;
            saveDifficulty(storage, d);
          },
          onHowToSeen: markHowToSeen,
        });
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
          reward: s.reward,
          difficulty,
          animateReward: !rewardShown, // count up only the first time, not when coming back from the ranking
          onSave: (initials) => {
            const entry = recordEntry(s.role, s.result, initials, new Date().toISOString());
            const r = insert(boards[mode][difficulty], s.role, entry, mode);
            boards = { ...boards, [mode]: { ...boards[mode], [difficulty]: r.board } };
            saveModeBoards(storage, boards);
            if (r.rank > 0) highlight = { mode, difficulty, role: s.role, rank: r.rank };
            state = reduce(state, { type: 'saved' }); // no redraw: the screen already shows "Recorde salvo!"
          },
          onAgain: () => press({ type: 'restart' }),
          onChangeSide: () => press({ type: 'changeSide' }),
          onRanking: () => press({ type: 'openRanking', difficulty, mode }),
          onHome: () => press({ type: 'quit' }),
        });
        rewardShown = true;
        break;
      case 'ranking':
        view = renderRanking(layer, {
          boards,
          mode: s.mode,
          onMode: (m) => ((modeSwitch = true), press({ type: 'modeTab', mode: m })),
          focusMode: modeSwitch,
          difficulty: s.difficulty,
          onDifficulty: (d) => ((difficultySwitch = true), press({ type: 'difficultyTab', difficulty: d })),
          focusDifficulty: difficultySwitch,
          tab: s.tab,
          highlight,
          focusTab: tabSwitch,
          onTab: (tab) => ((tabSwitch = true), press({ type: 'tab', tab })),
          onBack: () => press({ type: 'back' }),
        });
        tabSwitch = false;
        difficultySwitch = false;
        modeSwitch = false;
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
