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
    projectileSpeed: 300, // m/s (tiro do ladrão)
    // tiro da polícia mais lento: ziguezague do ladrão desvia de longe (playtest 2026-10-04); de perto não dá tempo
    policeProjectileSpeed: 150, // m/s
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
  // IA da polícia investe contra o ladrão (pressão para quem joga de ladrão); depois da batida vale a penalidade de sempre
  ai: {
    ramRange: 35, // m: só investe com o ladrão até aqui à frente
    ramMinGap: 5, // m
    ramChance: [0.01, 0.06] as const, // por decisão alinhada, do nível 1 ao 10
    ramBoost: 0.3, // +30% do cruzeiro durante a investida
    ramTime: 2, // s no máximo
  },
  // Fuga (Entrega 7): chegando vivo a 1:30 o ladrão some no horizonte e vence. Cresce com as fases (backlog).
  match: {
    escapeTime: 90, // s
    escapeScene: 2, // s de cena (ladrão com nitro some na neblina, polícia freia)
    escapeBoost: 2, // × cruzeiro do ladrão na cena
    escapeAccel: 25, // m/s² do ladrão na cena
    // Prisão (playtest 2026-10-05): o ladrão destruído para, arrebentado e soltando fumaça preta; a polícia encosta atrás; aí acaba
    arrestScene: 3, // s
    arrestGap: 4.5, // m: a viatura para logo atrás do ladrão, na faixa ao lado (a câmera vê o carro dele)
    arrestSide: 3, // m de lado
    thiefStopDecel: 18, // m/s²
  },
  traffic: { baseCount: 3, perLevel: 0.08, speedMin: 0.5, speedMax: 0.7, spawnAheadMin: 120, spawnAheadMax: 240, despawnBehind: 80, laneChangePerSecond: 0.15, laneChangeSpeed: 3, minGap: 12, minGapToGameCar: 40, minGapToItem: 8 },
  items: {
    boxEvery: 200, // m (~1 a cada 6 s no cruzeiro; playtest 2026-10-04: a cada 300 m vinham poucas)
    boxJitter: 40,
    firstBoxAt: 200,
    maxVisible: 2,
    spawnAhead: 250,
    wrongBoxDamage: 2,
    colorTilt: 0.15, // até 65/35
    colorTiltAtHpDiff: 50,
    police: {
      fireRateStep: 0.1, fireIntervalMin: 0.3, powerStep: 0.5, powerMax: 3, heal: 3,
      nitroBonus: 0.4, nitroTime: 3, ramCharges: 3, ramThief: 8, ramPolice: 1, heliTime: 8, pierceTime: 10,
      heliFireInterval: 0.7, // s: o helicóptero atira sozinho, além do policial (dano cheio, sem perda pela distância)
    },
    bomb: { damage: 15, // teste de balanço C
      lifetime: 20, dropBehind: 3, radiusS: 1.4, radiusX: 1.2 },
    thief: { platesMax: 3, bombsMax: 3, heal: 3, gunStep: 0.15, gunIntervalMin: 0.6 },
    weights: {
      police: { fireRate: 2, power: 2, heal: 3, nitro: 2, ram: 2, heli: 1, pierce: 2 },
      thief: { plate: 3, bomb: 3, heal: 3, gun: 5 },
    },
  },
  // Curvas (Entrega 6): leves pedem ◀ ▶, fechadas pedem freio
  curves: {
    straightStart: 300, // m
    straightMin: 150,
    straightMax: 350,
    lengthMin: 150,
    lengthMax: 300,
    sharpChance: 1 / 3,
    sharpRadius: [130, 180] as const,
    gentleRadius: [350, 600] as const,
    ramp: 0.25, // fração do comprimento em cada ponta (entrada/saída suaves)
    bumpClearance: 20, // m de folga dos quebra-molas
    grip: 6, // m/s² — acima disso derrapa
    driftGain: 0.5, // deriva para fora (m/s) por m/s² de aceleração lateral
    skidGain: 1.5, // deriva extra acima da aderência
    skidSteer: 0.5, // fração do ◀ ▶ que sobra derrapando
  },
  track: { bumpEvery: 400, bumpJitter: 80, bumpLanes: 2, jumpTime: 0.6, jumpHeight: 0.9, bumpSpeedLoss: 0.25, firstBumpAfter: 150 },
} as const;
