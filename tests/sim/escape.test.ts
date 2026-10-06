import { describe, expect, it } from 'vitest';
import { BALANCE, type Role } from '../../src/config/balance';
import { NO_INTENTS } from '../../src/sim/intents';
import { createWorld, policeOf, stepWorld, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const E = BALANCE.match.escapeTime;
const FIRE = { ...NO_INTENTS, fire: true, left: true };

/** mundo logo antes de 1:30, sem tráfego, polícia colada atirando */
const nearEnd = (role: Role = 'thief'): WorldState => {
  const w = createWorld({ seed: 4, playerRole: role, traffic: false, curves: false });
  const atEnd = withCar({ ...w, time: E - 0.5 }, 'thief', { ...thiefOf(w), s: 2000, speed: 34 });
  return withCar(atEnd, 'police', { ...policeOf(atEnd), s: 2000 - 12, x: thiefOf(atEnd).x, speed: 34 });
};

describe('escape: the thief also wins by surviving 1:30', () => {
  it('at 1:30 with both alive the escape scene starts (event), then the thief wins by escape with endTime = 1:30', () => {
    let w = nearEnd();
    let sawEscape = false;
    for (let i = 0; i < 60 * 4 && !w.match.over; i++) {
      w = stepWorld(w, NO_INTENTS, DT);
      if (w.events.some((e) => e.type === 'escape')) sawEscape = true;
    }
    expect(sawEscape).toBe(true);
    expect(w.match.over).toBe(true);
    expect(w.match.winner).toBe('thief');
    expect(w.match.reason).toBe('escape');
    expect(w.match.endTime).toBe(E); // exato: fugas empatam no ranking
    expect(w.time).toBeGreaterThanOrEqual(E + BALANCE.match.escapeScene - 0.05);
  });

  it('during the scene: no damage, no shots, controls ignored; the thief speeds away and the police brakes', () => {
    let w = nearEnd('police');
    while (w.match.escapeAt === undefined) w = stepWorld(w, FIRE, DT);
    const hp = [policeOf(w).hp, thiefOf(w).hp];
    const x = policeOf(w).x;
    const gap0 = thiefOf(w).s - policeOf(w).s;
    const vT = thiefOf(w).speed;
    for (let i = 0; i < 60; i++) {
      w = stepWorld(w, FIRE, DT);
      expect(w.events.some((e) => e.type === 'shot' || e.type === 'hit' || e.type === 'crash')).toBe(false);
    }
    expect([policeOf(w).hp, thiefOf(w).hp]).toEqual(hp);
    expect(w.projectiles).toHaveLength(0);
    expect(policeOf(w).x).toBe(x); // ◀ ignorado
    expect(thiefOf(w).speed).toBeGreaterThan(vT);
    expect(thiefOf(w).s - policeOf(w).s).toBeGreaterThan(gap0 + 20);
  });

  it('a car in the air when 1:30 hits lands normally; bombs on the road are cleared; no siren or rotor in the scene', () => {
    let w = nearEnd();
    w = withCar(w, 'thief', { ...thiefOf(w), airTime: 0.5 });
    w = { ...w, bombs: [{ id: 1, s: thiefOf(w).s - 5, x: 0, armedAt: 0 } as never] };
    while (w.match.escapeAt === undefined) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.bombs).toHaveLength(0);
    for (let i = 0; i < 40; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(thiefOf(w).airTime).toBe(0);
  });

  it('a kill on the very step that reaches 1:30 wins over the escape', () => {
    let w = nearEnd('police');
    w = { ...w, time: E - DT / 2 };
    w = withCar(w, 'thief', { ...thiefOf(w), hp: 0 });
    w = stepWorld(w, NO_INTENTS, DT);
    expect(w.match.arrestAt).toBeDefined(); // cena da prisão, não a da fuga
    expect(w.match.escapeAt).toBeUndefined();
    for (let i = 0; i < 60 * 5 && !w.match.over; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.match).toMatchObject({ over: true, winner: 'police', reason: 'thiefDown' });
    expect(w.match.escapeAt).toBeUndefined();
  });

  it('destroying before 1:30 still ends the match at once, with its reason', () => {
    const w0 = createWorld({ seed: 4, playerRole: 'police', traffic: false, curves: false, debugHp: { thief: 0.5 } });
    let w = withCar(w0, 'police', { ...policeOf(w0), s: thiefOf(w0).s - 15, x: thiefOf(w0).x });
    for (let i = 0; i < 600 && !w.match.over; i++) w = stepWorld(w, { ...NO_INTENTS, fire: true }, DT);
    expect(w.match).toMatchObject({ over: true, winner: 'police', reason: 'thiefDown' });
  });

  it('the escape time can be shortened (debug/e2e)', () => {
    let w = createWorld({ seed: 4, playerRole: 'thief', traffic: false, escapeTime: 3 });
    for (let i = 0; i < 60 * 6 && !w.match.over; i++) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.match).toMatchObject({ over: true, winner: 'thief', reason: 'escape' });
    expect(w.match.endTime).toBe(3);
  });

  it('AI vs AI: the thief wins 30–70% of the matches', () => {
    let thief = 0;
    let n = 0;
    for (const role of ['police', 'thief'] as Role[])
      for (let seed = 1; seed <= 20; seed++) {
        let w = createWorld({ seed, playerRole: role });
        for (let i = 0; i < 95 * 60 && !w.match.over; i++) w = stepWorld(w, 'ai', DT);
        expect(w.match.over, `seed ${seed}`).toBe(true); // ninguém passa de 1:30 + cena
        n++;
        if (w.match.winner === 'thief') thief++;
      }
    expect(thief / n).toBeGreaterThanOrEqual(0.3);
    expect(thief / n).toBeLessThanOrEqual(0.7);
  }, 120000);
});

describe('end scenes with traffic (playtest: the thief drove through cars)', () => {
  const overlaps = (w: WorldState) =>
    [policeOf(w), thiefOf(w)].some((g) => w.traffic.some((c) => Math.abs(c.x - g.x) < 2 * BALANCE.car.halfWidth && Math.abs(c.s - g.s) < BALANCE.car.length));
  it('escape: the thief weaves around traffic, never through it; traffic never drives into the braking police (30 seeds)', () => {
    let bad = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let w = createWorld({ seed, playerRole: 'thief', escapeTime: 20 });
      w = { ...w, level: 10 };
      for (let i = 0; i < 60 * 25 && !w.match.over; i++) {
        const scene = w.match.escapeAt !== undefined;
        w = stepWorld(w, 'ai', DT);
        if (scene && overlaps(w)) bad++;
      }
    }
    expect(bad).toBe(0);
  }, 60000);

  it('arrest: traffic coming from behind stops instead of driving through the stopped cars (30 seeds)', () => {
    let bad = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let w = createWorld({ seed, playerRole: 'police', debugHp: { thief: 3 } });
      w = { ...w, level: 10 };
      for (let i = 0; i < 60 * 90 && !w.match.over; i++) {
        const scene = w.match.arrestAt !== undefined;
        w = stepWorld(w, 'ai', DT);
        if (scene && overlaps(w)) bad++;
      }
    }
    expect(bad).toBe(0);
  }, 60000);
});

describe('police destroyed (playtest 2026-10-06): the police stops, the thief drives away, then the end', () => {
  const doomed = (): WorldState => {
    const w0 = createWorld({ seed: 4, playerRole: 'police', traffic: false, curves: false });
    const w = withCar(w0, 'thief', { ...thiefOf(w0), s: 1000, x: 1.5, speed: 34 });
    return withCar({ ...w, time: 40 }, 'police', { ...policeOf(w), s: 990, x: 1.5, speed: 34, hp: 0.4 });
  };
  const kill = (w: WorldState) => withCar(w, 'police', { ...policeOf(w), hp: 0 });

  it('police at 0: not over yet — the police brakes to a stop and the thief speeds away; no shots or damage', () => {
    let w = stepWorld(kill(doomed()), NO_INTENTS, DT);
    expect(w.match.over).toBe(false);
    expect(w.match.escapeAt).toBeCloseTo(40, 1);
    const hp = thiefOf(w).hp;
    while (!w.match.over) {
      w = stepWorld(w, { ...NO_INTENTS, fire: true }, DT);
      expect(w.events.some((e) => e.type === 'shot' || e.type === 'hit')).toBe(false);
    }
    expect(policeOf(w).speed).toBeLessThan(1);
    expect(thiefOf(w).s - policeOf(w).s).toBeGreaterThan(60);
    expect(thiefOf(w).hp).toBe(hp);
  });

  it('then the thief wins by destroying the police; the time is when the police was destroyed', () => {
    let w = stepWorld(kill(doomed()), NO_INTENTS, DT);
    const at = w.match.escapeAt!;
    while (!w.match.over) w = stepWorld(w, NO_INTENTS, DT);
    expect(w.match).toMatchObject({ over: true, winner: 'thief', reason: 'policeDown', endTime: at });
    expect(w.events).toContainEqual({ type: 'end', winner: 'thief' });
  });
});
