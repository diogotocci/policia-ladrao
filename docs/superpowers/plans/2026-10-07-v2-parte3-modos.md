# V2 Parte 3: modos e itens novos, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** os modos Perseguição e Sobrevivência (com caos) e 8 itens novos, entregues em 3 PRs jogáveis.

**Architecture:** o modo é um parâmetro da partida, como a dificuldade (`createWorld({ mode })`). O caos e a escala de dano ficam em `sim/chaos.ts` e todo dano passa por `hurt()`. Perigos no chão (bombas, óleo, pregos, bloqueio) viram uma lista só, `hazards`, e os efeitos nos carros (derrapagem, pneu furado, fumaça, holofote, metralhadora) ficam em `effects`. Fora da simulação: tela de modo, preferência `pl.mode`, ranking `pl.ranking.v4` e o HUD com tempo subindo.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-v2-parte3-modos-design.md`

## Global Constraints

- Todos os números da spec ficam em `BALANCE`:
  - `survival { chaosEvery: 45, chaosMax: 5, trafficPerChaos: 0.15, boxEveryPerChaos: 0.9, damagePerChaos: 0.2, worksFromChaos: 3, worksEvery: [500, 700], worksLength: 60, worksSign: 80, timeCoinsMax: 60 }`;
  - os itens novos com os valores das tabelas da seção 4.
- Perseguição sem itens novos = 0.12. Os testes de equilíbrio de hoje continuam passando sem mudar os limites.
- **Rótulos:** "Perseguição", "Sobrevivência", "Caos N", "Escolha o modo".
- **Chaves:** `pl.mode` (padrão `'pursuit'`) e `pl.ranking.v4`. O v3 nunca é apagado.
- `src/sim` continua pura e determinística; todo sorteio usa o rng do mundo.
- Arquivos com até 350 linhas de código: as partes novas entram em módulos novos, sem crescer `game.ts`, `world.ts` ou `carFactory.ts`.
- Comentários e commits em inglês, texto do jogo em português, sem emojis. Scripts `.ps1` só com ASCII. Versões: PR 1 0.13.0, PR 2 0.14.0, PR 3 0.15.0.

## Review Focus

- **Partida do Sobrevivência que nunca acaba** (os dois desviando de tudo): o dano escalado precisa garantir o fim. Teste de 10 min simulados entre dois computadores na Task 1.2.
- **Bloqueio sem lugar livre** (curva, quebra-mola, obra, caixa): ele procura o próximo ponto livre até 60 m e, se não achar, não gasta a carga. Teste na Task 3.1.
- **Especial apertado no ar ou sem carga:** sem efeito colateral e sem perder carga. Teste na Task 2.1.
- **Ranking do ladrão no Sobrevivência com derrota:** entra mesmo perdendo e mostra "preso". Teste na Task 1.4.
- **Efeitos e perigos durante as cenas de fim:** limpos e sem dano. Teste na Task 2.1 (perigos) e na Task 3.1 (bloqueio).

---

## PR 1 (0.13.0): modos e Sobrevivência

### Task 1.1: Modo e caos na simulação, dano centralizado

**Files:**
- Create: `src/sim/chaos.ts`
- Modify: `src/config/balance.ts`, `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/collisions.ts`, `src/sim/projectiles.ts`, `src/sim/bombs.ts`, `src/sim/items.ts`, `src/sim/traffic.ts`
- Test: `tests/sim/chaos.test.ts`

**Interfaces:**
- Produces:
  - `type Mode = 'pursuit' | 'survival'`, `MODES`
  - `createWorld({ mode?: Mode })`, `WorldState.mode`, `WorldState.chaos`
  - `chaosAt(time: number, mode: Mode, every = BALANCE.survival.chaosEvery): number`, que devolve sempre 1 na Perseguição
  - `damageScale(w): number`
  - `hurt(car: CarState, amount: number, w: WorldState): CarState`, a única forma de tirar vida

- [ ] **Step 1: Testes que falham:**
  - `chaosAt`: 0→1, 44,9→1, 45→2, 180→5, 9999→5; na Perseguição, sempre 1.
  - `damageScale`: caos 1 → 1, caos 3 → 1,4.
  - No Sobrevivência com caos 3, uma bomba tira 15 × 1,4 = 21 e a calçada tira 7.
  - No Sobrevivência, chegar a 90 s não dispara a fuga.
  - O tráfego alvo no caos 3 é ×1,3 sobre o da dificuldade.
  - O intervalo entre caixas no caos 3 é ×0,81.
  - `createWorld({ mode: 'survival', chaosEvery: 5 })` respeita o caos curto (para debug).
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
  - Os quatro pontos de dano de hoje (calçada e tráfego, tiros, bombas, caixa errada) passam a chamar `hurt`.
  - No Sobrevivência a fuga fica desligada (`escapeTime = Infinity`).
- [ ] **Step 4: Rodar** `npx vitest run tests/sim`: os testes antigos (Perseguição) continuam verdes sem mudança.
- [ ] **Step 5: Commit** `feat(sim): game modes; survival chaos scales damage, traffic and boxes; all damage goes through hurt()`

### Task 1.2: Obras e equilíbrio do Sobrevivência

**Files:**
- Create: `src/sim/works.ts`
- Modify: `src/sim/world.ts`, `src/sim/collisions.ts`, `src/sim/ai.ts`
- Test: `tests/sim/works.test.ts`, `tests/sim/survival.test.ts`

**Interfaces:**
- Produces:
  - `interface Works { s: number; lane: 0 | 1 | 2 | 3; length: number }`
  - `worksBetween(seed: number, s0: number, s1: number): Works[]`, determinístico, a cada 500–700 m, fora de quebra-molas e curvas fechadas
  - `WorldState.works` só considera trechos que começam depois do ponto onde o caos chegou a 3

- [ ] **Step 1: Testes que falham:**
  - `worksBetween` é igual para a mesma semente;
  - o espaçamento fica entre 500 e 700 m;
  - nunca cai sobre um quebra-mola ou uma curva fechada;
  - bater nos cones dá o mesmo dano e a mesma perda de velocidade da calçada;
  - o computador muda de faixa antes da obra com chance que depende do nível;
  - computador contra computador no Sobrevivência Médio, 20 sementes × 2 lados: todas as partidas terminam em 10 min e o ladrão vence entre 30% e 70%.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** O computador trata a obra como faixa bloqueada; na função de faixa livre ela entra como o tráfego. Se o equilíbrio não fechar, ajustar só os números de `BALANCE.survival`.
- [ ] **Step 4: Rodar** `npx vitest run tests/sim`.
- [ ] **Step 5: Commit** `feat(sim): roadworks from chaos 3 and survival balance`

### Task 1.3: Tela de modo, preferência e fluxo

**Files:**
- Create: `src/ui/screens/mode.ts`, `src/storage/mode.ts`
- Modify: `src/ui/screens/flow.ts`, `src/app.ts`, `src/main.ts` (`?mode=` e `?chaosEvery=` só em debug), `src/game.ts` (repassa `mode`), `src/ui/screens/screens.css`, `src/ui/screens/howto.ts` (página 3: caos e obras; os itens entram nos PRs 2 e 3)
- Test: `tests/ui/mode.test.ts`, `tests/ui/flow.test.ts`, `tests/storage/mode.test.ts`

**Interfaces:**
- Produces:
  - `renderMode(root, { mode: Mode; onPick(m: Mode): void; onBack(): void })`
  - estado de fluxo `{ screen: 'mode' }`; `play` leva a `mode` e a ação `pickMode` leva a `choose`; `back` da escolha do lado volta para `mode`
  - `loadMode(storage)` e `saveMode(storage, m)`

- [ ] **Step 1: Testes que falham:**
  - a tela tem dois cartões com os textos da spec;
  - o botão do modo lembrado recebe o foco;
  - `pickMode` salva em `pl.mode`;
  - fluxo: título → modo → lado → contagem; "Trocar de lado" vai direto para o lado;
  - o "Como jogar" passa a ter 3 páginas.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** com o visual do mockup (cartão do Sobrevivência dourado).
- [ ] **Step 4: Rodar** `npx vitest run tests/ui tests/storage`.
- [ ] **Step 5: Commit** `feat(ui): mode screen (Perseguição / Sobrevivência) between Jogar and the side choice`

### Task 1.4: HUD, ranking v4 e moedas

**Files:**
- Modify: `src/ui/hud.ts` (ou um `hudSurvival.ts` novo, se passar do limite), `src/storage/ranking.ts`, `src/ui/screens/screens.ts` (ranking), `src/meta/rewards.ts`, `src/meta/profile.ts`, `src/app.ts`
- Test: `tests/ui/hud.test.ts`, `tests/storage/ranking.test.ts`, `tests/meta/rewards.test.ts`, `tests/ui/screens.test.ts`, `tests/ui/app-credit.test.ts`

**Interfaces:**
- Produces:
  - `RANKING_V4_KEY`, `type ModeBoards = Record<Mode, Boards>`, `loadModeBoards()`/`saveModeBoards()`, com migração do v3 para `pursuit`;
  - `qualifies(board, role, time, won, hp?, mode?)` e `insert(..., mode?)`; no Sobrevivência o ladrão usa maior tempo e aceita derrota (`how: 'caught'`);
  - `rewardFor(r, stats, d, mode?)`, com o teto de tempo 60 no Sobrevivência.

- [ ] **Step 1: Testes que falham:**
  - HUD do Sobrevivência: o tempo sobe ("03:12"), "Caos 4" com 4 de 5 marcas acesas, e aviso grande quando o caos sobe;
  - ranking: v3 vira `pursuit`; no Sobrevivência o ladrão que perdeu aos 200 s fica acima do que venceu aos 150 s e mostra "preso"; a polícia ordena pelo menor tempo;
  - moedas: 300 s no Sobrevivência pagam 60 de tempo;
  - app: partida no Sobrevivência credita e grava no ranking `survival` da dificuldade;
  - a tela do ranking tem o seletor de modo acima do de dificuldade.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `npx vitest run`.
- [ ] **Step 5: Commit** `feat: survival HUD, per-mode ranking (v4) and coins`

### Task 1.5: Visual das obras, e2e, revisão e entrega do PR 1

- [ ] Cones e placa "Obras" em `src/render/hazardsView.ts` (novo), ligados no `game.ts` só pela função de montagem.
- [ ] **e2e:** `?app&debug&mode=survival&chaosEvery=5&traffic=0`. O caos chega a 3, aparece `.hud-chaos` com "Caos 3", existe uma obra no mundo (`__game.snapshot().works.length > 0`) e a partida termina com `debugHp` baixo.
- [ ] **e2e:** a tela de modo aparece depois de Jogar e lembra a escolha depois de recarregar.
- [ ] typecheck, lint, unitários e e2e completo; revisor novo; `chore(release): 0.13.0`; script de entrega.

## PR 2 (0.14.0): itens do ladrão

### Task 2.1: Especial e perigos

**Files:**
- Create: `src/sim/hazards.ts`, `src/sim/effects.ts`
- Remove: `src/sim/bombs.ts` (absorvido)
- Modify: `src/sim/car.ts` (`special`, `effects`), `src/sim/intents.ts` (`bomb` → `special`), `src/sim/items.ts`, `src/sim/world.ts`, `src/input/keyboard.ts`, `src/input/touchButtons.ts`, `src/game.ts`, `src/sim/ai.ts`
- Test: `tests/sim/hazards.test.ts`, `tests/sim/effects.test.ts`; adaptar `tests/sim/bombs.test.ts` para `hazards`

**Interfaces:**
- Produces:
  - `type SpecialKind = 'bomb' | 'bigBomb' | 'oil' | 'spikes' | 'smoke' | 'roadblock'`
  - `Upgrades.special: { kind: SpecialKind; charges: number } | null`
  - `interface Hazard { id; kind; s; xFrom; xTo; expiresAt }`
  - `useSpecial(w, role, intents)`, `stepHazards(w)`
  - `CarEffects { skidUntil; flatUntil; flatSide: -1 | 1; smokeUntil; spotUntil; mgUntil }` e `applyEffects(car, w)` dentro de `stepCar`

- [ ] **Step 1: Testes que falham:**
  - pegar um especial do mesmo tipo soma carga (máximo 3) e de outro tipo troca;
  - especial apertado sem carga não faz nada; apertado no ar cai atrás;
  - óleo: a viatura que passa derrapa por 1,5 s (direção pela metade e empurrão), sem dano; no caos 3 cobre 2 faixas;
  - miguelito: 4 s com velocidade máxima ×0,7 e puxão de 1,5 m/s; 6 s no caos 3;
  - fumaça: os tiros da polícia ganham espalhamento ±12° e o helicóptero não atira por 3 s (5 s no caos 3);
  - bomba de área: só no Sobrevivência no caos 2+ e cobre 2 faixas;
  - cenas de fim limpam perigos e efeitos;
  - a polícia do computador desvia de óleo e miguelito com chance que depende do nível;
  - o ladrão do computador usa óleo e miguelito com a polícia alinhada até 80 m, e a fumaça quando levou dano no último 1 s;
  - Perseguição entre dois computadores: o ladrão vence entre 30% e 70%.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** O botão de bomba vira o botão de especial, com ícone por tipo e o número de cargas; `aria-label` "Especial: óleo".
- [ ] **Step 4: Rodar** `npx vitest run`.
- [ ] **Step 5: Commit** `feat(sim): thief specials - oil, spikes, smoke and area bomb on a single special button`

### Task 2.2: Visual, som e HUD dos itens do ladrão

**Files:** `src/render/hazardsView.ts`, `src/render/particles.ts` (fumaça, faíscas), `src/render/rearview.ts`, `src/audio/sfx.ts`, `src/audio/mixer.ts`, `src/ui/hud.ts` (avisos), `src/ui/screens/howto.ts` (página 3 com os itens do ladrão)

- [ ] **Testes:**
  - o mixer toca o som certo para cada evento novo (`oilSplash`, `tirePop`, `smoke`);
  - o HUD mostra "Óleo!", "Pneu furado!" e "Fumaça!";
  - a cena tem um objeto por perigo ativo e os remove quando eles expiram.
- [ ] **Commit** `feat(render,audio): oil, spikes, smoke, area bomb visuals and sounds`

### Task 2.3: e2e, revisão e entrega do PR 2

- [ ] **e2e:** `?debug&give=oil` → B larga o óleo (aparece um perigo no snapshot) e o botão mostra a carga.
- [ ] Revisor novo; `chore(release): 0.14.0`; script.

## PR 3 (0.15.0): itens da polícia

### Task 3.1: Bloqueio + spike

**Files:** `src/sim/hazards.ts`, `src/sim/ai.ts`, `src/render/hazardsView.ts`; Test `tests/sim/roadblock.test.ts`

- [ ] **Testes:**
  - colocado 120 m à frente do ladrão, com a viatura numa faixa e spike nas vizinhas: 2 faixas livres na Perseguição e 1 no caos 2+;
  - sem lugar, procura até 60 m adiante; se não achar, a carga fica;
  - bater na viatura: −15 e velocidade ×0,4; spike: pneu furado;
  - some depois que o ladrão passa;
  - a polícia do computador usa com o ladrão 40–150 m à frente;
  - o ladrão do computador desvia pela faixa livre com chance que depende do nível.
- [ ] **Commit** `feat(sim): police roadblock with spike strips`

### Task 3.2: Metralhadora, segunda viatura e holofote

**Files:** `src/sim/effects.ts`, `src/sim/projectiles.ts`, `src/sim/wingman.ts` (novo), `src/sim/items.ts`; Test `tests/sim/policeItems.test.ts`

- [ ] **Testes:**
  - metralhadora: 4 s com intervalo 0,2 s e dano ×0,4; 6 s no caos 3;
  - segunda viatura: entra por trás na faixa vizinha e fica 8 s (12 s no caos 4); batida lateral −6 com empurrão de 1,5 m, no máximo 1 a cada 2 s; vai embora;
  - holofote: ladrão ×0,85 de velocidade por 3 s (5 s no caos 3), fumaça sem efeito;
  - Perseguição entre dois computadores com todos os itens: o ladrão vence entre 30% e 70%; no Sobrevivência também.
- [ ] **Commit** `feat(sim): machine gun, backup patrol car and helicopter spotlight`

### Task 3.3: Visual, som, HUD, e2e e entrega do PR 3

- [ ] **Visual:**
  - modelo do bloqueio (viatura atravessada, giroflex e policial);
  - segunda viatura com `createCarModel('police')`;
  - facho do holofote e brilho nas bordas da tela;
  - rajada da metralhadora.
- [ ] **Som e HUD:** sirene ao usar o bloqueio, som da rajada, avisos "Bloqueio à frente!", "Metralhadora!", "Reforço chegando!", "Holofote!"; "Como jogar" com os itens da polícia.
- [ ] **e2e:** `?debug&give=roadblock` jogando de polícia → B coloca o bloqueio à frente do ladrão.
- [ ] Revisor novo; `chore(release): 0.15.0`; script.
