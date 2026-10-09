// The app's own clock and global keys: the 3-2-1 countdown, the menu music, Esc/P to resume and the Back button.
import type { FlowAction, FlowState } from './ui/screens/flow';

const MENU_MUSIC = ['title', 'choose', 'shop', 'career', 'end', 'ranking'];

export function wireAppEvents(a: {
  container: HTMLElement;
  state(): FlowState;
  dispatch(action: FlowAction): void;
  /** button-like action (UI click + action) */
  press(action: FlowAction): void;
  menuMusic(dt: number): void;
  /** pushes the history entry that brings Back into the app */
  trap(): void;
}): () => void {
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const portrait = a.container.clientHeight > a.container.clientWidth; // phone held upright: the game rotates by itself (styles.css)
    if (a.state().screen === 'countdown' && !portrait) a.dispatch({ type: 'tick', dt }); // in portrait the countdown waits
    // menu music on screens with no match running (during a match the game plays; silence while paused)
    if (MENU_MUSIC.includes(a.state().screen)) a.menuMusic(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // Esc/P while paused resumes (in-game, the game itself requests the pause)
  const onKey = (e: KeyboardEvent) => {
    if (a.state().screen === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      e.stopImmediatePropagation(); // the same key must not immediately ask the game to pause again
      a.press({ type: 'resume' });
    }
  };
  window.addEventListener('keydown', onKey, true); // capture: runs before the game's pause shortcut
  // Android Back button / history: during a match opens the pause instead of leaving
  const onPop = () => {
    const screen = a.state().screen;
    if (screen === 'playing') a.dispatch({ type: 'pause' });
    else if (screen === 'paused') a.dispatch({ type: 'resume' });
    else if (screen !== 'title') a.dispatch({ type: 'back' });
    else return; // on the title screen, Back exits normally
    if (a.state().screen !== 'title' && !(history.state as { pl?: boolean } | null)?.pl) a.trap();
  };
  window.addEventListener('popstate', onPop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('popstate', onPop);
  };
}
