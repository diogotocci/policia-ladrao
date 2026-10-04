# Entrega 2 — Combate: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Regra do projeto (AGENTS.md §2):** o agente não commita. Cada "Checkpoint" vira um commit no script `scratch/NN-*.ps1` gerado pela skill `ship-via-script` no fim.

**Goal:** Partida jogável de verdade: o adversário controlado pela IA corre junto, a polícia atira com mira automática, as batidas tiram vida, a distância muda o dano e liga o turbo, a polícia nunca ultrapassa, e a partida termina com vitória ou derrota.

**Architecture:** Tudo que é regra fica em `src/sim` (puro e determinístico): funções pequenas de regra (`rules.ts`), colisões, projéteis, IA e partida, orquestradas por `stepWorld`. O render ganha o carro adversário, os tiros e os efeitos de impacto. A UI ganha um HUD mínimo e a tela de fim (as telas completas e o ranking ficam na entrega 5).

**Tech Stack:** a mesma da entrega 1 (TypeScript 7, Vite 8, Three.js 0.186, Vitest 5 + jsdom, Playwright 1.63, pnpm 12).

**Spec:** `docs/superpowers/specs/2026-10-03-policia-ladrao-design.md` (§2 partida, §4 combate, §6 HUD, §12 entrega 2)

## Global Constraints

- Valores copiados da spec, todos em `src/config/balance.ts`:
  - vida 100;
  - tiro da polícia: cadência 0,8 s, dano 1;
  - tiro do ladrão: 1 a cada 1,2 s, bloqueado abaixo de 8 m/s;
  - projétil a 300 m/s, alcance 150 m;
  - cone: frontal ±35° mais laterais até 90° (na prática, o semiplano à frente/ao lado dentro de 150 m);
  - batida polícia×ladrão: ladrão −5, polícia −3;
  - cenário: −5;
  - imunidade de 1 s por par (carro, fonte);
  - batida reduz a velocidade em 30%;
  - fator de distância: 1 até 40 m, linear até 0 em 150 m;
  - turbo: d > 60 m, linear até +35% em 150 m;
  - nível sobe a cada 30 s, até 10;
  - empate no mesmo passo → vence o ladrão.
- A polícia nunca ultrapassa: `s_polícia ≤ s_ladrão`. Na mesma faixa (sobreposição lateral), fica no mínimo 1 comprimento atrás e, se chegar mais rápida, bate. Em faixa diferente, no máximo emparelha. Continua atirando.
- Nesta entrega o ladrão **não tem arma** (ela vem das caixinhas na entrega 3). O código da arma traseira e o bloqueio abaixo de 8 m/s entram agora, ligados por `hasGun`.
- `src/sim` continua sem `three`, `document` ou `window` (o teste de pureza já cobre).
- Código e commits em inglês; textos da UI em português.

## Review Focus

1. **Ladrão parado ou freando forte** (jogador tentando trapacear): a polícia para atrás ou ao lado, nunca à frente, e continua acertando → teste em Task 4 e cenário IA×jogador em Task 8.
2. **Batida contínua** (carros encostados por vários passos): só 1 dano por segundo por par → teste de imunidade em Task 3.
3. **Fim de partida**: depois de alguém chegar a 0, nada mais muda (vida, tempo, tiros), e o input é ignorado → teste em Task 7.
4. **Projétil que erra**: o alvo desvia lateralmente durante o voo e o tiro passa → teste em Task 5.
5. **Partida IA × IA termina sempre** (nenhum impasse eterno), nos dois lados, com várias sementes → teste headless em Task 7.

---

### Task 1: Regras puras e números

**Files:**
- Modify: `src/config/balance.ts`
- Create: `src/sim/rules.ts`, `tests/sim/rules.test.ts`

**Interfaces:**
- Produces, em `BALANCE`: `hp: 100`, `combat: { policeFireInterval: 0.8, policeDamage: 1, thiefFireInterval: 1.2, thiefDamage: 1, thiefMinSpeedToFire: 8, projectileSpeed: 300, range: 150, frontConeDeg: 35, sideConeDeg: 90, falloffStart: 40, falloffEnd: 150 }`, `collision: { carCarThief: 5, carCarPolice: 3, scenery: 5, immunity: 1, speedLoss: 0.3, pushBack: 0.4 }`, `catchUp: { start: 60, end: 150, maxBonus: 0.35 }`, `difficulty: { levelEvery: 30, maxLevel: 10 }`.
- Produces, em `rules.ts`:
  ```ts
  export function distanceFactor(d: number): number;      // 1 ≤40, linear → 0 em 150, 0 além
  export function catchUpBonus(d: number): number;        // 0 ≤60, linear → 0.35 em 150, 0.35 além
  export function armorFactor(plates: number): number;    // 1 - 0.15*min(plates,3)
  export function inFireCone(shooter: {s:number;x:number}, target: {s:number;x:number}, facing: 'front'|'rear'): boolean;
  export function levelAt(timeSeconds: number): number;   // 1 + floor(t/30), máx 10
  ```

- [ ] **Step 1:** Testes com os valores da spec:
  - `distanceFactor(0)=1`, `(40)=1`, `(95)=0.5`, `(150)=0`, `(300)=0`;
  - `catchUpBonus(60)=0`, `(105)≈0.175`, `(150)=0.35`, `(400)=0.35`;
  - `armorFactor(0)=1`, `(3)=0.55`, `(5)=0.55`;
  - `inFireCone`: alvo 20 m à frente na mesma faixa → true; alvo ao lado (ds=0, dx=3) → true; alvo 5 m atrás → false (front); 160 m à frente → false; facing 'rear': alvo 20 m atrás → true;
  - `levelAt(0)=1`, `(29.9)=1`, `(30)=2`, `(1000)=10`.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): combat rules and balance values`

### Task 2: Mundo com dois carros

**Files:**
- Modify: `src/sim/car.ts`, `src/sim/world.ts`, `tests/sim/car.test.ts`, `tests/sim/world.test.ts`, `src/game.ts`, `src/debug.ts`, `e2e/foundation.spec.ts` (só o que quebrar)

**Interfaces:**
- `CarState` ganha `hp: number`, `hasGun: boolean`, `fireCooldown: number`.
- `stepCar(car, intents, dt, opts?: { speedBonus?: number })`: o cruzeiro vira `cruise * (1 + speedBonus)`. Acima do alvo (quando o turbo desliga), desacelera em `accel`, sem frear bruscamente.
- `WorldState`:
  ```ts
  { seed; time; level: number; playerRole: Role;
    player: CarState; opponent: CarState;          // mantém `player` (e2e e render já usam)
    projectiles: Projectile[]; immunity: Record<string, number>;
    events: GameEvent[];                            // eventos do último passo (render/áudio/HUD)
    match: { over: boolean; winner?: Role; endTime?: number } }
  ```
- Helpers: `policeOf(w)`, `thiefOf(w)`.
- `createWorld({ seed, playerRole, debugHp? })`:
  - ladrão nasce na faixa 2, s = 40;
  - polícia na faixa 1, s = 0;
  - `debugHp` (só testes e `?debug`) sobrescreve a vida inicial dos dois: `{ police?: number; thief?: number }`.
- `GameEvent` (união discriminada por `type`): `hit {target: Role; amount; s; x}`, `crash {a: Role | 'scenery'; b: Role | 'scenery'; s; x}`, `shot {from: Role; s; x}`, `noTarget {from: Role}`, `end {winner: Role}`.
- `WorldState` ganha também `aiRng: number` (estado do RNG da IA; ver Task 6).

- [ ] **Step 1:** Testes:
  - os dois carros nascem com 100 de vida e com as posições acima;
  - `player` é o carro do papel escolhido;
  - `speedBonus = 0.35` leva a polícia a 33 × 1,35;
  - ao zerar o bônus, a velocidade volta ao cruzeiro sem ficar abaixo dele.
- [ ] **Step 2:** FAIL → implementar → PASS. Ajustar o render/e2e da entrega 1 que lia só `player`, sem mudar o comportamento.
- [ ] **Checkpoint:** `feat(sim): world with player and opponent cars`

### Task 3: Colisões e imunidade

**Files:**
- Create: `src/sim/collisions.ts`, `tests/sim/collisions.test.ts`

**Interfaces:**
- `resolveCollisions(w: WorldState): WorldState`, chamada a cada passo depois do movimento:
  - **Cenário:** um carro que passa a tocar a borda (`touchingEdge` false→true, ou true com a imunidade vencida) leva −5, perde 30% da velocidade e é empurrado 0,4 m para dentro. Chave de imunidade `edge:<role>`.
  - **Carro × carro:** as caixas `(s ± length/2, x ± halfWidth)` se sobrepõem → ladrão −5 × `armorFactor(0)`, polícia −3, os dois perdem 30%. Separação: na mesma faixa, a polícia vai para 1 comprimento atrás; lado a lado, os dois são empurrados lateralmente até não sobrepor. Chave `cars`.
  - Emite os eventos `crash` e `hit`.

- [ ] **Step 1:** Testes:
  - encostar na borda tira 5 uma vez; ficar encostado 1 s tira só mais 5 depois de 1 s (não 60×);
  - a velocidade cai 30%;
  - x volta 0,4 m para dentro;
  - polícia e ladrão sobrepostos → 95 / 97, e a polícia fica 1 comprimento atrás (mesma faixa);
  - lado a lado sobrepostos → separados lateralmente, com a mesma perda de vida;
  - nova sobreposição dentro de 1 s não tira vida.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): car and scenery collisions with immunity`

### Task 4: A polícia nunca ultrapassa + turbo

**Files:**
- Create: `src/sim/pursuit.ts`, `tests/sim/pursuit.test.ts`

**Interfaces:**
- `pursuitBonus(w): number` = `catchUpBonus(d)` se a polícia está atrás, senão 0. É usado no `stepCar` da polícia.
- `enforceNoOvertake(w): WorldState`, depois das colisões:
  - se `s_polícia > s_ladrão`, então `s_polícia = s_ladrão` e `speed_polícia = min(speed_polícia, speed_ladrão)`;
  - se há sobreposição lateral, `s_polícia ≤ s_ladrão − length`, e chegar lá mais rápida conta como colisão (via `resolveCollisions`).

- [ ] **Step 1:** Testes:
  - polícia em outra faixa, mais rápida e emparelhada, nunca fica com `s` maior que o do ladrão;
  - ladrão freando até parar com a polícia ao lado → a polícia para ao lado, com `s` igual ou menor;
  - mesma faixa → a polícia para com centro 1 comprimento atrás (±0,1);
  - em 120 s simulados com um script de intents aleatório (semente fixa) para o ladrão e a polícia sempre acelerando, `s_polícia ≤ s_ladrão` em todos os passos;
  - turbo: d = 105 → bônus 0,175; polícia à frente/emparelhada → 0.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): police never overtakes, catch-up turbo`

### Task 5: Tiros com mira automática

**Files:**
- Create: `src/sim/projectiles.ts`, `tests/sim/projectiles.test.ts`

**Interfaces:**
- `Projectile = { from: Role; s: number; x: number; vs: number; vx: number; age: number; damage: number }`.
- `fireWeapons(w, intents: Record<Role, Intents>, dt): WorldState`:
  - o cooldown cai por dt;
  - com `fire` segurado, `cooldown ≤ 0` e o alvo em `inFireCone`, nasce um projétil mirando a posição prevista do alvo (lead linear: tempo de voo = distância / 300);
  - o dano é fixado no disparo: polícia `1 × distanceFactor(d) × armorFactor(0)`; ladrão `1 × distanceFactor(d)`, só se `hasGun` e `speed ≥ 8`;
  - fora do cone, nada é gasto, mas `events` recebe `{type:'noTarget', from}`.
- `stepProjectiles(w, dt): WorldState`: move os projéteis. Acertam se a caixa do alvo contém o ponto (com margem de 0,2 m), causando dano e evento `hit`. Somem ao passar de 150 m de percurso.

- [ ] **Step 1:** Testes:
  - polícia segurando fire com o ladrão 20 m à frente → 1 disparo a cada 0,8 s (contar em 4 s = 5 disparos, o primeiro em t=0);
  - acerto tira 1 de vida;
  - ladrão a 95 m → o tiro tira 0,5;
  - ladrão fora do cone (atrás) → 0 disparos e evento `noTarget`;
  - ladrão sem arma não atira;
  - com arma e a 5 m/s → não atira; a 10 m/s → atira na polícia atrás;
  - o alvo desvia 3 m lateralmente durante o voo → o tiro erra;
  - o projétil some depois de 150 m.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): auto-aimed projectiles with falloff`

### Task 6: IA dos dois lados

**Files:**
- Create: `src/sim/ai.ts`, `tests/sim/ai.test.ts`

**Interfaces:**
- `aiIntents(w: WorldState, role: Role, rng: Rng): Intents`. É pura, dado o rng. A `level` ajusta reação e agressividade.
  - **Polícia IA:** mira a faixa do ladrão. Se `d < 25` e está na mesma faixa, tenta encostar para bater. Senão alinha numa faixa vizinha para atirar pelo lado. `fire` sempre que houver alvo no cone. Evita a borda (não esterça se `|x| > 5`).
  - **Ladrão IA:** troca de faixa em intervalos aleatórios (menores em níveis altos) para fugir do alinhamento. Freia de leve às vezes, quando a polícia está colada atrás, para provocar batida e dano mútuo. Nunca esterça para a borda. Atira se tiver arma.
- O rng da IA vive no mundo: `w.aiRng` (estado numérico serializável) — `createRng` ganha `state()` e `createRngFromState(n)` para o snapshot continuar sendo dado puro.

- [ ] **Step 1:** Testes:
  - polícia IA com o ladrão à frente no cone → `fire: true`;
  - polícia IA perto da borda direita → nunca `right`;
  - ladrão IA com a polícia alinhada atrás → em até 3 s simulados troca de faixa (|Δx| > 2);
  - a mesma semente gera a mesma sequência de intents;
  - nível 10 reage mais rápido que nível 1 (tempo até a primeira troca de faixa menor, média de 20 sementes).
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): police and thief AI`

### Task 7: Passo do mundo e fim da partida

**Files:**
- Modify: `src/sim/world.ts`, `tests/sim/world.test.ts`
- Create: `tests/sim/match.test.ts`

**Interfaces:**
- Ordem em `stepWorld(w, playerIntents, dt)`, a cada passo:
  1. se `match.over`, retorna `w` sem mudanças (nem o tempo anda);
  2. as intents do adversário vêm de `aiIntents`;
  3. os carros andam (`pursuitBonus` na polícia);
  4. `resolveCollisions`;
  5. `enforceNoOvertake`;
  6. `fireWeapons`;
  7. `stepProjectiles`;
  8. `time += dt` e `level = levelAt(time)`;
  9. checa o fim: vida ≤ 0 → `over`, `winner` (empate → ladrão), `endTime = time`, evento `end`.
- `events` é zerado no começo de cada passo.

- [ ] **Step 1:** Testes:
  - com `debugHp {thief: 1}` e a polícia atirando colada, a partida acaba, `winner: 'police'` e `endTime` igual ao tempo daquele passo;
  - depois do fim, mais 100 passos não mudam nada (`toEqual`);
  - empate (os dois com 3 e uma batida que tira 5/3 no mesmo passo) → `winner: 'thief'`;
  - `level` vale 2 em t = 30 s;
  - IA × IA (o jogador também controlado por `aiIntents`): para sementes 1..5 e cada papel, a partida termina em menos de 10 min simulados;
  - determinismo: mesma semente e mesmas intents → mesmo estado em 3600 passos.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): full world step, difficulty level and match end`

### Task 8: Render do combate

**Files:**
- Modify: `src/game.ts`
- Create: `src/render/combatFx.ts`, `tests/render/combatFx.test.ts`

**Interfaces:**
- O adversário usa `createCarModel(opponentRole)` (com reflexos e sombra de contato, como o jogador) e é interpolado como o jogador.
- `createCombatFx(scene): { update(w: WorldState, prev: WorldState, alpha: number, originS: number): void }`:
  - **Projéteis:** um pool fixo de 32 traçadores (cilindros finos e emissivos, amarelos para a polícia, laranja para o ladrão), escondidos quando livres.
  - **Eventos:** `hit` gera faíscas, um pool de 64 partículas `Points` que vivem 0,3 s. `crash` gera faíscas maiores e um pequeno tremor de câmera (0,2 s, amplitude 0,15 m).
  - Nada é criado por frame.

- [ ] **Step 1:** Testes (Node, sem WebGL):
  - com 5 projéteis no mundo, 5 traçadores visíveis e 27 escondidos;
  - com 40 projéteis, só 32 visíveis (sem crescer o pool);
  - um evento `hit` deixa faíscas visíveis, e 0,4 s depois nenhuma;
  - o número de objetos na cena não muda depois de 1000 updates.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(render): opponent car, tracers and hit sparks`

### Task 9: HUD mínimo e tela de fim

**Files:**
- Create: `src/ui/hud.ts`, `src/ui/hud.css`, `tests/ui/hud.test.ts`
- Modify: `src/game.ts`, `src/input/touchButtons.ts` (ATIRAR visível conforme `hasGun`; pisca com `noTarget`)

**Interfaces:**
- `createHud(root, playerRole): { update(w: WorldState): void; dispose(): void }`:
  - topo esquerdo: barra de vida da polícia (azul) e do ladrão (âmbar), com o número;
  - topo centro: cronômetro `mm:ss.d` e a distância em metros, colorida (verde ≤ 40, amarelo ≤ 100, vermelho acima);
  - nível discreto `Nv 3`;
  - mesma linguagem visual dos botões (vidro escuro, sem caixas grandes no meio da tela);
  - no fim, overlay central com "Você venceu!"/"Você perdeu", o motivo ("O ladrão foi detido" / "A viatura foi destruída") e o tempo, mais o botão **Jogar de novo** (recarrega mantendo o papel). Ranking e iniciais ficam na entrega 5.
- O botão ATIRAR fica visível quando o carro do jogador `hasGun`: sempre para a polícia; para o ladrão só com arma, e nesta entrega nunca. Ganha a classe `.no-target` por 0,3 s ao receber `noTarget`.

- [ ] **Step 1:** Testes (jsdom):
  - `formatTime(83.45) === '01:23.4'`;
  - a cor da distância nas 3 faixas;
  - as barras refletem a vida (largura %);
  - o overlay aparece só com `match.over`, com o texto certo para cada papel e vencedor;
  - o botão "Jogar de novo" existe e tem rótulo acessível.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(ui): minimal combat HUD and end overlay`

### Task 10: e2e do combate

**Files:**
- Modify: `e2e/foundation.spec.ts` (mantém), `src/main.ts` (`?thiefHp=`, `?policeHp=` só com `?debug`)
- Create: `e2e/combat.spec.ts`

- [ ] **Step 1:** Testes (qualidade baixa nos de comportamento; espera por tempo de simulação):
  - polícia segurando Espaço por 4 s simulados → a vida do ladrão cai;
  - jogando de ladrão por 20 s simulados → em todos os snapshots (polling a cada 100 ms), `police.s ≤ thief.s`;
  - jogando de ladrão e freando até parar → a polícia para atrás ou ao lado e a vida do ladrão continua caindo;
  - `?debug&thiefHp=2` com a polícia atirando → aparece "Você venceu!", e "Jogar de novo" recarrega;
  - screenshot do combate (qualidade alta) com o HUD;
  - nenhum erro/aviso do app no console.
- [ ] **Step 2:** FAIL → implementar o que faltar → PASS nos dois projetos.
- [ ] **Checkpoint:** `test(e2e): combat flows`

### Task 11: Verificação, revisão e entrega

- [ ] **Step 1:** `verification-before-completion`: `pnpm typecheck && pnpm test && pnpm build && pnpm e2e`, com a saída colada.
- [ ] **Step 2:** `requesting-code-review` na branch inteira (revisor novo), com o Review Focus acima.
- [ ] **Step 3:** `ship-via-script`: branch `feat/combat`, um commit por Checkpoint, PR "feat: combat — AI opponent, auto-aim shooting, collisions, match end".
