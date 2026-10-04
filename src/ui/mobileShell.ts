// "Cara de app" no celular: sem zoom por toque duplo/pinça e tela cheia no primeiro toque (esconde as barras do navegador).
// Instalado na tela de início (manifest) ele já abre sem barras; aqui é para quem joga direto no navegador.

const DOUBLE_TAP_MS = 300;

/** Bloqueia o zoom de toque duplo e de pinça (o iOS ignora user-scalable=no). Devolve a função que desfaz. */
export function installNoZoom(doc: Document, now: () => number = () => performance.now()): () => void {
  let lastTouchEnd = -Infinity;
  const onTouchEnd = (e: Event) => {
    const t = now();
    if (t - lastTouchEnd < DOUBLE_TAP_MS) e.preventDefault(); // 2º toque rápido: sem zoom
    lastTouchEnd = t;
  };
  const block = (e: Event) => e.preventDefault();
  const opts = { passive: false } as AddEventListenerOptions;
  doc.addEventListener('touchend', onTouchEnd, opts);
  doc.addEventListener('gesturestart', block, opts); // pinça no iOS Safari
  doc.addEventListener('dblclick', block, opts);
  return () => {
    doc.removeEventListener('touchend', onTouchEnd, opts);
    doc.removeEventListener('gesturestart', block, opts);
    doc.removeEventListener('dblclick', block, opts);
  };
}

/** Aberto como app instalado (tela de início)? */
export function isStandalone(win: Window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    win.matchMedia?.('(display-mode: standalone)').matches === true ||
    win.matchMedia?.('(display-mode: fullscreen)').matches === true
  );
}

/**
 * No primeiro toque (dedo, não mouse) pede tela cheia e trava em paisagem.
 * Precisa de um gesto do usuário; falhas (iPhone não tem Fullscreen API para páginas) são ignoradas.
 */
export function installFullscreenOnFirstTap(doc: Document, win: Window): () => void {
  const onUp = (e: Event) => {
    if ((e as PointerEvent).pointerType !== 'touch') return;
    win.removeEventListener('pointerup', onUp, true);
    if (doc.fullscreenElement) return;
    const el = doc.documentElement as HTMLElement & { requestFullscreen?: (o?: FullscreenOptions) => Promise<void> };
    el.requestFullscreen?.({ navigationUI: 'hide' })
      .then(() => (win.screen?.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
      .catch(() => {
        /* sem tela cheia/rotação: segue no navegador */
      });
  };
  if (isStandalone(win) || !doc.fullscreenEnabled) return () => {};
  win.addEventListener('pointerup', onUp, true);
  return () => win.removeEventListener('pointerup', onUp, true);
}
