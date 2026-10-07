# V2 Parte 1: perfil e moedas, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** cada partida terminada rende moedas, o saldo aparece no jogo, fica salvo no aparelho e pode ir para outro aparelho por um código de backup.

**Architecture:** três módulos puros novos em `src/meta/`: `rewards` (eventos → moedas), `profile` (formato, validação, aplicar partida, boas-vindas) e `backup` (código com CRC32). Um módulo de armazenamento em `src/storage/profileStore.ts` e um diálogo novo em `src/ui/screens/progress.ts`. `game.ts` passa a entregar as estatísticas da partida em `onEnd`; `app.ts` credita uma vez por partida e passa saldo e recompensa para as telas. A simulação não muda.

**Tech Stack:** TypeScript, Vite, Vitest (jsdom nos testes de tela), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-v2-parte1-perfil-moedas-design.md`

## Global Constraints

- Texto do jogo em português; código, comentários, testes e commits em inglês; sem emojis na saída técnica.
- `src/sim` continua pura e sem mudanças.
- Números de recompensa só em `BALANCE.rewards`: `secondsPerCoin: 3`, `timeMax: 30`, `damagePerCoin: 4`, `damageMax: 25`, `perBox: 2`, `winMultiplier: 2`, `welcomePerRecord: 50`.
- Chaves de armazenamento: `pl.profile.v1` (perfil) e `pl.profile.corrupt` (cópia de perfil inválido). O ranking `pl.ranking.v2` não muda.
- Código de backup: prefixo `PL1-`, perfil em JSON (UTF-8) → base32 RFC 4648 sem `=` (alfabeto `A-Z2-7`) + CRC32 (8 hex maiúsculos), em blocos de 4 caracteres separados por `-`. Maiúsculas e minúsculas valem igual ao restaurar.
- Saldo e estatísticas são inteiros ≥ 0.
- Só partidas que chegam ao evento de fim creditam. Sair ou reiniciar pela pausa não credita e não conta em `matches`.
- Arquivos com até 350 linhas de código. Visual igual ao das telas atuais (tokens de `screens.css`); mockups em `v2-parte1-perfil-moedas.html`.
- Último commit da PR: `chore(release): 0.11.0`, ou a minor seguinte se outra PR sair antes.

## Review Focus

- **Código de uma versão futura ou com valores absurdos** (`v: 2`, `coins: -5`, `coins: 1e12`, texto qualquer): restaurar recusa com a mensagem da spec e não altera o perfil. Teste na Task 3.
- **Navegador sem `navigator.clipboard`** (iOS antigo, http): "Copiar código" seleciona o texto do código para o jogador copiar à mão, sem lançar erro. Teste na Task 6.
- **Página recarregada logo depois do fim da partida:** o crédito precisa estar salvo antes de a tela de fim aparecer; recarregar não credita de novo nem perde moedas. Teste na Task 5.
- **Armazenamento indisponível ou cheio no meio do jogo** (`setItem` lança erro): o jogo segue, o saldo da sessão continua na memória, e o Progresso avisa que não está salvando. Teste na Task 2.
- **Boas-vindas com ranking vazio ou ilegível:** credita 0, marca como concedido e nunca credita de novo. Teste na Task 2.

---

### Task 1: Recompensa da partida

**Files:**
- Modify: `src/config/balance.ts` (bloco `rewards` com os valores das Global Constraints)
- Create: `src/meta/rewards.ts`
- Test: `tests/meta/rewards.test.ts`

**Interfaces:**
- Produces:
  - `interface MatchStats { damageDealt: number; rightBoxes: number }`
  - `emptyStats(): MatchStats`
  - `addEvents(stats: MatchStats, events: readonly GameEvent[], player: Role): MatchStats`. `damageDealt` soma `hit.amount` com `target !== player`; `rightBoxes` conta `pickup` com `role === player` e item diferente de `'wrong'` e `'none'`.
  - `interface Reward { time: number; damage: number; boxes: number; won: boolean; total: number }`
  - `rewardFor(r: { time: number; won: boolean }, stats: MatchStats): Reward`

- [x] **Step 1: Escrever os testes que falham**
  - `rewardFor` com tempo 69.9, vitória, dano 100 e 4 caixas → `{ time: 23, damage: 25, boxes: 8, won: true, total: 112 }`.
  - Limites: tempo 300 → `time: 30`; dano 400 → `damage: 25`.
  - Derrota: 30 s, dano 10, 0 caixas → `{ time: 10, damage: 2, boxes: 0, won: false, total: 12 }`.
  - `addEvents` ignora `hit` no próprio jogador e `pickup` com `wrong`/`none` ou do adversário; acumula ao longo de várias chamadas.
- [x] **Step 2: Rodar e ver falhar** — `npx vitest run tests/meta/rewards.test.ts`: FAIL, módulo não existe.
- [x] **Step 3: Implementar** `src/meta/rewards.ts` e `BALANCE.rewards`. Tudo com arredondamento para baixo, limite aplicado depois de arredondar e multiplicador por último.
- [x] **Step 4: Rodar e ver passar** — mesmo comando: PASS.
- [x] **Step 5: Commit** `feat(meta): coins earned per match from time, damage dealt and boxes`

### Task 2: Perfil e armazenamento

**Files:**
- Create: `src/meta/profile.ts`, `src/storage/profileStore.ts`
- Test: `tests/meta/profile.test.ts`, `tests/storage/profileStore.test.ts`

**Interfaces:**
- Consumes: `Reward` (Task 1); `Board` de `src/storage/ranking.ts`.
- Produces:
  - `PROFILE_VERSION = 1`
  - `interface Profile { v: 1; coins: number; stats: { matches: number; wins: number; escapes: number; arrests: number; coinsEarned: number }; welcomeGranted: boolean }`
  - `emptyProfile(): Profile`
  - `parseProfile(raw: unknown): Profile | undefined`. Recusa: `v` diferente de 1, campos faltando, números não inteiros, negativos ou acima de `1e9`.
  - `applyMatch(p: Profile, result: { winner: Role; reason?: 'escape' | 'policeDown' | 'thiefDown' }, player: Role, reward: Reward): Profile`. `escapes` conta vitória do ladrão com `reason === 'escape'`; `arrests` conta vitória da polícia.
  - `grantWelcome(p: Profile, board: Board): Profile`. Soma `(board.police.length + board.thief.length) * welcomePerRecord` uma única vez.
  - `PROFILE_KEY = 'pl.profile.v1'`, `CORRUPT_KEY = 'pl.profile.corrupt'`
  - `loadProfile(storage: Storage | undefined): { profile: Profile; persistent: boolean }`. Texto inválido vai para `CORRUPT_KEY` e volta `emptyProfile()`. `persistent: false` quando não há storage ou `getItem` lança erro.
  - `saveProfile(storage: Storage | undefined, p: Profile): boolean`. Devolve `false` se não gravou e nunca lança erro.

- [x] **Step 1: Escrever os testes que falham**
  - `parseProfile`:
    - ida e volta de `emptyProfile()`;
    - recusa `{ v: 2 }`, `coins: -1`, `coins: 1.5`, `coins: 2e9`, `stats` faltando, `null`, `'x'`.
  - `applyMatch`:
    - vitória por fuga como ladrão soma `coins`, `coinsEarned`, `matches`, `wins` e `escapes`;
    - derrota soma só `matches` e as moedas.
  - `grantWelcome`:
    - board com 3 recordes → +150 e `welcomeGranted: true`;
    - chamar de novo não soma;
    - board vazio → +0 e `welcomeGranted: true`.
  - `profileStore`:
    - grava e lê;
    - texto quebrado fica em `pl.profile.corrupt` e volta perfil vazio;
    - `setItem` que lança erro faz `saveProfile` devolver `false` sem lançar;
    - `undefined` devolve `persistent: false`.
- [x] **Step 2: Rodar e ver falhar** — `npx vitest run tests/meta/profile.test.ts tests/storage/profileStore.test.ts`: FAIL.
- [x] **Step 3: Implementar** os dois módulos (o perfil é imutável: as funções devolvem objeto novo).
- [x] **Step 4: Rodar e ver passar** — mesmo comando: PASS.
- [x] **Step 5: Commit** `feat(meta): versioned player profile stored on the device, welcome bonus for existing records`

### Task 3: Código de backup

**Files:**
- Create: `src/meta/backup.ts`
- Test: `tests/meta/backup.test.ts`

**Interfaces:**
- Consumes: `Profile` e `parseProfile` (Task 2).
- Produces:
  - `encodeBackup(p: Profile): string`
  - `decodeBackup(code: string): { ok: true; profile: Profile } | { ok: false; error: 'format' | 'checksum' | 'invalid' }`
  - `BACKUP_ERROR_TEXT: Record<'format' | 'checksum' | 'invalid', string>`. Os três textos usam a cópia da spec: "Código incompleto ou com erro. Copie de novo no outro aparelho."

- [x] **Step 1: Escrever os testes que falham**
  - Ida e volta: `decodeBackup(encodeBackup(p))` devolve o mesmo perfil.
  - O código começa com `PL1-`, depois só usa `[A-Z2-7]`, `[0-9A-F]` no CRC e `-` entre blocos de 4.
  - Aceita espaços, quebras de linha e letras minúsculas colados no código.
  - Truncado → `format` ou `checksum`; um caractere trocado → `checksum`.
  - Perfil com `v: 2` ou `coins: -5`, com CRC correto → `invalid`.
- [x] **Step 2: Rodar e ver falhar** — `npx vitest run tests/meta/backup.test.ts`: FAIL.
- [x] **Step 3: Implementar.**
  - CRC32 com tabela (polinômio `0xEDB88320`) sobre os bytes UTF-8 do JSON.
  - base32 escrito à mão (cerca de 20 linhas), sem dependência.
  - O decode tira o prefixo, os espaços e os hífens, passa para maiúsculas, separa os últimos 8 caracteres como CRC, decodifica o resto, confere o CRC e chama `parseProfile`.
- [x] **Step 4: Rodar e ver passar** — mesmo comando: PASS.
- [x] **Step 5: Commit** `feat(meta): progress backup code with CRC32 check`

### Task 4: Estatísticas saindo da partida

**Files:**
- Modify: `src/game.ts` (acumular com `addEvents` a cada passo; incluir `stats` no `onEnd`), `src/ui/screens/flow.ts` (`MatchResult.stats?: MatchStats`)
- Test: `e2e/screens.spec.ts` (asserção na Task 7); unitário em `tests/ui/flow.test.ts` só para o tipo

**Interfaces:**
- Consumes: `emptyStats`, `addEvents`, `MatchStats` (Task 1).
- Produces: `onEnd(result: { winner; time; reason?; hp; level; stats: MatchStats })`.

- [x] **Step 1: Teste** em `tests/ui/flow.test.ts`: `reduce` com `ended` que traz `stats` preserva `stats` em `EndState.result`.
- [x] **Step 2: Rodar e ver falhar** (tipo) — `npx tsc --noEmit`: erro em `stats`.
- [x] **Step 3: Implementar.**
  - Em `game.ts`, um `let stats = emptyStats()` reiniciado em cada partida e atualizado com `world.events` depois de cada `stepWorld`.
  - O acúmulo e o relato do fim saem de dentro de `startGame` para uma função `reportEnd`, o que ajuda a baixar o tamanho da função.
- [x] **Step 4: Rodar** `npx tsc --noEmit && npx vitest run tests/ui/flow.test.ts`: PASS.
- [x] **Step 5: Commit** `feat(game): the match result carries damage dealt and right boxes`

### Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa

**Files:**
- Modify: `src/app.ts`, `src/ui/screens/screens.ts` (`renderTitle`), `src/ui/screens/end.ts` (`renderEnd`), `src/ui/screens/screens.css`, `src/ui/screens/icons.ts` (ícones `coin` e `profile`)
- Test: `tests/ui/screens.test.ts`, `tests/ui/app-credit.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2 e 4.
- Produces:
  - `renderTitle` recebe `coins: number` e `onProgress(): void`.
  - `renderEnd` recebe `reward?: Reward`.
  - `settleMatch(p: Profile, result: MatchResult, player: Role): { profile: Profile; reward: Reward }` em `src/meta/profile.ts`, que usa `rewardFor` com `won = result.winner === player` e `stats ?? emptyStats()`.

- [x] **Step 1: Escrever os testes que falham**
  - `renderTitle` mostra `.title-wallet` com o saldo formatado em pt-BR (`1240` → `1.240`) e o botão com `aria-label` "Progresso" chama `onProgress`.
  - `renderEnd` com `reward` mostra:
    - as linhas "Tempo de perseguição +23", "Dano causado (100) +25", "Caixas da sua cor (4) +8", "Vitória ×2";
    - o total final "+112 moedas" no texto, mesmo com a animação: com `matchMedia('(prefers-reduced-motion: reduce)')` o total já aparece final; sem ela, depois de 1 s com timers falsos;
    - sem `reward`, nenhum `.end-reward`.
  - `settleMatch` devolve o perfil creditado e a recompensa.
  - `tests/ui/app-credit.test.ts`:
    - com `startApp` em jsdom e `startGame` mockado, chamar o `onEnd` capturado credita uma vez e grava em `localStorage` antes de a tela de fim existir;
    - "Jogar de novo" e voltar não creditam de novo;
    - ao recarregar (novo `startApp`), o saldo é o mesmo.
    - Se mockar `startGame` ficar caro demais, este caso passa para o e2e da Task 7 e o plano registra isso.
- [x] **Step 2: Rodar e ver falhar** — `npx vitest run tests/ui`: FAIL.
- [x] **Step 3: Implementar.**
  - **`app.ts`:**
    - carrega o perfil e aplica `grantWelcome(profile, board)` com o board carregado;
    - no `onEnd`, primeiro `settleMatch` e `saveProfile`, depois o `dispatch` do `ended`; a recompensa vai num campo do `EndState` (`reward?: Reward` em `flow.ts`);
    - a tela inicial recebe `profile.coins`.
  - **Quadro de recompensa:** fica no cartão do resultado, entre a linha de estatísticas e o tempo (layout do mockup). O motivo e o nível passam a uma linha só.
- [x] **Step 4: Rodar e ver passar** — `npx vitest run tests/ui tests/meta`: PASS.
- [x] **Step 5: Commit** `feat(ui): coins on the title screen and the reward breakdown at the end of a match`

### Task 6: Diálogo de Progresso

**Files:**
- Create: `src/ui/screens/progress.ts`
- Modify: `src/app.ts` (abrir pelo botão; salvar ao restaurar), `src/ui/screens/screens.css`
- Test: `tests/ui/progress.test.ts`

**Interfaces:**
- Consumes: `encodeBackup`, `decodeBackup`, `BACKUP_ERROR_TEXT` (Task 3); `Profile` (Task 2); padrão de diálogo de `howto.ts` (conteúdo de trás inerte, Esc fecha, foco volta para quem abriu).
- Produces: `openProgress(host: HTMLElement, p: { profile: Profile; persistent: boolean; onRestore(next: Profile): void; onClose(): void }): void`.

- [x] **Step 1: Escrever os testes que falham**
  - Mostra moedas, partidas, vitórias e fugas.
  - Mostra o código (`encodeBackup(profile)`).
  - "Copiar código" chama `navigator.clipboard.writeText` com o código e mostra "Copiado". Sem `navigator.clipboard`, seleciona o texto do código e não lança erro.
  - Restaurar: colar um código válido mostra "Isso substitui o progresso deste aparelho (X moedas) pelo do código (Y moedas)."; confirmar chama `onRestore` com o perfil decodificado; cancelar não chama.
  - Código inválido mostra o texto de `BACKUP_ERROR_TEXT` e não chama `onRestore`.
  - `persistent: false` mostra "Seu progresso não está sendo salvo neste navegador".
  - Esc fecha e chama `onClose`. Tab fica dentro do diálogo.
- [x] **Step 2: Rodar e ver falhar** — `npx vitest run tests/ui/progress.test.ts`: FAIL.
- [x] **Step 3: Implementar.**
  - A área de colar é um `<textarea>` com rótulo.
  - Em `app.ts`, `onRestore` troca o perfil, grava e redesenha a tela inicial para o saldo novo.
- [x] **Step 4: Rodar e ver passar** — mesmo comando: PASS.
- [x] **Step 5: Commit** `feat(ui): progress dialog with stats, backup code copy and restore`

### Task 7: e2e, revisão e entrega

**Files:**
- Modify: `e2e/screens.spec.ts`, `package.json` (versão)
- Create: `scratch/NN-feat-v2-profile-coins.ps1` (modo patches, corpo da PR via `--body-file`)

- [x] **Step 1: e2e "coins".**
  - `?app&quality=low&mute&debug&traffic=0&escape=4`, jogar de ladrão até o fim.
  - O fim mostra `.end-reward` com "+N moedas" (N > 0).
  - Voltar ao Início mostra o saldo N.
  - Recarregar mantém N.
  - No Progresso, restaurar o código de um perfil com 500 moedas (gerado no teste com `encodeBackup` via `page.evaluate` sobre um JSON fixo) e confirmar: o saldo vira 500.
- [x] **Step 2: Rodar** typecheck, lint, todos os unitários e o e2e de telas e app nos dois projetos: tudo verde.
- [x] **Step 3: Revisor novo** sobre a branch inteira (spec + plano + diff), com foco no Review Focus. Corrigir o que for confirmado.
- [x] **Step 4: Commit** `chore(release): 0.11.0` e o script de entrega.
