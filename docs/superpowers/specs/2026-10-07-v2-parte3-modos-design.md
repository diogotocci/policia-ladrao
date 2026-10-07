# Polícia × Ladrão: V2, Parte 3: modos de jogo e itens novos (design)

Data: 2026-10-07. Status: aprovado em conversa, aguardando revisão desta spec escrita.

Contexto da V2: `2026-10-07-v2-parte1-perfil-moedas-design.md`, seção 1. Mockups: `v2-parte3-modos.html`, entregue na conversa.

## 1. Objetivo

Dois modos de jogo e oito itens novos.

- **Perseguição**: o jogo de hoje, com relógio de 1:30.
- **Sobrevivência**: sem relógio. Ganha quem zerar a vida do outro, e o "caos" sobe com o tempo.
- Os itens novos entram nos dois modos e ficam mais fortes no Sobrevivência conforme o caos.

**Decisões do Diogo (2026-10-07):** tudo numa parte só; o modo atual se chama **Perseguição**; os 8 itens entram; o modo se escolhe numa tela própria depois do Jogar; o ranking do Sobrevivência é por tempo.

**Critérios de sucesso:**

- A Perseguição sem itens novos joga como a 0.12. Com os itens novos ela fica mais variada, mas mantém os números de hoje para o que já existe.
- No Sobrevivência:
  - uma partida entre dois computadores sempre termina;
  - cada nível de caos muda o jogo de forma visível;
  - o ladrão vence entre 30% e 70% das partidas no Médio.
- Cada item novo tem o seu efeito, o seu visual, o seu som, um aviso no HUD e é usado pelo computador. O computador também desvia dos itens do jogador.
- Rankings e moedas seguem as regras da seção 6.

**Fora da Parte 3:** loja e skins (Parte 4); missões e conquistas (Parte 5); fases com tempo de fuga crescente (fica no backlog para a Perseguição).

## 2. Modos e fluxo

- **Fluxo:** Início → **Escolha o modo** → Escolha seu lado (com a dificuldade) → contagem → partida.
- **Tela de modo:** dois cartões com ícone, nome, uma frase e duas linhas do que muda, além de um botão "Jogar Perseguição" ou "Jogar Sobrevivência". Ela também tem "Voltar".
- **Memória:** o jogo lembra o último modo (chave `pl.mode`, padrão Perseguição).
- **Na tela de fim:** "Jogar de novo" e "Trocar de lado" mantêm modo e dificuldade.
- **"Como jogar":** ganha uma terceira página, "Sobrevivência e itens", com o caos e os itens novos.

## 3. Sobrevivência

| Regra | Valor |
|---|---|
| Fim | quem chega a 0 de vida perde; não existe fuga por tempo |
| Vida | 200 para os dois (playtest 2026-10-07: com 100 as partidas acabavam rápido demais); entre computadores a partida dura ~2 min e o ladrão vence ~50% |
| Caos | começa em 1 e sobe 1 a cada 45 s, até 5 |
| Tráfego | +15% por nível de caos acima de 1, multiplicado pelo tráfego da dificuldade |
| Caixas | intervalo entre caixas ×0,9 por nível acima de 1 |
| Dano | todo dano ×(1 + 0,15 × (caos − 1)): tiros, batidas, bombas, itens, caixa errada. O ladrão leva ×0,9 (sem a fuga de 1:30 a polícia vencia mais) |
| Obras | a partir do caos 3, um trecho de 60 m com uma faixa fechada por cones a cada ~500–700 m (empurrado para depois de quebra-molas e curvas fechadas), com placa 80 m antes; bater nos cones conta como calçada; o tráfego muda de faixa antes |
| Computador | nível e ritmo da dificuldade escolhida, como na Perseguição |

- **Cenas de fim:** a prisão (polícia vence) e a viatura destruída (ladrão vence) continuam iguais.
- **HUD:** no lugar da contagem regressiva, o tempo sobe ("03:12"), com "Caos N" e 5 marcas ao lado. Quando o caos sobe, aparece um aviso grande: "Caos 3: obras na pista!" ou o que aquele nível traz.
- **Debug:** `?mode=survival&chaosEvery=5` encurta o caos, só para debug e e2e.

## 4. Itens novos

Todos os números ficam em `BALANCE.items`. "Caos N+" vale só no Sobrevivência.

### 4.1 Ladrão (caixas vermelhas): especiais, usados com o botão

| Item | Efeito | Mais forte |
|---|---|---|
| **Óleo** | mancha de 3 m × 10 m na faixa do ladrão, 3 m atrás dele, dura 15 s; a viatura que passa por cima derrapa 1,5 s (direção pela metade e um empurrão para o lado), sem dano | caos 3+: cobre 2 faixas |
| **Miguelito** | pregos numa faixa (3 m × 2 m), duram 15 s; pneu furado: a viatura perde 30% da velocidade máxima e é puxada para um lado (1,5 m/s) por 4 s | caos 3+: 6 s |
| **Fumaça** | nuvem atrás do ladrão por 3 s: os tiros da polícia ganham ±12° de espalhamento e o helicóptero não atira | caos 3+: 5 s |
| **Bomba de área** | a bomba de hoje cobrindo 2 faixas (a do ladrão e a vizinha mais perto do centro) | só no Sobrevivência, a partir do caos 2, no lugar da bomba comum |

### 4.2 Polícia (caixas azuis)

| Item | Uso | Efeito | Mais forte |
|---|---|---|---|
| **Bloqueio + spike** | especial, com botão | uma viatura atravessada numa faixa, 120 m à frente do ladrão, e spike nas faixas vizinhas; na Perseguição ficam 2 faixas livres. Bater na viatura: −15 e perde 60% da velocidade. Passar no spike: pneu furado, como o miguelito. Placa de aviso 80 m antes. Some depois que o ladrão passa. | caos 2+: só 1 faixa livre |
| **Metralhadora** | na hora | 4 s atirando a cada 0,2 s, com dano ×0,4 por tiro | caos 3+: 6 s |
| **Segunda viatura** | na hora | uma viatura do computador entra por trás, na faixa vizinha, por 8 s. Quando fica lado a lado, dá uma batida lateral no ladrão (−6, empurra 1,5 m), no máximo 1 a cada 2 s. Depois vai embora. | caos 4+: 12 s |
| **Holofote** | na hora | por 3 s o ladrão fica 15% mais lento e a fumaça dele não tem efeito; o jogador ladrão vê um brilho branco nas bordas da tela | caos 3+: 5 s |

### 4.3 Botão de especial

- O botão de bomba vira o **botão de especial**, com o ícone e as cargas do item guardado. Tecla **B**, como hoje.
- Cada lado guarda **um tipo** de especial, com até 3 cargas. Pegar o mesmo tipo soma uma carga; pegar outro tipo troca o guardado.
- A polícia passa a ter o botão, para o bloqueio. Antes ela não tinha especial.
- **Peso nas caixas:**
  - ladrão: bomba 3, óleo 2, miguelito 2, fumaça 2; os itens de hoje mantêm os pesos;
  - polícia: bloqueio 2, metralhadora 2, segunda viatura 1, holofote 2.

### 4.4 Computador

- **Desviar:**
  - a polícia do computador desvia do óleo e do miguelito como desvia das bombas: avalia cada um uma vez, com chance que depende do nível;
  - o ladrão do computador desvia do bloqueio, do spike e das obras pela faixa livre, com chance que depende do nível.
- **Usar:**
  - o ladrão usa óleo e miguelito com a viatura alinhada atrás, a até 80 m;
  - usa a fumaça quando está sendo atingido;
  - a polícia usa o bloqueio quando o ladrão está 40–150 m à frente;
  - os itens "na hora" agem sozinhos.

## 5. Visual e som

- **Óleo:** mancha escura brilhante no asfalto. **Miguelito e spike:** faixa de pregos cinza. Os dois aparecem também no retrovisor.
- **Fumaça:** partículas cinza-escuras atrás do ladrão.
- **Bloqueio:** modelo da viatura atravessado, com giroflex piscando, e um policial em pé; placa de aviso.
- **Obras:** cones laranja e placa "Obras".
- **Segunda viatura:** o mesmo modelo da viatura, que entra e sai por trás.
- **Holofote:** facho de luz do helicóptero sobre o ladrão; para o jogador ladrão, um brilho branco nas bordas da tela.
- **Pneu furado:** faíscas na roda e o carro balançando.
- **Sons:**
  - o óleo espirra;
  - o pneu estoura;
  - a metralhadora faz uma rajada mais curta e rápida que o tiro normal;
  - a fumaça chia;
  - o bloqueio liga a sirene.
- **Avisos no HUD** (toast curto): "Óleo!", "Pneu furado!", "Fumaça!", "Bloqueio à frente!", "Metralhadora!", "Reforço chegando!", "Holofote!".

## 6. Ranking e moedas

- **Ranking:**
  - fica separado por modo e por dificuldade, na chave `pl.ranking.v4` com o formato `{ pursuit: Boards, survival: Boards }`;
  - o v3 vira a Perseguição, e o v3 fica guardado no aparelho;
  - a tela de ranking ganha um seletor de modo, igual ao de dificuldade, acima dele.
- **Sobrevivência:**
  - polícia: só vitórias, e a mais rápida fica no topo;
  - ladrão: maior tempo vivo no topo, contando também as partidas que ele perde;
  - na linha do ranking, o ladrão mostra o tempo com a vida restante (se venceu) ou com "preso" (se perdeu).
- **Moedas:**
  - no Sobrevivência, a parcela de tempo vai até **60** (1 moeda a cada 3 s);
  - dano, caixas, vitória e dificuldade continuam como hoje.

## 7. Arquitetura

- **Configuração:**
  - `type Mode = 'pursuit' | 'survival'` em `balance.ts`;
  - `BALANCE.survival` (caos, tráfego, caixas, dano, obras);
  - os números dos itens novos em `BALANCE.items`.
- **Simulação (continua pura):**
  - `WorldState` ganha `mode`, `chaos`, `hazards`, `works`, `wingman` e `effects` nos carros (`skidUntil`, `flatUntil`, `flatSide`, `smokeUntil`, `spotUntil`, `mgUntil`);
  - `Upgrades.bombs` vira `special: { kind; charges } | null`;
  - `world.bombs` vira `hazards` (bomba, bomba de área, óleo, miguelito, viatura do bloqueio, spike), com faixa e validade;
  - o intent `bomb` vira `special`.
- **Módulos novos na simulação:**
  - `chaos.ts`: `chaosAt` e `damageScale`;
  - `hazards.ts`: largar, colidir e expirar;
  - `effects.ts`: aplicar e decair os efeitos;
  - `wingman.ts`: a segunda viatura;
  - `works.ts`: os trechos de obra, gerados pela semente à frente.
  - `bombs.ts` é absorvido por `hazards.ts`.
- **Todo dano** passa por `hurt(w, car, amount)`, que aplica `damageScale`. Isso centraliza o que hoje se repete em colisões, tiros, bombas e caixas.
- **Render:**
  - `hazardsView.ts` (óleo, pregos, spike, viatura do bloqueio, cones);
  - fumaça e faíscas em `particles`;
  - holofote em `combatFx`;
  - a segunda viatura reaproveita `createCarModel('police')`.
- **Telas:**
  - `mode.ts` (tela de modo);
  - o HUD com tempo subindo e caos;
  - o botão de especial em `touchButtons`;
  - o ranking com o seletor de modo;
  - a terceira página do "Como jogar".
- **Armazenamento:** `pl.mode` e `pl.ranking.v4`, com migração do v3.
- **Arquivos grandes:** `game.ts` (431 linhas) e `carFactory.ts` (483) passam do limite. As partes novas entram em módulos próprios, e o `game.ts` perde a montagem do HUD e dos efeitos para `gameFx.ts`.

## 8. Entrega em três PRs

1. **0.13.0, modos e Sobrevivência:** tela de modo, caos, dano escalado, obras, HUD, ranking v4, moedas, terceira página do "Como jogar" e o equilíbrio do Sobrevivência entre dois computadores. Sem itens novos.
2. **0.14.0, itens do ladrão:**
   - troca da bomba pelo botão de especial;
   - óleo, miguelito, fumaça e bomba de área, com visual, som e HUD;
   - o computador usando esses itens e desviando deles.
3. **0.15.0, itens da polícia:** bloqueio + spike, metralhadora, segunda viatura e holofote, com visual, som e HUD, e o computador usando e desviando.

Cada PR passa por revisão própria e sai jogável.

## 9. Erros e casos de borda

- **Partida infinita no Sobrevivência:** o dano escalado garante o fim. O teste entre dois computadores confere que tudo termina em 10 min simulados.
- **Bloqueio sem espaço** (curva, quebra-mola, obra ou caixa no lugar): ele é colocado no próximo ponto livre até 60 m adiante; se não houver, a carga não é gasta.
- **Especial apertado sem carga:** nada acontece. Apertado no ar (quebra-mola): cai normalmente atrás.
- **Item ativo quando a partida acaba:** as cenas de fim limpam os perigos e os efeitos, como hoje fazem com as bombas.
- **Ranking v4 ilegível:** começa vazio sem apagar o v3.

## 10. Testes

- **Simulação (por item):**
  - efeito, duração e versão forte por caos;
  - o computador usando e desviando;
  - o dano escalado e o caos, nos limites de 45 s;
  - obras deterministas pela semente e fora de quebra-molas e curvas fechadas;
  - partidas entre dois computadores, Sobrevivência no Médio: 100% terminam em 10 min e o ladrão vence entre 30% e 70%;
  - a Perseguição com os itens novos mantém o ladrão entre 30% e 70%.
- **Telas:**
  - tela de modo;
  - HUD do Sobrevivência;
  - botão de especial;
  - ranking com o seletor de modo;
  - "Como jogar" com a página 3.
- **e2e:**
  - Sobrevivência com `chaosEvery` curto: o caos sobe, aparece a obra e a partida termina;
  - especial usado pelo jogador (`?debug&give=oil`);
  - o ranking do Sobrevivência guarda o tempo do ladrão mesmo na derrota.
