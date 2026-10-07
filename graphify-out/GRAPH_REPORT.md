# Graph Report - policia-ladrao  (2026-10-06)

## Corpus Check
- 164 files · ~103,290 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 999 nodes · 2367 edges · 70 communities (54 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2dda0f40`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- world.ts
- profile.ts
- carFactory.ts
- screens.ts
- strategy.ts
- Review Focus
- combat.spec.ts
- main.ts
- game.ts
- Review Focus
- music.ts
- damageView.ts
- Polícia × Ladrão — Design (v1)
- Coding Standards
- compilerOptions
- devDependencies
- gunner.ts
- session.ts
- package.json
- heli.ts
- scene.ts
- Review Focus
- Mixer
- Review Focus
- scripts
- Review Focus
- eslint.config.mjs
- AudioBackend
- touchButtons.ts
- Tasks
- particles.ts
- AGENTS.md — policia-ladrao
- Review Focus
- .prettierrc.json
- vercel.json
- opponentMarker.ts
- Backlog — ideias para próximas versões
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- feedback.ts
- 2. Refresh
- sfx.ts
- mixer.test.ts
- foundation.spec.ts
- visual.spec.ts
- ai.ts
- backup.ts
- GameHandle
- vitest
- fixedStepper.ts
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- @eslint/js
- eslint-plugin-import-x
- @playwright/test
- @types/node
- typescript
- typescript7
- typescript-eslint
- Review Focus
- app-credit.test.ts
- renderer.ts
- app.ts
- end.ts
- createCar

## God Nodes (most connected - your core abstractions)
1. `thiefOf()` - 49 edges
2. `policeOf()` - 48 edges
3. `startGame()` - 45 edges
4. `BALANCE` - 43 edges
5. `withCar()` - 42 edges
6. `WorldState` - 35 edges
7. `Role` - 34 edges
8. `createWorld()` - 33 edges
9. `stepWorld()` - 33 edges
10. `h()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `createTouchButtons()` --indirect_call--> `t()`  [INFERRED]
  src/input/touchButtons.ts → tests/storage/ranking.test.ts
- `police()` --calls--> `createCar()`  [EXTRACTED]
  tests/sim/items.test.ts → src/sim/car.ts
- `thief()` --calls--> `createCar()`  [EXTRACTED]
  tests/sim/items.test.ts → src/sim/car.ts
- `world()` --calls--> `createWorld()`  [EXTRACTED]
  tests/audio/mixer.test.ts → src/sim/world.ts
- `feedbackForFrame()` --indirect_call--> `e()`  [INFERRED]
  src/ui/feedback.ts → tests/storage/ranking.test.ts

## Import Cycles
- None detected.

## Communities (70 total, 16 thin omitted)

### Community 0 - "world.ts"
Cohesion: 0.07
Nodes (92): BALANCE, Role, IntentName, KEYMAP, AiMemory, initialAiMemory(), dropBomb(), stepBombs() (+84 more)

### Community 1 - "profile.ts"
Cohesion: 0.17
Nodes (18): applyMatch(), emptyProfile(), isCount(), isObject(), parseProfile(), Profile, PROFILE_VERSION, ProfileStats (+10 more)

### Community 2 - "carFactory.ts"
Cohesion: 0.13
Nodes (30): addLamps(), addWheels(), buildCivilian(), buildPolice(), buildThief(), CHROME, CIVILIAN_LAMPS, CIVILIANS (+22 more)

### Community 3 - "screens.ts"
Cohesion: 0.15
Nodes (28): renderChoose(), roleCard(), ROLES, btn(), Disposable, h(), mount(), openModal() (+20 more)

### Community 4 - "strategy.ts"
Cohesion: 0.06
Nodes (32): alwaysOnRules(), descriptionOf(), frontMatter(), root, rulesDir, skills, skillsDir, usingSuperpowers (+24 more)

### Community 5 - "Review Focus"
Cohesion: 0.12
Nodes (15): Entrega 1 — Fundação: Plano de Implementação, Global Constraints, Review Focus, Task 0: Skill three-webgl-game e comandos no AGENTS.md, Task 10: Montagem, câmera, debug e e2e, Task 11: Verificação final e entrega, Task 1: Projeto base, Task 2: RNG com semente e regra de pureza do sim (+7 more)

### Community 6 - "combat.spec.ts"
Cohesion: 0.29
Nodes (5): Car, errors, Snap, snapshot(), waitSim()

### Community 7 - "main.ts"
Cohesion: 0.13
Nodes (15): app, debug, escapeParam, ITEMS, mute, params, q, seedParam (+7 more)

### Community 8 - "game.ts"
Cohesion: 0.22
Nodes (12): createDebug(), anyOf(), lerpCar(), startGame(), createKeyboardInput(), createChaseCamera(), createRearview(), isBehind() (+4 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "music.ts"
Cohesion: 0.19
Nodes (14): createMixer(), BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS, MENU_DRUM, MENU_LEAD (+6 more)

### Community 11 - "damageView.ts"
Cohesion: 0.14
Nodes (16): applyDamage(), CarDamageState, clamp01(), crackTexture(), damageLook, deform(), DIR, DIRT (+8 more)

### Community 12 - "Polícia × Ladrão — Design (v1)"
Cohesion: 0.11
Nodes (18): 10. Arquitetura, 11. Testes, 12. Entregas, 1. Visão, 2. Partida, 3. Pista e movimento, 4.1 Tiros, 4.2 Tabela de dano (valores iniciais em `config/balance.ts`) (+10 more)

### Community 13 - "Coding Standards"
Cohesion: 0.10
Nodes (20): AI attribution, Architecture invariants, Coding Standards, Comments, Completion quality, Configuration, Dependencies, Dependencies and security updates (+12 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, e2e, ES2022, node, playwright.config.ts, src, tests (+19 more)

### Community 15 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, eslint-plugin-security, globals, jsdom, devDependencies, eslint, eslint-plugin-security, globals (+7 more)

### Community 16 - "gunner.ts"
Cohesion: 0.16
Nodes (14): createCarModel(), updateCarModel(), createCarPreview(), attachGunner(), BODY_MAT, box(), FLASH_GEO, FLASH_MAT (+6 more)

### Community 17 - "session.ts"
Cohesion: 0.24
Nodes (8): createAudioSession(), UNLOCK_EVENTS, createWebAudioBackend(), ICONS, createSoundToggle(), readSoundPref(), writeSoundPref(), broken

### Community 18 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, three, engines, node, name, private, type, version (+1 more)

### Community 19 - "heli.ts"
Cohesion: 0.22
Nodes (11): createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose (+3 more)

### Community 20 - "scene.ts"
Cohesion: 0.43
Nodes (6): createLighting(), makeStreetEnvironment(), SHADOW_BOX, snapToGrid(), SUN_DIR, makeSkyTexture()

### Community 21 - "Review Focus"
Cohesion: 0.15
Nodes (12): Entrega 6 — Curvas suaves: Plano de Implementação, Global Constraints, Review Focus, Task 1: Traçado (sim), Task 2: Física da curva e freio, Task 3: IA nas curvas, Task 4: Centro da pista no mundo, Task 5: Rua, calçadas e prédios curvos (+4 more)

### Community 23 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 2 — Combate: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do combate, Task 11: Verificação, revisão e entrega, Task 1: Regras puras e números, Task 2: Mundo com dois carros, Task 3: Colisões e imunidade (+6 more)

### Community 24 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, format, format:check, lint, lint:fix (+4 more)

### Community 25 - "Review Focus"
Cohesion: 0.17
Nodes (11): Entrega 4 — Visual e áudio: Plano de Implementação, Global Constraints, Review Focus, Task 1: Dano visual nos carros, Task 2: Partículas — fumaça, faíscas de dano e explosão, Task 3: Atirador na janela do carona, Task 4: Mixer de áudio puro e síntese WebAudio, Task 5: Música chiptune (+3 more)

### Community 26 - "eslint.config.mjs"
Cohesion: 0.17
Nodes (7): BROWSER_GLOBALS, local, require, SIM_FORBIDDEN_IMPORTS, ref_node_module, maxFileLines, require

### Community 28 - "touchButtons.ts"
Cohesion: 0.22
Nodes (6): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName, t()

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "particles.ts"
Cohesion: 0.16
Nodes (6): COLORS, createParticles(), Kind, Particles, puffTexture(), QualityTier

### Community 31 - "AGENTS.md — policia-ladrao"
Cohesion: 0.29
Nodes (6): 1. Regras sempre ativas e skills — use sem esperar o usuário pedir, 2. Git: o agente nunca commita, faz push nem abre PR, 3. Projeto, 4. Manutenção das skills, AGENTS.md — policia-ladrao, Mapeamento de nomes (skills do Superpowers)

### Community 32 - "Review Focus"
Cohesion: 0.17
Nodes (11): Entrega 5 — Meta: Plano de Implementação, Global Constraints, Review Focus, Task 1: Ranking (storage puro), Task 2: Máquina de fluxo das telas, Task 3: Jogo pausável e reiniciável, Task 4: Telas (DOM), Task 5: Sons das telas (+3 more)

### Community 33 - ".prettierrc.json"
Cohesion: 0.29
Nodes (6): arrowParens, endOfLine, printWidth, semi, singleQuote, trailingComma

### Community 34 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, $schema

### Community 35 - "opponentMarker.ts"
Cohesion: 0.60
Nodes (3): COLORS, createOpponentMarker(), markerTexture()

### Community 36 - "Backlog — ideias para próximas versões"
Cohesion: 0.40
Nodes (4): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Progressão e retenção (anotado em 2026-10-04), Reforço da polícia: bloqueio de via (anotado em 2026-10-05)

### Community 42 - "feedback.ts"
Cohesion: 0.53
Nodes (4): Feedback, feedbackFor(), feedbackForFrame(), e()

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "sfx.ts"
Cohesion: 0.39
Nodes (5): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave

### Community 45 - "mixer.test.ts"
Cohesion: 0.19
Nodes (6): Note, SoundName, createNullBackend(), NullBackend, shot, world()

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "ai.ts"
Cohesion: 0.06
Nodes (55): Car, errors, Snap, snapshot(), waitSim(), buildingsForChunk(), BuildingSpec, PALETTE (+47 more)

### Community 49 - "backup.ts"
Cohesion: 0.11
Nodes (24): RFC-4648, errors, G, BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks(), crc32() (+16 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.18
Nodes (3): ends, OnEnd, rafs

### Community 66 - "renderer.ts"
Cohesion: 0.48
Nodes (5): computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER, QUALITY

### Community 67 - "app.ts"
Cohesion: 0.23
Nodes (17): startApp(), grantWelcome(), better(), Board, emptyBoard(), Entry, insert(), loadBoard() (+9 more)

### Community 68 - "end.ts"
Cohesion: 0.18
Nodes (17): MatchStats, formatTime(), countUp(), endReason(), initialsPad(), padBtn(), reducedMotion(), resultCard() (+9 more)

### Community 69 - "createCar"
Cohesion: 0.29
Nodes (8): createTrafficModel(), bumpSignTexture(), chevronTexture(), createWorldProps(), stripeTexture(), baseUpgrades(), createCar(), atSpeed()

## Knowledge Gaps
- **331 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+326 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `world.ts` to `profile.ts`, `carFactory.ts`, `app.ts`, `opponentMarker.ts`, `screens.ts`, `end.ts`, `main.ts`, `game.ts`, `feedback.ts`, `gunner.ts`, `ai.ts`, `touchButtons.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `BALANCE` connect `world.ts` to `profile.ts`, `screens.ts`, `end.ts`, `createCar`, `game.ts`, `feedback.ts`, `ai.ts`, `heli.ts`, `fixedStepper.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `WorldState` connect `world.ts` to `createCar`, `game.ts`, `music.ts`, `mixer.test.ts`, `ai.ts`, `heli.ts`, `Mixer`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _331 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `world.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07224096987876516 - nodes in this community are weakly interconnected._
- **Should `carFactory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `screens.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.145748987854251 - nodes in this community are weakly interconnected._