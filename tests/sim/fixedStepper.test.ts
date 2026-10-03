import { describe, expect, it } from 'vitest';
import { FixedStepper } from '../../src/sim/fixedStepper';

const DT = 1 / 60;

describe('FixedStepper', () => {
  it('runs one step per dt', () => {
    let n = 0;
    const st = new FixedStepper(() => n++, DT, 5);
    st.advance(DT);
    expect(n).toBe(1);
  });

  it('accumulates partial frames', () => {
    let n = 0;
    const st = new FixedStepper(() => n++, DT, 5);
    st.advance(DT / 2);
    expect(n).toBe(0);
    st.advance(DT / 2 + 1e-9);
    expect(n).toBe(1);
  });

  it('caps steps per frame and drops the backlog (tab was in background)', () => {
    let n = 0;
    const st = new FixedStepper(() => n++, DT, 5);
    const alpha = st.advance(10);
    expect(n).toBe(5);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
    st.advance(DT);
    expect(n).toBe(6);
  });

  it('returns alpha = leftover / dt', () => {
    const st = new FixedStepper(() => {}, DT, 5);
    expect(st.advance(DT * 1.25)).toBeCloseTo(0.25, 6);
  });

  it('passes dt to the step function', () => {
    const seen: number[] = [];
    new FixedStepper((dt) => seen.push(dt), DT, 5).advance(DT * 2);
    expect(seen).toEqual([DT, DT]);
  });
});
