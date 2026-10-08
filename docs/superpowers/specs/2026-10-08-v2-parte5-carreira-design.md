# Polícia × Ladrão: V2, Parte 5: Carreira (gamificação)

Data: 2026-10-08. Status: aprovado em conversa (mockup `mockup-carreira.html`).

Contexto da V2: `2026-10-07-v2-parte1-perfil-moedas-design.md`, seção 1. A Parte 4 (loja) está em `2026-10-07-v2-parte4-loja-design.md`.

## 1. Objetivo

Dar motivo para voltar e para jogar mais. São quatro peças:

- desafios do dia;
- conquistas;
- patente por lado;
- sequência de dias.

A loja deixa de liberar tudo de uma vez:

- **Desbloqueio:** cada item precisa ser desbloqueado (por conquista ou patente) e depois comprado com moedas.
- **Preços:** ficam cerca de 3 vezes maiores.

**Decisões do Diogo (2026-10-08):**

- entram os quatro ganchos;
- desbloquear e depois comprar;
- preços cerca de 3 vezes maiores;
- quem já comprou na 0.16 mantém tudo;
- o mockup foi aprovado como está.

**Fora da Parte 5:** fases com tempo de fuga crescente (backlog); conta e servidor (V3).

## 2. Desafios do dia e sequência

**Desafios do dia:**

- São 3 por dia: um fácil (150 moedas), um médio (250) e um difícil (350).
- São sorteados pela data local do aparelho (`dailiesFor(date)`), então todo mundo tem os mesmos no mesmo dia.
- Renovam à meia-noite.
- No máximo um dos três pede um lado específico. Se o médio pedir um lado, o difícil vem dos que valem para os dois lados.
- O progresso soma ao longo do dia. Ao completar, as moedas entram sozinhas na hora, e cada desafio paga uma vez só.

| Fácil (150) | Médio (250) | Difícil (350) |
|---|---|---|
| Jogue 2 partidas | Vença 2 partidas | Vença 3 partidas no Difícil |
| Pegue 8 caixas da sua cor | Fuja 1 vez (ladrão) | Fuja 2 vezes (ladrão) |
| Jogue 1 partida no Sobrevivência | Prenda 1 ladrão (polícia) | Prenda 2 ladrões em menos de 1 min (polícia) |
| Abra 2 caixas ? | Cause 300 de dano | Sobreviva 2 min no Sobrevivência (ladrão) |

**Sequência:**

- A primeira partida terminada em cada dia paga 50, 100, 150, 200, 250, 300 e 500 moedas, do dia 1 ao dia 7. Do dia 8 em diante paga 500 por dia.
- Pulou um dia, a sequência volta ao dia 1.
- Ela aparece num aviso no topo da tela de fim da partida, que some sozinho (3,5 s) ou com um toque e não bloqueia os botões. O mockup mostrava uma janela; troquei por um aviso para não travar a tela de fim.

## 3. Conquistas e patentes

**Conquistas** (são permanentes, e a ordem é fixa porque o código de backup guarda as posições):

| Lado | Conquista | Prêmio |
|---|---|---|
| Polícia | Prenda 10 ladrões | libera Esportivo |
| Polícia | Prenda 30 ladrões | libera Blazer |
| Polícia | Prenda 15 ladrões no Difícil | libera Caveirão |
| Polícia | Use 10 bloqueios | libera sirene Choque |
| Polícia | Prenda um ladrão em menos de 40 s | libera sirene Americana |
| Ladrão | Fuja 10 vezes | libera Picape |
| Ladrão | Destrua a viatura 10 vezes | libera Moto com carona |
| Ladrão | Fuja 15 vezes no Difícil | libera Van preta |
| Ladrão | Acerte 20 bombas na viatura | libera buzina Grave |
| Ladrão | Sobreviva 3 min no Sobrevivência | libera buzina Corneta |
| Ladrão | Fuja com mais de 80% de vida | libera buzina Dupla |
| Geral | Jogue 10 / 50 / 200 partidas | +300 / +1.000 / +3.000 |
| Geral | 7 dias seguidos | +1.000 |
| Geral | Complete 20 desafios do dia | +1.500 |

**Patentes:** uma por lado.

- **XP:** cada partida rende de XP, naquele lado, as mesmas moedas que pagou. A dificuldade e o desempenho já estão nesse valor.

| # | Polícia | Ladrão | XP | Libera na loja (daquele lado) |
|---|---|---|---|---|
| 1 | Recruta | Pivete | 0 | o carro padrão |
| 2 | Soldado | Trombadinha | 300 | a placa (em qualquer um dos lados) e a 1ª pintura de cada carro |
| 3 | Cabo | Batedor | 900 | 2 cores de neon (polícia: azul e roxo; ladrão: verde e rosa) |
| 4 | Sargento | Assaltante | 2.000 | a 2ª pintura |
| 5 | Tenente | Fugitivo | 4.000 | as outras 2 cores de neon |
| 6 | Capitão | Procurado | 7.000 | a 3ª pintura |
| 7 | Delegado | Chefão | 12.000 | +2.000 moedas, e a patente aparece no ranking |

## 4. Loja com desbloqueio

**Preços novos:**

| Item | Preço |
|---|---|
| Esportivo e Picape | 2.500 |
| Blazer e Moto | 5.000 |
| Caveirão e Van | 10.000 |
| Pintura | 900 |
| Neon | 1.800 |
| Sirene ou buzina | 1.500 |
| Placa | 1.200 |

**Itens bloqueados:**

- Na lista, o item mostra um cadeado e o que falta embaixo do nome, por exemplo "Prenda 30 ladrões (14/30)" ou "Patente Sargento".
- O botão principal mostra o mesmo texto e fica desativado.
- O item já pode ser visto girando na vitrine.

**Regras:**

- **Ordem das condições:** uma pintura precisa primeiro do carro comprado e depois da patente.
- **Compras antigas:** o que já foi comprado (0.16) continua seu e pode ser usado, mesmo sem a conquista.

## 5. Telas

- **Início:**
  - novo botão "Carreira", entre Jogar e Loja, com uma bolinha que conta as novidades (patente nova, desafio feito, conquista). A bolinha zera quando a Carreira abre;
  - a sequência de dias aparece ao lado das moedas, enquanto estiver viva (hoje ou ontem).
- **Carreira:**
  - aba **Hoje**: os 3 desafios com barra, moedas e "renovam em Xh Ymin", mais a fileira dos 7 dias da sequência;
  - aba **Conquistas**: filtro Polícia, Ladrão ou Geral, com o progresso e o que cada uma libera;
  - aba **Patente**: as duas escadas lado a lado, com o XP que falta e o que cada patente libera.
- **Fim da partida:**
  - abaixo das moedas aparecem a patente, o XP ganho e a barra;
  - se subiu de patente, aparece "X → Y!" e o que foi liberado;
  - até 3 linhas mostram os desafios e as conquistas completados;
  - nesse caso as moedas mostram só o total, sem o detalhe linha a linha, para caber.
- **Ranking:** um recorde salvo com a patente 7 mostra "Delegado" ou "Chefão" ao lado das iniciais.

## 6. Perfil e backup

**Perfil v3** (chave `pl.profile.v3`):

- Acrescenta `career` com estes campos:
  - XP por lado;
  - contadores da vida toda;
  - conquistas feitas;
  - progresso do dia (data e 3 valores);
  - sequência (último dia e quantidade);
  - novidades ainda não vistas.
- Na leitura, o jogo procura v3, depois v2, depois v1, e nunca apaga as chaves antigas.

**Migração** de quem já jogava:

- Os contadores começam das estatísticas que já existiam: partidas, prisões e fugas.
- O XP começa com metade das moedas já ganhas em cada lado.
- As conquistas já alcançadas por esses números são marcadas sem pagar moedas, porque foram jogadas antes da Parte 5.

**Backup:**

- O código continua começando com `PL1-`.
- O v3 acrescenta um 11º campo com a carreira.
- Códigos v1 (8 campos) e v2 (10 campos) continuam aceitos e são migrados.

**Simulação:** não muda. A partida só passa a contar caixas ?, bloqueios usados e bombas que acertaram (`MatchStats`) e a fração de vida no fim.

## 7. Testes

- **Unidade:**
  - patentes e XP;
  - sequência (mesmo dia, dia seguinte, dia pulado, virada de mês e de ano);
  - desafios (sorteio estável, no máximo um por lado, pagam uma vez e zeram no dia seguinte, o lado certo);
  - cada conquista;
  - desbloqueio da loja;
  - migração do perfil;
  - backup v3 e códigos antigos;
  - telas (Carreira, Início, fim da partida, loja com cadeado);
  - crédito no app (moedas da partida mais as da carreira).
- **e2e:**
  - abrir a Carreira e as três abas;
  - ver o cadeado com o progresso na loja;
  - comprar o Esportivo já desbloqueado.

## 8. Resgatar e insígnias (playtest 2026-10-08, mockup `mockup-patentes.html`)

**Resgatar:**

- Desafios do dia, conquistas e patentes completados não pagam mais sozinhos. Eles entram na lista `career.claims`, com ids no formato `daily:<data>:<0..2>`, `ach:<id>` e `rank:<lado>:<n>`.
- O jogador toca em **Resgatar** na Carreira para receber.
- O que um item libera na loja só abre depois do resgate. Até lá, a loja mostra "Resgate na Carreira".
- Um desafio não resgatado nunca vence: depois da meia-noite, aparece em "Hoje" como "Desafio de dd/mm".
- A sequência de dias continua sendo paga sozinha.
- A bolinha do início conta os resgates esperando, e cada aba com resgate pendente ganha um ponto vermelho.
- A tela de fim mostra "Resgate na Carreira" e não soma essas moedas.
- O backup v3 guarda os resgates no 9º campo da carreira. Os códigos da 0.17.0 tinham ali um número; nesse caso, ficam sem resgates.

**Moedas por patente**, pagas ao resgatar:

| Patente | Moedas |
|---|---|
| 2 | 200 |
| 3 | 400 |
| 4 | 600 |
| 5 | 1.000 |
| 6 | 1.500 |
| 7 | 2.000 |

Na aba Patente, um botão resgata de uma vez todas as patentes alcançadas naquele lado.

**Insígnias** (`src/ui/screens/insignia.ts`, SVG):

- **Polícia:** escudo azul com borda dourada.
  - Recruta: pistolas cruzadas.
  - Soldado, Cabo e Sargento: 1, 2 e 3 divisas.
  - Tenente: 1 estrela de oficial; Capitão: 3 estrelas.
  - Delegado: escudo dourado com estrela e louros.
- **Ladrão:** losango vinho com borda vermelha, um ícone por patente e pontos com o nível.

  | Patente | Ícone |
  |---|---|
  | Pivete | boné |
  | Trombadinha | carteira |
  | Batedor | chave mixa |
  | Assaltante | máscara |
  | Fugitivo | algema quebrada |
  | Procurado | cartaz de procurado |
  | Chefão | coroa dourada |

**Aba Patente:**

- Um cartão por lado, com a insígnia grande, a barra de XP e o botão Resgatar.
- Embaixo, a trilha das 7 insígnias: as que ainda faltam ficam em cinza e a atual brilha.
- Por último, a próxima patente e o que ela traz.

## 9. Mais desafios do dia (playtest 2026-10-08)

Os desafios se repetiam demais com só 4 por nível. Agora são 21, 7 por nível (aprovados pelo Diogo):

| Fácil (150) | Médio (250) | Difícil (350) |
|---|---|---|
| Jogue 2 partidas | Vença 2 partidas | Vença 3 partidas no Difícil |
| Pegue 8 caixas da sua cor | Fuja 1 vez (ladrão) | Fuja 2 vezes (ladrão) |
| Jogue 1 partida no Sobrevivência | Prenda 1 ladrão (polícia) | Prenda 2 ladrões em menos de 1 min (polícia) |
| Abra 2 caixas ? | Cause 300 de dano | Sobreviva 2 min no Sobrevivência (ladrão) |
| Atire 30 vezes | Abra 4 caixas ? | Destrua a viatura 1 vez (ladrão) |
| Termine uma partida com mais de metade da vida | Use 2 bloqueios (polícia) | Vença sem pegar nenhuma caixa |
| Pegue 3 caixas do adversário | Pegue 6 caixas do adversário | Vença com menos de 30% de vida |

- Sorteio, a partir de 09/10/2026: por nível, cada dia embaralha os 7 pela data e pega o primeiro que não foi o do dia anterior. O difícil não pede lado quando o médio já pede. Todo mundo vê os mesmos.
- Os dias antes de 09/10/2026 continuam com o sorteio antigo (só os 12 primeiros), então um desafio feito ou esperando "Resgatar" não muda.
- Contadores novos da partida: caixas do adversário pegas, tiros dados pelo jogador (o helicóptero não conta) e total de caixas pegas (inclui as "?").
