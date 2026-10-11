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
  // V2 part 3: the yellow "?" box, oil and smoke
  mystery: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'),
  oil: svg('<path d="M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z"/>'),
  smoke: svg('<path d="M7 17a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 17z"/><path d="M5 21h6M14 21h5"/>'),
  // V2 part 3: police items
  barrier: svg('<path d="M3 8h18v6H3z"/><path d="M7 8l-4 6M12 8l-4 6M17 8l-4 6M21 8l-4 6"/><path d="M6 14v6M18 14v6"/>'),
  // V2 part 4: shop; part 5: career
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  flame: svg('<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3-1-3 0-6 1-9z"/>', true),
  medal: svg('<circle cx="12" cy="15" r="5"/><path d="M9 3h6l-1.5 7h-3zM10.5 15h3"/>'),
  shop: svg('<path d="M4 9h16l-1.5 11h-13z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>'),
  car: svg('<path d="M3 15v-3l2-5h14l2 5v3z"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M5 12h14"/>'),
  siren: svg('<path d="M7 18v-5a5 5 0 0 1 10 0v5"/><path d="M5 18h14v3H5zM12 3v2M4.5 6l1.5 1.5M19.5 6 18 7.5"/>'),
  // shop tabs (playtest 2026-10-10: side rail with icon and name)
  paint: svg('<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>'),
  sticker: svg('<path d="M5 4h14v9l-6 7H5z"/><path d="M13 20v-5a2 2 0 0 1 2-2h4"/>'),
  wheel: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5v6M12 14.5v6M3.5 12h6M14.5 12h6"/>'),
  wing: svg('<path d="M3 9h18l-2 3H5z"/><path d="M8 12v5M16 12v5M5 17h14"/>'),
  sparkle: svg(
    '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  ),
  horn: svg('<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10"/>'),
  plate: svg('<rect x="2.5" y="7" width="19" height="10" rx="1.5"/><path d="M2.5 9.5h19M6 13.5h3M11 13.5h3M16 13.5h2"/>'),
} as const;
