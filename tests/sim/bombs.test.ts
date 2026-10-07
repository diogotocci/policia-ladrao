import { BALANCE } from '../../src/config/balance';
import { describe, expect, it } from 'vitest';
import { stepBombs } from '../../src/sim/bombs';
import { useSpecial } from '../../src/sim/specials';
import { NO_INTENTS, type Intents } from '../../src/sim/intents';
import { createWorld, policeOf, thiefOf, withCar, type WorldState } from '../../src/sim/world';

const DT = 1 / 60;
const BOMB = { ...NO_INTENTS, bomb: true };

const armed = (bombs = 2): WorldState => {
  const w = createWorld({ seed: 1, playerRole: 'thief' });
  return withCar(w, 'thief', {
    ...thiefOf(w),
    upgrades: { ...thiefOf(w).upgrades, special: bombs > 0 ? { kind: 'bomb', charges: bombs } : null },
  });
};
const press = (w: WorldState, intents: Intents, steps: number) => {
  let s = w;
  for (let i = 0; i < steps; i++) s = useSpecial({ ...s, time: s.time + DT, events: [] }, intents);
  return s;
};

describe('special: bomb', () => {
  it('holding the button for 1 s drops exactly one bomb, 3 m behind the thief', () => {
    const w = press(armed(), BOMB, 60);
    expect(w.bombs).toHaveLength(1);
    expect(w.bombs[0]!.s).toBeCloseTo(thiefOf(w).s - 3, 5);
    expect(thiefOf(w).upgrades.special).toEqual({ kind: 'bomb', charges: 1 });
  });

  it('release and press again drops another', () => {
    let w = press(armed(), BOMB, 2);
    w = press(w, NO_INTENTS, 2);
    w = press(w, BOMB, 2);
    expect(w.bombs).toHaveLength(2);
  });

  it('no stock, no bomb', () => {
    expect(press(armed(0), BOMB, 10).bombs).toEqual([]);
  });
});

describe('stepBombs', () => {
  const withBomb = (w: WorldState, s: number, x: number) => ({ ...w, bombs: [{ id: 1, s, x, expiresAt: w.time + 20 }] });

  it('police driving over it takes the bomb damage once and the bomb explodes', () => {
    let w = armed();
    const p = policeOf(w);
    w = withBomb(w, p.s, p.x);
    w = stepBombs(w);
    expect(policeOf(w).hp).toBe(100 - BALANCE.items.bomb.damage);
    expect(w.bombs).toEqual([]);
    expect(w.events.some((e) => e.type === 'explosion')).toBe(true);
    expect(policeOf(stepBombs(w)).hp).toBe(100 - BALANCE.items.bomb.damage);
  });

  it('an airborne police car passes unharmed and the bomb stays', () => {
    let w = armed();
    const p = policeOf(w);
    w = withBomb(withCar(w, 'police', { ...p, airTime: 0.3 }), p.s, p.x);
    w = stepBombs(w);
    expect(policeOf(w).hp).toBe(100);
    expect(w.bombs).toHaveLength(1);
  });

  it('traffic does not set it off', () => {
    let w = armed();
    w = { ...withBomb(w, 500, 4.5), traffic: [{ id: 1, s: 500, x: 4.5, speed: 20, targetX: 4.5, model: 0 }] };
    expect(stepBombs(w).bombs).toHaveLength(1);
  });

  it('expires after 20 s', () => {
    let w = withBomb(armed(), 900, 4.5);
    w = stepBombs({ ...w, time: w.time + 20.01 });
    expect(w.bombs).toEqual([]);
  });
});
