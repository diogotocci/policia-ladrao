// Registra o service worker só no build de produção e fora dos testes/depuração (?debug).
export function registerServiceWorker(win: Window, opts: { prod: boolean; debug: boolean }): void {
  if (!opts.prod || opts.debug || !('serviceWorker' in win.navigator)) return;
  win.addEventListener('load', () => {
    win.navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sem service worker: o jogo funciona, só não fica offline */
    });
  });
}
