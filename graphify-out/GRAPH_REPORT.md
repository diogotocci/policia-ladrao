# Graph Report - policia-ladrao  (2026-10-17)

## Corpus Check
- 353 files · ~315,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2386 nodes · 7043 edges · 125 communities (106 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e279ebd5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Role
- Review Focus
- devApi.ts
- storage/ranking.ts
- strategy.ts
- Review Focus
- combat.spec.ts
- src/main.ts
- rearview.ts
- Review Focus
- mixer.ts
- damageView.ts
- Polícia × Ladrão — Design (v1)
- Coding Standards
- compilerOptions
- devDependencies
- Polícia × Ladrão: V2, Parte 2: dificuldade (design)
- emptyCareer
- package.json
- careerScreen.ts
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
- screens/shop.ts
- Google Play: do pacote à loja
- Review Focus
- .prettierrc.json
- vercel.json
- maps.ts
- Pendente
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- world.ts
- meta/shop.ts
- 2. Refresh
- synth.ts
- app.ts
- foundation.spec.ts
- visual.spec.ts
- end.ts
- backup.ts
- meta/profile.ts
- V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros
- car.ts
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- http.ts
- api.ts
- meta/events.ts
- @types/node
- carFactory.ts
- ai.ts
- typescript-eslint
- Review Focus
- vitest.config.ts
- app-credit.test.ts
- mastery.ts
- envDeps
- PR 1 (0.13.0): modos e Sobrevivência
- Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)
- roadChunks.ts
- mobileShell.ts
- howto.ts
- Profile
- @playwright/test
- touchButtons.ts
- audio/session.ts
- backdrop.ts
- account/records.ts
- Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)
- thiefOf
- V2 Parte 5: Carreira, plano de implementação
- Polícia × Ladrão: V2, Parte 4: loja e skins (design)
- itemsFx.ts
- soundToggle.ts
- V2 Parte 4: loja e skins, plano de implementação
- caveirao.ts
- typescript7
- adminActPost
- keyboard.ts
- trackFrame.ts
- 0.38.0: maps
- eslint-plugin-security
- Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play
- particles.ts
- screens.ts
- appAccount.ts
- dependencies
- items.ts
- screens.spec.ts
- mysteryBox.ts
- me
- typescript
- globals
- @types/three
- api/moderation.test.ts
- hud.ts
- renderer.ts
- admin/main.ts
- h
- _lib/records.ts
- WorldState
- Denúncias no /admin: revisar e agir
- balance.ts
- createFramePacer
- loading.test.ts
- Desempenho no celular
- feedback.ts
- GameHandle
- json
- 0.37.0: Garagem fix, prestige and the analog stick
- game.ts

## God Nodes (most connected - your core abstractions)
1. `Role` - 87 edges
2. `h()` - 73 edges
3. `thiefOf()` - 70 edges
4. `policeOf()` - 69 edges
5. `BALANCE` - 64 edges
6. `withCar()` - 61 edges
7. `startGame()` - 56 edges
8. `stepWorld()` - 52 edges
9. `startApp()` - 51 edges
10. `Profile` - 51 edges

## Surprising Connections (you probably didn't know these)
- `createLookModel()` --indirect_call--> `mat()`  [INFERRED]
  src/render/carLook.ts → tests/render/damageView.test.ts
- `eventsPost()` --indirect_call--> `parseEvent()`  [INFERRED]
  api/_lib/http.ts → src/meta/events.ts
- `tabs()` --indirect_call--> `t()`  [INFERRED]
  src/admin/main.ts → tests/storage/ranking.test.ts
- `startApp()` --indirect_call--> `tick()`  [INFERRED]
  src/app.ts → tests/sim/collisions.test.ts
- `enter()` --indirect_call--> `traffic()`  [INFERRED]
  src/main.ts → tests/render/worldProps.test.ts

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

## Communities (125 total, 19 thin omitted)

### Community 0 - "Role"
Cohesion: 0.17
Nodes (20): Submitted, MatchReporter, reportMatch(), settleEnd(), Difficulty, Mode, Role, GameOptions (+12 more)

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "devApi.ts"
Cohesion: 0.11
Nodes (31): bestOf(), boardOf(), DEV_TAKEN, devApi(), DevServer, testAccount(), demoAct(), demoModeration() (+23 more)

### Community 3 - "storage/ranking.ts"
Cohesion: 0.10
Nodes (34): addRecord(), globalRecord(), better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard() (+26 more)

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
Cohesion: 0.09
Nodes (19): eventContext(), useDevApi(), AppAccount, createAppAccount(), app, chaosEvery, debug, enter() (+11 more)

### Community 8 - "rearview.ts"
Cohesion: 0.20
Nodes (9): createRearview(), isBehind(), MIRROR_NEAR, rearviewRect(), TIER, ExtraPass, PREPARE_LIMIT_MS, prepareMatch() (+1 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "mixer.ts"
Cohesion: 0.15
Nodes (16): HORN_AHEAD, HORN_GAP, BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS, MENU_DRUM (+8 more)

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
Cohesion: 0.12
Nodes (17): @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-import-x, jsdom, devDependencies, @electric-sql/pglite, eslint (+9 more)

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "emptyCareer"
Cohesion: 0.12
Nodes (24): profileActions(), Career, CareerEvent, emptyCareer(), emptyCounters(), prestigeSide(), randomLook(), buy() (+16 more)

### Community 18 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 19 - "careerScreen.ts"
Cohesion: 0.13
Nodes (24): dayBefore(), MAX_RANK, PRESTIGE_COINS, RANK_XP, STREAK_COINS, PRESTIGE_MAX, NeonColor, achievementsPanel() (+16 more)

### Community 20 - "kit.ts"
Cohesion: 0.08
Nodes (100): ACCESSORY_SPOTS, addAccessory(), antenna(), BUILD, CHROME, exhaust(), FLAME, FLAME_CORE (+92 more)

### Community 21 - "Review Focus"
Cohesion: 0.15
Nodes (12): Entrega 6 — Curvas suaves: Plano de Implementação, Global Constraints, Review Focus, Task 1: Traçado (sim), Task 2: Física da curva e freio, Task 3: IA nas curvas, Task 4: Centro da pista no mundo, Task 5: Rua, calçadas e prédios curvos (+4 more)

### Community 23 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 2 — Combate: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do combate, Task 11: Verificação, revisão e entrega, Task 1: Regras puras e números, Task 2: Mundo com dois carros, Task 3: Colisões e imunidade (+6 more)

### Community 24 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, e2e, e2e:mobile, format, format:check, lint (+5 more)

### Community 25 - "Review Focus"
Cohesion: 0.17
Nodes (11): Entrega 4 — Visual e áudio: Plano de Implementação, Global Constraints, Review Focus, Task 1: Dano visual nos carros, Task 2: Partículas — fumaça, faíscas de dano e explosão, Task 3: Atirador na janela do carona, Task 4: Mixer de áudio puro e síntese WebAudio, Task 5: Música chiptune (+3 more)

### Community 26 - "eslint.config.mjs"
Cohesion: 0.17
Nodes (7): BROWSER_GLOBALS, local, require, SIM_FORBIDDEN_IMPORTS, ref_node_module, maxFileLines, require

### Community 28 - "career.ts"
Cohesion: 0.08
Nodes (50): Achievement, ACHIEVEMENTS, awaitingClaim(), canPrestige(), careerAfterMatch(), claim(), claimCoins(), Counters (+42 more)

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "screens/shop.ts"
Cohesion: 0.12
Nodes (25): carsOf(), inUse(), NEONS, normalizePlate(), owns(), PRICES, SoundId, hex() (+17 more)

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

### Community 35 - "maps.ts"
Cohesion: 0.13
Nodes (22): ADMIN_WINS, DEFAULT_MAP, isMapId(), loopLength(), LOOPS, MAP_IDS, MapId, MapInfo (+14 more)

### Community 36 - "Pendente"
Cohesion: 0.29
Nodes (6): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Feito, Mais coisas na loja (anotado em 2026-10-09), Pendente, V3: conta, servidor e Google Play

### Community 41 - "world.ts"
Cohesion: 0.13
Nodes (30): stepBombs(), damageScale(), doubled(), hurt(), scaledDamage(), Scaling, takenFactor(), resolveCollisions() (+22 more)

### Community 42 - "meta/shop.ts"
Cohesion: 0.08
Nodes (40): CAR_IDS, CarId, CarInfo, CARS, DEFAULT_CAR, FinishId, AccessoryId, SmokeColor (+32 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "synth.ts"
Cohesion: 0.20
Nodes (9): Note, envelopeAt(), recipeDuration(), RECIPES, SoundName, Voice, Wave, NullBackend (+1 more)

### Community 45 - "app.ts"
Cohesion: 0.11
Nodes (28): startApp(), MENU_MUSIC, wireAppEvents(), garageCars(), grantWelcome(), DIFFICULTY_KEY, loadDifficulty(), saveDifficulty() (+20 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "end.ts"
Cohesion: 0.20
Nodes (14): choicePicker(), coinsLabel(), DIFFICULTY_LABEL, difficultyPicker(), MODE_LABEL, modePicker(), countUp(), endReason() (+6 more)

### Community 49 - "backup.ts"
Cohesion: 0.09
Nodes (33): RFC-4648, at(), BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks(), crc32(), CRC_TABLE (+25 more)

### Community 50 - "meta/profile.ts"
Cohesion: 0.12
Nodes (16): errors, G, errors, Snap, snapshot(), waitSim(), errors, applyMatch() (+8 more)

### Community 51 - "V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros"
Cohesion: 0.12
Nodes (15): 1. Objetivo, 2. Maestria por carro, 3.1 Acabamentos (por carro), 3.2 Adesivos (por carro), 3.3 Rodas (por lado), 3.4 Fumaça colorida (por lado), 3.5 Acessórios (só ladrão), 3.6 Onde vai cada adesivo (playtest 2026-10-09) (+7 more)

### Community 52 - "car.ts"
Cohesion: 0.11
Nodes (31): baseUpgrades(), CarEffects, CarState, cornering(), createCar(), NO_EFFECTS, steerOf(), stepCar() (+23 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 54 - "http.ts"
Cohesion: 0.09
Nodes (39): Db, neonDb(), prodDb(), ready, SCHEMA, adminStats(), num(), rate() (+31 more)

### Community 55 - "api.ts"
Cohesion: 0.19
Nodes (6): httpApi(), OfflineError, ServerError, SignedOutError, UsernameIssue, DEV_API_KEY

### Community 56 - "meta/events.ts"
Cohesion: 0.33
Nodes (8): DIFFICULTIES, MODES, cleanData(), CLIENT_EVENTS, num(), parseContext(), parseEvent(), parseRecord()

### Community 58 - "carFactory.ts"
Cohesion: 0.06
Nodes (58): blinkLightbar(), buildCivilian(), buildPolice(), buildThief(), CIVILIAN_LAMPS, CIVILIANS, CivilianSpec, createCarModel() (+50 more)

### Community 59 - "ai.ts"
Cohesion: 0.13
Nodes (31): aimedAt(), aiStep(), bumpCovers(), considerBombs(), considerBump(), considerHazards(), curveBraking(), laneBlocked() (+23 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.14
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "mastery.ts"
Cohesion: 0.16
Nodes (21): FINISH_NAMES, FIRST_CARS, LEGENDARY, MASTERY_MAX, MASTERY_REWARDS, MASTERY_XP, masteryLevel(), masteryLevelFor() (+13 more)

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
Cohesion: 0.07
Nodes (58): Segment, buildingsForChunk(), BuildingSpec, box(), bridgeTower(), DECOR_GEOMETRY, DECOR_MAX, hedge() (+50 more)

### Community 71 - "mobileShell.ts"
Cohesion: 0.39
Nodes (6): installFullscreenOnFirstTap(), installNoZoom(), installViewportFix(), isStandalone(), lockLandscape(), ROTATED_QUERY

### Community 72 - "howto.ts"
Cohesion: 0.22
Nodes (11): gameDelta(), dragToTurn(), ESCAPE, HOWTO_TIPS, openHowTo(), pageDots(), PAGES, STEER_TEXT (+3 more)

### Community 73 - "Profile"
Cohesion: 0.12
Nodes (27): Stored, Account, Stored, hasProgress(), keepProgress(), nextStep(), same(), Step (+19 more)

### Community 75 - "touchButtons.ts"
Cohesion: 0.11
Nodes (15): v(), BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName, SPECIAL_ICONS, SPECIAL_NAMES (+7 more)

### Community 76 - "audio/session.ts"
Cohesion: 0.26
Nodes (10): Ctx, createMixer(), createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), readSoundPref(), writeSoundPref() (+2 more)

### Community 77 - "backdrop.ts"
Cohesion: 0.30
Nodes (9): Backdrop, BUILD, colored(), flatMat(), hazy(), ny(), paris(), rio() (+1 more)

### Community 78 - "account/records.ts"
Cohesion: 0.47
Nodes (8): drop(), flushRecords(), pendingFor(), pendingRecords(), Queued, queueRecord(), RECORDS_KEY, save()

### Community 79 - "Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. Desafios do dia e sequência, 3. Conquistas e patentes, 4. Loja com desbloqueio, 5. Telas, 6. Perfil e backup, 7. Testes, 8. Resgatar e insígnias (playtest 2026-10-08, mockup `mockup-patentes.html`) (+2 more)

### Community 80 - "thiefOf"
Cohesion: 0.14
Nodes (36): initialAiMemory(), chaosAt(), enforceNoOvertake(), pursuitBonus(), clearForScene(), policeSlowed(), createWorld(), policeOf() (+28 more)

### Community 82 - "Polícia × Ladrão: V2, Parte 4: loja e skins (design)"
Cohesion: 0.20
Nodes (9): 1. Objetivo, 2. Catálogo e preços, 3. Regras, 4. Visual dos carros, 5. Perfil e backup, 6. Loja (layout A, "garagem"), 7. Testes, Modo admin (playtest 2026-10-09) (+1 more)

### Community 83 - "itemsFx.ts"
Cohesion: 0.20
Nodes (11): createItemsFx(), itemToast(), blockSign(), createSpecialsView(), nailsGeometry(), ITEM_ICON, BAD_ICON, BAD_TEXT (+3 more)

### Community 84 - "soundToggle.ts"
Cohesion: 0.29
Nodes (4): ICONS, onTap(), createSoundToggle(), broken

### Community 85 - "V2 Parte 4: loja e skins, plano de implementação"
Cohesion: 0.40
Nodes (4): Global Constraints, Review Focus, Tasks, V2 Parte 4: loja e skins, plano de implementação

### Community 86 - "caveirao.ts"
Cohesion: 0.13
Nodes (26): addWheels(), AMBER, ARMOR, both(), box(), buildCaveirao(), CAVEIRAO_WHEEL_RADIUS, DARK (+18 more)

### Community 88 - "adminActPost"
Cohesion: 0.40
Nodes (5): GET(), POST(), admin(), adminActPost(), MODERATION_ACTIONS

### Community 89 - "keyboard.ts"
Cohesion: 0.40
Nodes (3): createKeyboardInput(), IntentName, KEYMAP

### Community 90 - "trackFrame.ts"
Cohesion: 0.16
Nodes (14): createChaseCamera(), createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y (+6 more)

### Community 91 - "0.38.0: maps"
Cohesion: 0.40
Nodes (4): 0.38.0: maps, Rules, Scenery (`src/meta/maps.ts`, `src/render/mapThemes.ts`, `mapDecor.ts`, `backdrop.ts`), Screens

### Community 93 - "Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play"
Cohesion: 0.11
Nodes (17): 10. Entregas, 11. Testes, 1. Objetivo, 2. Regras da Google Play que entram, 3. Arquitetura, 4.1 Primeira vez, 4.2 Depois, 4.3 Sincronização (+9 more)

### Community 94 - "particles.ts"
Cohesion: 0.15
Nodes (5): COLORS, createParticles(), Kind, Particles, puffTexture()

### Community 95 - "screens.ts"
Cohesion: 0.11
Nodes (22): formatTime(), careerStrip(), carName(), fillGlobal(), LoadGlobal, markReported(), OnReport, rankName() (+14 more)

### Community 96 - "appAccount.ts"
Cohesion: 0.13
Nodes (24): EVENTS_KEY, flushEvents(), load(), pendingEvents(), Queued, queueEvent(), save(), Stored (+16 more)

### Community 97 - "dependencies"
Cohesion: 0.29
Nodes (7): jose, @neondatabase/serverless, dependencies, jose, @neondatabase/serverless, three, three

### Community 98 - "items.ts"
Cohesion: 0.15
Nodes (18): hpPct(), applyItem(), available(), boxSpot(), colorChance(), pick(), rollItem(), stepBoxes() (+10 more)

### Community 101 - "mysteryBox.ts"
Cohesion: 0.53
Nodes (5): createMysteryBox(), faceTexture(), GLYPH, haloTexture(), pulseMysteryHalo()

### Community 102 - "me"
Cohesion: 0.26
Nodes (10): me(), who(), COOKIE, cookieOf(), key(), readSession(), SESSION_DAYS, setCookie() (+2 more)

### Community 107 - "api/moderation.test.ts"
Cohesion: 0.14
Nodes (20): ensureSchema(), adminStatsGet(), rankingGet(), GET(), POST(), GlobalBoard, post(), stats() (+12 more)

### Community 108 - "hud.ts"
Cohesion: 0.22
Nodes (8): ALERT_LEFT, BAD, distanceBand, FX_TEXT, HudItem, ITEM_LABEL, createChaosMeter(), RISE

### Community 109 - "renderer.ts"
Cohesion: 0.29
Nodes (12): computeRenderSize(), createQualityGovernor(), createRenderer(), PROBE_EVERY, QUALITY, QUALITY_KEY, QUALITY_TIERS, readTier() (+4 more)

### Community 110 - "admin/main.ts"
Cohesion: 0.09
Nodes (28): AccountApi, bars(), dailyChart(), el(), n(), niceMax(), SERIES, shortDay() (+20 more)

### Community 111 - "h"
Cohesion: 0.09
Nodes (42): Steering, carCount(), legalLinks(), n(), openDeleteAccount(), openRename(), progressCard(), renderChooseProgress() (+34 more)

### Community 114 - "_lib/records.ts"
Cohesion: 0.27
Nodes (11): board(), order(), ranked(), Row, submit(), Submitted, toRow(), reportedAmong() (+3 more)

### Community 115 - "WorldState"
Cohesion: 0.16
Nodes (18): CONES_PER_WORKS, createWorksView(), signTexture(), bumpSignTexture(), chevronTexture(), createWorldProps(), stripeTexture(), AiMemory (+10 more)

### Community 116 - "Denúncias no /admin: revisar e agir"
Cohesion: 0.25
Nodes (7): 1. Decisões, 2. A aba, 3. O que cada ação faz, 4. Servidor, 5. Textos legais, 6. Fora desta entrega, Denúncias no /admin: revisar e agir

### Community 117 - "balance.ts"
Cohesion: 0.13
Nodes (26): Car, errors, Snap, snapshot(), waitSim(), BALANCE, canShoot(), carOf() (+18 more)

### Community 119 - "createFramePacer"
Cohesion: 0.38
Nodes (3): createFramePacer(), FramePacer, run()

### Community 122 - "Desempenho no celular"
Cohesion: 0.29
Nodes (6): Desempenho no celular, Medir num celular, Níveis de qualidade, Sem travadas no meio da partida, Tela "Preparando a partida…", Telas de 90 e 120 Hz

### Community 123 - "feedback.ts"
Cohesion: 0.53
Nodes (4): Feedback, feedbackFor(), feedbackForFrame(), e()

### Community 126 - "json"
Cohesion: 0.27
Nodes (21): POST(), accountDelete(), bodyOf(), Deps, eventsPost(), foreign(), gone(), json() (+13 more)

### Community 130 - "0.37.0: Garagem fix, prestige and the analog stick"
Cohesion: 0.40
Nodes (4): 0.37.0: Garagem fix, prestige and the analog stick, 1. Garagem, 2. Prestige (per side), 3. Steering (Opções)

### Community 132 - "game.ts"
Cohesion: 0.13
Nodes (21): createDebug(), anyOf(), lerpCar(), startGame(), INSTANT_POLICE, addEvents(), emptyStats(), createBackdrop() (+13 more)

## Knowledge Gaps
- **612 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+607 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `Role` to `storage/ranking.ts`, `game.ts`, `src/main.ts`, `emptyCareer`, `careerScreen.ts`, `kit.ts`, `career.ts`, `screens/shop.ts`, `maps.ts`, `world.ts`, `meta/shop.ts`, `app.ts`, `end.ts`, `meta/profile.ts`, `car.ts`, `api.ts`, `meta/events.ts`, `carFactory.ts`, `ai.ts`, `mastery.ts`, `touchButtons.ts`, `thiefOf`, `itemsFx.ts`, `trackFrame.ts`, `screens.ts`, `items.ts`, `hud.ts`, `_lib/records.ts`, `WorldState`, `balance.ts`, `feedback.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `Mixer` connect `Mixer` to `mixer.ts`, `audio/session.ts`, `screens/shop.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Profile` connect `Profile` to `appAccount.ts`, `Role`, `devApi.ts`, `maps.ts`, `src/main.ts`, `meta/shop.ts`, `h`, `emptyCareer`, `backup.ts`, `meta/profile.ts`, `http.ts`, `api.ts`, `json`, `career.ts`, `screens/shop.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `considerHazards()` and `stepHazards()`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _612 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devApi.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11201079622132254 - nodes in this community are weakly interconnected._
- **Should `storage/ranking.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1048780487804878 - nodes in this community are weakly interconnected._