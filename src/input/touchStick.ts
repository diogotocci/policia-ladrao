// Analog steering (Opções › Analógico, mockup approved 2026-10-16): a floating stick on the left half of the screen.
// The finger lands anywhere there, the stick appears under it, and dragging sideways steers: the farther, the stronger.
// Only the horizontal distance counts. When no finger is on it, a faint stick rests at its usual place as a hint.

/** Radius of the stick's travel, in CSS px. */
export const STICK_RADIUS = 56;
/** Fraction of the travel ignored around the centre (a resting thumb does not steer). */
export const STICK_DEAD = 0.12;

/** Steering for a horizontal distance from where the finger landed: -1..1, linear after the dead zone. */
export function stickValue(dx: number, radius = STICK_RADIUS, dead = STICK_DEAD): number {
  const t = Math.max(-1, Math.min(1, dx / radius));
  const a = Math.abs(t);
  if (a <= dead) return 0;
  return (Math.sign(t) * (a - dead)) / (1 - dead);
}

export interface TouchStick {
  /** current steering, -1..1 */
  read(): number;
  /** lets go (system gesture, page hidden) */
  release(): void;
  /**
   * Safety net (the arrows had it since playtest 2026-10-07): some system gestures end a touch without pointerup.
   * Called on every touchend with the fingers still down; lets go when the stick's finger is not among them.
   */
  checkTouches(identifiers: readonly number[]): void;
  dispose(): void;
}

export function createTouchStick(parent: HTMLElement): TouchStick {
  const zone = document.createElement('div');
  zone.className = 'touch-stick-zone';
  zone.setAttribute('role', 'presentation');
  const base = document.createElement('div');
  base.className = 'touch-stick';
  base.setAttribute('aria-hidden', 'true');
  const knob = document.createElement('div');
  knob.className = 'touch-stick-knob';
  base.append(knob);
  zone.append(base);
  parent.append(zone);

  let finger: number | null = null;
  /** the Touch.identifier of the finger on the stick (touch screens), to notice it left without a pointerup */
  let touchId: number | null = null;
  let originX = 0;
  let value = 0;

  /** draws the stick centred under the finger (steering is measured from there, even near an edge) */
  const place = (x: number, y: number) => {
    const r = zone.getBoundingClientRect();
    base.style.left = `${x - r.left}px`;
    base.style.top = `${y - r.top}px`;
  };
  const show = (dx: number) => {
    const d = Math.max(-STICK_RADIUS, Math.min(STICK_RADIUS, dx));
    knob.style.transform = `translateX(${d}px)`;
  };
  const release = () => {
    finger = null;
    touchId = null;
    value = 0;
    base.classList.remove('is-on');
    base.style.left = '';
    base.style.top = '';
    show(0);
  };

  const onDown = (e: PointerEvent) => {
    if (finger !== null) return;
    finger = e.pointerId;
    originX = e.clientX;
    place(e.clientX, e.clientY);
    value = 0;
    show(0);
    base.classList.add('is-on');
    try {
      zone.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom / browser without capture */
    }
    try {
      navigator.vibrate?.(10);
    } catch {
      /* no vibration */
    }
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== finger) return;
    const dx = e.clientX - originX;
    value = stickValue(dx);
    show(dx);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId === finger) release();
  };
  zone.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches?.[0];
      if (t && touchId === null) touchId = t.identifier;
    },
    { passive: true },
  );
  zone.addEventListener('pointerdown', onDown);
  zone.addEventListener('pointermove', onMove);
  zone.addEventListener('pointerup', onUp);
  zone.addEventListener('pointercancel', onUp);
  zone.addEventListener('lostpointercapture', onUp);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    read: () => value,
    release,
    checkTouches(ids) {
      if (touchId !== null && !ids.includes(touchId)) release();
    },
    dispose() {
      release();
      zone.remove();
    },
  };
}
