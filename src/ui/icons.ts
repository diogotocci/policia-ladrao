// Ícones do HUD desenhados em SVG (emoji muda de celular para celular e fica pequeno/borrado).
// Usam currentColor: a cor vem do botão.
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const SPEAKER = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>';

export const ICONS = {
  soundOn: svg(`${SPEAKER}<path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/>`),
  soundOff: svg(`${SPEAKER}<path d="M16 9.5l5 5M21 9.5l-5 5"/>`),
  pause: svg('<rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/>'),
} as const;
