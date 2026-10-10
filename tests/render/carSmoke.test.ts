import { describe, expect, it, vi } from 'vitest';
import { createCarSmoke } from '../../src/render/carSmoke';
import { createCar } from '../../src/sim/car';
import { createWorld, stepWorld } from '../../src/sim/world';

const setup = () => {
  const emitSmoke = vi.fn();
  const particles = { emitSmoke, emissionScale: () => 1 } as never;
  const smoke = createCarSmoke(particles, { sparkAt: vi.fn() } as never);
  return { smoke, emitSmoke };
};
const colours = (f: ReturnType<typeof vi.fn>) => new Set(f.mock.calls.map((c) => c[3]));

describe('car smoke colours (V2 part 6 delivery 2, spec §3.4)', () => {
  it('skid smoke in the side colour, white without one', () => {
    const { smoke, emitSmoke } = setup();
    smoke.setColors({ police: 0x3f8bff, thief: null });
    const police = { ...createCar('police', 1), skidding: true };
    const thief = { ...createCar('thief', 2), skidding: true };
    smoke.tires([police], { time: 10, match: {} } as never, 0.5);
    expect(colours(emitSmoke)).toEqual(new Set([0x3f8bff]));
    emitSmoke.mockClear();
    smoke.tires([thief], { time: 10, match: {} } as never, 0.5);
    expect(colours(emitSmoke)).toEqual(new Set(['white']));
  });

  it('nitro trail while it lasts; the thief leaves a trail when it escapes, the police does not', () => {
    const { smoke, emitSmoke } = setup();
    smoke.setColors({ police: 0xff5fc8, thief: 0xffd23a });
    const base = createCar('police', 1);
    const police = { ...base, upgrades: { ...base.upgrades, nitroUntil: 12 } };
    smoke.tires([police], { time: 11, match: {} } as never, 0.5);
    expect(emitSmoke).toHaveBeenCalled();
    expect(colours(emitSmoke)).toEqual(new Set([0xff5fc8]));
    emitSmoke.mockClear();
    smoke.tires([police], { time: 13, match: {} } as never, 0.5);
    expect(emitSmoke).not.toHaveBeenCalled();
    // the real escape scene (no reason until it ends) leaves the thief's trail; the police leaves none
    let w = createWorld({ seed: 1, playerRole: 'police', escapeTime: 0.5, traffic: false });
    while (w.match.escapeAt === undefined) w = stepWorld(w, 'ai', 1 / 60);
    expect(w.match.over).toBe(false);
    emitSmoke.mockClear();
    smoke.tires(
      [
        { ...w.player, skidding: false },
        { ...w.opponent, skidding: false },
      ],
      w,
      0.5,
    );
    expect(colours(emitSmoke)).toEqual(new Set([0xffd23a]));
    // the police wreck scene: no trail
    emitSmoke.mockClear();
    smoke.tires([{ ...w.opponent, skidding: false }], { ...w, match: { ...w.match, reason: 'policeDown' } }, 0.5);
    expect(emitSmoke).not.toHaveBeenCalled();
  });
});
