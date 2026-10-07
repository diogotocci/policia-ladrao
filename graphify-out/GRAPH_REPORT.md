# Graph Report - policia-ladrao  (2026-10-07)

## Corpus Check
- 185 files · ~120,351 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1135 nodes · 2775 edges · 80 communities (64 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6edef902`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- world.ts
- Review Focus
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
- Polícia × Ladrão: V2, Parte 2: dificuldade (design)
- session.ts
- package.json
- heli.ts
- renderer.ts
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
- gunner.ts
- 2. Refresh
- sfx.ts
- ranking.ts
- foundation.spec.ts
- visual.spec.ts
- createRng
- profile.ts
- GameHandle
- vitest
- fixedStepper.ts
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- @eslint/js
- eslint-plugin-import-x
- @playwright/test
- @types/node
- app.ts
- typescript7
- typescript-eslint
- Review Focus
- app-credit.test.ts
- soundToggle.ts
- worldProps.ts
- PR 1 (0.13.0): modos e Sobrevivência
- Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)
- track.ts
- hud.ts
- curves.ts
- ai.ts
- howto.ts
- Difficulty
- difficultyPicker.ts
- world.spec.ts
- Rng
- typescript

## God Nodes (most connected - your core abstractions)
1. `thiefOf()` - 55 edges
2. `policeOf()` - 54 edges
3. `BALANCE` - 52 edges
4. `withCar()` - 47 edges
5. `startGame()` - 45 edges
6. `WorldState` - 43 edges
7. `stepWorld()` - 41 edges
8. `createWorld()` - 40 edges
9. `Role` - 37 edges
10. `h()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `feedbackForFrame()` --indirect_call--> `e()`  [INFERRED]
  src/ui/feedback.ts → tests/storage/ranking.test.ts
- `createTouchButtons()` --indirect_call--> `t()`  [INFERRED]
  src/input/touchButtons.ts → tests/storage/ranking.test.ts
- `world()` --calls--> `createWorld()`  [EXTRACTED]
  tests/audio/mixer.test.ts → src/sim/world.ts
- `run()` --indirect_call--> `reduce()`  [INFERRED]
  tests/ui/flow.test.ts → src/ui/screens/flow.ts
- `run()` --calls--> `createSequencer()`  [EXTRACTED]
  tests/audio/music.test.ts → src/audio/music.ts

## Import Cycles
- 3-file cycle: `src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/types.ts`
- 3-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts`
- 4-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts`

## Communities (80 total, 16 thin omitted)

### Community 0 - "world.ts"
Cohesion: 0.07
Nodes (99): BALANCE, Role, AiMemory, initialAiMemory(), dropBomb(), stepBombs(), CarState, cornering() (+91 more)

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "carFactory.ts"
Cohesion: 0.13
Nodes (30): addLamps(), addWheels(), buildCivilian(), buildPolice(), buildThief(), CHROME, CIVILIAN_LAMPS, CIVILIANS (+22 more)

### Community 3 - "screens.ts"
Cohesion: 0.16
Nodes (28): ModeBoards, formatTime(), renderChoose(), roleCard(), ROLES, btn(), Disposable, h() (+20 more)

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
Cohesion: 0.12
Nodes (16): app, chaosEvery, debug, escapeParam, ITEMS, mute, params, q (+8 more)

### Community 8 - "game.ts"
Cohesion: 0.16
Nodes (16): createDebug(), anyOf(), lerpCar(), startGame(), createKeyboardInput(), IntentName, KEYMAP, createChaseCamera() (+8 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "music.ts"
Cohesion: 0.17
Nodes (16): createMixer(), BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS, MENU_DRUM, MENU_LEAD (+8 more)

### Community 11 - "damageView.ts"
Cohesion: 0.13
Nodes (15): CarDamageState, clamp01(), crackTexture(), damageLook, deform(), DIR, DIRT, init() (+7 more)

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

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "session.ts"
Cohesion: 0.24
Nodes (5): AudioSession, createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend()

### Community 18 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, three, engines, node, name, private, type, version (+1 more)

### Community 19 - "heli.ts"
Cohesion: 0.32
Nodes (9): createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose (+1 more)

### Community 20 - "renderer.ts"
Cohesion: 0.23
Nodes (11): computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER, QUALITY, createLighting(), makeStreetEnvironment(), SHADOW_BOX (+3 more)

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

### Community 27 - "AudioBackend"
Cohesion: 0.13
Nodes (4): Note, SoundName, AudioBackend, NullBackend

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

### Community 42 - "gunner.ts"
Cohesion: 0.16
Nodes (13): createCarModel(), updateCarModel(), createCarPreview(), attachGunner(), BODY_MAT, box(), FLASH_GEO, FLASH_MAT (+5 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "sfx.ts"
Cohesion: 0.39
Nodes (5): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave

### Community 45 - "ranking.ts"
Cohesion: 0.13
Nodes (28): better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard(), emptyBoards(), emptyModeBoards() (+20 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "createRng"
Cohesion: 0.14
Nodes (19): buildingsForChunk(), BuildingSpec, PALETTE, smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot (+11 more)

### Community 49 - "profile.ts"
Cohesion: 0.07
Nodes (43): RFC-4648, errors, G, BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks(), crc32() (+35 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 58 - "app.ts"
Cohesion: 0.17
Nodes (19): startApp(), Mode, MODES, MatchStats, loadMode(), MODE_KEY, saveMode(), recordEntry() (+11 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.15
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "soundToggle.ts"
Cohesion: 0.26
Nodes (6): ICONS, onTap(), createSoundToggle(), readSoundPref(), writeSoundPref(), broken

### Community 67 - "worldProps.ts"
Cohesion: 0.18
Nodes (13): createTrafficModel(), CONES_PER_WORKS, createWorksView(), signTexture(), bumpSignTexture(), chevronTexture(), createWorldProps(), stripeTexture() (+5 more)

### Community 68 - "PR 1 (0.13.0): modos e Sobrevivência"
Cohesion: 0.11
Nodes (17): Global Constraints, PR 1 (0.13.0): modos e Sobrevivência, PR 2 (0.14.0): itens do ladrão, PR 3 (0.15.0): itens da polícia, Review Focus, Task 1.1: Modo e caos na simulação, dano centralizado, Task 1.2: Obras e equilíbrio do Sobrevivência, Task 1.3: Tela de modo, preferência e fluxo (+9 more)

### Community 69 - "Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)"
Cohesion: 0.12
Nodes (15): 10. Testes, 1. Objetivo, 2. Modos e fluxo, 3. Sobrevivência, 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão, 4.2 Polícia (caixas azuis), 4.3 Botão de especial, 4.4 Computador (+7 more)

### Community 70 - "track.ts"
Cohesion: 0.29
Nodes (11): Bump, bumpInBlock(), bumpsBetween(), bumpXRange(), crossedBump(), jumpHeight(), stepJump(), worksInBlock() (+3 more)

### Community 71 - "hud.ts"
Cohesion: 0.24
Nodes (10): ALERT_LEFT, createHud(), distanceBand, el(), HudItem, ITEM_ICON, ITEM_LABEL, pickupToast() (+2 more)

### Community 72 - "curves.ts"
Cohesion: 0.36
Nodes (8): active, createTrackFrame(), curvatureAt(), Curve, curvesBetween(), extend(), layoutFor(), layouts

### Community 73 - "ai.ts"
Cohesion: 0.44
Nodes (11): aiStep(), bumpCovers(), considerBombs(), considerBump(), curveBraking(), laneBlocked(), lerp(), nearestLane() (+3 more)

### Community 74 - "howto.ts"
Cohesion: 0.27
Nodes (9): gameDelta(), openModal(), dragToTurn(), ESCAPE, openHowTo(), pageDots(), PAGES, Tip (+1 more)

### Community 75 - "Difficulty"
Cohesion: 0.33
Nodes (6): DIFFICULTIES, Difficulty, DIFFICULTY_KEY, loadDifficulty(), saveDifficulty(), shortDate()

### Community 76 - "difficultyPicker.ts"
Cohesion: 0.36
Nodes (6): choicePicker(), coinsLabel(), DIFFICULTY_LABEL, difficultyPicker(), MODE_LABEL, modePicker()

### Community 77 - "world.spec.ts"
Cohesion: 0.40
Nodes (5): Car, errors, Snap, snapshot(), waitSim()

## Knowledge Gaps
- **383 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `world.ts` to `carFactory.ts`, `opponentMarker.ts`, `screens.ts`, `main.ts`, `game.ts`, `ai.ts`, `gunner.ts`, `hud.ts`, `ranking.ts`, `profile.ts`, `app.ts`, `touchButtons.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `BALANCE` connect `world.ts` to `worldProps.ts`, `screens.ts`, `track.ts`, `hud.ts`, `game.ts`, `ai.ts`, `curves.ts`, `howto.ts`, `difficultyPicker.ts`, `world.spec.ts`, `createRng`, `profile.ts`, `heli.ts`, `fixedStepper.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `WorldState` connect `world.ts` to `worldProps.ts`, `hud.ts`, `game.ts`, `ai.ts`, `music.ts`, `Difficulty`, `heli.ts`, `Mixer`, `app.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _383 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `world.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06983157687383039 - nodes in this community are weakly interconnected._
- **Should `carFactory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `strategy.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06376811594202898 - nodes in this community are weakly interconnected._