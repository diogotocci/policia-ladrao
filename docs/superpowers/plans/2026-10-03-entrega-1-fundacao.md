# Entrega 1 — Fundação: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Regra do projeto (AGENTS.md §2):** o agente nunca roda `git commit/push` nem `gh pr`. Cada passo "Checkpoint" só lista os arquivos; no fim da entrega a skill `ship-via-script` gera `scratch/NN-*.ps1` com todos os commits.

**Goal:** Rodar no celular (landscape) um carro 3D estilo PS1, polícia ou ladrão, andando sozinho por uma rua reta infinita de 4 faixas com prédios, controlado por ◀ ▶ e FREIO (touch e teclado).

**Architecture:** `src/sim` é TypeScript puro e determinístico (passo fixo de 1/60 s), sem Three.js e sem DOM. `src/render` lê um snapshot do mundo e desenha com Three.js numa resolução interna baixa, ampliada com pixels nítidos. `src/input` converte toque e teclado em `Intents`.

**Tech Stack:** TypeScript 7, Vite 8, Three.js 0.186, Vitest 5 (+ jsdom), Playwright 1.63, pnpm. São as versões atuais em 2026-10-03; o lockfile fixa as exatas.

**Spec:** `docs/superpowers/specs/2026-10-03-policia-ladrao-design.md` (§3 pista e movimento, §6 controles, §9 pipeline PS1, §10 arquitetura, §12 entrega 1)

## Global Constraints

- Coordenadas da simulação: `s` = metros ao longo da pista (cresce para frente), `x` = lateral em metros. No Three.js: `position.z = -s`, `position.x = x`, `y` para cima.
- 4 faixas no mesmo sentido, centros em `x = −4.5, −1.5, +1.5, +4.5`; bordas da pista em `x = ±6`.
- Cruzeiro: polícia 33 m/s, ladrão 34 m/s. Aceleração automática (sem botão de acelerar).
- `src/sim/**` não importa `three`, `document` nem `window` (há um teste que verifica isso).
- Todos os números de jogo ficam em `src/config/balance.ts`.
- Resolução interna com altura de 270 px; largura = 270 × proporção da tela (arredondada para par). Ampliação com `image-rendering: pixelated`.
- Landscape. Botões dentro de `env(safe-area-inset-*)`, multitoque.
- Código, nomes e commits em inglês; textos da UI em português.

## Review Focus

1. **Multitoque**: segurar ◀ e FREIO ao mesmo tempo, e soltar um dedo fora do botão, não pode deixar intent "presa" → teste em Task 6 (`pointercancel`/`pointerleave` liberam).
2. **Aba em segundo plano**: voltar depois de 10 s não pode simular 600 passos de uma vez → `FixedStepper` limita `maxSteps` (Task 4).
3. **◀ e ▶ juntos** se anulam (nem esquerda nem direita) → teste em Task 3.
4. **Redimensionar/girar a tela** recalcula a resolução interna sem distorcer → teste de `computeInternalSize` + e2e com `setViewportSize` (Tasks 7 e 10).
5. **Rodar muito tempo** (s grande): reciclagem de blocos não acumula objetos nem perde precisão → teste de `visibleChunkRange` com s = 1e6 (Task 8) e e2e confere que a contagem de draw calls fica estável.

---

### Task 0: Skill three-webgl-game e comandos no AGENTS.md

**Files:**
- Create: `.agents/skills/three-webgl-game/**` (copiado de `openai/plugins` → `plugins/game-studio/skills/three-webgl-game`), `.agents/skills/game-studio/references/{three-webgl-architecture,threejs-stack,threejs-vanilla-starter}.md`
- Modify: `.agents/VENDORED.md`, `AGENTS.md` §3 (stack e comandos)

- [ ] **Step 1:** Clonar `openai/plugins` (sparse), copiar a skill e as 3 referências. Reescrever `../../references/` → `../game-studio/references/` e reverter as marcações "não vendorizado" desses 3 arquivos nas outras skills.
- [ ] **Step 2:** Em `AGENTS.md` §3, trocar "Stack: a definir…" por: TypeScript + Vite + Three.js (3D low-poly estilo PS1), Vitest, Playwright, pnpm, com os comandos `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm e2e`. Adicionar `three-webgl-game` na tabela de skills ("implementar render 3D, câmeras, materiais, performance WebGL").
- [ ] **Step 3:** `node scripts/sync-skills.mjs` → espera `24 skills espelhadas`.
- [ ] **Checkpoint:** `chore: vendor three-webgl-game skill and document stack commands`

### Task 1: Projeto base

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml` (só se o pnpm exigir), `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `src/config/balance.ts`, `tests/sanity.test.ts`

**Interfaces:**
- Produces: `BALANCE` (export const, `as const`) em `src/config/balance.ts`:
  ```ts
  export const BALANCE = {
    road: { laneCenters: [-4.5, -1.5, 1.5, 4.5], halfWidth: 6 },
    car: { halfWidth: 0.9, length: 4.4 },
    movement: {
      cruise: { police: 33, thief: 34 },   // m/s
      accel: 8,                            // m/s²
      brakeDecel: 20,                      // m/s²
      lateralSpeed: 7,                     // m/s
    },
    sim: { dt: 1 / 60, maxStepsPerFrame: 5 },
  } as const;
  export type Role = 'police' | 'thief';
  ```
- Scripts em `package.json`: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `test` (`vitest run`), `typecheck`, `e2e` (`playwright test`).

- [ ] **Step 1:** `pnpm add three` e `pnpm add -D typescript vite vitest jsdom @types/three @playwright/test`. TS `strict: true`, `module: ESNext`, `moduleResolution: bundler`, `noUncheckedIndexedAccess: true`.
- [ ] **Step 2:** `index.html` com `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<div id="app">` e `<script type="module" src="/src/main.ts">`. `styles.css` zera margens, fundo preto, `touch-action: none`, `user-select: none`, `overflow: hidden`.
- [ ] **Step 3:** Teste `tests/sanity.test.ts`: `expect(BALANCE.road.laneCenters).toEqual([-4.5,-1.5,1.5,4.5])` e `expect(BALANCE.movement.cruise.thief).toBeGreaterThan(BALANCE.movement.cruise.police)`.
- [ ] **Step 4:** `pnpm test` → PASS. `pnpm build` → gera `dist/` sem erros.
- [ ] **Checkpoint:** `chore: scaffold vite + three + vitest + playwright project`

### Task 2: RNG com semente e regra de pureza do sim

**Files:**
- Create: `src/sim/rng.ts`, `tests/sim/rng.test.ts`, `tests/sim/purity.test.ts`

**Interfaces:**
- Produces: `createRng(seed: number): Rng` com `Rng = { next(): number /* [0,1) */; range(min: number, max: number): number; int(min: number, maxInclusive: number): number }`. Algoritmo: mulberry32.

- [ ] **Step 1:** Testes: mesma semente → mesmas 5 primeiras saídas; sementes diferentes → sequências diferentes; 10 000 chamadas de `next()` ficam em `[0,1)`; `int(1,3)` só retorna 1, 2 ou 3.
- [ ] **Step 2:** `purity.test.ts`: lê com `fs` todos os `.ts` de `src/sim/` e falha se algum contiver `from 'three'`, `document.` ou `window.`.
- [ ] **Step 3:** Rodar → FAIL. Implementar. Rodar → PASS.
- [ ] **Checkpoint:** `feat(sim): add seeded rng and sim purity guard`

### Task 3: Movimento do carro

**Files:**
- Create: `src/sim/intents.ts`, `src/sim/car.ts`, `tests/sim/car.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // intents.ts
  export interface Intents { left: boolean; right: boolean; brake: boolean; fire: boolean; bomb: boolean }
  export const NO_INTENTS: Intents;
  // car.ts
  export interface CarState { role: Role; s: number; x: number; speed: number; steer: -1 | 0 | 1; touchingEdge: boolean }
  export function createCar(role: Role, laneIndex: 0|1|2|3, s?: number): CarState;
  export function stepCar(car: CarState, intents: Intents, dt: number): CarState; // pura, retorna novo objeto
  ```
  O carro nasce com `speed = 0`.

- [ ] **Step 1:** Testes (dt = 1/60, valores de `BALANCE`):
  - `createCar('thief', 2)` → `x === 1.5`, `speed === 0`;
  - sem intents, após 10 s de passos, polícia a `33` (±0,01) e ladrão a `34`; nunca passa do cruzeiro;
  - `brake` por 1 s a partir do cruzeiro → `speed` cai 20 (±0,1); nunca fica negativa;
  - soltar o freio volta a acelerar a 8 m/s²;
  - `left` por 0,5 s → `x` diminui 3,5; `steer === -1`;
  - `left` e `right` juntos → `x` não muda e `steer === 0`;
  - segurar `right` por 5 s a partir da faixa 3 → `x === 6 - 0.9` e `touchingEdge === true`; ao sair da borda, `false`;
  - `s` avança `speed * dt` a cada passo;
  - `stepCar` não modifica o objeto recebido.
- [ ] **Step 2:** Rodar → FAIL. Implementar. Rodar → PASS.
- [ ] **Checkpoint:** `feat(sim): car movement with auto-accel, brake and lateral steering`

### Task 4: Mundo e passo fixo

**Files:**
- Create: `src/sim/world.ts`, `src/sim/fixedStepper.ts`, `tests/sim/world.test.ts`, `tests/sim/fixedStepper.test.ts`

**Interfaces:**
- Consumes: `createCar`, `stepCar`, `createRng`.
- Produces:
  ```ts
  export interface WorldState { seed: number; time: number; player: CarState }
  export function createWorld(opts: { seed: number; playerRole: Role }): WorldState; // jogador na faixa 1 (x = -1.5), s = 0
  export function stepWorld(w: WorldState, playerIntents: Intents, dt: number): WorldState;
  export class FixedStepper {
    constructor(step: (dt: number) => void, dt?: number /* BALANCE.sim.dt */, maxSteps?: number /* BALANCE.sim.maxStepsPerFrame */);
    advance(elapsedSeconds: number): number; // executa 0..maxSteps passos, devolve alpha [0,1) para interpolação
  }
  ```
  A IA e o adversário entram na Entrega 2; nesta entrega o mundo só tem o jogador.

- [ ] **Step 1:** Testes do `FixedStepper`: `advance(1/60)` executa 1 passo; `advance(1/120)` duas vezes executa 1 passo no total; `advance(10)` executa no máximo 5 passos e descarta o resto (alpha < 1); o alpha devolvido é `acumulado / dt`.
- [ ] **Step 2:** Testes do mundo: `time` soma dt; mesma semente + mesmas intents por 600 passos → estados idênticos (`toEqual`).
- [ ] **Step 3:** Rodar → FAIL. Implementar. Rodar → PASS.
- [ ] **Checkpoint:** `feat(sim): world state and fixed-step loop`

### Task 5: Teclado

**Files:**
- Create: `src/input/keyboard.ts`, `tests/input/keyboard.test.ts` (ambiente jsdom: `// @vitest-environment jsdom`)

**Interfaces:**
- Produces: `createKeyboardInput(target: Window | HTMLElement): { read(): Intents; dispose(): void }`. Mapa: ←/A = left, →/D = right, ↓/S = brake, Espaço = fire, B = bomb. Ao perder o foco (`blur`), tudo é solto.

- [ ] **Step 1:** Testes: `keydown ArrowLeft` → `left: true`; `keyup` → `false`; `KeyD` → `right`; `blur` solta tudo; após `dispose()`, eventos não mudam nada.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(input): keyboard intents`

### Task 6: Botões de toque

**Files:**
- Create: `src/input/touchButtons.ts`, `src/input/touchButtons.css`, `tests/input/touchButtons.test.ts` (jsdom)

**Interfaces:**
- Produces: `createTouchButtons(root: HTMLElement): { read(): Intents; dispose(): void; setVisible(name: 'fire' | 'bomb', visible: boolean): void }`.
  - Cria `button[data-intent=left|right|brake|fire|bomb]`, rotulados `◀`, `▶`, `FREIO`, `ATIRAR`, `💣`. Nesta entrega `fire` e `bomb` começam ocultos.
  - Layout: ◀ ▶ no canto inferior esquerdo; FREIO e ATIRAR no inferior direito; tudo com `padding` de `env(safe-area-inset-*)`, mínimo 64×64 CSS px, semitransparente.
  - Rastreia `pointerId` por botão (multitoque): `pointerdown` ativa; `pointerup`, `pointercancel` e `pointerleave` desativam só aquele ponteiro.

- [ ] **Step 1:** Testes: `pointerdown` em ◀ → `left: true`; dois ponteiros (◀ id 1, FREIO id 2) → `left` e `brake` true; `pointerup` do id 1 → só `brake`; `pointercancel` solta; `pointerleave` solta; os botões existem com os rótulos acima.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(input): multi-touch on-screen buttons`

### Task 7: Pipeline PS1

**Files:**
- Create: `src/render/ps1Pipeline.ts`, `tests/render/ps1Pipeline.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function computeInternalSize(cssWidth: number, cssHeight: number, targetHeight = 270): { width: number; height: number };
  export function createRenderer(container: HTMLElement): { renderer: THREE.WebGLRenderer; resize(): void };
  export function applyPs1Look(material: THREE.Material, snap: { width: number; height: number }): void;
  ```
  - `createRenderer`: `antialias: false`, `setPixelRatio(1)`, `setSize(internal.w, internal.h, false)`. Canvas com CSS `width:100%; height:100%; image-rendering: pixelated`. `resize()` usa `computeInternalSize` do container.
  - `applyPs1Look`: `onBeforeCompile` arredonda `gl_Position.xy / w` para a grade da resolução interna (vertex snap). Texturas com `NearestFilter` e sem mipmaps.
  - A cena usa `THREE.Fog` com início em 60 m e fim em 220 m.

- [ ] **Step 1:** Testes de `computeInternalSize`: 844×390 → altura 270 e largura 584 (par); 390×844 (retrato) → altura 270 e largura par ≥ 2; 1920×1080 → 480×270.
- [ ] **Step 2:** FAIL → implementar → PASS. `createRenderer` e `applyPs1Look` são validados no e2e (Task 10).
- [ ] **Checkpoint:** `feat(render): ps1 low-res pipeline with vertex snapping`

### Task 8: Rua infinita e prédios

**Files:**
- Create: `src/render/roadChunks.ts`, `src/render/buildings.ts`, `src/render/textures.ts`, `tests/render/roadChunks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CHUNK_LENGTH = 50; // m
  export function visibleChunkRange(cameraS: number, ahead = 250, behind = 50): { first: number; last: number }; // índices inteiros de bloco
  export function createRoad(scene: THREE.Scene, seed: number): { update(cameraS: number): void };
  ```
  - Cada bloco tem asfalto de 12 m de largura, faixas tracejadas brancas entre as 4 faixas, linhas contínuas nas bordas, meio-fio, calçada de 4 m de cada lado com postes a cada 25 m e prédios.
  - Os blocos vêm de um **pool fixo** (`last - first + 1` blocos) e são reposicionados. Nunca se cria mesh em `update`.
  - Prédios usam um `InstancedMesh` por lado. Altura, largura e cor vêm de `createRng(seed + chunkIndex)`, então o mesmo bloco sempre tem os mesmos prédios.
  - Texturas pequenas geradas em canvas (`textures.ts`: asfalto 32×32, janelas 16×16) com `NearestFilter`.
  - A origem do mundo do Three.js acompanha a câmera (o render subtrai `floor(cameraS / CHUNK_LENGTH) * CHUNK_LENGTH` de `s`), para não perder precisão com `s` grande.

- [ ] **Step 1:** Testes de `visibleChunkRange`: `s = 0` → `{first: -1, last: 5}`; `s = 49.9` → mesmos índices; `s = 50` → `{0, 6}`; `s = 1e6` → `{19999, 20005}`; o tamanho do intervalo é sempre 7.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(render): recycled road chunks with instanced buildings`

### Task 9: Carros em código

**Files:**
- Create: `src/render/carFactory.ts`, `tests/render/carFactory.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function createCarModel(role: Role): THREE.Group;
  export function updateCarModel(model: THREE.Group, car: CarState, timeSeconds: number): void;
  ```
  - Low-poly com caixas e cilindros; comprimento 4,4 m e largura 1,8 m (casa com `BALANCE.car`).
  - Polícia: carroceria branca, portas e capô azuis, filho `name = 'lightbar'` com duas luzes `'lightbar-red'` e `'lightbar-blue'`. A cada 0,25 s uma acende (emissive forte) e a outra apaga.
  - Ladrão: muscle car preto, capô longo e baixo, faixa cinza escura, rodas largas.
  - `updateCarModel`: posiciona o modelo, inclina (roll) até 6° na direção de `steer` e gira as rodas pela velocidade.
  - Todos os materiais passam por `applyPs1Look`.

- [ ] **Step 1:** Testes (Node, sem WebGL): `createCarModel('police')` tem `lightbar`, `lightbar-red` e `lightbar-blue`; o modelo do ladrão não tem `lightbar`; a caixa envolvente da polícia tem comprimento 4,4 ± 0,3 e largura 1,8 ± 0,2; em `t = 0` só o vermelho está aceso e em `t = 0.25` só o azul; com `steer = 1` e `steer = -1` o roll tem sinais opostos e `|roll| ≤ 6°`; com `steer = 0`, roll 0.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Checkpoint:** `feat(render): procedural police and thief car models`

### Task 10: Montagem, câmera, debug e e2e

**Files:**
- Create: `src/render/cameras.ts`, `src/game.ts`, `src/debug.ts`, `e2e/foundation.spec.ts`
- Modify: `src/main.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: tudo acima.
- Produces:
  - `createChaseCamera(): { camera: THREE.PerspectiveCamera; update(car: CarState, dt: number): void }`: FOV 60, 6 m atrás, 2,6 m acima, olhando 10 m à frente, com suavização lateral.
  - `startGame(container: HTMLElement, opts: { role: Role; seed: number; debug: boolean }): { stop(): void }`: monta o renderer, a cena, a rua, o carro, a câmera e os inputs (teclado e toque combinados: cada intent é verdadeira se qualquer um dos dois a ativar). O loop usa `requestAnimationFrame` → `FixedStepper` → render, com o carro interpolado por `alpha`.
  - `main.ts` lê `?role=police|thief` (padrão `police`), `?seed=` (padrão `Date.now()`) e `?debug`.
  - Com `?debug`, `debug.ts` mostra FPS e `renderer.info.render.calls` no canto e expõe `window.__game = { snapshot(): WorldState; drawCalls(): number }`.
  - Retrato (`innerHeight > innerWidth`): mostra o aviso "Gire o celular" e pausa o `FixedStepper`.

- [ ] **Step 1:** `playwright.config.ts`: `webServer` = `pnpm build && pnpm preview --port 4173`. Projeto `mobile-landscape`: viewport 844×390, `hasTouch: true`, `isMobile: true`. Projeto `desktop`: 1280×720.
- [ ] **Step 2:** Escrever os e2e (`/?debug&seed=1`):
  - canvas visível e sem erros no console;
  - após 6 s, `snapshot().player.speed` ≈ 33;
  - `?role=thief` → ≈ 34;
  - segurar ArrowLeft por 0,5 s diminui `x`;
  - no mobile, `touchscreen` no botão FREIO por 1 s reduz a velocidade;
  - `drawCalls()` < 100, e a contagem em t = 3 s e t = 8 s difere em no máximo 5;
  - `setViewportSize(390, 844)` mostra "Gire o celular" e `time` para;
  - screenshot salva em `test-results/foundation-<projeto>.png`.
- [ ] **Step 3:** `pnpm e2e` → FAIL. Implementar. `pnpm e2e` → PASS nos dois projetos.
- [ ] **Step 4:** Abrir o screenshot do mobile e conferir o visual: pixels nítidos, 4 faixas, prédios dos dois lados, viatura com giroscópio.
- [ ] **Checkpoint:** `feat: wire game loop, chase camera, debug overlay and e2e`

### Task 11: Verificação final e entrega

- [ ] **Step 1:** Usar `verification-before-completion`: `pnpm typecheck && pnpm test && pnpm build && pnpm e2e` → tudo verde, colando a saída.
- [ ] **Step 2:** Usar `requesting-code-review` na branch inteira.
- [ ] **Step 3:** Usar `ship-via-script`: branch `feat/foundation`, um commit por Checkpoint acima (em ordem) e PR "feat: foundation — PS1 road, drivable car, touch controls". A validação do script roda `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build` e, antes do primeiro e2e, `pnpm exec playwright install chromium`, depois `pnpm e2e`.
