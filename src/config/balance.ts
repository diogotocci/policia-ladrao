// Todos os números de jogo. Spec: docs/superpowers/specs/2026-10-03-policia-ladrao-design.md
export type Role = 'police' | 'thief';

export const BALANCE = {
  road: { laneCenters: [-4.5, -1.5, 1.5, 4.5], halfWidth: 6 },
  car: { halfWidth: 0.9, length: 4.4 },
  movement: {
    cruise: { police: 34, thief: 34 }, // m/s — iguais: a polícia só encosta quando o ladrão erra
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
    thiefDamage: 1.5, // teste de balanço A
    thiefMinSpeedToFire: 8, // m/s
    projectileSpeed: 300, // m/s
    range: 150, // m
    frontConeDeg: 35,
    sideConeDeg: 90, // frontal ±35° + laterais até 90° = semiplano à frente dentro do alcance
    falloffStart: 40, // m
    falloffEnd: 150, // m
  },
  collision: {
    carCarThief: 5,
    carCarPolice: 3,
    scenery: 5,
    immunity: 1,
    speedLoss: 0.3, // cenário e tráfego
    pushBack: 0.4,
    // polícia × ladrão: só a polícia perde velocidade e fica sem turbo de compensação por um tempo (o ladrão escapa)
    carCarPoliceSpeedLoss: 0.5,
    carCarThiefSpeedLoss: 0,
    policeTurboOff: 4, // s
  },
  catchUp: { start: 20, end: 150, maxBonus: 0.35 },
  difficulty: { levelEvery: 30, maxLevel: 10 },
  traffic: { baseCount: 3, perLevel: 0.08, speedMin: 0.5, speedMax: 0.7, spawnAheadMin: 120, spawnAheadMax: 240, despawnBehind: 80, laneChangePerSecond: 0.15, laneChangeSpeed: 3, minGap: 12, minGapToGameCar: 40, minGapToItem: 8 },
  items: {
    boxEvery: 300,
    boxJitter: 60,
    firstBoxAt: 300,
    maxVisible: 2,
    spawnAhead: 250,
    wrongBoxDamage: 2,
    colorTilt: 0.15, // até 65/35
    colorTiltAtHpDiff: 50,
    police: {
      fireRateStep: 0.1, fireIntervalMin: 0.3, powerStep: 0.5, powerMax: 3, heal: 3,
      nitroBonus: 0.4, nitroTime: 3, ramCharges: 3, ramThief: 8, ramPolice: 1, heliTime: 8, pierceTime: 10,
    },
    bomb: { damage: 15, // teste de balanço C
      lifetime: 20, dropBehind: 3, radiusS: 1.4, radiusX: 1.2 },
    thief: { platesMax: 3, bombsMax: 3, heal: 3, gunStep: 0.15, gunIntervalMin: 0.6 },
    weights: {
      police: { fireRate: 2, power: 2, heal: 3, nitro: 2, ram: 2, heli: 1, pierce: 2 },
      thief: { plate: 3, bomb: 3, heal: 3, gun: 5 },
    },
  },
  track: { bumpEvery: 400, bumpJitter: 80, bumpLanes: 2, jumpTime: 0.6, jumpHeight: 0.9, bumpSpeedLoss: 0.25, firstBumpAfter: 150 },
} as const;
