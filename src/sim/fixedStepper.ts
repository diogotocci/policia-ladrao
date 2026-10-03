import { BALANCE } from '../config/balance';

/**
 * Converte tempo real (variável) em passos fixos de simulação.
 * Limita os passos por frame: ao voltar de uma aba em segundo plano, o atraso é descartado.
 */
export class FixedStepper {
  private acc = 0;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly dt: number = BALANCE.sim.dt,
    private readonly maxSteps: number = BALANCE.sim.maxStepsPerFrame,
  ) {}

  /** Executa 0..maxSteps passos e devolve alpha em [0, 1) para interpolação. */
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
