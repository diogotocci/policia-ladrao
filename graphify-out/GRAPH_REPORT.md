# Graph Report - policia-ladrao  (2026-10-16)

## Corpus Check
- 333 files · ~295,262 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2240 nodes · 6592 edges · 129 communities (109 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f24e97b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- meta/profile.ts
- Review Focus
- ui/shop.test.ts
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
- WorldState
- package.json
- end.ts
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
- gunner.ts
- Pendente
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- thiefOf
- meta/shop.ts
- 2. Refresh
- synth.ts
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
- screens/account.ts
- screens.ts
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
- trackFrame.ts
- rearview.ts
- json
- emptyProfile
- @playwright/test
- touchButtons.ts
- devApi.ts
- api.ts
- items.ts
- Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)
- projectiles.ts
- V2 Parte 5: Carreira, plano de implementação
- Polícia × Ladrão: V2, Parte 4: loja e skins (design)
- itemsFx.ts
- audio/session.ts
- V2 Parte 4: loja e skins, plano de implementação
- caveirao.ts
- typescript7
- Role
- rankingGlobal.ts
- combatFx.ts
- _lib/records.ts
- AccountApi
- Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play
- carSmoke.ts
- howto.ts
- account/events.test.ts
- dependencies
- works.ts
- screens.spec.ts
- mysteryBox.ts
- http.ts
- eslint-plugin-security
- globals
- @types/three
- api/moderation.test.ts
- policeOf
- renderer.ts
- admin/main.ts
- progress.ts
- carLook.ts
- stickers.ts
- adminActPost
- balance.ts
- Denúncias no /admin: revisar e agir
- keyboard.ts
- difficultyPicker.ts
- createFramePacer
- loading.test.ts
- Desempenho no celular
- feedback.ts
- GameHandle
- AudioSession
- damageView.test.ts
- .show
- jsdom

## God Nodes (most connected - your core abstractions)
1. `Role` - 85 edges
2. `thiefOf()` - 70 edges
3. `policeOf()` - 69 edges
4. `h()` - 67 edges
5. `BALANCE` - 63 edges
6. `withCar()` - 61 edges
7. `startGame()` - 55 edges
8. `stepWorld()` - 52 edges
9. `WorldState` - 51 edges
10. `Profile` - 49 edges

## Surprising Connections (you probably didn't know these)
- `createLookModel()` --indirect_call--> `mat()`  [INFERRED]
  src/render/carLook.ts → tests/render/damageView.test.ts
- `eventsPost()` --indirect_call--> `parseEvent()`  [INFERRED]
  api/_lib/http.ts → src/meta/events.ts
- `startApp()` --indirect_call--> `tick()`  [INFERRED]
  src/app.ts → tests/sim/collisions.test.ts
- `createTouchButtons()` --indirect_call--> `t()`  [INFERRED]
  src/input/touchButtons.ts → tests/storage/ranking.test.ts
- `enter()` --indirect_call--> `traffic()`  [INFERRED]
  src/main.ts → tests/render/worldProps.test.ts

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

## Communities (129 total, 20 thin omitted)

### Community 0 - "meta/profile.ts"
Cohesion: 0.16
Nodes (20): globalRecord(), MatchReporter, reportMatch(), settleEnd(), CareerEvent, applyMatch(), grantWelcome(), isCount() (+12 more)

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "ui/shop.test.ts"
Cohesion: 0.14
Nodes (21): errors, profileActions(), emptyCareer(), emptyCounters(), CARS, claimReward(), buy(), canBuy() (+13 more)

### Community 3 - "storage/ranking.ts"
Cohesion: 0.13
Nodes (31): addRecord(), better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard(), emptyBoards() (+23 more)

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
Cohesion: 0.11
Nodes (19): app, chaosEvery, debug, escapeParam, fps, ITEMS, mute, params (+11 more)

### Community 8 - "game.ts"
Cohesion: 0.14
Nodes (17): createDebug(), anyOf(), lerpCar(), startGame(), createChaseCamera(), createCarSmoke(), flashGunner(), COLORS (+9 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "mixer.ts"
Cohesion: 0.16
Nodes (16): createMixer(), HORN_AHEAD, HORN_GAP, BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS (+8 more)

### Community 11 - "damageView.ts"
Cohesion: 0.18
Nodes (16): applyDamage(), CarDamageState, clamp01(), crackTexture(), damageLook, deform(), DIR, DIRT (+8 more)

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
Nodes (17): @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-import-x, devDependencies, @electric-sql/pglite, eslint, @eslint/js (+9 more)

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "WorldState"
Cohesion: 0.11
Nodes (25): AiMemory, stepBombs(), damageScale(), doubled(), hurt(), scaledDamage(), Scaling, takenFactor() (+17 more)

### Community 18 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 19 - "end.ts"
Cohesion: 0.24
Nodes (15): formatTime(), btn(), countUp(), endReason(), GlobalAnswer, globalLine(), initialsPad(), nth() (+7 more)

### Community 20 - "kit.ts"
Cohesion: 0.11
Nodes (79): ACCESSORY_SPOTS, antenna(), BUILD, CHROME, exhaust(), FLAME, FLAME_CORE, LAMP (+71 more)

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
Cohesion: 0.07
Nodes (49): v(), Achievement, awaitingClaim(), Career, careerAfterMatch(), claim(), claimCoins(), COUNTER_KEYS (+41 more)

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "screens/shop.ts"
Cohesion: 0.16
Nodes (24): Stored, Profile, inUse(), NEONS, owns(), PRICES, hex(), n() (+16 more)

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

### Community 35 - "gunner.ts"
Cohesion: 0.13
Nodes (15): blinkLightbar(), createCarModel(), flickerFlames(), updateCarModel(), createCarPreview(), attachGunner(), BODY_MAT, box() (+7 more)

### Community 36 - "Pendente"
Cohesion: 0.29
Nodes (6): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Feito, Mais coisas na loja (anotado em 2026-10-09), Pendente, V3: conta, servidor e Google Play

### Community 41 - "thiefOf"
Cohesion: 0.16
Nodes (26): initialAiMemory(), cornering(), stepCar(), enforceNoOvertake(), pursuitBonus(), stepJump(), createWorld(), thiefOf() (+18 more)

### Community 42 - "meta/shop.ts"
Cohesion: 0.07
Nodes (41): garageCars(), CarId, CarInfo, carsOf(), DEFAULT_CAR, FinishId, AccessoryId, SmokeColor (+33 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "synth.ts"
Cohesion: 0.29
Nodes (7): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave, SIREN_STYLES, SirenStyle

### Community 45 - "app.ts"
Cohesion: 0.10
Nodes (27): MENU_MUSIC, wireAppEvents(), DIFFICULTIES, MODES, isObj(), parseRecord(), DIFFICULTY_KEY, loadDifficulty() (+19 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "scene.ts"
Cohesion: 0.43
Nodes (6): createLighting(), makeStreetEnvironment(), SHADOW_BOX, snapToGrid(), SUN_DIR, makeSkyTexture()

### Community 49 - "backup.ts"
Cohesion: 0.08
Nodes (37): RFC-4648, at(), BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks(), crc32(), CRC_TABLE (+29 more)

### Community 50 - "mastery.ts"
Cohesion: 0.14
Nodes (22): unlockOf(), FINISH_NAMES, FINISHES, FIRST_CARS, LEGENDARY, MASTERY_REWARDS, MASTERY_XP, masteryLevel() (+14 more)

### Community 51 - "V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros"
Cohesion: 0.12
Nodes (15): 1. Objetivo, 2. Maestria por carro, 3.1 Acabamentos (por carro), 3.2 Adesivos (por carro), 3.3 Rodas (por lado), 3.4 Fumaça colorida (por lado), 3.5 Acessórios (só ladrão), 3.6 Onde vai cada adesivo (playtest 2026-10-09) (+7 more)

### Community 52 - "world.ts"
Cohesion: 0.17
Nodes (19): chaosAt(), Intents, NO_INTENTS, besideWorks(), closedAhead(), sameLane(), stepTraffic(), trafficTarget() (+11 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 54 - "users.ts"
Cohesion: 0.11
Nodes (24): Db, adminStats(), num(), rate(), saveEvents(), serverEvent(), GoogleUser, verifyGoogleToken() (+16 more)

### Community 55 - "screens/account.ts"
Cohesion: 0.19
Nodes (17): runGate(), USERNAME_RE, loadProfile(), saveProfile(), carCount(), legalLinks(), n(), openDeleteAccount() (+9 more)

### Community 56 - "screens.ts"
Cohesion: 0.20
Nodes (14): startApp(), renderCareer(), renderChoose(), mount(), trapFocus(), renderMode(), renderCountdown(), renderLoading() (+6 more)

### Community 58 - "carFactory.ts"
Cohesion: 0.14
Nodes (35): buildCivilian(), buildPolice(), buildThief(), CIVILIAN_LAMPS, CIVILIANS, CivilianSpec, createTrafficModel(), DEFORMABLE (+27 more)

### Community 59 - "ai.ts"
Cohesion: 0.38
Nodes (13): aimedAt(), aiStep(), bumpCovers(), considerBombs(), considerBump(), considerHazards(), curveBraking(), laneBlocked() (+5 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.14
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "careerScreen.ts"
Cohesion: 0.19
Nodes (22): STREAK_COINS, achievementsPanel(), bar(), careerStrip(), challengeRow(), Claim, itemName(), n() (+14 more)

### Community 67 - "envDeps"
Cohesion: 0.23
Nodes (9): DELETE(), POST(), GET(), config(), envDeps(), usernameCheck(), POST(), GET() (+1 more)

### Community 68 - "PR 1 (0.13.0): modos e Sobrevivência"
Cohesion: 0.11
Nodes (17): Global Constraints, PR 1 (0.13.0): modos e Sobrevivência, PR 2 (0.14.0): itens do ladrão, PR 3 (0.15.0): itens da polícia, Review Focus, Task 1.1: Modo e caos na simulação, dano centralizado, Task 1.2: Obras e equilíbrio do Sobrevivência, Task 1.3: Tela de modo, preferência e fluxo (+9 more)

### Community 69 - "Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)"
Cohesion: 0.11
Nodes (18): 10. Testes, 1. Objetivo, 2. Modos e fluxo, 3. Sobrevivência, 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão, 4.2.1 Ajustes da implementação (0.15.0), 4.2 Polícia (caixas azuis), 4.3.1 Ajustes da implementação (0.14.0) (+10 more)

### Community 70 - "trackFrame.ts"
Cohesion: 0.15
Nodes (18): buildingsForChunk(), BuildingSpec, PALETTE, smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot (+10 more)

### Community 71 - "rearview.ts"
Cohesion: 0.20
Nodes (9): createRearview(), isBehind(), MIRROR_NEAR, rearviewRect(), TIER, ExtraPass, PREPARE_LIMIT_MS, prepareMatch() (+1 more)

### Community 72 - "json"
Cohesion: 0.29
Nodes (19): accountDelete(), bodyOf(), Deps, foreign(), json(), member(), profileGet(), profilePut() (+11 more)

### Community 73 - "emptyProfile"
Cohesion: 0.14
Nodes (23): hasProgress(), keepProgress(), nextStep(), same(), Step, RECORDS_KEY, ACCOUNT_KEY, forgetAccount() (+15 more)

### Community 75 - "touchButtons.ts"
Cohesion: 0.20
Nodes (7): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName, SPECIAL_ICONS, SPECIAL_NAMES

### Community 76 - "devApi.ts"
Cohesion: 0.13
Nodes (16): Account, Stored, bestOf(), DEV_API_KEY, DEV_TAKEN, devApi(), DevServer, testAccount() (+8 more)

### Community 77 - "api.ts"
Cohesion: 0.15
Nodes (18): httpApi(), OfflineError, ServerError, SignedOutError, Submitted, UsernameIssue, drop(), flushRecords() (+10 more)

### Community 78 - "items.ts"
Cohesion: 0.17
Nodes (15): applyItem(), available(), boxSpot(), colorChance(), pick(), rollItem(), stepBoxes(), applyBad() (+7 more)

### Community 79 - "Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. Desafios do dia e sequência, 3. Conquistas e patentes, 4. Loja com desbloqueio, 5. Telas, 6. Perfil e backup, 7. Testes, 8. Resgatar e insígnias (playtest 2026-10-08, mockup `mockup-patentes.html`) (+2 more)

### Community 80 - "projectiles.ts"
Cohesion: 0.22
Nodes (15): canShoot(), carOf(), fireWeapons(), other(), stepProjectiles(), armorFactor(), catchUpBonus(), clamp01() (+7 more)

### Community 82 - "Polícia × Ladrão: V2, Parte 4: loja e skins (design)"
Cohesion: 0.20
Nodes (9): 1. Objetivo, 2. Catálogo e preços, 3. Regras, 4. Visual dos carros, 5. Perfil e backup, 6. Loja (layout A, "garagem"), 7. Testes, Modo admin (playtest 2026-10-09) (+1 more)

### Community 83 - "itemsFx.ts"
Cohesion: 0.17
Nodes (13): createItemsFx(), INSTANT_POLICE, itemToast(), blockSign(), createSpecialsView(), nailsGeometry(), ITEM_ICON, ITEM_LABEL (+5 more)

### Community 84 - "audio/session.ts"
Cohesion: 0.21
Nodes (10): Ctx, createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), ICONS, createSoundToggle(), readSoundPref() (+2 more)

### Community 85 - "V2 Parte 4: loja e skins, plano de implementação"
Cohesion: 0.40
Nodes (4): Global Constraints, Review Focus, Tasks, V2 Parte 4: loja e skins, plano de implementação

### Community 86 - "caveirao.ts"
Cohesion: 0.13
Nodes (26): addWheels(), AMBER, ARMOR, both(), box(), buildCaveirao(), CAVEIRAO_WHEEL_RADIUS, DARK (+18 more)

### Community 88 - "Role"
Cohesion: 0.24
Nodes (14): Difficulty, Mode, Role, GameOptions, MatchEnd, AdminStats, cleanData(), CLIENT_EVENTS (+6 more)

### Community 89 - "rankingGlobal.ts"
Cohesion: 0.20
Nodes (12): RANK_NAMES, carName(), fillGlobal(), LoadGlobal, markReported(), OnReport, openReport(), ReportAnswer (+4 more)

### Community 90 - "combatFx.ts"
Cohesion: 0.32
Nodes (9): createCombatFx(), dotTexture(), tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose (+1 more)

### Community 91 - "_lib/records.ts"
Cohesion: 0.15
Nodes (17): neonDb(), prodDb(), ready, SCHEMA, board(), order(), ranked(), Row (+9 more)

### Community 92 - "AccountApi"
Cohesion: 0.11
Nodes (4): AccountApi, Sync, AppAccount, ClientEventType

### Community 93 - "Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play"
Cohesion: 0.11
Nodes (17): 10. Entregas, 11. Testes, 1. Objetivo, 2. Regras da Google Play que entram, 3. Arquitetura, 4.1 Primeira vez, 4.2 Depois, 4.3 Sincronização (+9 more)

### Community 94 - "carSmoke.ts"
Cohesion: 0.14
Nodes (6): COLORS, createParticles(), Kind, Particles, puffTexture(), hpPct()

### Community 95 - "howto.ts"
Cohesion: 0.16
Nodes (13): gameDelta(), roleCard(), ROLES, openModal(), dragToTurn(), ESCAPE, openHowTo(), pageDots() (+5 more)

### Community 96 - "account/events.test.ts"
Cohesion: 0.22
Nodes (13): eventContext(), EVENTS_KEY, flushEvents(), load(), pendingEvents(), Queued, queueEvent(), save() (+5 more)

### Community 97 - "dependencies"
Cohesion: 0.29
Nodes (7): jose, @neondatabase/serverless, dependencies, jose, @neondatabase/serverless, three, three

### Community 98 - "works.ts"
Cohesion: 0.17
Nodes (22): curvatureAt(), Curve, curvesBetween(), extend(), Layout, layoutFor(), layouts, freeSpot() (+14 more)

### Community 101 - "mysteryBox.ts"
Cohesion: 0.53
Nodes (5): createMysteryBox(), faceTexture(), GLYPH, haloTexture(), pulseMysteryHalo()

### Community 102 - "http.ts"
Cohesion: 0.22
Nodes (15): POST(), gone(), hostOf(), me(), signOut(), who(), clearCookie(), COOKIE (+7 more)

### Community 107 - "api/moderation.test.ts"
Cohesion: 0.13
Nodes (22): POST(), ensureSchema(), eventsPost(), rankingGet(), GET(), POST(), parseContext(), GlobalBoard (+14 more)

### Community 108 - "policeOf"
Cohesion: 0.11
Nodes (32): NO_EFFECTS, applyPoliceItem(), clearPassedRoadblocks(), hitRoadblock(), laneIndex(), placeRoadblock(), roadblockLanes(), stepWingman() (+24 more)

### Community 109 - "renderer.ts"
Cohesion: 0.29
Nodes (12): computeRenderSize(), createQualityGovernor(), createRenderer(), PROBE_EVERY, QUALITY, QUALITY_KEY, QUALITY_TIERS, readTier() (+4 more)

### Community 110 - "admin/main.ts"
Cohesion: 0.06
Nodes (52): demoAct(), demoModeration(), demoStats(), Gis, initialize(), loadGis(), mountGoogleButton(), renderButton() (+44 more)

### Community 111 - "progress.ts"
Cohesion: 0.23
Nodes (7): AccountActions, accountBlock(), n(), openProgress(), statsGrid(), mine, open()

### Community 112 - "carLook.ts"
Cohesion: 0.20
Nodes (17): addAccessory(), addParts(), createLookModel(), disposeLookModel(), glowTexture(), plateTexture(), cache, carThumb() (+9 more)

### Community 113 - "stickers.ts"
Cohesion: 0.18
Nodes (10): addSticker(), ART, DIRECTIONAL, Draw, Layout, material(), Side, Spot (+2 more)

### Community 114 - "adminActPost"
Cohesion: 0.19
Nodes (15): GET(), POST(), admin(), adminActPost(), adminStatsGet(), ActResult, iso(), moderate() (+7 more)

### Community 115 - "balance.ts"
Cohesion: 0.09
Nodes (32): Car, errors, Snap, snapshot(), waitSim(), BALANCE, CONES_PER_WORKS, createWorksView() (+24 more)

### Community 116 - "Denúncias no /admin: revisar e agir"
Cohesion: 0.25
Nodes (7): 1. Decisões, 2. A aba, 3. O que cada ação faz, 4. Servidor, 5. Textos legais, 6. Fora desta entrega, Denúncias no /admin: revisar e agir

### Community 117 - "keyboard.ts"
Cohesion: 0.40
Nodes (3): createKeyboardInput(), IntentName, KEYMAP

### Community 118 - "difficultyPicker.ts"
Cohesion: 0.29
Nodes (8): choicePicker(), coinsLabel(), DIFFICULTY_LABEL, difficultyPicker(), MODE_LABEL, modePicker(), renderRanking(), shortDate()

### Community 119 - "createFramePacer"
Cohesion: 0.38
Nodes (3): createFramePacer(), FramePacer, run()

### Community 122 - "Desempenho no celular"
Cohesion: 0.29
Nodes (6): Desempenho no celular, Medir num celular, Níveis de qualidade, Sem travadas no meio da partida, Tela "Preparando a partida…", Telas de 90 e 120 Hz

### Community 123 - "feedback.ts"
Cohesion: 0.53
Nodes (4): Feedback, feedbackFor(), feedbackForFrame(), e()

## Knowledge Gaps
- **590 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+585 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `Role` to `meta/profile.ts`, `ui/shop.test.ts`, `storage/ranking.ts`, `src/main.ts`, `game.ts`, `WorldState`, `end.ts`, `Mixer`, `career.ts`, `screens/shop.ts`, `gunner.ts`, `thiefOf`, `meta/shop.ts`, `app.ts`, `backup.ts`, `mastery.ts`, `world.ts`, `screens.ts`, `carFactory.ts`, `ai.ts`, `careerScreen.ts`, `touchButtons.ts`, `api.ts`, `items.ts`, `projectiles.ts`, `itemsFx.ts`, `rankingGlobal.ts`, `_lib/records.ts`, `carSmoke.ts`, `howto.ts`, `policeOf`, `carLook.ts`, `balance.ts`, `feedback.ts`, `.show`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `AudioBackend` connect `AudioBackend` to `mixer.ts`, `audio/session.ts`, `Mixer`, `synth.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `BALANCE` connect `balance.ts` to `meta/profile.ts`, `storage/ranking.ts`, `game.ts`, `WorldState`, `end.ts`, `thiefOf`, `world.ts`, `ai.ts`, `trackFrame.ts`, `api.ts`, `items.ts`, `projectiles.ts`, `itemsFx.ts`, `combatFx.ts`, `howto.ts`, `works.ts`, `policeOf`, `difficultyPicker.ts`, `feedback.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `considerHazards()` and `stepHazards()`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _590 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ui/shop.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13793103448275862 - nodes in this community are weakly interconnected._
- **Should `storage/ranking.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12773109243697478 - nodes in this community are weakly interconnected._