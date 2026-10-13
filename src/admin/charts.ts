// The /admin panel's charts (V3 delivery 3, mockup approved 2026-10-12): a two-line daily chart with a hover crosshair
// and tooltip, and labelled bar lists. Plain SVG and DOM; colours validated for the dark surface (dataviz validator).
export const SERIES = { active: '#3b82f6', accounts: '#e2622a' } as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const NS = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};
export const n = (v: number) => Math.round(v).toLocaleString('pt-BR');
/** a round top for the axis (1, 2 or 5 times a power of ten), so the grid lines fall on plain numbers */
export function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Accounts created and active players per day: one axis (both are counts of people), legend above, tooltip on hover. */
export function dailyChart(days: { day: string; accounts: number; active: number }[]): HTMLElement {
  const box = el('div', 'chart');
  const legend = el('div', 'legend');
  for (const [key, label] of [
    ['active', 'Ativos'],
    ['accounts', 'Contas novas'],
  ] as const) {
    const item = el('span', 'legend-item');
    const swatch = el('i', 'swatch');
    swatch.style.background = SERIES[key];
    item.append(swatch, label);
    legend.append(item);
  }
  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 12, t: 10, b: 24 };
  const max = niceMax(Math.max(1, ...days.map((d) => Math.max(d.active, d.accounts))));
  const x = (i: number) => pad.l + (days.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (days.length - 1));
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const plot = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'plot',
    role: 'img',
    'aria-label': 'Contas novas e jogadores ativos por dia',
  });
  for (const f of [0, 0.5, 1]) {
    plot.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y(max * f), y2: y(max * f), class: 'grid' }));
    const t = svg('text', { x: pad.l - 6, y: y(max * f) + 4, class: 'tick', 'text-anchor': 'end' });
    t.textContent = n(max * f);
    plot.append(t);
  }
  for (const key of ['active', 'accounts'] as const) {
    const d = days.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join('');
    plot.append(svg('path', { d, class: 'line', stroke: SERIES[key] }));
  }
  if (days.length) {
    for (const [i, anchor] of [
      [0, 'start'],
      [days.length - 1, 'end'],
    ] as const) {
      const t = svg('text', { x: x(i), y: H - 6, class: 'tick', 'text-anchor': anchor });
      t.textContent = shortDay(days[i]!.day);
      plot.append(t);
    }
  }
  const cross = svg('line', { y1: pad.t, y2: H - pad.b, class: 'cross', visibility: 'hidden' });
  const dots = (['active', 'accounts'] as const).map((key) =>
    svg('circle', { r: 4, fill: SERIES[key], class: 'dot', visibility: 'hidden' }),
  );
  plot.append(cross, ...dots);
  const tip = el('div', 'tip');
  tip.hidden = true;
  const wrap = el('div', 'plot-wrap');
  wrap.append(plot, tip);
  const hide = () => {
    tip.hidden = true;
    cross.setAttribute('visibility', 'hidden');
    for (const d of dots) d.setAttribute('visibility', 'hidden');
  };
  const show = (e: PointerEvent) => {
    const r = plot.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(days.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (days.length - 1))));
    const p = days[i];
    if (!p) return hide();
    cross.setAttribute('x1', String(x(i)));
    cross.setAttribute('x2', String(x(i)));
    cross.setAttribute('visibility', 'visible');
    dots[0]!.setAttribute('cx', String(x(i)));
    dots[0]!.setAttribute('cy', String(y(p.active)));
    dots[1]!.setAttribute('cx', String(x(i)));
    dots[1]!.setAttribute('cy', String(y(p.accounts)));
    for (const d of dots) d.setAttribute('visibility', 'visible');
    tip.replaceChildren(
      el('b', '', shortDay(p.day)),
      el('span', '', `Ativos ${n(p.active)}`),
      el('span', '', `Contas novas ${n(p.accounts)}`),
    );
    tip.hidden = false;
    tip.style.left = `${(x(i) / W) * 100}%`;
  };
  // a mouse hovers; a finger taps (and drags along the line)
  plot.addEventListener('pointermove', show);
  plot.addEventListener('pointerdown', show);
  // a finger lifting also 'leaves': the tip stays until the next tap, so it can be read
  plot.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && hide());
  // the same numbers as a table, for screen readers
  const table = el('table', 'sr-only');
  const head = el('tr');
  head.append(el('th', '', 'Dia'), el('th', '', 'Ativos'), el('th', '', 'Contas novas'));
  table.append(head);
  for (const p of days) {
    const tr = el('tr');
    tr.append(el('td', '', shortDay(p.day)), el('td', '', String(p.active)), el('td', '', String(p.accounts)));
    table.append(tr);
  }
  box.append(legend, wrap, table);
  return box;
}

/** A labelled bar list (magnitude of one measure): name, bar from the baseline, value as text. */
export function bars(rows: { label: string; value: number }[], empty = 'Nada ainda neste período.'): HTMLElement {
  const list = el('ul', 'bars');
  if (rows.length === 0) {
    list.append(el('li', 'empty', empty));
    return list;
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  for (const r of rows) {
    const li = el('li', 'bar-row');
    li.title = `${r.label}: ${n(r.value)}`;
    const track = el('span', 'bar-track');
    const bar = el('span', 'bar');
    bar.style.width = `${(r.value / max) * 100}%`;
    track.append(bar);
    li.append(el('span', 'bar-label', r.label), track, el('span', 'bar-value', n(r.value)));
    list.append(li);
  }
  return list;
}
