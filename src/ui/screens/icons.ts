// Screen icons (buttons and the yellow road-sign tips). Stroke/fill use currentColor.
const svg = (body: string, fill = false) =>
  `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const SCREEN_ICONS = {
  play: svg('<path d="M7 4l13 8-13 8z"/>', true),
  coin: svg(
    '<circle cx="12" cy="12" r="9" fill="#ffcf4a" stroke="#b07a10"/><path d="M12 7v10M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9s1.1 1.7 2.5 2.1 2.5 1 2.5 2.1-1.1 1.9-2.5 1.9c-1 0-1.9-.4-2.5-1.2" stroke="#6b4300" stroke-width="1.6"/>',
  ),
  profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  forward: svg('<path d="M9 5l7 7-7 7"/>'),
  up: svg('<path d="M12 6l7 11H5z"/>', true),
  down: svg('<path d="M12 18L5 7h14z"/>', true),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h0"/>'),
  replay: svg('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>'),
  swap: svg('<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>'),
  trophy: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8"/>'),
  home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>'),
  clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 3h6"/>'),
  skull: svg(
    '<path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14z"/><circle cx="9" cy="11" r="1.4"/><circle cx="15" cy="11" r="1.4"/><path d="M10 20v-2M14 20v-2"/>',
  ),
  cone: svg('<path d="M9 4h6l4 15H5z"/><path d="M7.5 10h9M6.5 14h11M3 19h18"/>'),
  // road-sign tips
  auto: svg('<path d="M12 20V5M6 11l6-6 6 6"/><path d="M4 20h4M16 20h4"/>'),
  curve: svg('<path d="M7 21v-6c0-4 2-6 6-6h2"/><path d="M13 5l4 4-4 4"/>'),
  box: svg('<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>'),
  bump: svg('<path d="M2 18h20v2H2z"/><path d="M6 18c1-5 3-7 6-7s5 2 6 7z"/>', true),
  crash: svg('<path d="M12 3l1.8 5.2L19 6l-2.6 4.6L21 13l-5.3.8L16 19l-4-3.4L8 19l.3-5.2L3 13l4.6-2.4L5 6l5.2 2.2z"/>'),
  shot: svg('<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>'),
  bomb: svg('<circle cx="11" cy="14" r="6"/><path d="M15 9l2-2M17 7c1-2 3-2 4-1"/>'),
  flag: svg('<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>'),
} as const;
