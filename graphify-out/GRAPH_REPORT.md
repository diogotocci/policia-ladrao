# Graph Report - policia-ladrao  (2026-10-06)

## Corpus Check
- 146 files · ~91,256 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 883 nodes · 2061 edges · 69 communities (51 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8dc2a96c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- world.ts
- track.ts
- carFactory.ts
- app.ts
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
- mixer.test.ts
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
- hud.ts
- 2. Refresh
- sfx.ts
- scene.ts
- foundation.spec.ts
- visual.spec.ts
- roadChunks.ts
- screens.spec.ts
- GameHandle
- keyboard.ts
- fixedStepper.ts
- items.ts
- @eslint/js
- eslint-plugin-import-x
- @playwright/test
- @types/node
- typescript
- typescript7
- typescript-eslint
- vitest
- createRng
- curves.ts
- ai.ts
- world.spec.ts

## God Nodes (most connected - your core abstractions)
1. `thiefOf()` - 49 edges
2. `policeOf()` - 48 edges
3. `startGame()` - 43 edges
4. `withCar()` - 42 edges
5. `BALANCE` - 39 edges
6. `WorldState` - 35 edges
7. `createWorld()` - 33 edges
8. `stepWorld()` - 33 edges
9. `Role` - 30 edges
10. `createCar()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `createTouchButtons()` --indirect_call--> `t()`  [INFERRED]
  src/input/touchButtons.ts → tests/storage/ranking.test.ts
- `feedbackForFrame()` --indirect_call--> `e()`  [INFERRED]
  src/ui/feedback.ts → tests/storage/ranking.test.ts
- `world()` --calls--> `createWorld()`  [EXTRACTED]
  tests/audio/mixer.test.ts → src/sim/world.ts
- `run()` --indirect_call--> `reduce()`  [INFERRED]
  tests/ui/flow.test.ts → src/ui/screens/flow.ts
- `run()` --calls--> `createSequencer()`  [EXTRACTED]
  tests/audio/music.test.ts → src/audio/music.ts

## Import Cycles
- None detected.

## Communities (69 total, 18 thin omitted)

### Community 0 - "world.ts"
Cohesion: 0.08
Nodes (79): BALANCE, Role, AiMemory, initialAiMemory(), dropBomb(), stepBombs(), CarState, cornering() (+71 more)

### Community 1 - "track.ts"
Cohesion: 0.20
Nodes (12): createTrafficModel(), bumpSignTexture(), chevronTexture(), createWorldProps(), stripeTexture(), Bump, bumpInBlock(), bumpsBetween() (+4 more)

### Community 2 - "carFactory.ts"
Cohesion: 0.07
Nodes (48): addLamps(), addWheels(), buildCivilian(), buildPolice(), buildThief(), CHROME, CIVILIAN_LAMPS, CIVILIANS (+40 more)

### Community 3 - "app.ts"
Cohesion: 0.10
Nodes (42): startApp(), better(), Board, emptyBoard(), Entry, insert(), loadBoard(), normalize() (+34 more)

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
Nodes (16): app, debug, escapeParam, ITEMS, mute, params, q, seedParam (+8 more)

### Community 8 - "game.ts"
Cohesion: 0.24
Nodes (14): createDebug(), anyOf(), lerpCar(), startGame(), createKeyboardInput(), createChaseCamera(), updateCarModel(), flashGunner() (+6 more)

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

### Community 16 - "mixer.test.ts"
Cohesion: 0.19
Nodes (6): Note, SoundName, createNullBackend(), NullBackend, shot, world()

### Community 17 - "session.ts"
Cohesion: 0.24
Nodes (8): createAudioSession(), UNLOCK_EVENTS, createWebAudioBackend(), ICONS, createSoundToggle(), readSoundPref(), writeSoundPref(), broken

### Community 18 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, three, engines, node, name, private, type, version (+1 more)

### Community 19 - "heli.ts"
Cohesion: 0.35
Nodes (8): createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose

### Community 20 - "renderer.ts"
Cohesion: 0.48
Nodes (5): computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER, QUALITY

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
Cohesion: 0.24
Nodes (5): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName

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

### Community 42 - "hud.ts"
Cohesion: 0.31
Nodes (8): ALERT_LEFT, createHud(), distanceBand, el(), HudItem, ITEM_ICON, ITEM_LABEL, pickupToast()

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "sfx.ts"
Cohesion: 0.39
Nodes (5): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave

### Community 45 - "scene.ts"
Cohesion: 0.48
Nodes (5): createLighting(), makeStreetEnvironment(), SHADOW_BOX, snapToGrid(), SUN_DIR

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "roadChunks.ts"
Cohesion: 0.20
Nodes (14): smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot, visibleChunkRange(), canvas(), FACADE_TILE_METERS (+6 more)

### Community 53 - "items.ts"
Cohesion: 0.21
Nodes (8): applyItem(), available(), colorChance(), onBump(), rollItem(), stepBoxes(), Rng, Box

### Community 65 - "createRng"
Cohesion: 0.29
Nodes (8): buildingsForChunk(), BuildingSpec, PALETTE, Layout, createRng(), createRngFromState(), makeRng(), take()

### Community 66 - "curves.ts"
Cohesion: 0.36
Nodes (8): active, createTrackFrame(), curvatureAt(), Curve, curvesBetween(), extend(), layoutFor(), layouts

### Community 67 - "ai.ts"
Cohesion: 0.41
Nodes (11): aiStep(), bumpCovers(), considerBombs(), considerBump(), curveBraking(), laneBlocked(), lerp(), nearestLane() (+3 more)

### Community 68 - "world.spec.ts"
Cohesion: 0.40
Nodes (5): Car, errors, Snap, snapshot(), waitSim()

## Knowledge Gaps
- **299 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+294 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `world.ts` to `carFactory.ts`, `app.ts`, `opponentMarker.ts`, `ai.ts`, `main.ts`, `game.ts`, `hud.ts`, `items.ts`, `touchButtons.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `WorldState` connect `world.ts` to `track.ts`, `ai.ts`, `game.ts`, `music.ts`, `hud.ts`, `mixer.test.ts`, `heli.ts`, `items.ts`, `Mixer`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `AudioBackend` connect `AudioBackend` to `mixer.test.ts`, `session.ts`, `music.ts`, `Mixer`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _299 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `world.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08359671302149178 - nodes in this community are weakly interconnected._
- **Should `carFactory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06766917293233082 - nodes in this community are weakly interconnected._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.102322206095791 - nodes in this community are weakly interconnected._