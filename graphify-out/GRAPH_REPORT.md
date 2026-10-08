# Graph Report - policia-ladrao  (2026-10-08)

## Corpus Check
- 212 files · ~155,046 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1394 nodes · 3705 edges · 88 communities (73 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05104bcb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- thiefOf
- Review Focus
- carFactory.ts
- ranking.ts
- strategy.ts
- Review Focus
- combat.spec.ts
- main.ts
- game.ts
- Review Focus
- mixer.ts
- damageView.ts
- Polícia × Ladrão — Design (v1)
- Coding Standards
- compilerOptions
- devDependencies
- Polícia × Ladrão: V2, Parte 2: dificuldade (design)
- profile.ts
- package.json
- combatFx.ts
- shopCars.ts
- Review Focus
- Mixer
- Review Focus
- scripts
- Review Focus
- eslint.config.mjs
- AudioBackend
- touchButtons.ts
- Tasks
- renderer.ts
- AGENTS.md — policia-ladrao
- Review Focus
- .prettierrc.json
- vercel.json
- car.ts
- Backlog — ideias para próximas versões
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- screens.ts
- 2. Refresh
- synth.ts
- balance.ts
- foundation.spec.ts
- visual.spec.ts
- h
- backup.ts
- meta/shop.ts
- world.ts
- WorldState
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- items.ts
- eslint-plugin-import-x
- typescript
- @types/node
- app.ts
- typescript7
- typescript-eslint
- Review Focus
- app-credit.test.ts
- session.ts
- ai.ts
- PR 1 (0.13.0): modos e Sobrevivência
- Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)
- gunner.ts
- end.ts
- stepWorld
- vitest
- @playwright/test
- worldProps.ts
- eslint
- itemsFx.ts
- projectiles.ts
- Profile
- works.ts
- policeItems.ts
- Polícia × Ladrão: V2, Parte 4: loja e skins (design)
- profileStore.ts
- DIFFICULTIES
- V2 Parte 4: loja e skins, plano de implementação
- AudioSession
- fixedStepper.ts

## God Nodes (most connected - your core abstractions)
1. `thiefOf()` - 70 edges
2. `policeOf()` - 68 edges
3. `BALANCE` - 62 edges
4. `withCar()` - 61 edges
5. `Role` - 52 edges
6. `stepWorld()` - 51 edges
7. `WorldState` - 50 edges
8. `startGame()` - 49 edges
9. `createWorld()` - 46 edges
10. `startApp()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `feedbackForFrame()` --indirect_call--> `e()`  [INFERRED]
  src/ui/feedback.ts → tests/storage/ranking.test.ts
- `createTouchButtons()` --indirect_call--> `t()`  [INFERRED]
  src/input/touchButtons.ts → tests/storage/ranking.test.ts
- `press()` --calls--> `useSpecial()`  [EXTRACTED]
  tests/sim/bombs.test.ts → src/sim/specials.ts
- `base()` --calls--> `createWorld()`  [EXTRACTED]
  tests/sim/collisions.test.ts → src/sim/world.ts
- `run()` --indirect_call--> `reduce()`  [INFERRED]
  tests/ui/flow.test.ts → src/ui/screens/flow.ts

## Import Cycles
- 3-file cycle: `src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/types.ts`
- 3-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/car.ts`
- 3-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/track.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/track.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/curves.ts -> src/sim/track.ts -> src/sim/car.ts`

## Communities (88 total, 15 thin omitted)

### Community 0 - "thiefOf"
Cohesion: 0.16
Nodes (28): initialAiMemory(), stepProjectiles(), enforceNoOvertake(), pursuitBonus(), createWorld(), policeOf(), thiefOf(), withCar() (+20 more)

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "carFactory.ts"
Cohesion: 0.13
Nodes (31): addLamps(), addWheels(), buildCivilian(), buildPolice(), buildThief(), CHROME, CIVILIAN_LAMPS, CIVILIANS (+23 more)

### Community 3 - "ranking.ts"
Cohesion: 0.14
Nodes (27): better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard(), emptyBoards(), emptyModeBoards() (+19 more)

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
Nodes (17): app, chaosEvery, debug, escapeParam, ITEMS, mute, params, q (+9 more)

### Community 8 - "game.ts"
Cohesion: 0.10
Nodes (24): createDebug(), anyOf(), GameHandle, lerpCar(), startGame(), createKeyboardInput(), IntentName, KEYMAP (+16 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "mixer.ts"
Cohesion: 0.16
Nodes (16): createMixer(), HORN_AHEAD, HORN_GAP, BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS (+8 more)

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
Nodes (15): @eslint/js, eslint-plugin-security, globals, jsdom, devDependencies, @eslint/js, eslint-plugin-security, globals (+7 more)

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "profile.ts"
Cohesion: 0.16
Nodes (18): errors, applyMatch(), emptyProfile(), isCount(), isObject(), parseProfile(), PROFILE_VERSION, ProfileStats (+10 more)

### Community 18 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, three, engines, node, name, private, type, version (+1 more)

### Community 19 - "combatFx.ts"
Cohesion: 0.35
Nodes (8): createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose

### Community 20 - "shopCars.ts"
Cohesion: 0.08
Nodes (71): addWheels(), AMBER, ARMOR, badge(), both(), box(), buildCaveirao(), CAVEIRAO_WHEEL_RADIUS (+63 more)

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
Cohesion: 0.12
Nodes (4): Note, SoundName, AudioBackend, NullBackend

### Community 28 - "touchButtons.ts"
Cohesion: 0.20
Nodes (5): BUTTONS, ICONS, IntentName, SPECIAL_ICONS, SPECIAL_NAMES

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "renderer.ts"
Cohesion: 0.12
Nodes (11): COLORS, createParticles(), Kind, Particles, puffTexture(), computeRenderSize(), createQualityGovernor(), createRenderer() (+3 more)

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

### Community 35 - "car.ts"
Cohesion: 0.13
Nodes (16): COLORS, createOpponentMarker(), markerTexture(), baseUpgrades(), CarEffects, cornering(), createCar(), NO_EFFECTS (+8 more)

### Community 36 - "Backlog — ideias para próximas versões"
Cohesion: 0.40
Nodes (4): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Progressão e retenção (anotado em 2026-10-04), Reforço da polícia: bloqueio de via (anotado em 2026-10-05)

### Community 42 - "screens.ts"
Cohesion: 0.16
Nodes (18): Difficulty, Mode, Reward, ModeBoards, choicePicker(), DIFFICULTY_LABEL, difficultyPicker(), MODE_LABEL (+10 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "synth.ts"
Cohesion: 0.26
Nodes (7): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave, SIREN_STYLES, SirenStyle

### Community 45 - "balance.ts"
Cohesion: 0.19
Nodes (16): BALANCE, stepBombs(), damageScale(), doubled(), hurt(), scaledDamage(), Scaling, takenFactor() (+8 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "h"
Cohesion: 0.15
Nodes (23): gameDelta(), renderChoose(), roleCard(), ROLES, btn(), Disposable, h(), openModal() (+15 more)

### Community 49 - "backup.ts"
Cohesion: 0.13
Nodes (19): RFC-4648, errors, G, at(), BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks() (+11 more)

### Community 50 - "meta/shop.ts"
Cohesion: 0.10
Nodes (36): buy(), BuyCheck, BY_ID, canBuy(), CarId, CarInfo, CARS, carsOf() (+28 more)

### Community 51 - "world.ts"
Cohesion: 0.16
Nodes (24): Role, CarState, clearPassedRoadblocks(), clearForScene(), innerNeighbor(), nearestLane(), over(), policeSlowed() (+16 more)

### Community 52 - "WorldState"
Cohesion: 0.13
Nodes (14): AiMemory, WorldState, ALERT_LEFT, BAD, distanceBand, FX_TEXT, HudItem, ITEM_LABEL (+6 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 54 - "items.ts"
Cohesion: 0.18
Nodes (19): applyItem(), available(), boxSpot(), colorChance(), pick(), rollItem(), stepBoxes(), applyBad() (+11 more)

### Community 58 - "app.ts"
Cohesion: 0.18
Nodes (18): startApp(), MODES, grantWelcome(), loadMode(), MODE_KEY, saveMode(), insert(), qualifies() (+10 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.15
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "session.ts"
Cohesion: 0.23
Nodes (9): createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), ICONS, createSoundToggle(), readSoundPref(), writeSoundPref() (+1 more)

### Community 67 - "ai.ts"
Cohesion: 0.05
Nodes (60): Car, errors, Snap, snapshot(), waitSim(), buildingsForChunk(), BuildingSpec, PALETTE (+52 more)

### Community 68 - "PR 1 (0.13.0): modos e Sobrevivência"
Cohesion: 0.11
Nodes (17): Global Constraints, PR 1 (0.13.0): modos e Sobrevivência, PR 2 (0.14.0): itens do ladrão, PR 3 (0.15.0): itens da polícia, Review Focus, Task 1.1: Modo e caos na simulação, dano centralizado, Task 1.2: Obras e equilíbrio do Sobrevivência, Task 1.3: Tela de modo, preferência e fluxo (+9 more)

### Community 69 - "Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)"
Cohesion: 0.11
Nodes (18): 10. Testes, 1. Objetivo, 2. Modos e fluxo, 3. Sobrevivência, 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão, 4.2.1 Ajustes da implementação (0.15.0), 4.2 Polícia (caixas azuis), 4.3.1 Ajustes da implementação (0.14.0) (+10 more)

### Community 70 - "gunner.ts"
Cohesion: 0.13
Nodes (19): CarLook, updateCarModel(), createLookModel(), disposeLookModel(), glowTexture(), plateTexture(), createCarPreview(), attachGunner() (+11 more)

### Community 71 - "end.ts"
Cohesion: 0.31
Nodes (12): formatTime(), coinsLabel(), countUp(), endReason(), initialsPad(), padBtn(), recordPanel(), reducedMotion() (+4 more)

### Community 72 - "stepWorld"
Cohesion: 0.18
Nodes (16): chaosAt(), Intents, NO_INTENTS, besideWorks(), closedAhead(), sameLane(), stepTraffic(), trafficTarget() (+8 more)

### Community 75 - "worldProps.ts"
Cohesion: 0.19
Nodes (13): createTrafficModel(), CONES_PER_WORKS, createWorksView(), signTexture(), createMysteryBox(), faceTexture(), GLYPH, haloTexture() (+5 more)

### Community 77 - "itemsFx.ts"
Cohesion: 0.19
Nodes (13): createItemsFx(), itemToast(), createCarModel(), blockSign(), createSpecialsView(), nailsGeometry(), ITEM_ICON, BAD_ICON (+5 more)

### Community 78 - "projectiles.ts"
Cohesion: 0.31
Nodes (10): canShoot(), carOf(), fireWeapons(), other(), armorFactor(), catchUpBonus(), clamp01(), distanceFactor() (+2 more)

### Community 79 - "Profile"
Cohesion: 0.18
Nodes (6): Profile, Equipped, ShopProps, mine, open(), other

### Community 80 - "works.ts"
Cohesion: 0.36
Nodes (9): clear(), hitWorks(), inside(), levelOf(), stepWorks(), Works, worksBetween(), worksInBlock() (+1 more)

### Community 81 - "policeItems.ts"
Cohesion: 0.38
Nodes (8): applyPoliceItem(), laneIndex(), placeRoadblock(), roadblockLanes(), stepWingman(), strongAt(), usePoliceSpecial(), PRESS

### Community 82 - "Polícia × Ladrão: V2, Parte 4: loja e skins (design)"
Cohesion: 0.22
Nodes (8): 1. Objetivo, 2. Catálogo e preços, 3. Regras, 4. Visual dos carros, 5. Perfil e backup, 6. Loja (layout A, "garagem"), 7. Testes, Polícia × Ladrão: V2, Parte 4: loja e skins (design)

### Community 83 - "profileStore.ts"
Cohesion: 0.36
Nodes (5): CORRUPT_KEY, loadProfile(), PROFILE_KEY, PROFILE_V1_KEY, saveProfile()

### Community 84 - "DIFFICULTIES"
Cohesion: 0.48
Nodes (4): DIFFICULTIES, DIFFICULTY_KEY, loadDifficulty(), saveDifficulty()

### Community 85 - "V2 Parte 4: loja e skins, plano de implementação"
Cohesion: 0.40
Nodes (4): Global Constraints, Review Focus, Tasks, V2 Parte 4: loja e skins, plano de implementação

## Knowledge Gaps
- **430 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+425 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `world.ts` to `thiefOf`, `carFactory.ts`, `ranking.ts`, `main.ts`, `game.ts`, `profile.ts`, `Mixer`, `touchButtons.ts`, `car.ts`, `screens.ts`, `balance.ts`, `h`, `meta/shop.ts`, `WorldState`, `items.ts`, `app.ts`, `ai.ts`, `gunner.ts`, `end.ts`, `stepWorld`, `itemsFx.ts`, `projectiles.ts`, `Profile`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `BALANCE` connect `balance.ts` to `thiefOf`, `ranking.ts`, `game.ts`, `profile.ts`, `combatFx.ts`, `car.ts`, `screens.ts`, `h`, `world.ts`, `WorldState`, `items.ts`, `ai.ts`, `end.ts`, `stepWorld`, `worldProps.ts`, `itemsFx.ts`, `projectiles.ts`, `works.ts`, `policeItems.ts`, `fixedStepper.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `AudioBackend` connect `AudioBackend` to `mixer.ts`, `synth.ts`, `session.ts`, `Mixer`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _430 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `carFactory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1310483870967742 - nodes in this community are weakly interconnected._
- **Should `ranking.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13978494623655913 - nodes in this community are weakly interconnected._
- **Should `strategy.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06376811594202898 - nodes in this community are weakly interconnected._