# Entrega 7 — Fuga em 1:30: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** o ladrão também vence chegando vivo a 1:30 (some no horizonte); contagem regressiva no HUD; ranking do ladrão por "mais rápido a vencer"; ajustes do playtest (helicóptero sem piscar, iniciais na ordem certa).

**Brainstorm aprovado (2026-10-05):**
- Ranking do ladrão: mais rápido a vencer (destruir a polícia antes fica no topo; fugas empatam em 1:30 e desempatam pela vida que sobrou).
- Cronômetro: contagem regressiva ("Fuga em" / "Prenda em"), últimos 10 s amarelo pulsando + bip.
- Final: cena curta (~2 s) — ladrão com nitro some na neblina, polícia freia; depois "Fugiu!".
- Recordes: zerar os dois rankings (chave nova).
- Backlog (não implementar): fases com tempo de fuga crescente; reforço da polícia (bloqueio de via).

## Global Constraints

- Sim pura e determinística; todos os números em `BALANCE` (`match.escapeTime: 90`, `match.escapeScene: 2`).
- Durante a cena de fuga: sem controles, tiros, bombas, caixinhas, colisões ou dano.
- `endTime` de uma fuga = 90 s (instante em que bateu 1:30), não o fim da cena.
- `?debug&escape=N` encurta o tempo de fuga (só debug/e2e).
- IA × IA: ladrão vence entre 30% e 70%.

## Tasks

### Task 1: Fuga na sim
**Files:** `src/config/balance.ts`, `src/sim/types.ts`, `src/sim/world.ts`; Test `tests/sim/escape.test.ts`.
- [x] Testes: em 90 s sem ninguém destruído entra a cena (`match.escapeAt`, evento `escape`); durante a cena nada de dano/tiros/bomba, ladrão acelera e polícia freia, intents ignorados; após 2 s `over`, vencedor ladrão, `reason: 'escape'`, `endTime` 90; destruir antes continua valendo (`reason: 'policeDown' | 'thiefDown'`); IA × IA 30–70%.
- [x] **Checkpoint:** `feat(sim): the thief wins by surviving 1:30 (escape scene)`

### Task 2: Ranking
**Files:** `src/storage/ranking.ts`, `src/app.ts`, `src/ui/screens/screens.ts`; Tests.
- [x] Testes: chave `pl.ranking.v2` (v1 ignorada = recomeça vazio); ladrão: menor tempo melhor, empate → mais vida; entrada guarda `hp` e `how` (`escape` | `kill`); só vitórias qualificam nos dois lados.
- [x] **Checkpoint:** `feat(ranking): thief board = fastest wins; boards restart (v2)`

### Task 3: HUD e telas
**Files:** `src/ui/hud.ts`, `hud.css`, `src/audio/mixer.ts`, `src/ui/screens/screens.ts`, `src/game.ts`, `src/render/cameras.ts`/`game.ts` (cena).
- [x] Testes: HUD conta para baixo com rótulo por lado; últimos 10 s com classe de alerta; bip por segundo nos últimos 10 s; tela de fim com motivo ("Fugiu!", "Polícia destruída", "Ladrão preso"); iniciais ▼ = próxima letra, ▲ = anterior.
- [x] **Checkpoint:** `feat(ui): escape countdown, escape ending and end reasons`

### Task 4: Ajustes
- [x] Helicóptero não pisca; só vai embora no fim.
- [x] **Checkpoint:** `fix: helicopter leaves without blinking; initials wheel order`

### Task 5: e2e, balanço, revisão, entrega
- [x] e2e: `?app&debug&escape=5` jogando de ladrão → "Fugiu!" → iniciais → ranking do ladrão.
- [x] Spec + backlog atualizados; revisor novo; `scratch/19-feat-escape.ps1`.
