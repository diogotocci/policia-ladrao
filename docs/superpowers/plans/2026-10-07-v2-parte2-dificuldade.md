# V2 Parte 2: dificuldade, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fácil, Médio e Difícil escolhidos na escolha do lado mudam o computador, o tráfego e as moedas, com ranking por dificuldade.

**Architecture:** a dificuldade é um parâmetro da partida (`createWorld({ difficulty })`, `WorldState.difficulty`), lido pela simulação em `levelAt`, `trafficTarget` e no ritmo do helicóptero do computador. Fora da simulação ela é uma preferência do app (`pl.difficulty`), passada para a recompensa, o ranking (`pl.ranking.v3`, um `Board` por dificuldade) e as telas. A máquina de estados só ganha a dificuldade no estado do ranking.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-v2-parte2-dificuldade-design.md`

## Global Constraints

- **Valores**, em `BALANCE.difficulties`:
  - easy `{ startLevel: 1, levelEvery: 60, traffic: 0.7, heliFireIntervalAi: 1.2, coins: 0.75 }`
  - normal `{ startLevel: 1, levelEvery: 45, traffic: 1, heliFireIntervalAi: 1, coins: 1 }`
  - hard `{ startLevel: 3, levelEvery: 30, traffic: 1.3, heliFireIntervalAi: 0.7, coins: 1.5 }`
- `BALANCE.difficulty.maxLevel: 10` continua. `difficulty.levelEvery` e `items.police.heliFireIntervalAi` saem.
- O Médio (`'normal'`) é o padrão em todo lugar e reproduz a versão 0.11 exatamente.
- O helicóptero do jogador continua em `items.police.heliFireInterval` (0,7 s) em todas as dificuldades.
- **Rótulos:** `Fácil`, `Médio`, `Difícil`. Multiplicador escrito com vírgula: `×0,75`, `×1`, `×1,5`.
- **Chaves:** `pl.difficulty` e `pl.ranking.v3`. O `pl.ranking.v2` nunca é apagado.
- `src/sim` continua pura. Comentários e commits em inglês, texto do jogo em português, sem emojis, arquivos com até 350 linhas de código.
- Último commit: `chore(release): 0.12.0`.

## Review Focus

- **v3 já existe e o v2 também:** não migra de novo e não sobrescreve recordes novos. Teste na Task 3.
- **Ranking aberto do fim, trocando a dificuldade e voltando:** volta para o mesmo fim de partida, com o recorde ainda pendente, se houver. Teste na Task 5.
- **`pl.difficulty` com lixo** (`"insano"`, `""`): vira Médio sem quebrar. Teste na Task 3.
- **Difícil com `?escape=4`** (e2e): começa no nível 3 sem quebrar a cena de fuga. Coberto pelo e2e da Task 7.
- **Arredondamento das moedas no Fácil** (ex.: 12 × 0,75 = 9): nunca fracionário, nunca negativo. Teste na Task 2.

---

### Task 1: Dificuldade na simulação

**Files:**
- Modify: `src/config/balance.ts`, `src/sim/world.ts`, `src/sim/rules.ts`, `src/sim/traffic.ts`, `src/sim/projectiles.ts`, `src/sim/types.ts`
- Test: `tests/sim/difficulty.test.ts`; ajustar `tests/sim/rules.test.ts`, `tests/sim/ai.test.ts`, `tests/sim/ram.test.ts` e `tests/sim/projectiles.test.ts` para a nova origem dos valores.

**Interfaces:**
- Produces:
  - `type Difficulty = 'easy' | 'normal' | 'hard'` e `DIFFICULTIES: readonly Difficulty[]`, em `balance.ts`
  - `levelAt(time: number, d: Difficulty = 'normal'): number`
  - `trafficTarget(level: number, d: Difficulty = 'normal'): number`
  - `createWorld({ ..., difficulty?: Difficulty })`
  - `WorldState.difficulty: Difficulty`

- [ ] **Step 1: Testes que falham** (`tests/sim/difficulty.test.ts`):
  - `levelAt`:
    - `levelAt(0,'easy')=1`, `levelAt(59.9,'easy')=1`, `levelAt(60,'easy')=2`;
    - `levelAt(44.9)=1`, `levelAt(45)=2`;
    - `levelAt(0,'hard')=3`, `levelAt(29.9,'hard')=3`, `levelAt(30,'hard')=4`;
    - `levelAt(9999,'hard')=10`.
  - `createWorld({ difficulty: 'hard' }).level === 3`; sem `difficulty`, o mundo é `'normal'` e nível 1.
  - `trafficTarget(1,'easy')=2`, `trafficTarget(1)=3`, `trafficTarget(1,'hard')=4`. Nenhum resultado fica abaixo de 1.
  - Helicóptero do computador (jogador = ladrão), contando os tiros em 4 s: Fácil 4 (1,2 s), Médio 4, Difícil 6 (0,7 s). Com o jogador sendo a polícia, `Math.ceil(4 / 0.7)` em qualquer dificuldade.
  - Computador contra computador, 20 sementes × 2 lados, 95 s: com o jogador como ladrão, a polícia do computador vence menos partidas no Fácil do que no Difícil.
- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run tests/sim/difficulty.test.ts`.
- [ ] **Step 3: Implementar.**
  - O mundo guarda `difficulty`; `stepWorld` chama `levelAt(time, w.difficulty)`.
  - O tráfego calcula `Math.max(1, Math.round(base * (1 + perLevel*(level-1)) * traffic))`.
  - `createWorld` com dificuldade desconhecida cai para `'normal'`.
- [ ] **Step 4: Rodar** `npx vitest run tests/sim`: tudo verde, incluindo os testes de equilíbrio de hoje (Médio inalterado).
- [ ] **Step 5: Commit** `feat(sim): difficulty sets the computer's start level and pace, traffic and its helicopter`

### Task 2: Moedas com multiplicador

**Files:**
- Modify: `src/meta/rewards.ts`, `src/meta/profile.ts`
- Test: `tests/meta/rewards.test.ts`, `tests/meta/profile.test.ts`

**Interfaces:**
- Consumes: `Difficulty` (Task 1).
- Produces:
  - `rewardFor(r, stats, d: Difficulty = 'normal'): Reward`, com `Reward.difficulty: Difficulty`
  - `settleMatch(p, result, player, d: Difficulty = 'normal')`

- [ ] **Step 1: Testes que falham:**
  - o exemplo da Parte 1 no `'hard'` dá `total: 168` e `difficulty: 'hard'`;
  - a derrota de 12 no `'easy'` dá 9;
  - total sempre inteiro;
  - `settleMatch` com `'hard'` credita 168.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** `total = Math.floor(soma × vitória × coins)`.
- [ ] **Step 4: Rodar** `npx vitest run tests/meta`: PASS.
- [ ] **Step 5: Commit** `feat(meta): coins multiplied by the difficulty`

### Task 3: Ranking por dificuldade e preferência salva

**Files:**
- Modify: `src/storage/ranking.ts`
- Create: `src/storage/difficulty.ts`
- Test: `tests/storage/ranking.test.ts`, `tests/storage/difficulty.test.ts`

**Interfaces:**
- Produces:
  - `RANKING_V3_KEY = 'pl.ranking.v3'`
  - `type Boards = Record<Difficulty, Board>`
  - `emptyBoards(): Boards`
  - `loadBoards(storage): Boards`, que migra o v2 para o `normal` só quando o v3 não existe
  - `saveBoards(storage, boards): void`
  - `countRecords(boards): number`
  - `DIFFICULTY_KEY = 'pl.difficulty'`
  - `loadDifficulty(storage): Difficulty`, que devolve `'normal'` quando falta, é inválido ou dá erro
  - `saveDifficulty(storage, d): void`, que nunca lança erro

- [ ] **Step 1: Testes que falham:**
  - só v2 com 2 recordes → `normal` com os 2, `easy` e `hard` vazios, e v2 intacto;
  - v3 e v2 presentes → usa só o v3;
  - v3 ilegível → `emptyBoards()` e v2 intacto;
  - entradas inválidas dentro do v3 são descartadas;
  - `countRecords` soma tudo;
  - `loadDifficulty` com `'hard'` devolve `'hard'`, e com `'insano'`, `''`, ausente ou `getItem` lançando erro devolve `'normal'`;
  - `saveDifficulty` com `setItem` lançando erro não lança.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** As funções `loadBoard`/`saveBoard` do v2 ficam só para a migração e os testes.
- [ ] **Step 4: Rodar** `npx vitest run tests/storage`: PASS.
- [ ] **Step 5: Commit** `feat(ranking): one ranking per difficulty (v3), old records become Médio; difficulty preference saved`

### Task 4: Seletor e escolha do lado

**Files:**
- Create: `src/ui/screens/difficultyPicker.ts`
- Modify: `src/ui/screens/choose.ts`, `src/ui/screens/screens.css`
- Test: `tests/ui/difficultyPicker.test.ts`, `tests/ui/screens.test.ts` (choose)

**Interfaces:**
- Produces:
  - `DIFFICULTY_LABEL: Record<Difficulty, string>`
  - `coinsLabel(d): string`, que devolve `'moedas ×0,75'` e equivalentes
  - `difficultyPicker(value: Difficulty, onChange: (d) => void, opts?: { showCoins?: boolean }): HTMLElement`
  - `renderChoose(root, { ..., difficulty: Difficulty, onDifficulty(d): void })`

- [ ] **Step 1: Testes que falham:**
  - O picker é `role="radiogroup"` com `aria-label` "Dificuldade" e três `role="radio"`; o escolhido tem `aria-checked="true"` e `tabindex="0"`, os outros `-1`.
  - Clique muda a escolha e chama `onChange`. ArrowRight/ArrowLeft andam (sem dar a volta) e focam a nova opção.
  - Com `showCoins` aparece `moedas ×1,5` no Difícil.
  - Escolha do lado:
    - mostra o picker com o valor recebido;
    - mudar chama `onDifficulty`;
    - o título "Escolha seu lado" continua;
    - o foco inicial continua no primeiro cartão.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
  - Visual do mockup: segmentado, opção ativa branca.
  - Na escolha do lado, o picker vai no centro da linha do topo e o título desce para baixo dela.
- [ ] **Step 4: Rodar** `npx vitest run tests/ui`: PASS.
- [ ] **Step 5: Commit** `feat(ui): difficulty picker on the side choice`

### Task 5: Ranking com seletor

**Files:**
- Modify: `src/ui/screens/flow.ts`, `src/ui/screens/screens.ts` (`renderRanking`)
- Test: `tests/ui/flow.test.ts`, `tests/ui/screens.test.ts` (ranking)

**Interfaces:**
- Consumes: `difficultyPicker` (Task 4), `Boards` (Task 3).
- Produces:
  - estado `ranking` com `difficulty: Difficulty`;
  - ação `{ type: 'difficultyTab'; difficulty: Difficulty }`;
  - `openRanking` passa a levar `difficulty`: `{ type: 'openRanking'; difficulty: Difficulty }`, que o app preenche com a dificuldade atual;
  - `renderRanking(root, { boards: Boards, difficulty, onDifficulty(d), ... })`.

- [ ] **Step 1: Testes que falham:**
  - `flow`:
    - `openRanking` do título e do fim guarda a `difficulty`;
    - `difficultyTab` muda só a dificuldade;
    - `back` de um ranking aberto do fim, depois de trocar a dificuldade, devolve o mesmo `EndState` (recorde pendente preservado).
  - Tela:
    - com boards diferentes por dificuldade, mostra a lista certa;
    - trocar no picker chama `onDifficulty`;
    - o destaque do recorde novo só aparece na dificuldade e no lado dele.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** O picker aqui não mostra moedas.
- [ ] **Step 4: Rodar** `npx vitest run tests/ui`: PASS.
- [ ] **Step 5: Commit** `feat(ui): ranking per difficulty with the same picker`

### Task 6: Fim de partida e ligação no app

**Files:**
- Modify: `src/ui/screens/end.ts`, `src/app.ts`, `src/game.ts` (passa `difficulty` ao `createWorld`), `src/ui/screens/screens.css`
- Test: `tests/ui/screens.test.ts` (end), `tests/ui/app-credit.test.ts`

**Interfaces:**
- Consumes: Tasks 1 a 5.
- Produces:
  - `renderEnd(root, { ..., difficulty: Difficulty })`;
  - `startGame(container, { ..., difficulty })`.

- [ ] **Step 1: Testes que falham:**
  - Fim: selo `.end-difficulty` com "Difícil" e a classe `is-hard`; linha "Difícil" `×1,5` no quadro; no Médio, sem linha de multiplicador.
  - `app-credit`:
    - com `pl.difficulty = 'hard'`, a escolha do lado vem em Difícil e a partida mockada recebe `difficulty: 'hard'`;
    - o crédito usa ×1,5;
    - o recorde vai para `pl.ranking.v3.hard`;
    - trocar para Fácil salva `pl.difficulty = 'easy'`.
  - As boas-vindas usam `countRecords(boards)`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
  - O app guarda `difficulty` (lido com `loadDifficulty`) e `boards` (lido com `loadBoards`).
  - A escolha salva com `saveDifficulty`.
  - O ranking da tela inicial abre na dificuldade atual.
- [ ] **Step 4: Rodar** `npx vitest run`: tudo verde.
- [ ] **Step 5: Commit** `feat: difficulty wired through the match, coins, ranking and end screen`

### Task 7: e2e, revisão e entrega

- [ ] **Step 1: e2e "difficulty"**, em `?app&quality=low&mute&debug&traffic=0&escape=4`:
  - Difícil → ladrão → fim com selo "Difícil" e "×1,5";
  - Ranking abre com Difícil marcado e o recorde salvo lá;
  - recarregar: Jogar mostra Difícil marcado.
- [ ] **Step 2:** typecheck, lint, unitários e e2e de telas e app nos dois projetos.
- [ ] **Step 3: Revisor novo** sobre a branch inteira, com o Review Focus. Corrigir o que for confirmado.
- [ ] **Step 4:** `chore(release): 0.12.0` e o script de entrega. O script tem que ser só ASCII, porque o PowerShell 5 lê `.ps1` sem BOM como ANSI.
