# Entrega 5 — Meta: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Regra do projeto (AGENTS.md §2):** o agente não commita; os Checkpoints viram commits no script `scratch/NN-*.ps1` (skill `ship-via-script`). Branch nova a partir da `main` atualizada.

**Goal:** O jogo vira um produto completo: telas de título, escolha de lado, contagem 3-2-1, pausa, fim com iniciais estilo arcade e ranking local. Também funciona sem internet depois de aberto uma vez.

**Architecture:**
- **Fluxo de telas:** `src/ui/screens/` com uma máquina de estados pura (`flow.ts`: `title → choose → countdown → playing ⇄ paused → end → (ranking | choose | title)`), testável sem DOM. Cada tela é um componente DOM fino.
- **Ranking:** `src/storage/ranking.ts` puro (validação, ordenação, corte, chave versionada) sobre uma interface de storage; nunca quebra.
- **Jogo:** o `game.ts` ganha `pause()`, `resume()`, `restart()` e `onEnd(result)`. O loop para de simular em pausa e na contagem.
- **Offline:** um service worker escrito à mão (`public/sw.js`), sem dependência nova:
  - HTML: rede primeiro, com cópia de reserva;
  - `/assets` (com hash): cache primeiro;
  - versão do cache por build.

**Tech Stack:** a mesma; nenhuma dependência nova.

**Spec:** §6 (pausa, Esc, botão de pausa, foco da aba), §7 Telas, §8 Ranking, §10 PWA, §12 Entrega 5.

## Global Constraints

- **Telas** (spec §7):
  1. **Título:** Jogar, Ranking, Som on/off.
  2. **Escolha:** dois cards com as 3 linhas de regras de cada lado (viatura e muscle car, com os modelos 3D girando).
  3. **Contagem:** 3-2-1 com sirene antes de começar.
  4. **Pausa:** continuar, reiniciar, sair.
  5. **Fim:**
     - vitória ou derrota, tempo e motivo;
     - entrou no top 10 → 3 iniciais estilo arcade (A–Z, setas ▲▼ e toque; teclado no PC);
     - botões Jogar de novo, Ranking, Título.
  6. **Ranking:** abas "Polícia — mais rápidos" e "Ladrão — mais resistentes"; top 10 com iniciais, tempo e data.
- **Ranking** (spec §8):
  - `localStorage` com chave versionada `pl.ranking.v1`, validado ao carregar; dado corrompido vira lista vazia;
  - **polícia:** só vitórias jogando de polícia, tempo crescente;
  - **ladrão:** toda partida de ladrão, tempo decrescente;
  - top 10 e, no empate, o mais antigo na frente.
- **Pausa:**
  - botão ⏸ no HUD, ao lado do som; tecla Esc ou P;
  - pausa automática ao perder o foco da aba ou girar para retrato;
  - na pausa: simulação parada, música baixa, motor e sirene calados.
- **Botão Voltar do Android / histórico:** voltar durante o jogo abre a pausa, não sai do app.
- **Offline:** depois da primeira visita, o jogo abre sem rede. Uma versão nova é pega na próxima abertura (sem ficar preso em versão velha).
- Os parâmetros de debug (`?role=`, `?seed=`, `?debug`…) continuam pulando direto para o jogo, para os e2e existentes não mudarem.
- Acessibilidade: todas as telas navegáveis por teclado (Tab/Enter/setas), com rótulos em português.

## Review Focus

1. **Ranking:** entra só quem deve (polícia só vitória); empate mantém o mais antigo; dado corrompido ou storage bloqueado não quebra → Task 1.
2. **Pausa de verdade:** nada avança (tempo, IA, tráfego, cooldowns, bombas expirando); ao voltar, sem salto de tempo → Task 3.
3. **Reiniciar ou sair várias vezes** não vaza WebGL, áudio nem listeners (10 ciclos no e2e sem crescer draw calls e erros) → Task 3/7.
4. **Service worker** não serve HTML velho para sempre; atualização limpa o cache antigo → Task 6.
5. **Telas no celular:** cabem em 844×390 com safe areas; foco visível no PC → Task 7.

---

### Task 1: Ranking (storage puro)

**Files:** Create `src/storage/ranking.ts`, `tests/storage/ranking.test.ts`.

**Interfaces:**
- `Entry = { initials: string; time: number; date: string }`, `Board = { police: Entry[]; thief: Entry[] }`.
- `loadBoard(storage)` e `saveBoard(storage, board)` validam formato e tipos; corrompido → vazio; exceções são engolidas.
- `qualifies(board, role, time, won): boolean`.
- `insert(board, role, entry): { board; rank }`: ordem, corte em 10, empate estável.
- `sanitizeInitials(s): string`: 3 letras A–Z, maiúsculas, preenche com "A".

- [x] **Step 1:** Testes:
  - polícia que perdeu não entra;
  - ladrão entra vencendo ou perdendo;
  - ordem crescente/decrescente;
  - o 11º sai;
  - empate: o mais antigo fica na frente;
  - JSON quebrado, tipos errados e storage que lança → vazio sem exceção;
  - iniciais saneadas.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(storage): local top-10 ranking with validation`

### Task 2: Máquina de fluxo das telas

**Files:** Create `src/ui/screens/flow.ts`, `tests/ui/flow.test.ts`.

**Interfaces:** `reduce(state, action)` puro.
- **Estados:** `title`, `choose`, `countdown{role, left}`, `playing{role}`, `paused{role}`, `end{role, result, rank?}`, `ranking{tab, from}`.
- **Ações:** `play`, `choose(role)`, `tick(dt)`, `pause`, `resume`, `restart`, `quit`, `ended(result)`, `openRanking`, `back`.

- [x] **Step 1:** Testes:
  - caminho feliz completo;
  - a contagem sai de 3 a 0 em 3 s;
  - não há pausa na contagem;
  - restart volta para a contagem com o mesmo lado;
  - quit vai ao título;
  - ações inválidas são ignoradas.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(ui): screen flow state machine`

### Task 3: Jogo pausável e reiniciável

**Files:** Modify `src/game.ts`, `src/audio/mixer.ts`, `src/input/keyboard.ts`. Create `tests/ui/gameLifecycle.test.ts` (com stubs) e partes em e2e.

**Interfaces:**
- **`startGame` passa a retornar:** `{ pause(); resume(); stop(); onEnd(cb) }`.
- **Em pausa:**
  - o `FixedStepper` não acumula;
  - `mixer.frame(..., paused)`;
  - o render continua desenhando o quadro parado.
- **Gatilhos de pausa:** Esc/P, botão ⏸, `visibilitychange` (escondido), retrato, `popstate`.
- **`stop()`** libera renderer, texturas e geometrias próprias, áudio e listeners.

- [x] **Step 1:** Testes:
  - 5 s pausado não mudam `world.time`, cooldowns nem bombas;
  - Esc pausa e retoma;
  - aba escondida pausa;
  - ao voltar, o primeiro passo não pula mais de 1 passo de simulação.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat: pause, resume and restart`

### Task 4: Telas (DOM)

**Files:** Create `src/ui/screens/{title,choose,countdown,pause,end,ranking}.ts` + `screens.css`, `tests/ui/screens.test.ts`. Modify `src/main.ts` (a app passa a começar no título, exceto com parâmetros de debug).

- **Título:** logo com o ícone, Jogar, Ranking e 🔊.
- **Escolha:**
  - dois cards com os modelos 3D girando (1 renderer pequeno compartilhado) e as 3 linhas de regras;
  - o fundo pode ser o próprio mundo 3D desfocado.
- **Contagem:** números grandes; bip a cada número e sirene no "1".
- **Pausa:** Continuar, Reiniciar, Sair.
- **Fim:**
  - substitui a tela de fim atual do HUD;
  - entrada de iniciais com 3 slots ▲▼, toque, teclado e Enter;
  - o recorde é salvo uma vez só.
- **Ranking:** abas, lista com posição, iniciais, tempo `mm:ss.d` e data `dd/mm`; destaque da linha recém-inserida.

- [x] **Step 1:** Testes (jsdom):
  - cada tela renderiza, os botões disparam as ações certas e o foco inicial fica no botão principal;
  - as iniciais alteram pelas setas e pelo teclado;
  - o ranking mostra as abas e o destaque.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(ui): title, side choice, countdown, pause, end with arcade initials, ranking`

### Task 5: Sons das telas

**Files:** Modify `src/audio/sfx.ts`, `src/audio/mixer.ts` (+ testes).

- **Receitas novas:** `beep` (contagem), `go` (largada) e `ui` (clique de menu).
- **Música do menu:** padrão calmo no título e na escolha; troca para a música de perseguição na largada.

- [x] **Step 1–2:** testes de receitas e troca de música → implementar.
- [x] **Checkpoint:** `feat(audio): countdown and menu sounds`

### Task 6: Offline (service worker)

**Files:** Create `public/sw.js`, `src/pwa/register.ts`, `tests/pwa/sw.test.ts` (lógica de estratégia extraída em função pura). Modify `vite.config.ts` (injeta a versão do build) e `vercel.json` (`/sw.js` sem cache).

- **Cache primeiro:** `/assets/*`, ícones e manifest.
- **Rede primeiro:** navegação (HTML), com cópia de reserva offline.
- **Versão:** `CACHE = 'pl-<buildId>'`; no `activate`, apaga os caches antigos; `skipWaiting` e `clients.claim`.
- **Registro** só em produção, e não com `?debug`.

- [x] **Step 1:** Testes da função de estratégia (qual requisição usa qual política) e da limpeza de caches antigos.
- [x] **Step 2:** e2e:
  - em `vite preview`, depois da 1ª visita, `context.setOffline(true)` e recarregar → o jogo abre;
  - um build novo troca o cache.
- [x] **Checkpoint:** `feat(pwa): offline play with a versioned service worker`

### Task 7: e2e do produto e sobras

**Files:** Create `e2e/screens.spec.ts`. Modify o `e2e/combat.spec.ts` existente (o fim de jogo agora é tela própria).

- [x] **Step 1:** Fluxo completo:
  - título → escolher ladrão → contagem → jogo → `?debug&thiefHp=1`, para terminar rápido → fim → iniciais "DIO" → ranking mostra DIO no topo;
  - recarregar mantém o ranking.
- [x] **Step 2:**
  - pausa com Esc, o tempo para;
  - continuar retoma;
  - reiniciar 10× sem erros e sem crescer os draw calls;
  - botão Voltar abre a pausa;
  - retrato pausa.
- [x] **Step 3:** PASS nos dois projetos.
- [x] **Checkpoint:** `test(e2e): product flows`

### Task 8: Verificação, revisão e entrega

- [x] **Step 1:** `verification-before-completion`: typecheck, unit, build e e2e, com a saída colada.
- [x] **Step 2:** `requesting-code-review` com revisor novo e o Review Focus.
- [ ] **Step 3:** `ship-via-script`:
  - branch `feat/meta` a partir da `main` atualizada;
  - um commit por Checkpoint;
  - PR "feat: meta — screens, pause, arcade ranking, offline".
