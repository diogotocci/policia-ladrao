// Full app (spec §7): screens + matches + ranking. The flow is the pure state machine in screens/flow.ts;
// here we only wire each state to what appears on screen (and to the game).
import type { Difficulty, Mode, Role } from './config/balance';
import { createAudioSession } from './audio/session';
import { startGame } from './game';
import type { GameHandle, GameOptions } from './gameTypes';
import { createCarPreview } from './render/carPreview';
import { createShopPreview } from './render/shopPreview';
import { CARS, lookFor } from './meta/shop';
import { randomLook } from './meta/randomLook';
import { grantWelcome } from './meta/profile';
import { garageCars, profileActions } from './appProfile';
import { localDate } from './meta/career';
import { streakDays } from './ui/screens/careerScreen';
import { loadProfile, saveProfile } from './storage/profileStore';
import { loadDifficulty, saveDifficulty } from './storage/difficulty';
import { loadMode, saveMode } from './storage/mode';
import { renderMode } from './ui/screens/mode';
import { countModeRecords, loadModeBoards, qualifies, saveModeBoards, type ModeBoards } from './storage/ranking';
import { ADMIN_KEY, HOWTO_KEY, INITIALS_KEY, openStorage, readPref, writePref } from './storage/prefs';
import { addRecord, settleEnd } from './appMatch';
import { wireAppEvents } from './appEvents';
import { checkAdminPassword } from './admin';
import { initialState, reduce, type FlowAction, type FlowState } from './ui/screens/flow';
import { openProgress } from './ui/screens/progress';
import {
  renderCareer,
  renderChoose,
  renderCountdown,
  renderEnd,
  renderPause,
  renderRanking,
  renderShop,
  renderTitle,
} from './ui/screens/screens';

declare const __APP_VERSION__: string | undefined;
/** injected by Vite (package.json version); absent when the module runs outside a Vite build (unit tests) */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;

export function startApp(
  container: HTMLElement,
  /** debug/e2e only: mode, chaosEvery and the debug options */
  opts: Pick<GameOptions, 'quality' | 'debugHp' | 'traffic' | 'mute' | 'curves' | 'escapeTime' | 'mode' | 'chaosEvery'> & {
    debug?: boolean;
  } = {},
): { stop(): void } {
  const storage = openStorage();
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
  const howToSeen = () => readPref(storage, HOWTO_KEY) === '1';
  const markHowToSeen = () => writePref(storage, HOWTO_KEY, '1');
  // admin mode (testing): the whole shop unlocked and free
  let admin = readPref(storage, ADMIN_KEY) === '1';
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
      admin: {
        on: admin,
        enter: async (password) => {
          admin = await checkAdminPassword(password);
          if (admin) writePref(storage, ADMIN_KEY, '1');
          return admin;
        },
        leave: () => ((admin = false), writePref(storage, ADMIN_KEY, '')),
      },
    });
  };
  const actions = profileActions({
    get: () => profile,
    set: (next) => ((profile = next), persist()),
    cue: () => audio.mixer.cue('ui'),
    admin: () => admin,
  });
  /** the player's calendar day (challenges renew at local midnight) */
  const today = () => localDate(new Date());
  /** the cars in use (shop), for the spinning previews */
  const looks = () => ({ police: lookFor(profile, 'police'), thief: lookFor(profile, 'thief') });
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
      ...opts,
      role,
      seed: Date.now() >>> 0,
      debug: opts.debug === true,
      difficulty,
      mode,
      look: lookFor(profile, role),
      // the computer drives a random car of its side (debug/e2e keep the default one: stable draw calls)
      opponentLook: opts.debug ? undefined : randomLook(role === 'police' ? 'thief' : 'police'),
      audio,
      startPaused: true,
      onPauseRequest: () => dispatch({ type: 'pause' }),
      onEnd: (r) => {
        // credited and saved before the end screen shows: a reload right after cannot lose or repeat it
        const settled = settleEnd(profile, r, { role, mode, difficulty, today: today() });
        profile = settled.profile;
        persist();
        rewardShown = false;
        dispatch({
          type: 'ended',
          result: r,
          qualifies: qualifies(boards[mode][difficulty], role, r.time, r.winner === role, r.hp, mode),
          reward: settled.reward,
          career: settled.events,
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
          onShop: () => press({ type: 'openShop' }),
          onCareer: () => press({ type: 'openCareer' }),
          careerBadge: profile.career.claims.length, // rewards waiting for Resgatar
          streak: streakDays(profile.career, today()),
          mountToggle: (p) => audio.mountToggle(p),
          version: APP_VERSION,
        });
        const preview = createCarPreview(t.previews, looks());
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
          cars: { police: CARS[profile.equipped.police.car].name, thief: CARS[profile.equipped.thief.car].name },
          onShop: (side) => press({ type: 'openShop', side }),
        });
        const preview = createCarPreview(c.previews, looks());
        view = { dispose: () => (preview.dispose(), c.dispose()) };
        break;
      }
      case 'career':
        stopGame();
        view = renderCareer(layer, {
          career: profile.career,
          coins: profile.coins,
          today: today(),
          onBack: () => press({ type: 'back' }),
          onClaim: actions.onClaim,
          cars: () => garageCars(profile), // V2 part 6: Garagem tab
        });
        break;
      case 'shop':
        stopGame();
        view = renderShop(layer, {
          profile,
          side: s.side,
          onSide: (side) => press({ type: 'shopSide', side }),
          onBack: () => press({ type: 'back' }),
          onBuy: actions.onBuy,
          onUse: actions.onUse,
          onPlate: actions.onPlate,
          onListen: (role, sound) => audio.mixer.preview(role, sound),
          mountPreview: (slot) => createShopPreview(slot),
          admin,
        });
        break;
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
          lastInitials: /^[A-Z]{3}$/.test(readPref(storage, INITIALS_KEY)) ? readPref(storage, INITIALS_KEY) : '',
          career: s.career,
          onSave: (initials) => {
            writePref(storage, INITIALS_KEY, initials); // the plate starts with them next time
            const r = addRecord(boards, profile, s, initials, { mode, difficulty });
            boards = r.boards;
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

  const unwire = wireAppEvents({
    container,
    state: () => state,
    dispatch,
    press,
    menuMusic: (dt) => audio.mixer.menu(dt),
    trap,
  });

  show(state);

  return {
    stop() {
      unwire();
      clearTimeout(goTimer);
      clearView();
      stopGame();
      layer.remove();
      audio.dispose();
    },
  };
}
