# Entrega 4 — Visual e áudio: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Regra do projeto (AGENTS.md §2):** o agente não commita; os Checkpoints viram commits no script `scratch/NN-*.ps1` (skill `ship-via-script`).

**Goal:** O jogo passa a *parecer* e *soar* como uma perseguição. Os carros mostram o dano conforme a vida, e um atirador aparece na janela do carona. Explosões, fumaça e faíscas reagem aos eventos. Motor, sirene, tiros, impactos e música são sintetizados em WebAudio.

**Architecture:** Nenhuma regra de jogo muda: `src/sim` fica intocado (só leitura de `WorldState` e `GameEvent`).
- **Render:** módulos novos em `src/render`:
  - `damageView.ts`: dano visual a partir da vida;
  - `gunner.ts`: atirador na janela;
  - `particles.ts`: fumaça e explosão com pool fixo e `InstancedMesh`.
- **Áudio:** `src/audio/` com um mixer puro e testável (mapeia estado e eventos para comandos de som) e um adaptador WebAudio fino:
  - `synth.ts`: osciladores, ruído, envelopes;
  - `sfx.ts`;
  - `music.ts`: sequenciador chiptune.
- **Wiring:** o `game.ts` liga tudo, igual às entregas anteriores.

**Tech Stack:** a mesma (TypeScript 7, Vite 8, Three.js 0.186, Vitest 5, Playwright 1.63, pnpm 12). Áudio sem arquivos e sem bibliotecas: só WebAudio.

**Spec:** `docs/superpowers/specs/2026-10-03-policia-ladrao-design.md` (§9 dano visual e áudio, §12 entrega 4 com o atirador visível).

## Global Constraints

- **Dano visual** (spec §9) é contínuo, função só da vida, e reversível ao curar:

  | Vida | Aparência |
  |---|---|
  | ≤ 80 | sujeira crescente |
  | ≤ 60 | amassados (deformação de vértices) e uma lanterna torta |
  | ≤ 40 | fumaça branca, para-choque pendurado, para-brisa trincado |
  | ≤ 20 | fumaça preta, faíscas, farol piscando |

- **Atirador:** boneco low-poly na janela do carona, braço e arma apontando para o alvo. Policial com quepe azul; ladrão com touca e lenço. Clarão na boca da arma a cada tiro. O ladrão só aparece depois de ganhar a arma; a polícia sempre.
- **Orçamento:** < 100 draw calls em `high`. Hoje são ~90.
  - Fumaça: 1 `InstancedMesh` compartilhado.
  - Atirador: ≤ 2 meshes por carro.
  - Para-brisa trincado: troca de textura, sem mesh novo.
  - Sujeira: parâmetro do material, sem draw.
- **Áudio** (spec §9), sintetizado em WebAudio:
  - motor com pitch pela velocidade;
  - sirene (só a polícia, e só perto da tela: volume pela distância);
  - tiros, impactos, explosão e coleta;
  - música chiptune em loop.
  - **Ligado por padrão.** Por regra dos navegadores, o áudio só começa no primeiro toque ou tecla.
  - **Botão de som** 🔊/🔇 pequeno no HUD (a tela de título e a pausa ficam para a Entrega 5) e tecla **M**. A escolha fica salva em `localStorage`, com fallback se o storage falhar.
- **Desempenho:** o áudio não cria nós por frame. Os sons curtos reaproveitam buffers de ruído e envelopes. Em `low`, as partículas caem pela metade.
- Os testes e2e continuam sem erros no console. No headless sem áudio, o mixer roda com um backend nulo.

## Review Focus

1. **Curar reverte o dano visual:** de 15 para 45 de vida some a fumaça preta, as faíscas e o farol piscando → teste em Task 1.
2. **Clones de template compartilham geometria** (Entrega 3): amassar um carro não pode amassar o outro, nem o template → teste em Task 1.
3. **Draw calls** com os dois carros em ≤ 20 de vida, fumaça, atirador, tráfego e caixinhas: < 100 → e2e em Task 7.
4. **Áudio após fim de partida e reinício:** nada fica tocando em dobro e nenhum nó vaza → teste em Task 4/5.
5. **Sem gesto do usuário**, nenhum `AudioContext` em estado de erro e nenhum aviso no console → e2e em Task 7.

---

### Task 1: Dano visual nos carros

**Files:**
- Create: `src/render/damageView.ts`, `tests/render/damageView.test.ts`
- Modify: `src/render/carFactory.ts` (geometria própria da lataria por carro do jogo, peças nomeadas), `src/game.ts`

**Interfaces:**
- `damageLook(hp: number): { dirt: number; dents: number; tiltedLamp: boolean; whiteSmoke: boolean; hangingBumper: boolean; crackedGlass: boolean; blackSmoke: boolean; sparks: boolean; blinkingHeadlight: boolean }`:
  - `dirt` vai de 0 (100 hp) a 1 (≤ 20 hp);
  - `dents` vai de 0 (> 60 hp) a 1 (0 hp);
  - os booleanos seguem a tabela.
- `applyDamage(model: THREE.Group, look, time: number): void`:
  - **sujeira:** escurece e tira o verniz (`clearcoat`, `roughness`);
  - **amassados:** desloca vértices da lataria com ruído fixo por carro;
  - **lanterna torta:** rotaciona uma lanterna;
  - **para-choque pendurado:** rotaciona o para-choque;
  - **vidro trincado:** troca o mapa do vidro;
  - **farol piscando:** emissive on/off.
- O carro do jogo passa a ter **geometria de lataria própria** (cópia do template), para amassar sem afetar o outro carro nem o template. O tráfego continua compartilhando.

- [x] **Step 1:** Testes:
  - a tabela de `damageLook` nos limites (100, 80, 60, 40, 20, 0);
  - curar de 15 para 45 desliga a fumaça preta, as faíscas e o farol piscando;
  - amassar um carro não muda a geometria de outro carro nem a do template;
  - com `dents = 0`, a geometria é idêntica à original;
  - nenhuma peça nova adiciona draw call: conta de meshes igual antes/depois.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(render): progressive car damage (dirt, dents, hanging bumper, cracked glass, blinking headlight)`

### Task 2: Partículas — fumaça, faíscas de dano e explosão

**Files:**
- Create: `src/render/particles.ts`, `tests/render/particles.test.ts`
- Modify: `src/render/combatFx.ts` (explosão da bomba e batidas usam as partículas), `src/game.ts`

**Interfaces:**
- `createParticles(scene, max = 160): { emitSmoke(x, y, z, color: 'white'|'black'); emitBurst(x, y, z, kind: 'explosion'|'crash'); update(dt, originS); setQuality(q) }`:
  - 1 `InstancedMesh` (quad billboard) com cor por instância;
  - pool circular: a mais velha é reaproveitada;
  - fumaça sobe e cresce, some em ~1,2 s;
  - explosão: bola laranja rápida, depois fumaça escura;
  - em `low`, emite metade.
- **Emissão contínua pelo `damageLook`:** fumaça branca ≤ 40, preta ≤ 20, saindo do capô e deixada para trás conforme a velocidade. As faíscas de dano ≤ 20 reaproveitam o `combatFx`.
- **Eventos:** `explosion` gera explosão no ponto da bomba; `crash` gera um burst pequeno.

- [x] **Step 1:** Testes:
  - nunca passa de `max` instâncias vivas;
  - partículas expiradas somem (escala 0);
  - em `low` emite metade;
  - um `explosion` gera N partículas na posição certa;
  - não adiciona objetos à cena depois de criado (pool fixo).
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(render): smoke, explosion and crash particles`

### Task 3: Atirador na janela do carona

**Files:**
- Create: `src/render/gunner.ts`, `tests/render/gunner.test.ts`
- Modify: `src/render/carFactory.ts` (encaixe na janela direita), `src/render/combatFx.ts` (clarão na boca da arma), `src/game.ts`

**Interfaces:**
- `createGunner(role): THREE.Group`:
  - **corpo:** cabeça, tronco e braço com arma mesclados num mesh, cor por vértice;
  - **policial:** quepe e camisa azul-escuros;
  - **ladrão:** touca preta e lenço vermelho;
  - **clarão:** sprite no cano, escondido por padrão.
- `aimGunner(g, from: {s, x}, to: {s, x}, originS)`:
  - gira o tronco e o braço para o alvo, limitado ao cone de tiro;
  - fora do cone, volta à posição de descanso (arma para cima).
- `flash(g, time)`: mostra o clarão por 60 ms. Disparado pelo evento `shot` do atirador.
- **Ladrão:** o atirador só fica visível com `hasGun`.

- [x] **Step 1:** Testes:
  - o policial aparece sempre, o ladrão só com `hasGun`;
  - mirando um alvo à direita/atrás, o braço aponta para o lado do alvo (sinal do ângulo);
  - fora do cone, volta ao descanso;
  - o clarão aparece após `shot` e some após 60 ms;
  - ≤ 2 meshes por atirador.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(render): visible gunner in the passenger window with muzzle flash`

### Task 4: Mixer de áudio puro e síntese WebAudio

**Files:**
- Create: `src/audio/mixer.ts`, `src/audio/synth.ts`, `src/audio/sfx.ts`, `tests/audio/mixer.test.ts`, `tests/audio/sfx.test.ts`

**Interfaces:**
- `AudioBackend` (interface): `tone(...)`, `noise(...)`, `setEngine(freq, gain)`, `setSiren(gain)`, `setMaster(gain)`, `close()`.
  - `createWebAudioBackend()` implementa com `AudioContext`, criado só no primeiro gesto do usuário;
  - `createNullBackend()` só grava as chamadas (testes e headless).
- `createMixer(backend): { frame(world, dt); events(events); setMuted(m); reset() }`, puro:
  - **motor:** frequência = 55 + 3 × velocidade Hz; gain mais alto ao acelerar, mais baixo no ar;
  - **sirene:** só quando a polícia está a ≤ 120 m do carro do jogador. Gain pela distância; jogando de polícia, a própria sirene fica baixa e constante;
  - **eventos:** `shot` → tiro; `hit` → impacto; `crash` → batida; `explosion` → explosão; `pickup` → coleta (agudo para item, grave para −2); `end` → fanfarra curta;
  - **limite** de 6 sons curtos por 100 ms (rajadas não estouram);
  - **`reset()`** ao reiniciar: sem sobreposição.
- **`sfx.ts`:** receitas puras (frequências, envelopes, duração) para cada som, testáveis sem WebAudio.

- [x] **Step 1:** Testes (null backend):
  - a frequência do motor sobe com a velocidade;
  - a sirene fica silenciosa a 200 m e sobe ao se aproximar;
  - cada tipo de evento toca a receita certa;
  - 20 `shot` no mesmo frame tocam no máximo 6;
  - mudo → master 0 e nenhum som novo;
  - `reset()` para motor e sirene;
  - as receitas têm duração > 0 e envelope que termina em 0.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(audio): pure mixer, WebAudio synth and sound effects`

### Task 5: Música chiptune

**Files:**
- Create: `src/audio/music.ts`, `tests/audio/music.test.ts`
- Modify: `src/audio/mixer.ts`

**Interfaces:**
- `createSequencer(song: Song, bpm = 140)` com `step(dt): Note[]`, determinístico. Os padrões têm 16 passos.
  - baixo em onda quadrada;
  - melodia em pulso 25%;
  - percussão com ruído.
- **Intensidade:** a música sobe um nível quando a distância fica abaixo de 40 m ou alguém fica com ≤ 30 de vida (camada extra de percussão).
- O mixer agenda as notas com antecedência (lookahead de 100 ms) para não atrasar em frames lentos.

- [x] **Step 1:** Testes:
  - mesma `dt` → mesmas notas (determinístico);
  - o loop fecha em 16 passos;
  - em 140 bpm, 1 s rende ~9,3 passos (semicolcheias);
  - a intensidade alta acrescenta a camada de percussão;
  - mudo → nenhuma nota agendada.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(audio): chiptune music with intensity layer`

### Task 6: Botão de som e wiring no jogo

**Files:**
- Modify: `src/ui/hud.ts`, `src/ui/hud.css`, `tests/ui/hud.test.ts`, `src/input/keyboard.ts`, `src/game.ts`, `src/main.ts` (`?mute`)

**Interfaces:**
- **Botão** 🔊/🔇 no HUD, à direita do relógio central, com `aria-label` "Som ligado"/"Som desligado".
- **Tecla M** alterna.
- **Estado salvo** em `localStorage['pl.sound']`, com leitura e escrita em `try/catch`.
- **Primeiro gesto** (pointerdown ou keydown) cria e retoma o `AudioContext`.
- **Fim de partida:** a música abaixa e o motor para.
- **"Jogar de novo":** `mixer.reset()`.

- [x] **Step 1:** Testes (jsdom):
  - o botão alterna o rótulo e o estado;
  - M alterna;
  - o estado persiste e um storage que lança exceção não quebra;
  - o `?mute` começa mudo.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Checkpoint:** `feat(ui): sound toggle and audio wiring`

### Task 7: Sobras da Entrega 3 e e2e

**Files:**
- Modify:
  - `src/render/worldProps.ts`: pool de bombas 3 → 6; tráfego interpolado entre passos da simulação; pool de tráfego enxuto;
  - `src/sim/traffic.ts`: tráfego não nasce sobre caixinhas;
  - `src/ui/hud.ts`: aviso "máximo" ao pegar um item já no limite;
  - `src/debug.ts`: contador de draw calls somando todos os passes do quadro, retrovisor incluído;
  - `e2e/visual.spec.ts` (novo).

- [x] **Step 1:** Testes unitários das sobras (bomba nº 4 visível; spawn de tráfego nunca sobre caixinha; aviso "máximo").
- [x] **Step 2:** e2e:
  - com `?debug&policeHp=15&thiefHp=15`, os dois carros mostram fumaça preta e a contagem total de draw calls (com retrovisor) fica < 100 em `high`;
  - o atirador da polícia aparece;
  - com `?give=gun`, o atirador do ladrão aparece;
  - o botão de som alterna;
  - o `?mute` não toca nada;
  - zero erros no console sem gesto do usuário;
  - screenshot "visual" para conferência.
- [x] **Step 3:** PASS nos dois projetos.
- [x] **Checkpoint:** `fix: milestone 3 leftovers; test(e2e): visuals and audio`

### Task 8: Verificação, revisão e entrega

- [x] **Step 1:** `verification-before-completion`: typecheck, unit, build e e2e, com a saída colada.
- [x] **Step 2:** `requesting-code-review`, com revisor novo e o Review Focus acima.
- [ ] **Step 3:** `ship-via-script`: branch `feat/visual-audio` a partir da `main` (com a PR da Entrega 3 mergeada), um commit por Checkpoint, PR "feat: visuals and audio — car damage, gunner, particles, synthesized sound and music".
