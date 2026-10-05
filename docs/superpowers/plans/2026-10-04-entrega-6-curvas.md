# Entrega 6 — Curvas suaves: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> **Regra do projeto (AGENTS.md §2):** o agente não commita; os Checkpoints viram commits no script `scratch/NN-*.ps1` (skill `ship-via-script`), em branch nova a partir da `main` atualizada.

**Goal:** A rua ganha curvas: as leves pedem só um ajuste no ◀ ▶; as fechadas, com placa de aviso, pedem freio. Rápido demais, o carro derrapa para fora e bate no meio-fio. O freio vira estratégia, para o jogador e para a IA.

**Decisão do usuário (2026-10-04):** "curvas que pedem freio". Curvas leves e algumas fechadas com aviso; escorregar para fora custa −5 no meio-fio; a IA freia melhor nos níveis altos.

**Architecture:**
- **Simulação em coordenadas da pista:** a sim continua em `(s, x)` (distância ao longo da pista, posição lateral).
  - A curva entra como uma **curvatura** `κ(s)` determinística por semente.
  - O efeito na física é uma **deriva lateral para fora** proporcional a `v²·κ`.
  - Com isso, colisões, polícia que nunca ultrapassa, tiros, tráfego, caixinhas e bombas continuam valendo sem mudança.
- **Render:**
  - **Centro da pista:** `trackToWorld(s, x)` integra a curvatura (direção `θ(s) = ∫κ ds`) e devolve posição e direção no mundo.
  - **Malhas:** a rua, as calçadas, os prédios, os postes e todos os objetos passam a ser posicionados por essa função.
  - **Origem móvel:** continua existindo para manter a precisão numérica.

**Tech Stack:** a mesma; nenhuma dependência nova.

## Global Constraints

- **Traçado** (`BALANCE.curves`):
  - os primeiros 300 m são retos;
  - depois se alternam retas (150–350 m) e curvas (150–300 m) para os dois lados;
  - **leves:** raio ≥ 350 m;
  - **fechadas:** raio entre 110 e 160 m, cerca de 1 em cada 3 curvas;
  - entrada e saída suaves (a curvatura cresce e diminui em rampa, sem degrau);
  - curvas nunca coincidem com quebra-molas; caixinhas podem cair nelas.
- **Física da curva:**
  - a aceleração lateral é `a = v²·|κ|`;
  - **até a aderência** (6 m/s²): a deriva para fora é `0,5·a` m/s, e o ◀ ▶ (7 m/s) segura com folga;
  - **acima da aderência (derrapando):** a deriva é `0,5·a + 1,5·(a − 6)` e o ◀ ▶ rende metade;
  - **exemplos com o cruzeiro de 34 m/s:**
    - curva leve (r 400): a ≈ 2,9, tranquilo;
    - curva fechada (r 120): a ≈ 9,6, derrapa;
    - a mesma curva fechada a 25 m/s: a ≈ 5,2, segura.
  - **saída da pista:** derrapar até o meio-fio é a batida de cenário que já existe (−5, −30% de velocidade, empurrão para dentro).
- **Avisos:**
  - placa de curva (setas na direção da curva) 90 m antes de cada curva fechada;
  - a câmera inclina levemente para dentro da curva;
  - derrapando, toca um chiado de pneu e sai fumaça clara das rodas.
- **IA:**
  - olha 70 m à frente e freia para `v_alvo = √(aderência·0,95/κ)`;
  - a habilidade cresce com o nível (no nível 1 freia tarde e às vezes não freia);
  - nunca freia ao ponto de deixar a polícia ultrapassar (a regra de não ultrapassar continua valendo).
- **Desempenho:** < 100 draw calls no passe principal. A rua curva usa os mesmos pedaços reaproveitados (malha refeita só ao reciclar o pedaço).
- **Debug:** `?curves=0` deixa a rua reta. Os e2e antigos rodam com `?curves=0` quando dependem de reta (quebra-molas, retrovisor), para não mudarem.
- `src/sim` continua puro.

## Review Focus

1. **Curvatura contínua:** sem degraus de `κ` nem de direção, e `trackToWorld` contínuo nas emendas dos pedaços (sem buracos na rua) → Tasks 1 e 4.
2. **Física:** abaixo da aderência não há derrapagem; frear numa curva fechada evita o meio-fio; derrapar até o meio-fio custa exatamente −5 (com a imunidade de sempre) → Task 2.
3. **Polícia nunca ultrapassa, inclusive em curva:** a regra é em `s`, não muda → teste IA × IA em Task 3.
4. **Precisão:** depois de 20 km de pista, posições no mundo continuam estáveis (sem tremer) → Task 4.
5. **Partidas IA × IA continuam terminando e equilibradas:** o ladrão vence entre 30% e 70% → Task 8.

---

### Task 1: Traçado (sim)

**Files:** Create `src/sim/curves.ts`, `tests/sim/curves.test.ts`. Modify `src/config/balance.ts`, `src/sim/types.ts` (`curvesOn`), `src/sim/world.ts`.

**Interfaces:**
- `curvatureAt(seed, s): number`: positivo para a direita, negativo para a esquerda, 0 na reta.
- `curvesBetween(seed, s0, s1): Curve[]`, com `Curve = { start; length; radius; dir: -1|1; sharp: boolean }`.
- A rampa de entrada/saída ocupa 25% do comprimento de cada lado.

- [x] **Step 1:** Testes:
  - determinístico;
  - reto até 300 m;
  - leves com r ≥ 350 e fechadas com r entre 110 e 160;
  - cerca de 1/3 fechadas (amostra de 200 curvas);
  - `κ` contínuo (diferença entre amostras de 1 m < 1/(r·20));
  - nenhuma curva sobre quebra-mola (±20 m);
  - `curvesOn = false` → `κ = 0`.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(sim): deterministic gentle and sharp curves`

### Task 2: Física da curva e freio

**Files:** Modify `src/sim/car.ts` (`CarState.skidding`), `src/sim/world.ts`, `tests/sim/car.test.ts` (+ `tests/sim/curvesPhysics.test.ts`).

**Interfaces:**
- `stepCar(car, intents, dt, { speedBonus, curvature })` aplica a deriva e marca `skidding`.
- Evento `skid` (início da derrapagem, para som e efeitos).

- [x] **Step 1:** Testes:
  - reta: nada muda;
  - curva leve a 34 m/s segurando ◀ ou ▶ para dentro: não encosta no meio-fio;
  - curva fechada a 34 m/s sem frear: derrapa e bate (−5) mesmo esterçando para dentro;
  - a mesma curva freando para 25 m/s antes: passa limpa;
  - derrapando, o ◀ ▶ rende metade;
  - no ar (quebra-mola) a deriva continua (sem aderência).
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(sim): cornering drift, grip limit and skids — the brake matters`

### Task 3: IA nas curvas

**Files:** Modify `src/sim/ai.ts`, `tests/sim/ai.test.ts`.

- **Antecipação:** olha 70 m à frente (máximo de `|κ|`) e freia se a velocidade passa de `v_alvo`.
- **Erro no nível 1:** começa a frear 0–40 m atrasada e às vezes não freia (40%).
- **Nível 10:** quase sempre acerta.
- **Polícia:** continua a perseguição normalmente e também freia.

- [x] **Step 1:** Testes:
  - nível 10: em 50 curvas fechadas bate no meio-fio em ≤ 10%;
  - nível 1: bate em 30–70%;
  - IA × IA com curvas sempre termina e a polícia nunca passa o ladrão.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(sim): AI brakes for sharp curves (skill by level)`

### Task 4: Centro da pista no mundo

**Files:** Create `src/render/trackFrame.ts`, `tests/render/trackFrame.test.ts`.

**Interfaces:**
- `createTrackFrame(seed, curvesOn)`, com `toWorld(s, x, originS): { x; z; heading }`, amostras a cada 1 m em cache e interpolação.
- **Origem móvel:** posição relativa a `toWorld(originS, 0)`, sem rotação.

- [x] **Step 1:** Testes:
  - sem curvas, é igual ao mapeamento atual (`z = −(s − originS)`);
  - contínuo (Δ entre s e s+0,1 ≤ 0,11 m);
  - a direção acompanha `∫κ`;
  - `x` é perpendicular à direção;
  - depois de 20 km, variação < 1 mm entre dois cálculos.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(render): track frame — world position and heading along the curves`

### Task 5: Rua, calçadas e prédios curvos

**Files:** Modify `src/render/roadChunks.ts`, `src/render/buildings.ts` (+ testes).

- **Pedaços de rua:** viram faixas dobradas pelo centro da pista (segmentos de 2 m), refeitas ao reciclar.
- **Prédios e postes:** posicionados e girados pela direção local; na parte de dentro das curvas fechadas, recuam para não invadir a calçada.

- [x] **Step 1:** Testes:
  - os vértices da borda de um pedaço batem com os do próximo (sem fresta);
  - os prédios ficam fora da calçada também em curva fechada;
  - o número de meshes não muda.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(render): curved road, sidewalks and buildings`

### Task 6: Tudo no mundo curvo

**Files:** Modify:
- `src/render/carFactory.ts` (`updateCarModel` recebe o frame);
- `worldProps.ts`, `combatFx.ts`, `particles.ts`, `gunner.ts` (mira com a direção do carro), `opponentMarker.ts`, `cameras.ts` (câmera atrás seguindo a direção, inclinando na curva), `rearview.ts`, `scene.ts` (sombra segue o carro);
- `src/game.ts`.

- [x] **Step 1:** Testes por módulo: em curva, carro, tráfego, caixinha, bomba, traçador e fumaça ficam sobre a rua, alinhados à direção.
- [x] **Step 2:** e2e:
  - screenshots numa curva leve e numa fechada;
  - draw calls < 100;
  - zero erros.
- [x] **Checkpoint:** `feat(render): cars, props, effects and cameras follow the curves`

### Task 7: Avisos e sensação

**Files:** Modify `src/render/worldProps.ts` (placa de curva), `src/audio/sfx.ts` + `mixer.ts` (chiado), `src/game.ts` (fumaça das rodas ao derrapar), `src/main.ts` (`?curves=0`).

- [x] **Step 1:** Testes:
  - placa 90 m antes de toda curva fechada, com as setas para o lado certo;
  - evento `skid` toca o chiado (limitado);
  - fumaça sai das rodas derrapando.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat: curve warnings, tyre squeal and skid smoke`

### Task 7b: Extras aprovados junto (playtest)

**Files:** Create `src/ui/feedback.ts`, `src/ui/splash.ts`, `src/render/heli.ts`, `public/splash/*`; Modify `src/game.ts`, `src/app.ts`, `src/sim/projectiles.ts`, `src/render/combatFx.ts`, `src/audio/*`, `src/ui/hud.ts`, `src/ui/mobileShell.ts`, `src/styles.css`, `index.html`, `src/main.ts`.

- [x] **E1 — dano no iPhone:** borda vermelha 0,25 s proporcional ao dano (também em batidas); vibração onde houver; movimento reduzido = mais fraca.
- [x] **E2 — bomba acertou:** ladrão vê "💥 Bomba acertou! −15" grande, ouve `bomb-hit`, vibra; explosão aparece no retrovisor; polícia leva borda cheia.
- [x] **E3 — helicóptero visível:** low-poly acima e à frente da viatura (a câmera de trás vê), hélice girando, som de hélice, sombra; tiros descem do alto (`Projectile.air`); pisca nos últimos 2 s e vai embora subindo. +3 draw calls só enquanto ativo.
- [x] **E4 — sempre paisagem:** em pé, `#app` gira −90° por CSS (topo do jogo à esquerda); sem "Gire o celular"; retrato só congela se o próprio container for em pé; Android trava `landscape` no 1º toque também instalado.
- [x] **E5 — splash:** inline no `index.html` (ícone, giroflex piscando, nome), some com fade ≥ 0,7 s depois da 1ª tela; `apple-touch-startup-image` para 9 iPhones × 2 orientações (fora do precache).
- [x] **Checkpoint:** `feat: damage flash, bomb-hit notice, visible helicopter, always-landscape and splash`

### Task 8: Balanço, e2e, revisão e entrega

- [ ] **Step 1:**
  - IA × IA com curvas: o ladrão vence entre 30% e 70% das partidas e a partida dura em média ≥ 60 s;
  - ajustar só `BALANCE.curves` se preciso.
  - **Resultado (80 partidas):** reta 29% ladrão / 85 s; curvas 110–160 m: 25% / 78 s, ~1,8 batidas no meio-fio por carro; curvas 130–180 m: 30% / 80 s, ~1,1 batida. Ficou `sharpRadius: [130, 180]`. Mesmo sem deriva o ladrão fica em ~26%: o viés vem da IA × IA na reta (pré-existente), não das curvas.
- [ ] **Step 2:**
  - e2e antigos com `?curves=0` onde dependem de reta;
  - frear antes de uma curva fechada evita a batida; sem frear, bate — coberto na sim (`curvesPhysics.test.ts`, determinístico) em vez de e2e;
  - e2e novos: celular em pé (jogo girado, botões funcionam), splash some.
- [ ] **Step 3:** `verification-before-completion` + `requesting-code-review` (revisor novo, Review Focus).
- [ ] **Step 4:** `ship-via-script`:
  - branch `feat/curves` a partir da `main`;
  - um commit por Checkpoint;
  - PR "feat: curves — gentle and sharp turns, cornering drift, brake matters".
