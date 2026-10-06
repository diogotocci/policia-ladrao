# Graph Report - policia-ladrao  (2026-10-06)

## Corpus Check
- 144 files · ~90,165 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .css 4, (none) 3, .webmanifest 1)

## Summary
- 862 nodes · 2223 edges · 47 communities (41 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `065faea0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- world.ts
- app.ts
- strategy.ts
- roadChunks.ts
- carFactory.ts
- gunner.ts
- world.spec.ts
- Review Focus
- aiStep
- main.ts
- game.ts
- music.ts
- damageView.ts
- Polícia × Ladrão — Design (v1)
- Coding Standards
- car.ts
- compilerOptions
- devDependencies
- synth.ts
- session.ts
- Mixer
- Review Focus
- package.json
- renderer.ts
- Review Focus
- Review Focus
- AudioBackend
- scripts
- three
- eslint.config.mjs
- worldProps.ts
- touchButtons.ts
- Tasks
- AGENTS.md — policia-ladrao
- rearview.ts
- eslint.test.ts
- vercel.json
- .prettierrc.json
- trackPos
- Backlog — ideias para próximas versões
- feedback.ts
- combatFx.test.ts
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md

## God Nodes (most connected - your core abstractions)
1. `vitest` - 54 edges
2. `thiefOf()` - 50 edges
3. `policeOf()` - 49 edges
4. `startGame()` - 47 edges
5. `withCar()` - 42 edges
6. `BALANCE` - 39 edges
7. `WorldState` - 37 edges
8. `stepWorld()` - 36 edges
9. `createWorld()` - 33 edges
10. `Role` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Task 6: Tudo no mundo curvo` --references--> `updateCarModel()`  [INFERRED]
  docs/superpowers/plans/2026-10-04-entrega-6-curvas.md → src/render/carFactory.ts
- `Task 1: Retrovisor` --references--> `isBehind()`  [INFERRED]
  docs/superpowers/plans/2026-10-03-entrega-3-mundo.md → src/render/rearview.ts
- `Task 7: Pipeline PS1` --references--> `createRenderer()`  [INFERRED]
  docs/superpowers/plans/2026-10-03-entrega-1-fundacao.md → src/render/renderer.ts
- `Task 3: Movimento do carro` --references--> `stepCar()`  [INFERRED]
  docs/superpowers/plans/2026-10-03-entrega-1-fundacao.md → src/sim/car.ts
- `Task 7: Passo do mundo, equilíbrio e pendências da entrega 2` --references--> `stepWorld()`  [INFERRED]
  docs/superpowers/plans/2026-10-03-entrega-3-mundo.md → src/sim/world.ts

## Import Cycles
- None detected.

## Communities (47 total, 6 thin omitted)

### Community 0 - "world.ts"
Cohesion: 0.07
Nodes (100): Task 7: Passo do mundo e fim da partida, Task 2: Quebra-molas e pulo, Task 4: Caixinhas e itens, vitest, BALANCE, Role, AiMemory, initialAiMemory() (+92 more)

### Community 1 - "app.ts"
Cohesion: 0.08
Nodes (46): startApp(), dispatch(), createCarModel(), createCarPreview(), attachGunner(), updateGunner(), better(), Board (+38 more)

### Community 2 - "strategy.ts"
Cohesion: 0.07
Nodes (31): alwaysOnRules(), descriptionOf(), frontMatter(), root, rulesDir, skills, skillsDir, usingSuperpowers (+23 more)

### Community 3 - "roadChunks.ts"
Cohesion: 0.12
Nodes (22): buildingsForChunk(), BuildingSpec, PALETTE, smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot (+14 more)

### Community 4 - "carFactory.ts"
Cohesion: 0.13
Nodes (30): addLamps(), addWheels(), buildCivilian(), buildPolice(), buildThief(), CHROME, CIVILIAN_LAMPS, CIVILIANS (+22 more)

### Community 5 - "gunner.ts"
Cohesion: 0.09
Nodes (25): Entrega 2 — Combate: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do combate, Task 11: Verificação, revisão e entrega, Task 1: Regras puras e números, Task 2: Mundo com dois carros, Task 3: Colisões e imunidade (+17 more)

### Community 6 - "world.spec.ts"
Cohesion: 0.08
Nodes (17): Car, errors, Snap, snapshot(), waitSim(), errors, G, errors (+9 more)

### Community 7 - "Review Focus"
Cohesion: 0.07
Nodes (17): Entrega 1 — Fundação: Plano de Implementação, Global Constraints, Review Focus, Task 0: Skill three-webgl-game e comandos no AGENTS.md, Task 10: Montagem, câmera, debug e e2e, Task 11: Verificação final e entrega, Task 1: Projeto base, Task 2: RNG com semente e regra de pureza do sim (+9 more)

### Community 8 - "aiStep"
Cohesion: 0.11
Nodes (23): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 3: Tráfego, Task 5: Bombas (+15 more)

### Community 9 - "main.ts"
Cohesion: 0.13
Nodes (15): app, debug, escapeParam, ITEMS, mute, params, q, seedParam (+7 more)

### Community 10 - "game.ts"
Cohesion: 0.16
Nodes (13): Task 4: Mundo e passo fixo, Task 3: Jogo pausável e reiniciável, createDebug(), anyOf(), lerpCar(), startGame(), createKeyboardInput(), IntentName (+5 more)

### Community 11 - "music.ts"
Cohesion: 0.16
Nodes (17): createMixer(), BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS, MENU_DRUM, MENU_LEAD (+9 more)

### Community 12 - "damageView.ts"
Cohesion: 0.13
Nodes (16): applyDamage(), CarDamageState, clamp01(), crackTexture(), damageLook, deform(), DIR, DIRT (+8 more)

### Community 13 - "Polícia × Ladrão — Design (v1)"
Cohesion: 0.11
Nodes (18): 10. Arquitetura, 11. Testes, 12. Entregas, 1. Visão, 2. Partida, 3. Pista e movimento, 4.1 Tiros, 4.2 Tabela de dano (valores iniciais em `config/balance.ts`) (+10 more)

### Community 14 - "Coding Standards"
Cohesion: 0.11
Nodes (17): AI attribution, Architecture invariants, Coding Standards, Comments, Completion quality, Configuration, Dependencies, Emojis (+9 more)

### Community 15 - "car.ts"
Cohesion: 0.15
Nodes (12): COLORS, createOpponentMarker(), markerTexture(), baseUpgrades(), cornering(), createCar(), Upgrades, atCruise() (+4 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch, noUncheckedIndexedAccess (+8 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, eslint, @eslint/js, eslint-plugin-import-x, eslint-plugin-security, globals, jsdom, @playwright/test (+8 more)

### Community 18 - "synth.ts"
Cohesion: 0.20
Nodes (8): Note, envelopeAt(), recipeDuration(), RECIPES, SoundName, Voice, Wave, NullBackend

### Community 19 - "session.ts"
Cohesion: 0.23
Nodes (9): createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), ICONS, createSoundToggle(), readSoundPref(), writeSoundPref() (+1 more)

### Community 20 - "Mixer"
Cohesion: 0.13
Nodes (3): Task 5: Tiros com mira automática, Mixer, AudioSession

### Community 21 - "Review Focus"
Cohesion: 0.14
Nodes (11): Entrega 5 — Meta: Plano de Implementação, Global Constraints, Review Focus, Task 1: Ranking (storage puro), Task 2: Máquina de fluxo das telas, Task 4: Telas (DOM), Task 5: Sons das telas, Task 6: Offline (service worker) (+3 more)

### Community 22 - "package.json"
Cohesion: 0.13
Nodes (14): dependencies, three, engines, node, name, private, type, version (+6 more)

### Community 23 - "renderer.ts"
Cohesion: 0.20
Nodes (10): COLORS, createParticles(), Kind, puffTexture(), computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER (+2 more)

### Community 24 - "Review Focus"
Cohesion: 0.15
Nodes (12): Entrega 6 — Curvas suaves: Plano de Implementação, Global Constraints, Review Focus, Task 1: Traçado (sim), Task 2: Física da curva e freio, Task 3: IA nas curvas, Task 4: Centro da pista no mundo, Task 5: Rua, calçadas e prédios curvos (+4 more)

### Community 25 - "Review Focus"
Cohesion: 0.17
Nodes (10): Entrega 4 — Visual e áudio: Plano de Implementação, Global Constraints, Review Focus, Task 1: Dano visual nos carros, Task 2: Partículas — fumaça, faíscas de dano e explosão, Task 3: Atirador na janela do carona, Task 5: Música chiptune, Task 6: Botão de som e wiring no jogo (+2 more)

### Community 27 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, format, format:check, lint, lint:fix (+4 more)

### Community 28 - "three"
Cohesion: 0.33
Nodes (9): three, createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y (+1 more)

### Community 29 - "eslint.config.mjs"
Cohesion: 0.18
Nodes (9): BROWSER_GLOBALS, local, require, SIM_FORBIDDEN_IMPORTS, @eslint/js, eslint-plugin-import-x, eslint-plugin-security, globals (+1 more)

### Community 30 - "worldProps.ts"
Cohesion: 0.31
Nodes (9): Task 9: Carros em código, Task 8: Render do mundo, createTrafficModel(), updateCarModel(), bumpSignTexture(), chevronTexture(), createWorldProps(), stripeTexture() (+1 more)

### Community 31 - "touchButtons.ts"
Cohesion: 0.24
Nodes (5): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName

### Community 32 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 33 - "AGENTS.md — policia-ladrao"
Cohesion: 0.29
Nodes (6): 1. Regras sempre ativas e skills — use sem esperar o usuário pedir, 2. Git: o agente nunca commita, faz push nem abre PR, 3. Projeto, 4. Manutenção das skills, AGENTS.md — policia-ladrao, Mapeamento de nomes (skills do Superpowers)

### Community 34 - "rearview.ts"
Cohesion: 0.48
Nodes (5): Naming, createRearview(), isBehind(), rearviewRect(), TIER

### Community 35 - "eslint.test.ts"
Cohesion: 0.29
Nodes (3): eslint, maxFileLines, require

### Community 36 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, $schema

### Community 37 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): arrowParens, printWidth, semi, singleQuote, trailingComma

### Community 38 - "trackPos"
Cohesion: 0.53
Nodes (3): createChaseCamera(), active, trackPos()

### Community 39 - "Backlog — ideias para próximas versões"
Cohesion: 0.40
Nodes (4): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Progressão e retenção (anotado em 2026-10-04), Reforço da polícia: bloqueio de via (anotado em 2026-10-05)

### Community 40 - "feedback.ts"
Cohesion: 0.70
Nodes (3): Feedback, feedbackFor(), feedbackForFrame()

### Community 41 - "combatFx.test.ts"
Cohesion: 0.50
Nodes (3): hit, proj(), withProjectiles()

## Knowledge Gaps
- **269 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+264 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 358 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `world.ts` to `app.ts`, `strategy.ts`, `roadChunks.ts`, `gunner.ts`, `main.ts`, `game.ts`, `music.ts`, `damageView.ts`, `car.ts`, `synth.ts`, `session.ts`, `package.json`, `renderer.ts`, `three`, `touchButtons.ts`, `rearview.ts`, `eslint.test.ts`, `trackPos`, `feedback.ts`, `combatFx.test.ts`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `startGame()` (e.g. with `Task 3: Jogo pausável e reiniciável` and `.advance()`) actually correct?**
  _`startGame()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _269 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `world.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06691919191919192 - nodes in this community are weakly interconnected._
- **Why does `three` connect `three` to `world.ts`, `app.ts`, `rearview.ts`, `roadChunks.ts`, `carFactory.ts`, `gunner.ts`, `trackPos`, `combatFx.test.ts`, `game.ts`, `damageView.ts`, `car.ts`, `package.json`, `renderer.ts`, `worldProps.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08035714285714286 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `world.spec.ts` to `strategy.ts`, `package.json`, `Review Focus`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._