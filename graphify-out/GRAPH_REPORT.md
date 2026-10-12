# Graph Report - policia-ladrao  (2026-10-12)

## Corpus Check
- 288 files · ~211,846 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1943 nodes · 5633 edges · 114 communities (95 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `244cd2b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Mode
- Review Focus
- meta/shop.ts
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
- appMatch.ts
- Conta (V3): configurar o login com Google e o banco
- Review Focus
- .prettierrc.json
- vercel.json
- gunner.ts
- Pendente
- Workflow: skills that apply automatically
- minimal-code.md
- VENDORED.md
- thiefOf
- Role
- 2. Refresh
- synth.ts
- app.ts
- foundation.spec.ts
- visual.spec.ts
- carLook.ts
- backup.ts
- mastery.ts
- V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros
- policeItems.ts
- Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)
- http.ts
- eslint-plugin-import-x
- meta/shopParts.ts
- @types/node
- carFactory.ts
- balance.ts
- typescript-eslint
- Review Focus
- app-credit.test.ts
- world.ts
- car.ts
- PR 1 (0.13.0): modos e Sobrevivência
- Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)
- trackFrame.ts
- particles.ts
- scene.ts
- store.ts
- @playwright/test
- h
- AudioSession
- itemsFx.ts
- items.ts
- Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)
- projectiles.ts
- V2 Parte 5: Carreira, plano de implementação
- Polícia × Ladrão: V2, Parte 4: loja e skins (design)
- Profile
- audio/session.ts
- V2 Parte 4: loja e skins, plano de implementação
- caveirao.ts
- typescript7
- progress.ts
- stepWorld
- touchButtons.ts
- gate.ts
- sync.test.ts
- Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play
- meta/profile.ts
- hud.ts
- mobileShell.ts
- dependencies
- stickers.ts
- account/google.ts
- screens.spec.ts
- mysteryBox.ts
- DIFFICULTIES
- eslint-plugin-security
- globals
- @types/three
- MODES
- keyboard.ts
- feedback.ts
- GameHandle
- opponentMarker.ts
- fixedStepper.ts
- damageView.test.ts

## God Nodes (most connected - your core abstractions)
1. `Role` - 76 edges
2. `thiefOf()` - 70 edges
3. `policeOf()` - 69 edges
4. `BALANCE` - 62 edges
5. `withCar()` - 61 edges
6. `h()` - 59 edges
7. `stepWorld()` - 52 edges
8. `WorldState` - 51 edges
9. `startGame()` - 50 edges
10. `Profile` - 49 edges

## Surprising Connections (you probably didn't know these)
- `createLookModel()` --indirect_call--> `mat()`  [INFERRED]
  src/render/carLook.ts → tests/render/damageView.test.ts
- `Stored` --references--> `Profile`  [EXTRACTED]
  api/_lib/users.ts → src/meta/profile.ts
- `enter()` --indirect_call--> `traffic()`  [INFERRED]
  src/main.ts → tests/render/worldProps.test.ts
- `take()` --calls--> `createRng()`  [EXTRACTED]
  tests/sim/rng.test.ts → src/sim/rng.ts
- `world()` --calls--> `createWorld()`  [EXTRACTED]
  tests/audio/mixer.test.ts → src/sim/world.ts

## Import Cycles
- 3-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts`
- 3-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/car.ts`
- 3-file cycle: `src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/types.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/track.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/chaos.ts -> src/sim/car.ts`
- 4-file cycle: `src/sim/chaos.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts`
- 4-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/curves.ts -> src/sim/track.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/track.ts -> src/sim/car.ts`
- 5-file cycle: `src/sim/car.ts -> src/sim/types.ts -> src/sim/works.ts -> src/sim/world.ts -> src/sim/chaos.ts -> src/sim/car.ts`

## Communities (114 total, 19 thin omitted)

### Community 0 - "Mode"
Cohesion: 0.25
Nodes (5): Mode, renderTitle(), titleHero(), walletChip(), onClaim

### Community 1 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Dificuldade na simulação, Task 2: Moedas com multiplicador, Task 3: Ranking por dificuldade e preferência salva, Task 4: Seletor e escolha do lado, Task 5: Ranking com seletor, Task 6: Fim de partida e ligação no app (+2 more)

### Community 2 - "meta/shop.ts"
Cohesion: 0.08
Nodes (37): profileActions(), CareerEvent, CarId, CarInfo, CARS, carsOf(), DEFAULT_CAR, claimReward() (+29 more)

### Community 3 - "ranking.ts"
Cohesion: 0.13
Nodes (28): better(), Board, Boards, countModeRecords(), countRecords(), emptyBoard(), emptyBoards(), emptyModeBoards() (+20 more)

### Community 4 - "strategy.ts"
Cohesion: 0.06
Nodes (33): alwaysOnRules(), descriptionOf(), frontMatter(), root, rulesDir, skills, skillsDir, usingSuperpowers (+25 more)

### Community 5 - "Review Focus"
Cohesion: 0.12
Nodes (15): Entrega 1 — Fundação: Plano de Implementação, Global Constraints, Review Focus, Task 0: Skill three-webgl-game e comandos no AGENTS.md, Task 10: Montagem, câmera, debug e e2e, Task 11: Verificação final e entrega, Task 1: Projeto base, Task 2: RNG com semente e regra de pureza do sim (+7 more)

### Community 6 - "combat.spec.ts"
Cohesion: 0.29
Nodes (5): Car, errors, Snap, snapshot(), waitSim()

### Community 7 - "main.ts"
Cohesion: 0.10
Nodes (22): httpApi(), Stored, UsernameIssue, DEV_API_KEY, DEV_TAKEN, devApi(), testAccount(), useDevApi() (+14 more)

### Community 8 - "game.ts"
Cohesion: 0.16
Nodes (20): createDebug(), anyOf(), lerpCar(), startGame(), createChaseCamera(), createCarSmoke(), createCombatFx(), dotTexture() (+12 more)

### Community 9 - "Review Focus"
Cohesion: 0.13
Nodes (14): Entrega 3 — Mundo: Plano de Implementação, Global Constraints, Review Focus, Task 10: e2e do mundo, Task 11: Verificação, revisão e entrega, Task 1: Retrovisor, Task 2: Quebra-molas e pulo, Task 3: Tráfego (+6 more)

### Community 10 - "mixer.ts"
Cohesion: 0.15
Nodes (18): createMixer(), HORN_AHEAD, HORN_GAP, BASS, createSequencer(), DRUM_BAR, LEAD, MENU_BASS (+10 more)

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
Nodes (17): @electric-sql/pglite, eslint, @eslint/js, jsdom, devDependencies, @electric-sql/pglite, eslint, @eslint/js (+9 more)

### Community 16 - "Polícia × Ladrão: V2, Parte 2: dificuldade (design)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. O que muda, 3. Escolha da dificuldade, 4. Ranking, 5. Fim de partida, 6. Arquitetura, 7. Erros e casos de borda, 8. Testes (+2 more)

### Community 17 - "ai.ts"
Cohesion: 0.38
Nodes (13): aimedAt(), aiStep(), bumpCovers(), considerBombs(), considerBump(), considerHazards(), curveBraking(), laneBlocked() (+5 more)

### Community 18 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 19 - "combatFx.ts"
Cohesion: 0.40
Nodes (7): tracerHeight(), box(), createHeli(), HELI_EXIT, HELI_Y, heliPose, trackPos()

### Community 20 - "kit.ts"
Cohesion: 0.11
Nodes (80): ACCESSORY_SPOTS, antenna(), BUILD, CHROME, exhaust(), FLAME, FLAME_CORE, LAMP (+72 more)

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
Nodes (62): v(), ACHIEVEMENTS, awaitingClaim(), Career, careerAfterMatch(), claim(), claimCoins(), Counters (+54 more)

### Community 29 - "Tasks"
Cohesion: 0.22
Nodes (8): Entrega 7 — Fuga em 1:30: Plano de Implementação, Global Constraints, Task 1: Fuga na sim, Task 2: Ranking, Task 3: HUD e telas, Task 4: Ajustes, Task 5: e2e, balanço, revisão, entrega, Tasks

### Community 30 - "appMatch.ts"
Cohesion: 0.19
Nodes (15): addRecord(), settleEnd(), MatchEnd, applyMatch(), settleCareer(), settleMatch(), addEvents(), emptyStats() (+7 more)

### Community 31 - "Conta (V3): configurar o login com Google e o banco"
Cohesion: 0.08
Nodes (22): 1. Regras sempre ativas e skills — use sem esperar o usuário pedir, 2. Git: o agente nunca commita, faz push nem abre PR, 3. Projeto, 4. Manutenção das skills, AGENTS.md — policia-ladrao, Mapeamento de nomes (skills do Superpowers), 1. Banco no Neon, 2. Client ID do Google (+14 more)

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
Cohesion: 0.15
Nodes (12): createCarModel(), attachGunner(), BODY_MAT, box(), FLASH_GEO, FLASH_MAT, geoCache, gunnerGeometry() (+4 more)

### Community 36 - "Pendente"
Cohesion: 0.29
Nodes (6): Backlog — ideias para próximas versões, Fases (anotado em 2026-10-05), Feito, Mais coisas na loja (anotado em 2026-10-09), Pendente, V3: conta, servidor e Google Play

### Community 41 - "thiefOf"
Cohesion: 0.17
Nodes (31): initialAiMemory(), resolveCollisions(), slow(), enforceNoOvertake(), pursuitBonus(), clearForScene(), createWorld(), policeOf() (+23 more)

### Community 42 - "Role"
Cohesion: 0.15
Nodes (21): Role, Achievement, inUse(), lookFor(), owns(), PRICES, hex(), n() (+13 more)

### Community 43 - "2. Refresh"
Cohesion: 0.25
Nodes (7): 1. Discovery, 2. Refresh, Graphify, Refresh failure, Refresh order, Running the refresh, When refresh is required

### Community 44 - "synth.ts"
Cohesion: 0.29
Nodes (7): envelopeAt(), recipeDuration(), RECIPES, Voice, Wave, SIREN_STYLES, SirenStyle

### Community 45 - "app.ts"
Cohesion: 0.14
Nodes (24): startApp(), MENU_MUSIC, wireAppEvents(), garageCars(), localDate(), grantWelcome(), randomLook(), HOWTO_KEY (+16 more)

### Community 47 - "visual.spec.ts"
Cohesion: 0.33
Nodes (4): errors, Game, Snap, Visuals

### Community 48 - "carLook.ts"
Cohesion: 0.14
Nodes (22): CarLook, defaultLook(), addAccessory(), blinkLightbar(), DEFORMABLE, flickerFlames(), instantiate(), updateCarModel() (+14 more)

### Community 49 - "backup.ts"
Cohesion: 0.10
Nodes (32): RFC-4648, at(), BACKUP_ERROR_TEXT, BackupError, BackupResult, blocks(), crc32(), CRC_TABLE (+24 more)

### Community 50 - "mastery.ts"
Cohesion: 0.11
Nodes (30): unlockOf(), FINISH_NAMES, FINISHES, FinishId, FIRST_CARS, LEGENDARY, MASTERY_MAX, MASTERY_REWARDS (+22 more)

### Community 51 - "V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros"
Cohesion: 0.12
Nodes (15): 1. Objetivo, 2. Maestria por carro, 3.1 Acabamentos (por carro), 3.2 Adesivos (por carro), 3.3 Rodas (por lado), 3.4 Fumaça colorida (por lado), 3.5 Acessórios (só ladrão), 3.6 Onde vai cada adesivo (playtest 2026-10-09) (+7 more)

### Community 52 - "policeItems.ts"
Cohesion: 0.21
Nodes (17): stepBombs(), damageScale(), doubled(), hurt(), scaledDamage(), Scaling, takenFactor(), applyPoliceItem() (+9 more)

### Community 53 - "Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)"
Cohesion: 0.17
Nodes (11): 10. Versão, 1. Contexto: a V2, 2. Objetivo da Parte 1, 3. Ganho de moedas, 4. Perfil do jogador, 5. Backup por código, 6. Telas, 7. Arquitetura (+3 more)

### Community 54 - "http.ts"
Cohesion: 0.06
Nodes (71): DELETE(), POST(), POST(), GET(), Db, ensureSchema(), neonDb(), prodDb() (+63 more)

### Community 56 - "meta/shopParts.ts"
Cohesion: 0.14
Nodes (22): ACCESSORY_IDS, ACCESSORY_NAMES, AccessoryId, SMOKE_COLORS, SmokeColor, SMOKES, WHEEL_NAMES, WHEEL_RANK (+14 more)

### Community 58 - "carFactory.ts"
Cohesion: 0.15
Nodes (33): buildCivilian(), buildPolice(), buildThief(), CIVILIAN_LAMPS, CIVILIANS, CivilianSpec, createTrafficModel(), SHADOW_CASTERS (+25 more)

### Community 59 - "balance.ts"
Cohesion: 0.10
Nodes (39): Car, errors, Snap, snapshot(), waitSim(), BALANCE, CONES_PER_WORKS, createWorksView() (+31 more)

### Community 61 - "Review Focus"
Cohesion: 0.18
Nodes (10): Global Constraints, Review Focus, Task 1: Recompensa da partida, Task 2: Perfil e armazenamento, Task 3: Código de backup, Task 4: Estatísticas saindo da partida, Task 5: Crédito no fim, saldo na tela inicial e quadro de recompensa, Task 6: Diálogo de Progresso (+2 more)

### Community 65 - "app-credit.test.ts"
Cohesion: 0.14
Nodes (5): ends, gameOpts, OnEnd, Opts, rafs

### Community 66 - "world.ts"
Cohesion: 0.16
Nodes (21): AiMemory, besideWorks(), closedAhead(), sameLane(), stepTraffic(), trafficTarget(), Bomb, Box (+13 more)

### Community 67 - "car.ts"
Cohesion: 0.18
Nodes (15): baseUpgrades(), CarEffects, CarState, cornering(), createCar(), stepCar(), Upgrades, MysteryOutcome (+7 more)

### Community 68 - "PR 1 (0.13.0): modos e Sobrevivência"
Cohesion: 0.11
Nodes (17): Global Constraints, PR 1 (0.13.0): modos e Sobrevivência, PR 2 (0.14.0): itens do ladrão, PR 3 (0.15.0): itens da polícia, Review Focus, Task 1.1: Modo e caos na simulação, dano centralizado, Task 1.2: Obras e equilíbrio do Sobrevivência, Task 1.3: Tela de modo, preferência e fluxo (+9 more)

### Community 69 - "Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)"
Cohesion: 0.11
Nodes (18): 10. Testes, 1. Objetivo, 2. Modos e fluxo, 3. Sobrevivência, 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão, 4.2.1 Ajustes da implementação (0.15.0), 4.2 Polícia (caixas azuis), 4.3.1 Ajustes da implementação (0.14.0) (+10 more)

### Community 70 - "trackFrame.ts"
Cohesion: 0.13
Nodes (20): buildingsForChunk(), BuildingSpec, PALETTE, smoothTexture(), CHUNK_LENGTH, createRoad(), renderOrigin(), Slot (+12 more)

### Community 71 - "particles.ts"
Cohesion: 0.14
Nodes (7): GameOptions, COLORS, createParticles(), Kind, Particles, puffTexture(), QualityTier

### Community 72 - "scene.ts"
Cohesion: 0.24
Nodes (10): computeRenderSize(), createQualityGovernor(), createRenderer(), ORDER, QUALITY, createLighting(), makeStreetEnvironment(), SHADOW_BOX (+2 more)

### Community 73 - "store.ts"
Cohesion: 0.22
Nodes (7): ACCOUNT_KEY, noAccount(), CORRUPT_KEY, PROFILE_KEY, PROFILE_V1_KEY, PROFILE_V2_KEY, saveProfile()

### Community 75 - "h"
Cohesion: 0.11
Nodes (41): Difficulty, formatTime(), gameDelta(), careerStrip(), openStreak(), renderChoose(), roleCard(), ROLES (+33 more)

### Community 77 - "itemsFx.ts"
Cohesion: 0.17
Nodes (13): createItemsFx(), INSTANT_POLICE, itemToast(), blockSign(), createSpecialsView(), nailsGeometry(), ITEM_ICON, ITEM_LABEL (+5 more)

### Community 78 - "items.ts"
Cohesion: 0.14
Nodes (18): applyItem(), available(), boxSpot(), colorChance(), pick(), rollItem(), stepBoxes(), applyBad() (+10 more)

### Community 79 - "Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)"
Cohesion: 0.18
Nodes (10): 1. Objetivo, 2. Desafios do dia e sequência, 3. Conquistas e patentes, 4. Loja com desbloqueio, 5. Telas, 6. Perfil e backup, 7. Testes, 8. Resgatar e insígnias (playtest 2026-10-08, mockup `mockup-patentes.html`) (+2 more)

### Community 80 - "projectiles.ts"
Cohesion: 0.25
Nodes (12): canShoot(), carOf(), fireWeapons(), other(), stepProjectiles(), armorFactor(), catchUpBonus(), clamp01() (+4 more)

### Community 82 - "Polícia × Ladrão: V2, Parte 4: loja e skins (design)"
Cohesion: 0.20
Nodes (9): 1. Objetivo, 2. Catálogo e preços, 3. Regras, 4. Visual dos carros, 5. Perfil e backup, 6. Loja (layout A, "garagem"), 7. Testes, Modo admin (playtest 2026-10-09) (+1 more)

### Community 83 - "Profile"
Cohesion: 0.27
Nodes (14): AppAccount, Profile, carCount(), legalLinks(), n(), openDeleteAccount(), openRename(), progressCard() (+6 more)

### Community 84 - "audio/session.ts"
Cohesion: 0.20
Nodes (11): Ctx, createAudioSession(), UNLOCK_EVENTS, createNullBackend(), createWebAudioBackend(), ICONS, onTap(), createSoundToggle() (+3 more)

### Community 85 - "V2 Parte 4: loja e skins, plano de implementação"
Cohesion: 0.40
Nodes (4): Global Constraints, Review Focus, Tasks, V2 Parte 4: loja e skins, plano de implementação

### Community 86 - "caveirao.ts"
Cohesion: 0.13
Nodes (26): addWheels(), AMBER, ARMOR, both(), box(), buildCaveirao(), CAVEIRAO_WHEEL_RADIUS, DARK (+18 more)

### Community 88 - "progress.ts"
Cohesion: 0.17
Nodes (11): Account, DevServer, Entered, AccountState, AccountActions, accountBlock(), n(), openProgress() (+3 more)

### Community 89 - "stepWorld"
Cohesion: 0.12
Nodes (21): NO_EFFECTS, chaosAt(), Intents, NO_INTENTS, clearPassedRoadblocks(), addSpecial(), innerNeighbor(), nearestLane() (+13 more)

### Community 90 - "touchButtons.ts"
Cohesion: 0.18
Nodes (8): BUTTONS, buzz(), createTouchButtons(), ICONS, IntentName, SPECIAL_ICONS, SPECIAL_NAMES, t()

### Community 91 - "gate.ts"
Cohesion: 0.16
Nodes (10): AccountApi, OfflineError, hasProgress(), keepProgress(), nextStep(), same(), Step, runGate() (+2 more)

### Community 92 - "sync.test.ts"
Cohesion: 0.22
Nodes (8): SignedOutError, loadAccountState(), saveAccountState(), createSync(), Sync, memStorage(), acc, setup()

### Community 93 - "Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play"
Cohesion: 0.11
Nodes (17): 10. Entregas, 11. Testes, 1. Objetivo, 2. Regras da Google Play que entram, 3. Arquitetura, 4.1 Primeira vez, 4.2 Depois, 4.3 Sincronização (+9 more)

### Community 94 - "meta/profile.ts"
Cohesion: 0.19
Nodes (12): errors, maxOf(), mergeProfiles(), union(), emptyProfile(), PROFILE_VERSION, ProfileStats, defaultEquipped() (+4 more)

### Community 95 - "hud.ts"
Cohesion: 0.24
Nodes (9): ALERT_LEFT, BAD, createHud(), distanceBand, el(), FX_TEXT, HudItem, createChaosMeter() (+1 more)

### Community 96 - "mobileShell.ts"
Cohesion: 0.39
Nodes (6): installFullscreenOnFirstTap(), installNoZoom(), installViewportFix(), isStandalone(), lockLandscape(), ROTATED_QUERY

### Community 97 - "dependencies"
Cohesion: 0.29
Nodes (7): jose, @neondatabase/serverless, dependencies, jose, @neondatabase/serverless, three, three

### Community 98 - "stickers.ts"
Cohesion: 0.18
Nodes (10): addSticker(), ART, DIRECTIONAL, Draw, Layout, material(), Side, Spot (+2 more)

### Community 99 - "account/google.ts"
Cohesion: 0.53
Nodes (5): Gis, initialize(), loadGis(), mountGoogleButton(), renderButton()

### Community 101 - "mysteryBox.ts"
Cohesion: 0.53
Nodes (5): createMysteryBox(), faceTexture(), GLYPH, haloTexture(), pulseMysteryHalo()

### Community 102 - "DIFFICULTIES"
Cohesion: 0.48
Nodes (4): DIFFICULTIES, DIFFICULTY_KEY, loadDifficulty(), saveDifficulty()

### Community 107 - "MODES"
Cohesion: 0.48
Nodes (4): MODES, loadMode(), MODE_KEY, saveMode()

### Community 108 - "keyboard.ts"
Cohesion: 0.40
Nodes (3): createKeyboardInput(), IntentName, KEYMAP

### Community 109 - "feedback.ts"
Cohesion: 0.53
Nodes (4): Feedback, feedbackFor(), feedbackForFrame(), e()

### Community 111 - "opponentMarker.ts"
Cohesion: 0.60
Nodes (3): COLORS, createOpponentMarker(), markerTexture()

## Knowledge Gaps
- **537 isolated node(s):** `root`, `skillsDir`, `rulesDir`, `skills`, `usingSuperpowers` (+532 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role` connect `Role` to `meta/shop.ts`, `ranking.ts`, `main.ts`, `game.ts`, `ai.ts`, `career.ts`, `appMatch.ts`, `gunner.ts`, `thiefOf`, `app.ts`, `carLook.ts`, `backup.ts`, `mastery.ts`, `policeItems.ts`, `meta/shopParts.ts`, `carFactory.ts`, `balance.ts`, `world.ts`, `car.ts`, `particles.ts`, `h`, `itemsFx.ts`, `items.ts`, `projectiles.ts`, `stepWorld`, `touchButtons.ts`, `meta/profile.ts`, `hud.ts`, `feedback.ts`, `opponentMarker.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `BALANCE` connect `balance.ts` to `ranking.ts`, `game.ts`, `ai.ts`, `combatFx.ts`, `appMatch.ts`, `thiefOf`, `policeItems.ts`, `world.ts`, `car.ts`, `trackFrame.ts`, `h`, `itemsFx.ts`, `items.ts`, `projectiles.ts`, `stepWorld`, `meta/profile.ts`, `hud.ts`, `feedback.ts`, `fixedStepper.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `AudioBackend` connect `AudioBackend` to `mixer.ts`, `audio/session.ts`, `Mixer`, `synth.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `root`, `skillsDir`, `rulesDir` to the rest of the system?**
  _537 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `meta/shop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08313725490196078 - nodes in this community are weakly interconnected._
- **Should `ranking.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12605042016806722 - nodes in this community are weakly interconnected._
- **Should `strategy.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05952380952380952 - nodes in this community are weakly interconnected._