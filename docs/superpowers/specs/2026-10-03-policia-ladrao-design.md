# Polícia × Ladrão — Design (v1)

Data: 2026-10-03 · Status: aprovado em conversa, aguardando revisão da spec escrita

## 1. Visão

Jogo de perseguição de carros em 3D low-poly estilizado (resolução nativa, iluminação e reflexos; *revisado em 2026-10-03: o visual "32 bit"/PS1 da primeira versão foi descartado*), para celular em landscape (PC depois). Antes da partida o jogador escolhe **Polícia** ou **Ladrão**; a IA controla o outro lado. A polícia tenta destruir o ladrão o mais rápido possível; o ladrão tenta sobreviver o máximo de tempo e, se puder, destruir a polícia.

**Critérios de sucesso da v1**
- Partida completa jogável no celular (Android médio) a 60 fps, dos dois lados.
- Todas as regras abaixo implementadas e cobertas por testes.
- Ranking local funcionando, PWA instalável, deploy na Vercel.

**Fora da v1**: multiplayer (local ou online), contas e ranking global, curvas (entrega 6, logo após a v1), mais de um mapa.

## 2. Partida

- Fluxo: Título → Escolha de lado → contagem 3-2-1 → corrida → Fim → (iniciais se top 10) → Ranking.
- Polícia e ladrão começam com **100 de vida**. Sem limite de tempo. Vida mínima 0, máxima 100.
- **Vitória**: quem chega a 0 perde. Se os dois chegarem a 0 no mesmo passo de simulação, vence o ladrão (ele "sobreviveu" até o fim).
- **Cronômetro**: começa no fim da contagem e para quando alguém chega a 0. Precisão interna de ms, exibição `mm:ss.d`.
- **Dificuldade crescente**: a cada 30 s o nível sobe 1 (máximo 10). Cada nível melhora a IA adversária (tempo de reação, precisão de desvio, agressividade de batida) e aumenta a densidade de tráfego em ~8%. Aplica-se ao adversário controlado pela IA, seja ele polícia ou ladrão.

## 3. Pista e movimento

- Rua reta (curvas suaves na entrega 6) com **4 faixas no mesmo sentido**, calçada com meio-fio e postes dos dois lados e prédios passando. A pista é gerada em blocos e reciclada (infinita).
- Coordenadas da simulação: `s` = metros ao longo da pista, `x` = posição lateral contínua (faixas centradas em −4,5 / −1,5 / +1,5 / +4,5 m; bordas em ±6 m).
- **Aceleração automática** até a velocidade de cruzeiro. Valores iniciais: polícia e ladrão 34 m/s (*revisado em 2026-10-04: antes 33 × 34, a polícia ficava parada a ~65 m e nunca encostava*). Com a compensação a partir de 20 m, a polícia chega rápido a ~20 m e só encosta/bate quando o ladrão erra (tráfego, quebra-molas, freio).
- **◀ ▶** movem lateralmente (direção contínua, não troca de faixa por salto). **Freio** reduz a velocidade; soltar volta a acelerar.
- **Tráfego**: 2–4 carros visíveis no nível 1, a 50–70% do cruzeiro, trocando de faixa ocasionalmente.
- **Quebra-molas** (*revisado em 2026-10-03*): a cada 400 m ± 80 m, cobrindo **2 faixas vizinhas** sorteadas (as outras 2 ficam livres, dá para desviar). Quem passa por cima salta por 0,6 s e **perde 25% da velocidade**; no ar não acelera (a direção continua funcionando). Depois de aterrissar, recupera com a aceleração normal (~1 s). Vale para polícia e ladrão. No ar o carro **não pega caixinhas nem ativa bombas**. Colisões com carros continuam valendo. Aviso: placa amarela grande (losango com o desenho da lombada) na beira da pista 75 m antes e 3 faixas amarelas pintadas nas 2 faixas cobertas, de 16 a 28 m antes (*revisado em 2026-10-04: a placa pequena a 40 m passava despercebida*).

## 4. Combate

### 4.1 Tiros
- **Mira automática**: o alvo é sempre o carro adversário, se estiver dentro do cone de tiro. Polícia: cone frontal de ±35° e laterais (até 90°), alcance 150 m. Arma traseira do ladrão: cone traseiro de ±35° e laterais.
- Segurar ATIRAR dispara na cadência atual. Fora do cone, o botão pisca "sem alvo" e não gasta nada.
- **Tráfego bloqueia tiros** (vira escudo), exceto com Tiro perfurante ativo.
- Projéteis são rápidos (300 m/s) mas não instantâneos, e podem errar se o alvo desviar.
- **Arma do ladrão não funciona com o carro quase parado**: abaixo de 8 m/s (~30 km/h, configurável) o botão ATIRAR do ladrão fica bloqueado. A bomba continua liberada.

### 4.2 Tabela de dano (valores iniciais em `config/balance.ts`)

| Evento | Ladrão | Polícia |
|---|---|---|
| Tiro da polícia | −1 × potência × fator de distância × armadura | — |
| Tiro do ladrão (com arma) | — | −1,5 × fator de distância (*teste de balanço A, 2026-10-04*) |
| Colisão polícia × ladrão (qualquer um iniciando) | −5 × armadura (−8 com aríete) | −3 (−1 com aríete) |
| Colisão com cenário (meio-fio/poste) ou tráfego | −5 | −5 |
| Pegar caixinha da outra cor | −2 | −2 |
| Passar sobre bomba (no chão) | — | −15 (*teste de balanço C, 2026-10-04*) |

- Cada par (carro, fonte de colisão) tem **1 s de imunidade** após o impacto. Toda colisão reduz a velocidade em 30% e empurra o carro para longe do obstáculo.
- **Armadura** (titânio) = 1 − 0,15 × placas (até 3 placas = 0,55). Vale para tiro da polícia e colisão com a polícia. **Não** vale para cenário, tráfego ou caixinha.

### 4.3 Distância e compensação
- `d` = distância em `s` entre os dois carros.
- **Fator de distância do tiro**: 1,0 até 40 m; cai linearmente até 0 em 150 m. Com Helicóptero ativo, o tiro da polícia ignora esse fator (vale 1,0 até 150 m).
- **Turbo de compensação**: quando `d > 20 m`, a polícia ganha velocidade extra que cresce linearmente até +35% em `d = 150 m`. Desliga quando `d ≤ 20 m` (*revisado em 2026-10-04: antes 60 m*).
- **A polícia nunca ultrapassa o ladrão.** Vale para a IA e para o jogador de polícia. A dianteira da viatura nunca passa da dianteira do ladrão (`s_polícia ≤ s_ladrão`). Ao encostar, a velocidade da polícia fica limitada à do ladrão:
  - **mesma faixa** (sobreposição lateral): a polícia fica **atrás**, a 1 comprimento de carro no mínimo. A batida traseira ainda acontece se ela chegar com velocidade maior;
  - **faixa diferente**: a polícia fica **ao lado** (no máximo emparelhada);
  - se o ladrão frear ou parar, a polícia freia junto e para atrás ou ao lado, conforme a posição. **Ela continua atirando** (o cone lateral cobre o lado).
  - Motivo: impedir que o ladrão pare ou se deixe ultrapassar para fugir da mira e ganhar sem correr.
- HUD mostra `d` colorido: verde ≤ 40 m, amarelo ≤ 100 m, vermelho acima.

## 5. Caixinhas e itens

- Aparecem a cada 300 m ± 60 m, numa faixa aleatória, nunca sobre um quebra-molas. **No máximo 2 visíveis ao mesmo tempo.**
- Visual: **polícia = cubo azul**, **ladrão = losango vermelho**; casca colorida translúcida com núcleo branco brilhante (*revisado em 2026-10-04: só o núcleo era colorido e as duas se confundiam*).
- Cor sorteada com 50/50 por padrão. A cor tende para o lado com menos vida (até 65/35) para ajudar quem está perdendo.
- Pegar a da **própria** cor aplica um item sorteado do grupo. Pegar a da **outra** cor causa −2 e consome a caixinha. A IA busca as da sua cor e desvia das outras (melhor em níveis altos).

### 5.1 Azul — Polícia (pesos iniciais)
| Item | Efeito | Tipo |
|---|---|---|
| Cadência | intervalo −0,1 s (de 0,8 s até mínimo 0,3 s) | permanente |
| Potência | dano +0,5 por tiro (de 1 até máximo 3) | permanente |
| Vida | +3 | instantâneo |
| Nitro | +40% de velocidade por 3 s | ativa ao pegar |
| Para-choque aríete | próximas 3 colisões com o ladrão: ladrão −8, polícia −1 | cargas |
| Helicóptero | 8 s sem queda de dano por distância | ativa ao pegar |
| Tiro perfurante | 10 s com tiros atravessando o tráfego | ativa ao pegar |

Quando um item permanente já está no máximo, o sorteio o exclui.

### 5.2 Vermelha — Ladrão
| Item | Efeito | Tipo |
|---|---|---|
| Placa de titânio | +1 placa (para-choque → lateral E → lateral D; máximo 3) | permanente, visível no carro |
| Bomba | +1 no estoque (máximo 3) | estoque |
| Vida | +3 | instantâneo |
| Arma traseira | 1ª: libera a arma (1,5 de dano a cada 1,2 s). Seguintes: intervalo −0,15 s (mínimo 0,6 s) | permanente |

- **Bomba**: botão 💣 (só aparece com estoque > 0) solta a bomba no chão, atrás do ladrão. Ela fica 20 s na pista. Dá −15 na polícia se ela passar por cima sem estar no ar. Tráfego passa por cima sem efeito.

## 6. Controles e HUD

- Landscape. À esquerda: **◀ ▶**. À direita: **FREIO** e **ATIRAR** (maior, com aro na cor do lado: azul polícia, âmbar ladrão), mais **💣** contextual para o ladrão. Botões redondos só com ícone (rótulo acessível em português), vidro escuro com aro, afundam e acendem ao tocar, área de toque maior que o desenho, dentro das safe areas, multitoque com deslizar entre ◀ e ▶. Vibração curta (10 ms) ao apertar e ao levar dano (se suportado). Respeitam "reduzir movimento".
- Ladrão sem arma: ATIRAR fica cinza.
- PC: ←/→ ou A/D, ↓/S freio, Espaço atira, B bomba, Esc pausa.
- HUD: barras de vida dos dois, cronômetro, distância colorida, ícones dos upgrades ativos/permanentes (com timer nos temporários), nível de dificuldade discreto, botão de pausa.
- **Marcador do adversário**: seta de tamanho fixo na cor do outro lado (vermelha = ladrão, azul = polícia) flutuando sobre o carro dele, desenhada por cima de tudo e sem neblina; aparece quando ele está a mais de 15 m.
- **Retrovisor**: segunda câmera, imagem espelhada, pequena (22% da largura) no canto superior direito, ativa sempre que o adversário está atrás do jogador (*revisado em 2026-10-04: no topo central e maior, cobria tráfego, caixinhas e quebra-molas*).
- Retrato: overlay "gire o aparelho" e pausa automática. Perder o foco da aba também pausa.

## 7. Telas

1. **Título**: Jogar · Ranking · Som on/off.
2. **Escolha**: dois cards — viatura branca e azul com giroscópio vermelho/azul piscando; muscle car vermelho — com 3 linhas de regras de cada lado.
3. **Jogo** (contagem 3-2-1 com sirene).
4. **Pausa**: continuar, reiniciar, sair.
5. **Fim**: vitória/derrota, tempo, motivo. Se entrou no top 10, campo de **3 iniciais estilo arcade**.
6. **Ranking**: abas "Polícia — mais rápidos" e "Ladrão — mais resistentes". Top 10 com iniciais, tempo e data.

## 8. Ranking

- Salvo no `localStorage` (chave versionada), dados validados ao carregar. Dados corrompidos viram ranking vazio, sem quebrar o jogo.
- **Polícia**: só partidas que a polícia venceu, jogando de polícia; ordem crescente de tempo; top 10.
- **Ladrão**: toda partida jogada de ladrão (vencendo ou perdendo), com o tempo vivo; ordem decrescente; top 10.
- Empates: o registro mais antigo fica na frente.

## 9. Visual e áudio

- **Render**: resolução nativa da tela (densidade até 2×), antialias, tone mapping ACES, texturas filtradas com mipmaps. **Qualidade automática** em 3 níveis — alto (sombras 2048, 2×), médio (sombras 1024, 1,5×), baixo (sem sombras, 1×) — que desce um nível se a média ficar abaixo de 45 fps por 3 s e nunca sobe sozinha; `?quality=` força um nível.
- **Cena**: céu em degradê, neblina leve ao longe, luz hemisférica, sol com sombras que acompanha o carro, sombra de contato suave sob cada carro (sempre ligada). Reflexos de ambiente (céu/cidade/asfalto) só nos carros.
- **Rua e prédios**: asfalto granulado com marcas de pneu, calçada em placas, faixas nítidas; fachadas com janelas emolduradas que repetem conforme o tamanho do prédio (não esticam).
- **Carros gerados em código** (sem arquivos de terceiros), silhueta extrudada de perfil lateral com caixas de roda e cantos chanfrados, pintura com verniz:
  - polícia branca e azul com giroscópio vermelho/azul piscando (luz alternada);
  - ladrão como muscle car **vermelho** com faixas pretas e lanternas grandes (*revisado em 2026-10-03: o preto sumia contra o asfalto*);
  - tráfego com 3–4 modelos de cores variadas.
- **Dano visual** contínuo, em função da vida, e reversível ao curar:
  | Vida | Aparência |
  |---|---|
  | ≤ 80 | sujeira crescente |
  | ≤ 60 | amassados (deformação de vértices) e uma lanterna torta |
  | ≤ 40 | fumaça branca, para-choque pendurado, para-brisa trincado |
  | ≤ 20 | fumaça preta, faíscas, farol piscando |
- Placas de titânio aparecem no carro do ladrão.
- **Áudio** gerado com WebAudio: motor (pitch pela velocidade), sirene, tiros, impactos, explosão, coleta, música chiptune. Liga/desliga no título e na pausa.

## 10. Arquitetura

- **Stack**: TypeScript, Vite, Three.js, Vitest, Playwright, pnpm, PWA (vite-plugin-pwa), deploy na Vercel.
- **Separação simulação/render**: `src/sim` é TypeScript puro, determinístico (passo fixo de 1/60 s, RNG com semente) e não importa Three.js nem DOM. O render lê um snapshot do estado a cada frame (com interpolação). O input gera **intenções** (`left`, `right`, `brake`, `fire`, `bomb`), que tanto o jogador quanto a IA produzem.

```
src/
  config/balance.ts
  sim/  world.ts track.ts car.ts combat.ts items.ts traffic.ts rubberband.ts ai.ts difficulty.ts match.ts rng.ts
  render/ ps1Pipeline.ts roadChunks.ts buildings.ts carFactory.ts damageView.ts effects.ts cameras.ts
  input/ touchButtons.ts keyboard.ts intents.ts
  ui/ screens/*.ts hud.ts styles.css
  audio/ synth.ts sfx.ts music.ts
  storage/ ranking.ts
  main.ts
```

## 11. Testes

- **Vitest (TDD)** para `sim` e `storage`: tabela de dano, imunidade de colisão, armadura, fator de distância, turbo, cada item (efeito, limite, duração), pulo ignorando bomba e caixinha, polícia nunca ultrapassa (ladrão parado em mesma faixa/faixa vizinha), arma do ladrão bloqueada abaixo de 8 m/s, regra de no máximo 2 caixinhas, viés de cor, escalada de dificuldade, regra de empate, ranking (ordem, corte em 10, dados corrompidos).
- **Simulações headless**: IA × IA com sementes fixas sempre termina, dentro de um tempo limite razoável, nos dois lados.
- **Playwright** (viewport de celular landscape, ex.: 844×390, touch): abrir, escolher cada lado, jogar 10 s, screenshot, HUD visível, retrovisor visível jogando de ladrão, zero erros no console.
- **Desempenho**: 60 fps alvo em Android médio. Contador de FPS e draw calls com `?debug`. Orçamento: < 100 draw calls.

## 12. Entregas

1. **Fundação**: projeto, render low-poly estilizado com qualidade automática, rua reta infinita com prédios, carro do jogador com ◀ ▶/freio/aceleração automática, controles touch e teclado.
2. **Combate**: IA adversária, tiros com mira automática, colisões, vida, distância/turbo, fim de partida.
3. **Mundo**: quebra-molas com pulo, tráfego, caixinhas e todos os itens, bomba, escalada de dificuldade.
4. **Visual e áudio**: dano progressivo, giroscópio, fumaça, efeitos, sons e música; atirador visível (policial/ladrão na janela do carona apontando a arma e atirando).
5. **Meta**: telas, ranking com iniciais, pausa, aviso de retrato, PWA e deploy na Vercel.
6. **Curvas suaves** (pós-v1).

Cada entrega vira uma PR via `scratch/NN-*.ps1`.
