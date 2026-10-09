# Graph Report - policia-ladrao  (2026-10-09)

## Corpus Check
- 242 files · ~182,042 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1618 nodes · 4483 edges · 96 communities (77 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f836b1b7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- world.ts
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
- ai.ts
- package.json
- combatFx.ts
- kit.ts
- Review Focus
- Mixer
- Review Focus
- scripts
- Review Focus
- eslint.config.mjs
- AudioBackend
- career.ts
- Tasks
- particles.ts
- Polícia × Ladrão
- Review Focus
- .prettierrc.json
- vercel.json
- itemsFx.ts
- Pendente
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- thiefOf
- garage.ts
- 2. Refresh
- synth.ts
- h
- foundation.spec.ts
- visual.spec.ts
- intents.ts
- backup.ts
- meta/shop.ts
- V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros
- hud.ts
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- renderer.ts
- eslint-plugin-import-x
- typescript
- @types/node
- ui/shop.test.ts
- car.ts
- typescript-eslint
- Review Focus
- app-credit.test.ts
- appMatch.ts
- balance.ts
- PR 1 (0.13.0): modos e Sobrevivência
- Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)
- trackFrame.ts
- projectiles.ts
- careerScreen.ts
- vitest
- @playwright/test
- screens.ts
- app.ts
- Role
- items.ts
- Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)
- opponentMarker.ts
- V2 Parte 5: Carreira, plano de implementação
- Polícia × Ladrão: V2, Parte 4: loja e skins (design)
- profile.ts
- session.ts
- V2 Parte 4: loja e skins, plano de implementação
- progress.ts
- typescript7
- keyboard.ts
- mysteryBox.ts
- GameHandle
- fixedStepper.ts
- AudioSession
- admin.test.ts
- ui/icons.ts
- eslint

## God Nodes (most connected - your core abstractions)
1. `Role` - 71 edges
2. `thiefOf()` - 70 edges
3. `policeOf()` - 69 edges
4. `BALANCE` - 62 edges
5. `withCar()` - 61 edges
6. `stepWorld()` - 51 edges
7. `startGame()` - 50 edges
8. `WorldState` - 50 edges
9. `h()` - 50 edges
10. `createWorld()` - 46 edges

## Surprising Connections (you probably didn't know these)
- `createLookModel()` --indirect_call--> `mat()`  [INFERRED]
  src/render/carLook.ts → tests/render/damageView.test.ts
- `drive()` --calls--> `stepCar()`  [EXTRACTED]
  tests/sim/curvesPhysics.test.ts → src/sim/car.ts
- `run()` --calls--> `stepWorld()`  [EXTRACTED]
  tests/sim/chaos.test.ts → src/sim/world.ts
- `play()` --calls--> `stepWorld()`  [EXTRACTED]
  tests/sim/world.test.ts → src/sim/world.ts
- `feedbackForFrame()` --indirect_call--> `e()`  [INFERRED]
  src/ui/feedback.ts → tests/storage/ranking.test.ts

## Import Cycles
- 3-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/car.ts`
- 3-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts`
- 3-file cycle: `src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/types.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/track.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/curves.ts -> src/sim/track.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/track.ts -> src/sim/car.ts`

## Communities (96 total, 19 thin omitted)

### Community 0 - "world.ts"
Cohesion: 0.17
Nodes (23): stepBombs(), chaosAt(), damageScale(), doubled(), hurt(), scaledDamage(), Scaling, takenFactor() (+15 more)

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "carFactory.ts"
Cohesion: 0.05
Nodes (70): buildCivilian(), buildPolice(), buildThief(), CIVILIAN_LAMPS, CIVILIANS, CivilianSpec, createCarModel(), createTrafficModel() (+62 more)

### Community 3 - "ranking.ts"
Cohesion: 0.13
Nodes (29): better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard(), emptyBoards(), emptyModeBoards() (+21 more)

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
Cohesion: 0.13
Nodes (23): createDebug(), anyOf(), lerpCar(), startGame(), addEvents(), emptyStats(), createChaseCamera(), createCarSmoke() (+15 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "mixer.ts"
Cohesion: 0.16
Nodes (16): createMixer(), HORN_AHEAD, HORN_GAP, BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS (+8 more)

### Community 11 - "damageView.ts"
Cohesion: 0.14
Nodes (17): applyDamage(), CarDamageState, clamp01(), crackTexture(), damageLook, deform(), DIR, DIRT (+9 more)

### Community 12 - "Polícia × Ladrão — Design (v1)"
Cohesion: 0.11
Nodes (18): 10. Arquitetura, 11. Testes, 12. Entregas, 1. Visão, 2. Partida, 3. Pista e movimento, 4.1 Tiros, 4.2 Tabela de dano (valores iniciais em `config/balance.ts`) (+10 more)

### Community 13 - "Coding Standards"
Cohesion: 0.10
Nodes (20): AI attribution, Architecture invariants, Coding Standards, Comments, Completion quality, Configuration, Dependencies, Dependencies and security updates (+12 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (28): api, DOM, DOM.Iterable, e2e, ES2022, node, playwright.config.ts, src (+20 more)

### Community 15 - "devDependencies"
Cohesion: 0.13
Nodes (15): @eslint/js, eslint-plugin-security, globals, jsdom, devDependencies, @eslint/js, eslint-plugin-security, globals (+7 more)

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "ai.ts"
Cohesion: 0.19
Nodes (24): aimedAt(), aiStep(), bumpCovers(), considerBombs(), considerBump(), considerHazards(), curveBraking(), laneBlocked() (+16 more)

### Community 18 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, three, engines, node, name, private, type, version (+1 more)

### Community 19 - "combatFx.ts"
Cohesion: 0.21
Nodes (12): createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose (+4 more)

### Community 20 - "kit.ts"
Cohesion: 0.09
Nodes (69): addWheels(), AMBER, ARMOR, both(), box(), buildCaveirao(), CAVEIRAO_WHEEL_RADIUS, DARK (+61 more)

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

### Community 28 - "career.ts"
Cohesion: 0.11
Nodes (36): ACHIEVEMENTS, awaitingClaim(), Career, careerAfterMatch(), claim(), claimCoins(), Counters, dailyProgress() (+28 more)

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "particles.ts"
Cohesion: 0.15
Nodes (5): COLORS, createParticles(), Kind, Particles, puffTexture()

### Community 31 - "Polícia × Ladrão"
Cohesion: 0.12
Nodes (15): 1. Regras sempre ativas e skills — use sem esperar o usuário pedir, 2. Git: o agente nunca commita, faz push nem abre PR, 3. Projeto, 4. Manutenção das skills, AGENTS.md — policia-ladrao, Mapeamento de nomes (skills do Superpowers), Como se joga, Contribuindo (+7 more)

### Community 32 - "Review Focus"
Cohesion: 0.17
Nodes (11): Entrega 5 — Meta: Plano de Implementação, Global Constraints, Review Focus, Task 1: Ranking (storage puro), Task 2: Máquina de fluxo das telas, Task 3: Jogo pausável e reiniciável, Task 4: Telas (DOM), Task 5: Sons das telas (+3 more)

### Community 33 - ".prettierrc.json"
Cohesion: 0.29
Nodes (6): arrowParens, endOfLine, printWidth, semi, singleQuote, trailingComma

### Community 34 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, $schema

### Community 35 - "itemsFx.ts"
Cohesion: 0.10
Nodes (18): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName, SPECIAL_ICONS, SPECIAL_NAMES, createItemsFx() (+10 more)

### Community 36 - "Pendente"
Cohesion: 0.29
Nodes (6): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Feito, Mais coisas na loja (anotado em 2026-10-09), Pendente, V3: conta, servidor e dinheiro de verdade

### Community 41 - "thiefOf"
Cohesion: 0.14
Nodes (37): initialAiMemory(), resolveCollisions(), stepMystery(), stepWingman(), enforceNoOvertake(), pursuitBonus(), clearForScene(), policeSlowed() (+29 more)

### Community 42 - "garage.ts"
Cohesion: 0.13
Nodes (28): FINISH_NAMES, FINISHES, LEGENDARY, MASTERY_CARS, MASTERY_MAX, MASTERY_REWARDS, MASTERY_XP, masteryLevel() (+20 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "synth.ts"
Cohesion: 0.29
Nodes (7): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave, SIREN_STYLES, SirenStyle

### Community 45 - "h"
Cohesion: 0.19
Nodes (21): formatTime(), openStreak(), choicePicker(), coinsLabel(), DIFFICULTY_LABEL, difficultyPicker(), MODE_LABEL, modePicker() (+13 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "intents.ts"
Cohesion: 0.22
Nodes (11): baseUpgrades(), createCar(), Intents, NO_INTENTS, atCruise(), run(), atSpeed(), drive() (+3 more)

### Community 49 - "backup.ts"
Cohesion: 0.09
Nodes (25): RFC-4648, errors, G, at(), BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks() (+17 more)

### Community 50 - "meta/shop.ts"
Cohesion: 0.10
Nodes (36): garageCars(), FinishId, BuyCheck, BY_ID, canBuy(), CAR_IDS, CarLook, CARS (+28 more)

### Community 51 - "V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros"
Cohesion: 0.14
Nodes (13): 1. Objetivo, 2. Maestria por carro, 3.1 Acabamentos (por carro), 3.2 Adesivos (por carro), 3.3 Rodas (por lado), 3.4 Fumaça colorida (por lado), 3.5 Acessórios (só ladrão), 3. Cosméticos novos (+5 more)

### Community 52 - "hud.ts"
Cohesion: 0.22
Nodes (10): ALERT_LEFT, BAD, createHud(), distanceBand, el(), FX_TEXT, HudItem, ITEM_ICON (+2 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 54 - "renderer.ts"
Cohesion: 0.48
Nodes (5): computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER, QUALITY

### Community 58 - "ui/shop.test.ts"
Cohesion: 0.16
Nodes (17): errors, profileActions(), emptyCareer(), emptyCounters(), claimReward(), emptyProfile(), buy(), randomLook() (+9 more)

### Community 59 - "car.ts"
Cohesion: 0.10
Nodes (36): blockSign(), createSpecialsView(), nailsGeometry(), AiMemory, CarEffects, CarState, cornering(), NO_EFFECTS (+28 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.14
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "appMatch.ts"
Cohesion: 0.22
Nodes (16): settleEnd(), Difficulty, Mode, GameOptions, MatchEnd, CareerEvent, settleCareer(), MatchStats (+8 more)

### Community 67 - "balance.ts"
Cohesion: 0.12
Nodes (21): Car, errors, Snap, snapshot(), waitSim(), BALANCE, CONES_PER_WORKS, createWorksView() (+13 more)

### Community 68 - "PR 1 (0.13.0): modos e Sobrevivência"
Cohesion: 0.11
Nodes (17): Global Constraints, PR 1 (0.13.0): modos e Sobrevivência, PR 2 (0.14.0): itens do ladrão, PR 3 (0.15.0): itens da polícia, Review Focus, Task 1.1: Modo e caos na simulação, dano centralizado, Task 1.2: Obras e equilíbrio do Sobrevivência, Task 1.3: Tela de modo, preferência e fluxo (+9 more)

### Community 69 - "Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)"
Cohesion: 0.11
Nodes (18): 10. Testes, 1. Objetivo, 2. Modos e fluxo, 3. Sobrevivência, 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão, 4.2.1 Ajustes da implementação (0.15.0), 4.2 Polícia (caixas azuis), 4.3.1 Ajustes da implementação (0.14.0) (+10 more)

### Community 70 - "trackFrame.ts"
Cohesion: 0.15
Nodes (18): buildingsForChunk(), BuildingSpec, PALETTE, smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot (+10 more)

### Community 71 - "projectiles.ts"
Cohesion: 0.16
Nodes (20): canShoot(), carOf(), fireWeapons(), other(), stepProjectiles(), armorFactor(), catchUpBonus(), clamp01() (+12 more)

### Community 72 - "careerScreen.ts"
Cohesion: 0.16
Nodes (19): STREAK_COINS, achievementsPanel(), bar(), careerStrip(), challengeRow(), Claim, itemName(), n() (+11 more)

### Community 75 - "screens.ts"
Cohesion: 0.13
Nodes (26): ModeBoards, gameDelta(), renderCareer(), renderChoose(), roleCard(), ROLES, btn(), Disposable (+18 more)

### Community 76 - "app.ts"
Cohesion: 0.12
Nodes (23): checkAdminPassword(), startApp(), MENU_MUSIC, wireAppEvents(), addRecord(), DIFFICULTIES, MODES, DIFFICULTY_KEY (+15 more)

### Community 77 - "Role"
Cohesion: 0.10
Nodes (16): v(), Role, Achievement, Daily, dayAfter(), FIRST_POOL, firstPoolDay(), MatchSummary (+8 more)

### Community 78 - "items.ts"
Cohesion: 0.15
Nodes (18): Layout, applyItem(), available(), boxSpot(), colorChance(), pick(), rollItem(), stepBoxes() (+10 more)

### Community 79 - "Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. Desafios do dia e sequência, 3. Conquistas e patentes, 4. Loja com desbloqueio, 5. Telas, 6. Perfil e backup, 7. Testes, 8. Resgatar e insígnias (playtest 2026-10-08, mockup `mockup-patentes.html`) (+2 more)

### Community 80 - "opponentMarker.ts"
Cohesion: 0.60
Nodes (3): COLORS, createOpponentMarker(), markerTexture()

### Community 82 - "Polícia × Ladrão: V2, Parte 4: loja e skins (design)"
Cohesion: 0.20
Nodes (9): 1. Objetivo, 2. Catálogo e preços, 3. Regras, 4. Visual dos carros, 5. Perfil e backup, 6. Loja (layout A, "garagem"), 7. Testes, Modo admin (playtest 2026-10-09) (+1 more)

### Community 83 - "profile.ts"
Cohesion: 0.14
Nodes (19): careerFromStats(), applyMatch(), grantWelcome(), isCount(), isObject(), parseProfile(), PROFILE_VERSION, ProfileStats (+11 more)

### Community 84 - "session.ts"
Cohesion: 0.28
Nodes (9): Ctx, createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), createSoundToggle(), readSoundPref(), writeSoundPref() (+1 more)

### Community 85 - "V2 Parte 4: loja e skins, plano de implementação"
Cohesion: 0.40
Nodes (4): Global Constraints, Review Focus, Tasks, V2 Parte 4: loja e skins, plano de implementação

### Community 86 - "progress.ts"
Cohesion: 0.57
Nodes (6): adminPanel(), copyCode(), n(), openProgress(), restorePanel(), statsGrid()

### Community 88 - "keyboard.ts"
Cohesion: 0.40
Nodes (3): createKeyboardInput(), IntentName, KEYMAP

### Community 89 - "mysteryBox.ts"
Cohesion: 0.53
Nodes (5): createMysteryBox(), faceTexture(), GLYPH, haloTexture(), pulseMysteryHalo()

## Knowledge Gaps
- **473 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+468 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `Role` to `world.ts`, `carFactory.ts`, `ranking.ts`, `main.ts`, `game.ts`, `ai.ts`, `career.ts`, `itemsFx.ts`, `thiefOf`, `garage.ts`, `h`, `meta/shop.ts`, `hud.ts`, `ui/shop.test.ts`, `car.ts`, `appMatch.ts`, `balance.ts`, `projectiles.ts`, `careerScreen.ts`, `screens.ts`, `app.ts`, `items.ts`, `opponentMarker.ts`, `profile.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `AudioBackend` connect `AudioBackend` to `mixer.ts`, `session.ts`, `Mixer`, `synth.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `BALANCE` connect `balance.ts` to `world.ts`, `appMatch.ts`, `ranking.ts`, `trackFrame.ts`, `projectiles.ts`, `game.ts`, `thiefOf`, `fixedStepper.ts`, `screens.ts`, `h`, `items.ts`, `intents.ts`, `ai.ts`, `combatFx.ts`, `profile.ts`, `hud.ts`, `car.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _473 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `carFactory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0533515731874145 - nodes in this community are weakly interconnected._
- **Should `ranking.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1253968253968254 - nodes in this community are weakly interconnected._
- **Should `strategy.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06376811594202898 - nodes in this community are weakly interconnected._