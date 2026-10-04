# Entrega 3 — Mundo: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Regra do projeto (AGENTS.md §2):** o agente não commita; os Checkpoints viram commits no script `scratch/NN-*.ps1` (skill `ship-via-script`).

**Goal:** A rua ganha vida e estratégia: retrovisor para quem joga de ladrão, quebra-molas com pulo, tráfego que bloqueia tiros e causa batidas, caixinhas azuis e vermelhas com todos os itens da spec, e bombas.

**Architecture:** Mantém o padrão das entregas anteriores. Regras novas em módulos puros de `src/sim`:
- `track.ts`: quebra-molas;
- `traffic.ts`;
- `items.ts`: caixinhas e efeitos;
- `bombs.ts`.

Todos encadeados no `stepWorld`. O estado novo de cada carro fica em `CarState.upgrades`. O render ganha modelos e pools para tráfego, caixinhas, bombas e quebra-molas, além do retrovisor.

**Tech Stack:** a mesma (TypeScript 7, Vite 8, Three.js 0.186, Vitest 5, Playwright 1.63, pnpm 12).

**Spec:** `docs/superpowers/specs/2026-10-03-policia-ladrao-design.md` (§3 quebra-molas e tráfego, §4.1 tráfego bloqueia tiros, §4.2 tabela, §5 caixinhas e itens, §6 retrovisor e botão 💣, §12 entrega 3)

## Global Constraints

Valores copiados da spec, todos em `BALANCE`:

- **Quebra-molas** (revisado): a cada 400 m ± 80 m, em 2 faixas vizinhas sorteadas, desviável. Quem passa por cima salta 0,6 s, perde 25% da velocidade e não acelera no ar (direção continua); recupera ao aterrissar. No ar não pega caixinha nem ativa bomba; colisões com carros continuam valendo.
- **Tráfego:** 2–4 carros visíveis no nível 1, a 50–70% do cruzeiro, trocando de faixa às vezes, +8% de densidade por nível. Bater no tráfego tira −5 (igual cenário) e o tráfego bloqueia tiros, exceto com Tiro perfurante.
- **Caixinhas:**
  - a cada 300 m ± 60 m, faixa aleatória, nunca sobre quebra-molas;
  - no máximo 2 visíveis;
  - cor 50/50, tendendo até 65/35 para quem tem menos vida;
  - própria cor → item sorteado do grupo; outra cor → −2 e a caixinha some;
  - itens permanentes no máximo saem do sorteio.
- **Itens da polícia:**
  - cadência −0,1 s (mín. 0,3);
  - potência +0,5 (máx. 3);
  - vida +3;
  - nitro +40% por 3 s;
  - aríete: 3 cargas, ladrão −8 / polícia −1;
  - helicóptero: 8 s sem queda por distância;
  - perfurante: 10 s atravessando o tráfego.
- **Itens do ladrão:**
  - titânio +1 placa (máx. 3; −15% cada no tiro e na batida da polícia);
  - bomba +1 (máx. 3);
  - vida +3;
  - arma traseira: 1ª libera (1,2 s), seguintes −0,15 s (mín. 0,6).
- **Bomba:** o botão 💣 aparece só com estoque. A bomba fica 20 s no chão, atrás do ladrão, e tira −10 na polícia se ela passar por cima sem estar no ar. O tráfego passa sem efeito.
- **Retrovisor:** câmera traseira no topo central, ativa quando o adversário está atrás do jogador.
- Vida máxima 100; `src/sim` continua puro.

## Review Focus

1. **Pulo no quebra-molas sobre caixinha/bomba**: no ar não pega nem explode; ao aterrissar depois dela, também não → teste em Task 2 e Task 6. **Passar pela beirada** do quebra-molas (carro meio dentro da faixa coberta) conta como passar por cima → teste em Task 2.
2. **Item no máximo**: nunca sorteia de novo, e a vida nunca passa de 100 → testes em Task 4.
3. **Tráfego nascendo dentro de um carro** (polícia ou ladrão) ou em cima de caixinha/bomba → teste de spawn em Task 3.
4. **Muitos efeitos temporários ao mesmo tempo** (nitro + helicóptero + perfurante): durações independentes, e pegar de novo renova em vez de somar → teste em Task 4.
5. **Partida IA × IA com itens e tráfego** continua terminando, e o ladrão agora vence às vezes → teste em Task 7.

---

### Task 1: Retrovisor

**Files:**
- Create: `src/render/rearview.ts`, `tests/render/rearview.test.ts`
- Modify: `src/game.ts`, `src/ui/hud.css` (moldura)

**Interfaces:**
- `rearviewRect(cssW: number, cssH: number): { x: number; y: number; w: number; h: number }`: 28% da largura, proporção 3:1, centralizado no topo, abaixo do HUD central (y = 64 px + safe area).
- `isBehind(player: CarState, foe: CarState): boolean`: verdadeiro quando `foe.s < player.s − 2`.
- `createRearview(): { camera: THREE.PerspectiveCamera; render(renderer, scene, car, originS, cssW, cssH): void }`:
  - câmera no teto do carro olhando para trás, FOV 50, far 160;
  - desenha com `setScissor`/`setViewport` no retângulo e restaura o viewport cheio;
  - moldura em DOM (`.rearview-frame`) com borda de vidro, alinhada ao mesmo retângulo.

- [ ] **Step 1:** Testes:
  - `rearviewRect(844, 390)`: largura ≈ 236, altura ≈ 79, centralizado;
  - `isBehind` nos casos atrás, ao lado e à frente;
  - a câmera do retrovisor fica atrás/acima do carro e olha para +z (para trás).
- [ ] **Step 2:** FAIL → implementar → PASS. Só renderiza quando `isBehind` (jogando de polícia quase nunca). Em qualidade `low` atualiza a cada 2 frames.
- [ ] **Checkpoint:** `feat(render): rear-view mirror when the opponent is behind`

### Task 2: Quebra-molas e pulo

**Files:**
- Create: `src/sim/track.ts`, `tests/sim/track.test.ts`
- Modify: `src/sim/car.ts` (`airTime`), `src/sim/world.ts`, `src/config/balance.ts`

**Interfaces:**
- `BALANCE.track = { bumpEvery: 400, bumpJitter: 80, bumpLanes: 2, jumpTime: 0.6, jumpHeight: 0.9, bumpSpeedLoss: 0.25 }`.
- `Bump = { s: number; lanes: [number, number] }` (índices de faixas vizinhas: 0-1, 1-2 ou 2-3); `bumpsBetween(seed, s0, s1): Bump[]` determinístico. Bloco k = [400k, 400k+400) com 1 quebra-molas em `400k + 200 ± 80`. Nenhum antes de s = 150.
- `bumpXRange(b): [xMin, xMax]` = da borda esquerda da 1ª faixa à direita da 2ª (3 m por faixa).
- `CarState.airTime` (s restantes no ar). `stepJump(car, prevS, seed, dt)`: o carro **no chão** cruza um quebra-molas com a caixa lateral `x ± halfWidth` sobrepondo `bumpXRange` → `airTime = 0.6` e `speed *= 0.75`. No ar só desconta. `stepCar` não acelera enquanto `airTime > 0` (frear e esterçar continuam).
- `jumpHeight(airTime): number`: parábola, 0 nas pontas e 0,9 m no meio.

- [ ] **Step 1:** Testes:
  - `bumpsBetween` é determinístico, com espaçamento entre 240 e 560 m, nenhum antes de 150, e sempre 2 faixas vizinhas;
  - passar por cima: salta 0,6 s e a velocidade cai 25% no ato;
  - no ar não sobe;
  - depois de aterrissar, volta ao cruzeiro em ~1 s;
  - passar numa faixa livre do mesmo quebra-molas: nada acontece;
  - passar pela beirada (metade do carro sobre a faixa coberta) conta;
  - cruzar outro no ar não reinicia o pulo nem tira mais velocidade;
  - `jumpHeight(0.3) = 0.9`, `jumpHeight(0) = 0`.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): speed bumps and jumps`

### Task 3: Tráfego

**Files:**
- Create: `src/sim/traffic.ts`, `tests/sim/traffic.test.ts`
- Modify: `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/collisions.ts`, `src/sim/projectiles.ts`, `src/config/balance.ts`

**Interfaces:**
- `TrafficCar = { id: number; s; x; speed; targetX; model: 0|1|2|3 }`; `WorldState.traffic: TrafficCar[]`, `WorldState.nextTrafficId`, `WorldState.trafficRng`.
- `BALANCE.traffic = { baseCount: 3, perLevel: 0.08, speedMin: 0.5, speedMax: 0.7, spawnAhead: [120, 240], despawnBehind: 80, laneChangeChance: 0.15 }`.
- `stepTraffic(w, dt)`:
  - move, troca de faixa ocasional (suave, 3 m/s);
  - remove carros > 80 m atrás do mais atrasado entre polícia e ladrão;
  - mantém `round(baseCount × (1 + perLevel × (level−1)))` carros, nascendo entre 120 e 240 m à frente do mais adiantado;
  - nunca nasce a menos de 12 m de outro carro, na mesma faixa de um carro do jogo a menos de 40 m, nem sobre caixinha ou bomba.
- **Colisão** jogador×tráfego: −5, −30% de velocidade, imunidade `traffic:<role>`, o tráfego empurrado/freado.
- **Projéteis:** um tráfego no caminho absorve o tiro (evento `blocked`), exceto com perfurante (Task 4).

- [ ] **Step 1:** Testes:
  - a quantidade no nível 1 é 3 e no nível 10 é 5;
  - o tráfego anda entre 50 e 70% do cruzeiro;
  - spawn nunca a menos de 12 m de outro carro nem na faixa do jogador a menos de 40 m (1000 spawns com sementes variadas);
  - bater num tráfego tira 5 uma vez por segundo;
  - um tiro com um tráfego entre a polícia e o ladrão não chega ao ladrão e gera `blocked`;
  - os que ficam para trás somem;
  - é determinístico.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): traffic that blocks shots and causes crashes`

### Task 4: Caixinhas e itens

**Files:**
- Create: `src/sim/items.ts`, `tests/sim/items.test.ts`
- Modify: `src/sim/car.ts` (`upgrades`), `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/projectiles.ts`, `src/sim/collisions.ts`, `src/sim/pursuit.ts`, `src/config/balance.ts`

**Interfaces:**
- `Upgrades = { fireInterval: number; power: number; plates: number; bombs: number; ramCharges: number; nitroUntil: number; heliUntil: number; pierceUntil: number }`. A polícia nasce com `fireInterval 0.8, power 1`; o ladrão com `fireInterval 1.2`, sem arma.
- `Box = { id; s; x; color: 'blue' | 'red' }`; `WorldState.boxes`, `nextBoxAt`, `itemRng`.
- `BALANCE.items` = valores da spec, mais os pesos: polícia `{fireRate 3, power 3, heal 3, nitro 2, ram 2, heli 2, pierce 2}`, ladrão `{plate 3, bomb 3, heal 3, gun 3}`.
- `colorChance(policeHp, thiefHp): number` (probabilidade de azul): 0,5 com vidas iguais, movendo-se linearmente até 0,35/0,65 com 50 de diferença.
- `rollItem(role, car, rng): ItemId | null` exclui os permanentes no máximo (e a vida cheia).
- `applyItem(car, item, time): CarState`. Pegar de novo um item temporário renova o fim, não soma.
- `stepBoxes(w)`: spawn, máximo 2 visíveis, coleta (sobreposição e carro no chão), evento `pickup {role, item | 'wrong'}`.
- **Efeitos ligados:**
  - `fireWeapons` usa `upgrades.fireInterval`, `power`, a armadura do alvo (`plates`) e o helicóptero (fator 1);
  - colisões usam o aríete (−8 / −1, consome carga) e a armadura;
  - nitro soma +0,40 ao `speedBonus`;
  - perfurante ignora o tráfego.

- [ ] **Step 1:** Testes:
  - `colorChance(100,100)=0.5`, `(50,100)` → 0,65 para a polícia (vermelha 0,35), `(100,50)` → 0,35;
  - no máximo 2 caixinhas visíveis;
  - nunca sobre um quebra-molas (±6 m);
  - pegar a da própria cor aplica um item; a da outra tira 2;
  - no ar não pega;
  - cada item da tabela com o efeito e o limite exatos:
    - cadência 0,8 → 0,3 em 5 coletas, sem passar disso;
    - potência até 3;
    - vida até 100;
    - arma: 1ª libera, depois −0,15 até 0,6;
    - 3 placas → tiro da polícia ×0,55 e batida ×0,55, sem efeito no cenário;
  - `rollItem` exclui os itens no máximo (1000 sorteios);
  - nitro+heli+perfurante juntos expiram cada um no seu tempo, e pegar o nitro de novo renova para 3 s;
  - aríete: 3 batidas a −8/−1, a 4ª volta a −5/−3.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): item boxes and all police/thief items`

### Task 5: Bombas

**Files:**
- Create: `src/sim/bombs.ts`, `tests/sim/bombs.test.ts`
- Modify: `src/sim/world.ts`, `src/sim/types.ts`

**Interfaces:**
- `Bomb = { id; s; x; expiresAt }`; `WorldState.bombs`.
- `dropBomb(w, intents)`: intent `bomb` com borda de subida (só ao apertar, não segurando), estoque > 0 → bomba em `thief.s − 3` e evento `bombDropped`.
- `stepBombs(w)`: a polícia no chão sobre a bomba (caixas se sobrepõem) leva −10, e a bomba explode (evento `explosion`). Expira em 20 s.

- [ ] **Step 1:** Testes:
  - segurar `bomb` por 1 s solta só 1;
  - sem estoque, nada;
  - a polícia passando por cima leva −10 uma vez;
  - no ar passa ilesa e a bomba continua;
  - o tráfego não detona;
  - some depois de 20 s.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): thief bombs`

### Task 6: IA usa o mundo

**Files:**
- Modify: `src/sim/ai.ts`, `tests/sim/ai.test.ts`

**Interfaces:** `aiStep` passa a considerar:
- **caixinhas:** escolhe a faixa de uma da própria cor a até 120 m à frente; evita as da outra cor; melhor em níveis altos;
- **tráfego:** troca de faixa se houver um a menos de 35 m à frente na sua faixa;
- **quebra-molas:** desvia para uma faixa livre quando há um a menos de 60 m à frente (acerta mais em níveis altos; no nível 1 desvia ~50% das vezes);
- **bombas:** a polícia desvia; o ladrão solta bomba quando a polícia está alinhada atrás a menos de 50 m (chance cresce com o nível).

- [ ] **Step 1:** Testes:
  - a IA desvia de um tráfego parado à frente (sem batida em 5 s);
  - no nível 10 a IA desvia de ≥ 90% dos quebra-molas (100 sorteados); no nível 1, entre 30% e 70%;
  - a polícia IA desvia de uma bomba na sua faixa;
  - o ladrão IA vai buscar uma caixinha vermelha na faixa vizinha;
  - o ladrão IA com bomba e a polícia alinhada atrás solta a bomba em até 3 s.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(sim): AI handles traffic, boxes and bombs`

### Task 7: Passo do mundo, equilíbrio e pendências da entrega 2

**Files:**
- Modify: `src/sim/world.ts`, `tests/sim/match.test.ts`, `src/sim/collisions.ts`, `src/input/keyboard.ts`, `src/render/combatFx.ts`

**Interfaces:** ordem em `stepWorld`:
1. IA;
2. movimento (turbo + nitro);
3. pulo;
4. tráfego;
5. colisões (carros, tráfego, cenário);
6. não-ultrapassar;
7. caixinhas;
8. bombas;
9. tiros (só se ninguém está com vida ≤ 0);
10. projéteis;
11. tempo/nível;
12. fim.

Pendências da entrega 2 resolvidas aqui:
- quem zerou a vida neste passo não atira mais (tiros e acertos pulados);
- o carro empurrado de lado para 1 cm antes da borda (sem dano de parede gratuito);
- Espaço não aciona o fogo quando o foco está num botão;
- os traçadores somem na tela de fim.

- [ ] **Step 1:** Testes:
  - um carro zerado por batida não dispara no mesmo passo;
  - empurrado contra a borda, não leva dano de cenário;
  - IA × IA com itens e tráfego termina em menos de 10 min para sementes 1..8 nos dois papéis, e o ladrão vence pelo menos 1 das 16;
  - determinismo em 3600 passos.
- [ ] **Step 2:** FAIL → implementar/ajustar `BALANCE` (só números, registrando no ledger) → PASS.
- [ ] **Checkpoint:** `feat(sim): world step with traffic, items, bombs; M2 leftovers`

### Task 8: Render do mundo

**Files:**
- Create: `src/render/worldProps.ts`, `tests/render/worldProps.test.ts`
- Modify: `src/render/carFactory.ts` (cache de geometria por modelo; placas de titânio visíveis; modelos de tráfego), `src/render/roadChunks.ts` (quebra-molas), `src/game.ts` (pulo: `y = jumpHeight`, leve inclinação)

**Interfaces:**
- `createWorldProps(scene, reflections): { update(w, originS, time): void }`:
  - pool de 8 carros de tráfego, em 4 modelos (sedã, hatch, van, táxi) de cores variadas, com geometria compartilhada;
  - pool de 2 caixinhas: cubo de vidro brilhante azul ou vermelho com "?", girando e flutuando;
  - pool de 3 bombas: esfera escura com pavio e luz piscando;
  - nada é criado por frame.
- **Quebra-molas:** faixa amarela e preta elevada só nas 2 faixas cobertas, nos `s` de `bumpsBetween`, com placa de aviso na calçada 40 m antes.
- **Placas de titânio:** `updateCarModel` mostra `plate-front`, `plate-left` e `plate-right` conforme `upgrades.plates`.

- [ ] **Step 1:** Testes (Node):
  - o pool de tráfego mostra N carros visíveis para N no mundo, até 8;
  - as caixinhas visíveis acompanham `w.boxes`;
  - os modelos de tráfego compartilham a geometria (mesmo `geometry.uuid` entre instâncias do mesmo modelo);
  - placas aparecem 0→3;
  - nenhum objeto novo na cena depois de 1000 updates.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(render): traffic, boxes, bombs, speed bumps, titanium plates`

### Task 9: HUD de itens e botão de bomba

**Files:**
- Modify: `src/ui/hud.ts`, `src/ui/hud.css`, `tests/ui/hud.test.ts`, `src/game.ts`, `src/input/touchButtons.ts`

**Interfaces:**
- **HUD:** ao lado da barra de vida do jogador, ícones dos upgrades permanentes com contador e dos temporários com anel de tempo. Um aviso curto e central-alto ("+ Cadência", "−2 caixinha errada") por 1,2 s ao pegar.
- **Botão 💣:** visível só com `bombs > 0`, com a contagem no canto.
- **Botão ATIRAR do ladrão:** aparece quando ganha a arma; fica esmaecido abaixo de 8 m/s.
- **Vibração** curta ao levar dano (regra da spec §6).

- [ ] **Step 1:** Testes (jsdom):
  - os ícones aparecem conforme os upgrades;
  - o anel do nitro reflete o tempo restante;
  - o aviso aparece e some em 1,2 s;
  - o botão de bomba aparece com estoque e mostra "2";
  - ATIRAR do ladrão é visível com arma e tem `.locked` abaixo de 8 m/s.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(ui): item HUD, bomb button, thief gun state`

### Task 10: e2e do mundo

**Files:** Create `e2e/world.spec.ts`. Modify `src/main.ts` para os parâmetros de debug `?give=` (`gun,bomb,bomb,plate`) e `?traffic=0`.

- [ ] **Step 1:** Testes:
  - o retrovisor aparece jogando de ladrão e não aparece de polícia;
  - passando por cima de um quebra-molas, `airTime > 0` por um instante, a velocidade cai ~25% e volta ao cruzeiro;
  - com `?give=bomb` jogando de ladrão, apertar B solta a bomba e o botão some;
  - com `?give=gun`, o ladrão acerta a polícia;
  - screenshot com tráfego, caixinhas e quebra-molas;
  - nenhum erro/aviso do app.
- [ ] **Step 2:** PASS nos dois projetos.
- [ ] **Checkpoint:** `test(e2e): world flows`

### Task 11: Verificação, revisão e entrega

- [x] **Step 1:** `verification-before-completion`: typecheck, unit, build e e2e, com a saída colada.
- [x] **Step 2:** `requesting-code-review`, com revisor novo e o Review Focus acima.
- [ ] **Step 3:** `ship-via-script`: branch `feat/world`, um commit por Checkpoint, PR "feat: world — rear-view mirror, speed bumps, traffic, item boxes, bombs".
