// Tráfego: poucos carros lentos (50–70% do cruzeiro) que trocam de faixa às vezes, reciclados à frente.
import { BALANCE } from '../config/balance';
import { createRngFromState } from './rng';
import type { TrafficCar, WorldState } from './types';
import { policeOf, thiefOf } from './world';

const LANES = BALANCE.road.laneCenters;

/** Quantos carros de tráfego manter no nível: 3 no 1, +8% por nível. */
export function trafficTarget(level: number): number {
  const t = BALANCE.traffic;
  return Math.round(t.baseCount * (1 + t.perLevel * (level - 1)));
}

const sameLane = (ax: number, bx: number) => Math.abs(ax - bx) < 2 * BALANCE.car.halfWidth;

export function stepTraffic(w: WorldState, dt: number): WorldState {
  const T = BALANCE.traffic;
  const rng = createRngFromState(w.trafficRng);
  const police = policeOf(w);
  const thief = thiefOf(w);
  const back = Math.min(police.s, thief.s);
  const front = Math.max(police.s, thief.s);

  // move e troca de faixa
  let cars: TrafficCar[] = w.traffic.map((t) => {
    let targetX = t.targetX;
    if (Math.abs(t.x - targetX) < 0.01 && rng.next() < T.laneChangePerSecond * dt) {
      const lane = LANES.indexOf(targetX as (typeof LANES)[number]);
      const options = [lane - 1, lane + 1].filter((l) => l >= 0 && l < LANES.length);
      targetX = LANES[options[rng.int(0, options.length - 1)]!]!;
    }
    const dx = targetX - t.x;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), T.laneChangeSpeed * dt);
    return { ...t, s: t.s + t.speed * dt, x: t.x + step, targetX };
  });

  // recicla quem ficou para trás (ou longe demais à frente)
  cars = cars.filter((t) => t.s > back - T.despawnBehind && t.s < front + T.spawnAheadMax + 200);

  // completa até a densidade do nível
  let nextId = w.nextTrafficId;
  const target = w.trafficOn ? trafficTarget(w.level) : 0;
  let attempts = 0;
  while (cars.length < target && attempts < 20) {
    attempts++;
    const s = front + rng.range(T.spawnAheadMin, T.spawnAheadMax);
    const x = LANES[rng.int(0, LANES.length - 1)]!;
    const tooClose =
      cars.some((o) => sameLane(o.x, x) && Math.abs(o.s - s) < T.minGap) ||
      [police, thief].some((g) => sameLane(g.x, x) && Math.abs(g.s - s) < T.minGapToGameCar);
    if (tooClose) continue;
    const speed = BALANCE.movement.cruise.police * rng.range(T.speedMin, T.speedMax);
    cars.push({ id: nextId++, s, x, speed, targetX: x, model: rng.int(0, 3) });
  }

  return { ...w, traffic: cars, nextTrafficId: nextId, trafficRng: rng.state() };
}
