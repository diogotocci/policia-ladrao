// All game numbers. Spec: docs/superpowers/specs/2026-10-03-policia-ladrao-design.md
export type Role = 'police' | 'thief';
/** V2 part 2: Fácil / Médio / Difícil */
export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
/** V2 part 3: Perseguição (1:30 clock) / Sobrevivência (no clock, chaos rises) */
export type Mode = 'pursuit' | 'survival';
export const MODES: readonly Mode[] = ['pursuit', 'survival'];

export const BALANCE = {
  road: { laneCenters: [-4.5, -1.5, 1.5, 4.5], halfWidth: 6 },
  car: { halfWidth: 0.9, length: 4.4 },
  movement: {
    cruise: { police: 34, thief: 34 }, // m/s — equal: the police only catches up when the thief makes a mistake
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
    thiefDamage: 1.5, // balance test A
    thiefMinSpeedToFire: 8, // m/s
    projectileSpeed: 300, // m/s (thief's shot)
    // slower police shot: the thief's zigzag dodges it from afar (playtest 2026-10-04); up close there is no time
    policeProjectileSpeed: 150, // m/s
    range: 150, // m
    frontConeDeg: 35,
    sideConeDeg: 90, // front ±35° + sides up to 90° = half-plane ahead within range
    falloffStart: 40, // m
    falloffEnd: 150, // m
  },
  collision: {
    carCarThief: 5,
    carCarPolice: 3,
    scenery: 5,
    immunity: 1,
    speedLoss: 0.3, // scenery and traffic
    pushBack: 0.4,
    // police × thief: only the police loses speed and loses its catch-up turbo for a while (the thief gets away)
    carCarPoliceSpeedLoss: 0.5,
    carCarThiefSpeedLoss: 0,
    policeTurboOff: 4, // s
  },
  catchUp: { start: 20, end: 150, maxBonus: 0.35 },
  difficulty: { maxLevel: 10 },
  // V2 part 3 (spec 2026-10-07-v2-parte3-modos-design.md §3): Sobrevivência has no clock; chaos rises and so does everything
  survival: {
    chaosEvery: 45, // s
    chaosMax: 5,
    trafficBase: 1.3, // playtest 2026-10-07: more traffic than Perseguição from the start
    trafficPerChaos: 0.25, // +25% target traffic per chaos level above 1
    boxEveryPerChaos: 0.9, // box spacing x0.9 per level above 1
    damagePerChaos: 0.15, // all damage x(1 + 0.15 x (chaos - 1)): guarantees the match ends
    worksFromChaos: 3,
    // m between roadworks on average at chaos 3, 4 and 5 (playtest 2026-10-07: at 500-700 m they almost never came)
    worksEvery: [300, 220, 180] as const,
    worksLength: 60, // m of closed lane
    worksSign: 80, // m: warning sign before
    timeCoinsMax: 60,
    // both cars, by difficulty (playtest 2026-10-07: at 100 the matches ended too fast)
    hp: { easy: 200, normal: 250, hard: 300 } as Record<Difficulty, number>,
    thiefDamageTaken: 1.05, // tuned so the computer x computer thief wins ~50% (playtest 2026-10-07: more traffic and works)
  },
  // V2 part 2 (spec 2026-10-07-v2-parte2-dificuldade-design.md §2). Médio is the 0.11 game:
  // level every 45 s (playtest 2026-10-07: it felt harder on both sides at 30 s) and the computer's helicopter every 1 s.
  difficulties: {
    easy: { startLevel: 1, levelEvery: 60, traffic: 0.7, heliFireIntervalAi: 1.2, coins: 0.75 },
    normal: { startLevel: 1, levelEvery: 45, traffic: 1, heliFireIntervalAi: 1, coins: 1 },
    hard: { startLevel: 3, levelEvery: 30, traffic: 1.3, heliFireIntervalAi: 0.7, coins: 1.5 },
  },
  // police AI rams the thief (pressure on whoever plays the thief); after the crash the usual penalty applies
  ai: {
    ramRange: 35, // m: only rams with the thief up to this far ahead
    ramMinGap: 5, // m
    ramChance: [0.004, 0.06] as const, // per aligned decision, from level 1 to 10 (rare at the start: playtest 2026-10-07)
    ramBoost: 0.3, // +30% of cruise during the ram
    ramTime: 2, // s at most
  },
  // Escape (Delivery 7): reaching 1:30 alive, the thief vanishes over the horizon and wins. Grows with the phases (backlog).
  match: {
    escapeTime: 90, // s
    escapeScene: 2, // s of scene (thief with nitro vanishes into the fog, police brakes)
    escapeBoost: 2, // × the thief's cruise in the scene
    escapeAccel: 25, // m/s² of the thief in the scene
    // Arrest (playtest 2026-10-05): the destroyed thief stops, wrecked and emitting black smoke; the police pulls up behind; then it ends
    arrestScene: 3, // s
    arrestGap: 4.5, // m: the patrol car stops right behind the thief, in the lane beside (the camera sees his car)
    arrestSide: 3, // m to the side
    thiefStopDecel: 18, // m/s²
  },
  traffic: {
    baseCount: 3,
    perLevel: 0.08,
    speedMin: 0.5,
    speedMax: 0.7,
    spawnAheadMin: 120,
    spawnAheadMax: 240,
    despawnBehind: 80,
    laneChangePerSecond: 0.15,
    laneChangeSpeed: 3,
    minGap: 12,
    minGapToGameCar: 40,
    minGapToItem: 8,
  },
  items: {
    boxEvery: 200, // m (~1 every 6 s at cruise; playtest 2026-10-04: at every 300 m too few came)
    boxJitter: 40,
    firstBoxAt: 200,
    maxVisible: 2,
    spawnAhead: 250,
    wrongBoxDamage: 2,
    colorTilt: 0.15, // up to 65/35
    colorTiltAtHpDiff: 50,
    police: {
      fireRateStep: 0.1,
      fireIntervalMin: 0.3,
      powerStep: 0.5,
      powerMax: 3,
      heal: 3,
      nitroBonus: 0.4,
      nitroTime: 3,
      ramCharges: 3,
      ramThief: 8,
      ramPolice: 1,
      heliTime: 8,
      pierceTime: 10,
      heliFireInterval: 0.7, // s: the helicopter shoots on its own, besides the officer (full damage, no loss over distance)
    },
    bomb: {
      damage: 15, // balance test C
      lifetime: 20,
      dropBehind: 3,
      radiusS: 1.4,
      radiusX: 1.2,
    },
    thief: { platesMax: 3, specialMax: 3, heal: 3, gunStep: 0.15, gunIntervalMin: 0.6 },
    // V2 part 3 (spec 2026-10-07-v2-parte3-modos-design.md §4.1): the thief's specials, one kind kept, up to 3 charges.
    // "strong" values from chaos 3 (Sobrevivência only).
    strongFromChaos: 3,
    oil: { lifetime: 15, length: 10, dropBehind: 3, skidTime: 1.5, skidSteer: 0.5, skidPush: 2, speedLoss: 0.3 },
    spikes: { lifetime: 15, length: 2, dropBehind: 3, flatTime: 4, flatTimeStrong: 6, speedFactor: 0.7, pull: 1.5 },
    smoke: { time: 3, timeStrong: 5, spreadDeg: 12 },
    bigBombFromChaos: 2, // Sobrevivência: the bomb covers 2 lanes from chaos 2
    // V2 part 3: the yellow "?" box (both modes): a good item of your side or a bad effect, after a 0.6 s roulette
    mystery: {
      share: 0.15, // of the boxes (about 1 in 7; at 1 in 5 the computer thief lost too often)
      good: { easy: 0.7, normal: 0.6, hard: 0.45 } as Record<Difficulty, number>,
      revealTime: 0.6,
      slow: { time: 4, factor: 0.7 },
      double: { time: 6 },
      mud: { time: 4 },
      noBrake: { time: 3 },
    },
    weights: {
      police: { fireRate: 2, power: 2, heal: 3, nitro: 2, ram: 2, heli: 1, pierce: 2 },
      // the thief's specials share the weight the bomb had (3), then split by kind: the rest of the mix stays as it was
      // (balance: with each kind weighing on its own, plates, heal and gun came much less and the thief won ~28%)
      thief: { plate: 3, special: 3, heal: 3, gun: 5 },
      specials: { bomb: 3, oil: 2, spikes: 2, smoke: 2 },
    },
  },
  // Curves (Delivery 6): gentle ones call for ◀ ▶, sharp ones call for braking
  curves: {
    straightStart: 300, // m
    straightMin: 150,
    straightMax: 350,
    lengthMin: 150,
    lengthMax: 300,
    sharpChance: 1 / 3,
    sharpRadius: [130, 180] as const,
    gentleRadius: [350, 600] as const,
    ramp: 0.25, // fraction of the length at each end (smooth entry/exit)
    bumpClearance: 20, // m of clearance from speed bumps
    grip: 6, // m/s² — above this it skids
    driftGain: 0.5, // outward drift (m/s) per m/s² of lateral acceleration
    skidGain: 1.5, // extra drift above grip
    skidSteer: 0.5, // fraction of ◀ ▶ left while skidding
  },
  // V2 part 1: coins earned per finished match (spec 2026-10-07-v2-parte1-perfil-moedas-design.md §3)
  rewards: {
    secondsPerCoin: 3,
    timeMax: 30,
    damagePerCoin: 4,
    damageMax: 25,
    perBox: 2,
    winMultiplier: 2,
    welcomePerRecord: 50, // one-time credit per record already in the local ranking
  },
  track: { bumpEvery: 400, bumpJitter: 80, bumpLanes: 2, jumpTime: 0.6, jumpHeight: 0.9, bumpSpeedLoss: 0.25, firstBumpAfter: 150 },
} as const;
