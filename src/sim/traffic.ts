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

  // move e troca de faixa — da frente para trás: cada carro já conhece a nova posição de quem vai à frente.
  // Nunca atravessa outro (segue o da frente na mesma faixa) e só troca de faixa com espaço livre.
  const L = BALANCE.car.length;
  const overlapsLane = (o: TrafficCar, x: number) => sameLane(o.x, x) || sameLane(o.targetX, x);
  const order = [...w.traffic].sort((a, b) => b.s - a.s || a.id - b.id);
  const moved: TrafficCar[] = [];
  for (const t of order) {
    let targetX = t.targetX;
    if (Math.abs(t.x - targetX) < 0.01 && rng.next() < T.laneChangePerSecond * dt) {
      const lane = LANES.indexOf(targetX as (typeof LANES)[number]);
      const options = [lane - 1, lane + 1].filter((l) => l >= 0 && l < LANES.length);
      const pick = LANES[options[rng.int(0, options.length - 1)]!]!;
      const free =
        ![...moved, ...order].some((o) => o.id !== t.id && overlapsLane(o, pick) && Math.abs(o.s - t.s) < T.minGap) &&
        ![police, thief].some((g) => sameLane(g.x, pick) && Math.abs(g.s - t.s) < T.minGap);
      if (free) targetX = pick;
    }
    const dx = targetX - t.x;
    let x = t.x + Math.sign(dx) * Math.min(Math.abs(dx), T.laneChangeSpeed * dt);
    // não fecha ninguém que esteja do lado (outro carro, polícia ou ladrão)
    const L0 = BALANCE.car.length + 0.5;
    if (dx !== 0 && ([...moved, ...order.filter((o) => o.id !== t.id && !moved.some((m) => m.id === o.id)), police, thief] as { s: number; x: number }[]).some((o) => Math.abs(o.s - t.s) < L0 && Math.abs(o.x - x) < 2 * BALANCE.car.halfWidth && Math.abs(o.x - t.x) >= Math.abs(o.x - x)))
      x = t.x;
    // quem vai à frente na mesma faixa (já movido neste passo) — inclusive polícia e ladrão parados/freando (cenas do fim)
    let leader: { s: number; speed: number } | undefined;
    for (const o of moved) if ((overlapsLane(o, x) || overlapsLane(o, targetX)) && o.s >= t.s && (!leader || o.s < leader.s)) leader = o;
    for (const g of [police, thief]) if ((sameLane(g.x, x) || sameLane(g.x, targetX)) && g.s >= t.s && (!leader || g.s < leader.s)) leader = g;
    let s = t.s + t.speed * dt;
    if (leader) {
      const gap = leader.s - t.s;
      if (gap < T.minGap) s = Math.min(s, t.s + Math.min(t.speed, leader.speed) * dt); // segue no ritmo do da frente
      s = Math.min(s, leader.s - (L + 1)); // nunca encosta
      s = Math.max(t.s - 0.0, s); // não anda para trás
    }
    moved.push({ ...t, s, x, targetX });
  }
  let cars: TrafficCar[] = moved.sort((a, b) => a.id - b.id);

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
      [police, thief].some((g) => sameLane(g.x, x) && Math.abs(g.s - s) < T.minGapToGameCar) ||
      [...w.boxes, ...w.bombs].some((o) => sameLane(o.x, x) && Math.abs(o.s - s) < T.minGapToItem);
    if (tooClose) continue;
    const speed = BALANCE.movement.cruise.police * rng.range(T.speedMin, T.speedMax);
    cars.push({ id: nextId++, s, x, speed, targetX: x, model: rng.int(0, 3) });
  }

  return { ...w, traffic: cars, nextTrafficId: nextId, trafficRng: rng.state() };
}
