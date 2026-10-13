# Graph Report - policia-ladrao  (2026-10-13)

## Corpus Check
- 320 files · ~283,406 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2138 nodes · 6323 edges · 116 communities (96 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e10b534`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Role
- Review Focus
- meta/profile.ts
- storage/ranking.ts
- strategy.ts
- Review Focus
- combat.spec.ts
- src/main.ts
- game.ts
- Review Focus
- mixer.ts
- damageView.ts
- Polícia × Ladrão — Design (v1)
- Coding Standards
- compilerOptions
- devDependencies
- Polícia × Ladrão: V2, Parte 2: dificuldade (design)
- Profile
- package.json
- screens.ts
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
- appMatch.ts
- Google Play: do pacote à loja
- Review Focus
- .prettierrc.json
- vercel.json
- carLook.ts
- Pendente
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- thiefOf
- meta/shop.ts
- 2. Refresh
- sfx.ts
- app.ts
- foundation.spec.ts
- visual.spec.ts
- scene.ts
- backup.ts
- mastery.ts
- V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros
- world.ts
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- users.ts
- eslint-plugin-import-x
- screens/shopParts.ts
- @types/node
- carFactory.ts
- ai.ts
- typescript-eslint
- Review Focus
- app-credit.test.ts
- careerScreen.ts
- envDeps
- PR 1 (0.13.0): modos e Sobrevivência
- Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)
- roadChunks.ts
- WorldState
- json
- emptyProfile
- @playwright/test
- howto.ts
- api.ts
- meta/records.ts
- items.ts
- Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)
- projectiles.ts
- V2 Parte 5: Carreira, plano de implementação
- Polícia × Ladrão: V2, Parte 4: loja e skins (design)
- h
- audio/session.ts
- V2 Parte 4: loja e skins, plano de implementação
- caveirao.ts
- typescript7
- progress.ts
- car.ts
- itemsFx.ts
- db.ts
- appAccount.ts
- Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play
- Particles
- screens/account.ts
- meta/events.ts
- dependencies
- GameHandle
- screens.spec.ts
- worldProps.ts
- http.ts
- eslint-plugin-security
- globals
- @types/three
- api/ranking.test.ts
- AccountApi
- ui/icons.ts
- admin/main.ts
- traffic.ts
- balance.ts
- mobileShell.ts
- fixedStepper.ts

## God Nodes (most connected - your core abstractions)
1. `Role` - 85 edges
2. `thiefOf()` - 70 edges
3. `policeOf()` - 69 edges
4. `h()` - 65 edges
5. `BALANCE` - 63 edges
6. `withCar()` - 61 edges
7. `stepWorld()` - 52 edges
8. `WorldState` - 51 edges
9. `startGame()` - 50 edges
10. `Profile` - 49 edges

## Surprising Connections (you probably didn't know these)
- `createLookModel()` --indirect_call--> `mat()`  [INFERRED]
  src/render/carLook.ts → tests/render/damageView.test.ts
- `eventsPost()` --indirect_call--> `parseEvent()`  [INFERRED]
  api/_lib/http.ts → src/meta/events.ts
- `Stored` --references--> `Profile`  [EXTRACTED]
  api/_lib/users.ts → src/meta/profile.ts
- `enter()` --indirect_call--> `traffic()`  [INFERRED]
  src/main.ts → tests/render/worldProps.test.ts
- `setup()` --calls--> `createCarSmoke()`  [EXTRACTED]
  tests/render/carSmoke.test.ts → src/render/carSmoke.ts

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

## Communities (116 total, 20 thin omitted)

### Community 0 - "Role"
Cohesion: 0.10
Nodes (26): Role, GameOptions, MatchEnd, Achievement, addEvents(), emptyStats(), MatchStats, rewardFor() (+18 more)

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "meta/profile.ts"
Cohesion: 0.11
Nodes (26): errors, profileActions(), careerFromStats(), emptyCareer(), emptyCounters(), isCount(), isDate(), parseCareer() (+18 more)

### Community 3 - "storage/ranking.ts"
Cohesion: 0.13
Nodes (28): better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard(), emptyBoards(), emptyModeBoards() (+20 more)

### Community 4 - "strategy.ts"
Cohesion: 0.05
Nodes (39): alwaysOnRules(), descriptionOf(), frontMatter(), root, rulesDir, skills, skillsDir, usingSuperpowers (+31 more)

### Community 5 - "Review Focus"
Cohesion: 0.12
Nodes (15): Entrega 1 — Fundação: Plano de Implementação, Global Constraints, Review Focus, Task 0: Skill three-webgl-game e comandos no AGENTS.md, Task 10: Montagem, câmera, debug e e2e, Task 11: Verificação final e entrega, Task 1: Projeto base, Task 2: RNG com semente e regra de pureza do sim (+7 more)

### Community 6 - "combat.spec.ts"
Cohesion: 0.29
Nodes (5): Car, errors, Snap, snapshot(), waitSim()

### Community 7 - "src/main.ts"
Cohesion: 0.13
Nodes (14): useDevApi(), app, chaosEvery, debug, enter(), escapeParam, ITEMS, mute (+6 more)

### Community 8 - "game.ts"
Cohesion: 0.08
Nodes (39): createDebug(), anyOf(), lerpCar(), startGame(), createKeyboardInput(), IntentName, KEYMAP, INSTANT_POLICE (+31 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "mixer.ts"
Cohesion: 0.15
Nodes (16): HORN_AHEAD, HORN_GAP, BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS, MENU_DRUM (+8 more)

### Community 11 - "damageView.ts"
Cohesion: 0.13
Nodes (15): CarDamageState, clamp01(), crackTexture(), deform(), DIR, DIRT, init(), ORIG (+7 more)

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
Cohesion: 0.12
Nodes (17): @electric-sql/pglite, eslint, @eslint/js, jsdom, devDependencies, @electric-sql/pglite, eslint, @eslint/js (+9 more)

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "Profile"
Cohesion: 0.24
Nodes (3): Profile, SoundId, ShopProps

### Community 18 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 19 - "screens.ts"
Cohesion: 0.12
Nodes (26): Difficulty, Mode, RANK_NAMES, MatchEndData, choicePicker(), DIFFICULTY_LABEL, difficultyPicker(), MODE_LABEL (+18 more)

### Community 20 - "kit.ts"
Cohesion: 0.08
Nodes (92): ACCESSORY_SPOTS, antenna(), BUILD, CHROME, exhaust(), FLAME, FLAME_CORE, LAMP (+84 more)

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
Cohesion: 0.09
Nodes (40): ACHIEVEMENTS, awaitingClaim(), careerAfterMatch(), claim(), claimCoins(), Counters, meets(), NEON_FIRST (+32 more)

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "appMatch.ts"
Cohesion: 0.18
Nodes (12): addRecord(), Ctx, globalRecord(), MatchReporter, reportMatch(), applyMatch(), settleMatch(), goesGlobal() (+4 more)

### Community 31 - "Google Play: do pacote à loja"
Cohesion: 0.05
Nodes (36): 1. Regras sempre ativas e skills — use sem esperar o usuário pedir, 2. Git: o agente nunca commita, faz push nem abre PR, 3. Projeto, 4. Manutenção das skills, AGENTS.md — policia-ladrao, Mapeamento de nomes (skills do Superpowers), 1. Banco no Neon, 2. Client ID do Google (+28 more)

### Community 32 - "Review Focus"
Cohesion: 0.17
Nodes (11): Entrega 5 — Meta: Plano de Implementação, Global Constraints, Review Focus, Task 1: Ranking (storage puro), Task 2: Máquina de fluxo das telas, Task 3: Jogo pausável e reiniciável, Task 4: Telas (DOM), Task 5: Sons das telas (+3 more)

### Community 33 - ".prettierrc.json"
Cohesion: 0.29
Nodes (6): arrowParens, endOfLine, printWidth, semi, singleQuote, trailingComma

### Community 34 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, cleanUrls, framework, headers, installCommand, outputDirectory, $schema

### Community 35 - "carLook.ts"
Cohesion: 0.09
Nodes (32): addAccessory(), blinkLightbar(), DEFORMABLE, flickerFlames(), instantiate(), updateCarModel(), addParts(), createLookModel() (+24 more)

### Community 36 - "Pendente"
Cohesion: 0.29
Nodes (6): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Feito, Mais coisas na loja (anotado em 2026-10-09), Pendente, V3: conta, servidor e Google Play

### Community 41 - "thiefOf"
Cohesion: 0.17
Nodes (31): initialAiMemory(), resolveCollisions(), slow(), enforceNoOvertake(), pursuitBonus(), clearForScene(), createWorld(), policeOf() (+23 more)

### Community 42 - "meta/shop.ts"
Cohesion: 0.08
Nodes (51): garageCars(), CAR_IDS, CarId, CarInfo, CARS, carsOf(), DEFAULT_CAR, FinishId (+43 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "sfx.ts"
Cohesion: 0.39
Nodes (6): envelopeAt(), recipeDuration(), RECIPES, v(), Voice, Wave

### Community 45 - "app.ts"
Cohesion: 0.11
Nodes (29): startApp(), MENU_MUSIC, wireAppEvents(), settleEnd(), localDate(), grantWelcome(), DIFFICULTY_KEY, loadDifficulty() (+21 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "scene.ts"
Cohesion: 0.24
Nodes (10): computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER, QUALITY, createLighting(), makeStreetEnvironment(), SHADOW_BOX (+2 more)

### Community 49 - "backup.ts"
Cohesion: 0.12
Nodes (24): RFC-4648, at(), BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks(), crc32(), CRC_TABLE (+16 more)

### Community 50 - "mastery.ts"
Cohesion: 0.13
Nodes (26): FINISH_NAMES, FINISHES, FIRST_CARS, LEGENDARY, MASTERY_MAX, MASTERY_REWARDS, MASTERY_XP, masteryLevelFor() (+18 more)

### Community 51 - "V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros"
Cohesion: 0.12
Nodes (15): 1. Objetivo, 2. Maestria por carro, 3.1 Acabamentos (por carro), 3.2 Adesivos (por carro), 3.3 Rodas (por lado), 3.4 Fumaça colorida (por lado), 3.5 Acessórios (só ladrão), 3.6 Onde vai cada adesivo (playtest 2026-10-09) (+7 more)

### Community 52 - "world.ts"
Cohesion: 0.13
Nodes (26): stepCar(), chaosAt(), Intents, NO_INTENTS, clearPassedRoadblocks(), addSpecial(), innerNeighbor(), nearestLane() (+18 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 54 - "users.ts"
Cohesion: 0.11
Nodes (23): GET(), serverEvent(), GoogleUser, verifyGoogleToken(), adminStatsGet(), Account, ADMIN_EMAIL, deleteAccount() (+15 more)

### Community 56 - "screens/shopParts.ts"
Cohesion: 0.18
Nodes (20): ACCESSORY_IDS, ACCESSORY_NAMES, AccessoryId, SMOKE_COLORS, SmokeColor, SMOKES, WHEEL_NAMES, WHEEL_STYLES (+12 more)

### Community 58 - "carFactory.ts"
Cohesion: 0.15
Nodes (32): buildCivilian(), buildPolice(), buildThief(), CIVILIAN_LAMPS, CIVILIANS, CivilianSpec, SHADOW_CASTERS, template() (+24 more)

### Community 59 - "ai.ts"
Cohesion: 0.12
Nodes (34): aimedAt(), AiMemory, aiStep(), bumpCovers(), considerBombs(), considerBump(), considerHazards(), curveBraking() (+26 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.14
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "careerScreen.ts"
Cohesion: 0.11
Nodes (28): Career, CareerEvent, dailyProgress(), dayBefore(), MAX_RANK, RANK_XP, STREAK_COINS, NeonColor (+20 more)

### Community 67 - "envDeps"
Cohesion: 0.16
Nodes (13): DELETE(), POST(), GET(), POST(), config(), envDeps(), profileGet(), usernameCheck() (+5 more)

### Community 68 - "PR 1 (0.13.0): modos e Sobrevivência"
Cohesion: 0.11
Nodes (17): Global Constraints, PR 1 (0.13.0): modos e Sobrevivência, PR 2 (0.14.0): itens do ladrão, PR 3 (0.15.0): itens da polícia, Review Focus, Task 1.1: Modo e caos na simulação, dano centralizado, Task 1.2: Obras e equilíbrio do Sobrevivência, Task 1.3: Tela de modo, preferência e fluxo (+9 more)

### Community 69 - "Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)"
Cohesion: 0.11
Nodes (18): 10. Testes, 1. Objetivo, 2. Modos e fluxo, 3. Sobrevivência, 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão, 4.2.1 Ajustes da implementação (0.15.0), 4.2 Polícia (caixas azuis), 4.3.1 Ajustes da implementação (0.14.0) (+10 more)

### Community 70 - "roadChunks.ts"
Cohesion: 0.16
Nodes (17): buildingsForChunk(), BuildingSpec, PALETTE, smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot (+9 more)

### Community 71 - "WorldState"
Cohesion: 0.35
Nodes (10): WorldState, clear(), hitWorks(), inside(), levelOf(), stepWorks(), Works, worksBetween() (+2 more)

### Community 72 - "json"
Cohesion: 0.37
Nodes (17): accountDelete(), bodyOf(), Deps, eventsPost(), foreign(), json(), member(), profilePut() (+9 more)

### Community 73 - "emptyProfile"
Cohesion: 0.14
Nodes (19): Account, hasProgress(), keepProgress(), nextStep(), same(), RECORDS_KEY, ACCOUNT_KEY, AccountState (+11 more)

### Community 75 - "howto.ts"
Cohesion: 0.16
Nodes (13): gameDelta(), renderChoose(), roleCard(), ROLES, dragToTurn(), ESCAPE, openHowTo(), pageDots() (+5 more)

### Community 76 - "api.ts"
Cohesion: 0.15
Nodes (20): httpApi(), OfflineError, ServerError, SignedOutError, Stored, DEV_API_KEY, DEV_TAKEN, devApi() (+12 more)

### Community 77 - "meta/records.ts"
Cohesion: 0.17
Nodes (18): board(), order(), ranked(), Row, submit(), Submitted, toRow(), reportedAmong() (+10 more)

### Community 78 - "items.ts"
Cohesion: 0.12
Nodes (28): stepBombs(), CarState, damageScale(), doubled(), hurt(), scaledDamage(), Scaling, takenFactor() (+20 more)

### Community 79 - "Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. Desafios do dia e sequência, 3. Conquistas e patentes, 4. Loja com desbloqueio, 5. Telas, 6. Perfil e backup, 7. Testes, 8. Resgatar e insígnias (playtest 2026-10-08, mockup `mockup-patentes.html`) (+2 more)

### Community 80 - "projectiles.ts"
Cohesion: 0.25
Nodes (13): canShoot(), carOf(), fireWeapons(), other(), stepProjectiles(), armorFactor(), catchUpBonus(), clamp01() (+5 more)

### Community 82 - "Polícia × Ladrão: V2, Parte 4: loja e skins (design)"
Cohesion: 0.20
Nodes (9): 1. Objetivo, 2. Catálogo e preços, 3. Regras, 4. Visual dos carros, 5. Perfil e backup, 6. Loja (layout A, "garagem"), 7. Testes, Modo admin (playtest 2026-10-09) (+1 more)

### Community 83 - "h"
Cohesion: 0.26
Nodes (17): formatTime(), openStreak(), coinsLabel(), h(), countUp(), endReason(), GlobalAnswer, globalLine() (+9 more)

### Community 84 - "audio/session.ts"
Cohesion: 0.18
Nodes (13): createMixer(), createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), SIREN_STYLES, onTap(), createSoundToggle() (+5 more)

### Community 85 - "V2 Parte 4: loja e skins, plano de implementação"
Cohesion: 0.40
Nodes (4): Global Constraints, Review Focus, Tasks, V2 Parte 4: loja e skins, plano de implementação

### Community 86 - "caveirao.ts"
Cohesion: 0.13
Nodes (26): addWheels(), AMBER, ARMOR, both(), box(), buildCaveirao(), CAVEIRAO_WHEEL_RADIUS, DARK (+18 more)

### Community 88 - "progress.ts"
Cohesion: 0.25
Nodes (7): AccountActions, accountBlock(), n(), openProgress(), statsGrid(), mine, open()

### Community 89 - "car.ts"
Cohesion: 0.13
Nodes (14): COLORS, createOpponentMarker(), markerTexture(), baseUpgrades(), CarEffects, cornering(), createCar(), NO_EFFECTS (+6 more)

### Community 90 - "itemsFx.ts"
Cohesion: 0.10
Nodes (22): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName, SPECIAL_ICONS, SPECIAL_NAMES, createItemsFx() (+14 more)

### Community 91 - "db.ts"
Cohesion: 0.20
Nodes (12): Db, neonDb(), prodDb(), ready, SCHEMA, adminStats(), num(), rate() (+4 more)

### Community 92 - "appAccount.ts"
Cohesion: 0.14
Nodes (14): Submitted, drop(), flushRecords(), pendingFor(), pendingRecords(), Queued, queueRecord(), save() (+6 more)

### Community 93 - "Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play"
Cohesion: 0.11
Nodes (17): 10. Entregas, 11. Testes, 1. Objetivo, 2. Regras da Google Play que entram, 3. Arquitetura, 4.1 Primeira vez, 4.2 Depois, 4.3 Sincronização (+9 more)

### Community 95 - "screens/account.ts"
Cohesion: 0.16
Nodes (21): UsernameIssue, Step, Entered, runGate(), USERNAME_RE, saveProfile(), carCount(), legalLinks() (+13 more)

### Community 96 - "meta/events.ts"
Cohesion: 0.16
Nodes (16): eventContext(), EVENTS_KEY, flushEvents(), load(), pendingEvents(), Queued, queueEvent(), save() (+8 more)

### Community 97 - "dependencies"
Cohesion: 0.29
Nodes (7): jose, @neondatabase/serverless, dependencies, jose, @neondatabase/serverless, three, three

### Community 101 - "worldProps.ts"
Cohesion: 0.20
Nodes (13): createTrafficModel(), CONES_PER_WORKS, createWorksView(), signTexture(), createMysteryBox(), faceTexture(), GLYPH, haloTexture() (+5 more)

### Community 102 - "http.ts"
Cohesion: 0.20
Nodes (16): POST(), gone(), hostOf(), me(), signOut(), who(), clearCookie(), COOKIE (+8 more)

### Community 107 - "api/ranking.test.ts"
Cohesion: 0.17
Nodes (14): ensureSchema(), rankingGet(), GET(), POST(), GlobalBoard, post(), stats(), CLIENT (+6 more)

### Community 110 - "admin/main.ts"
Cohesion: 0.11
Nodes (32): demoStats(), Gis, initialize(), loadGis(), mountGoogleButton(), renderButton(), bars(), dailyChart() (+24 more)

### Community 113 - "traffic.ts"
Cohesion: 0.54
Nodes (6): besideWorks(), closedAhead(), sameLane(), stepTraffic(), trafficTarget(), fill()

### Community 115 - "balance.ts"
Cohesion: 0.13
Nodes (18): Car, errors, Snap, snapshot(), waitSim(), BALANCE, applyBad(), BAD_EFFECTS (+10 more)

### Community 116 - "mobileShell.ts"
Cohesion: 0.33
Nodes (7): installFullscreenOnFirstTap(), installNoZoom(), installViewportFix(), isStandalone(), lockLandscape(), ROTATED_QUERY, e()

## Knowledge Gaps
- **570 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+565 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `Role` to `meta/profile.ts`, `storage/ranking.ts`, `src/main.ts`, `game.ts`, `Profile`, `screens.ts`, `career.ts`, `appMatch.ts`, `carLook.ts`, `thiefOf`, `meta/shop.ts`, `app.ts`, `backup.ts`, `mastery.ts`, `world.ts`, `screens/shopParts.ts`, `carFactory.ts`, `ai.ts`, `careerScreen.ts`, `WorldState`, `howto.ts`, `api.ts`, `meta/records.ts`, `items.ts`, `projectiles.ts`, `h`, `car.ts`, `itemsFx.ts`, `appAccount.ts`, `meta/events.ts`, `admin/main.ts`, `balance.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Profile` connect `Profile` to `meta/profile.ts`, `careerScreen.ts`, `json`, `emptyProfile`, `meta/shop.ts`, `api.ts`, `career.ts`, `backup.ts`, `mastery.ts`, `users.ts`, `progress.ts`, `screens/shopParts.ts`, `appAccount.ts`, `appMatch.ts`, `screens/account.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Mixer` connect `Mixer` to `Profile`, `mixer.ts`, `audio/session.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `considerHazards()` and `stepHazards()`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _570 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Role` be split into smaller, more focused modules?**
  _Cohesion score 0.10158730158730159 - nodes in this community are weakly interconnected._
- **Should `meta/profile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10810810810810811 - nodes in this community are weakly interconnected._