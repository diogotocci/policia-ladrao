import { BALANCE } from '../config/balance';

/**
 * Converts real (variable) time into fixed simulation steps.
 * Limits steps per frame: when returning from a background tab, the lag is discarded.
 */
export class FixedStepper {
  private acc = 0;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly dt: number = BALANCE.sim.dt,
    private readonly maxSteps: number = BALANCE.sim.maxStepsPerFrame,
  ) {}

  /** Runs 0..maxSteps steps and returns alpha in [0, 1) for interpolation. */
  advance(elapsedSeconds: number): number {
    this.acc += Math.max(0, elapsedSeconds);
    let steps = 0;
    while (this.acc >= this.dt && steps < this.maxSteps) {
      this.step(this.dt);
      this.acc -= this.dt;
      steps++;
    }
    if (this.acc >= this.dt) this.acc %= this.dt;
    return this.acc / this.dt;
  }
}
