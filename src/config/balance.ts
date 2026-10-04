// Todos os números de jogo. Spec: docs/superpowers/specs/2026-10-03-policia-ladrao-design.md
export type Role = 'police' | 'thief';

export const BALANCE = {
  road: { laneCenters: [-4.5, -1.5, 1.5, 4.5], halfWidth: 6 },
  car: { halfWidth: 0.9, length: 4.4 },
  movement: {
    cruise: { police: 33, thief: 34 }, // m/s
    accel: 8, // m/s²
    brakeDecel: 20, // m/s²
    lateralSpeed: 7, // m/s
  },
  sim: { dt: 1 / 60, maxStepsPerFrame: 5 },
  hp: 100,
  combat: {
    policeFireInterval: 0.8, // s
    policeDamage: 1,
    thiefFireInterval: 1.2, // s
    thiefDamage: 1,
    thiefMinSpeedToFire: 8, // m/s
    projectileSpeed: 300, // m/s
    range: 150, // m
    frontConeDeg: 35,
    sideConeDeg: 90, // frontal ±35° + laterais até 90° = semiplano à frente dentro do alcance
    falloffStart: 40, // m
    falloffEnd: 150, // m
  },
  collision: { carCarThief: 5, carCarPolice: 3, scenery: 5, immunity: 1, speedLoss: 0.3, pushBack: 0.4 },
  catchUp: { start: 60, end: 150, maxBonus: 0.35 },
  difficulty: { levelEvery: 30, maxLevel: 10 },
} as const;
