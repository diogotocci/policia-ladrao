# V2 Parte 6 — Loja 2: maestria por carro, cosméticos novos e 4 carros

Status: aprovado (2026-10-09). Entrega 1 implementada na 0.21.0.

## 1. Objetivo

Dar motivo para continuar jogando depois de comprar tudo da Parte 4 (pedido do Diogo, 2026-10-09). Decisões do brainstorming:

- **Retenção:** maestria por carro. Vitrine do dia, temporada mensal e desafios da semana ficam para depois.
- **Cosméticos:** pinturas especiais, adesivos, rodas, fumaça colorida e acessórios (só ladrão).
- **Carros:** 2 por lado.
- **Fases:** depois, numa parte própria.

Tudo continua só visual: a simulação não importa nada da loja.

## 2. Maestria por carro

- Cada carro tem XP próprio: as moedas de cada partida jogada com ele (o mesmo número que já vira XP do lado).
- 10 níveis. XP para chegar em cada nível: 0, 300, 800, 1.500, 2.500, 4.000, 6.000, 8.500, 11.500, 15.000.
- Cada nível libera alguma coisa **daquele carro** na loja (depois é preciso comprar, como na Parte 5), e o nível 10 dá de graça a pintura lendária do carro:

  | Nível | Libera |
  |---|---|
  | 2 | acabamento metálico |
  | 3 | adesivo "faixas" |
  | 4 | acabamento fosco |
  | 5 | adesivo "chamas" (polícia: "brasão") |
  | 6 | acabamento perolizado |
  | 7 | adesivo "número" |
  | 8 | acabamento camuflado |
  | 9 | adesivo "caveira" (polícia: "xadrez") |
  | 10 | pintura lendária (dourada no ladrão, cromada na polícia), grátis, com "Resgatar" |

- Subir de nível aparece na faixa da Carreira no fim da partida ("Esportivo: maestria 4! Acabamento fosco na Loja") e entra no "Resgatar" só no nível 10.
- Onde aparece:
  - na loja, em cima da vitrine: "Maestria 3", uma barra e "1.100 / 1.500 XP" (só para carros comprados);
  - na Carreira, aba **Garagem** (mockup C, "conta-giros"): um cartão por carro comprado, polícia primeiro, rolando para o lado. Cada cartão tem a foto do carro (render do jogo), o conta-giros com o nível no meio e os 9 prêmios em volta, e embaixo o próximo prêmio com o nome e o nível. Tocar num prêmio do mostrador mostra o que ele é e em que nível sai (playtest 2026-10-09: só o ícone não diz muito). No nível 10, "Resgatar" a pintura lendária.
- Carros comprados antes desta parte começam no nível 1, sem XP retroativo. O número do adesivo "número" é o nível de maestria do carro.

## 3. Cosméticos novos

Preços seguem a Parte 5 (~3x). Tudo bloqueado mostra o que falta, como hoje.

### 3.1 Acabamentos (por carro)

- Normal (grátis), metálico, fosco, perolizado e camuflado. Mudam o material da cor escolhida: brilho, reflexo e textura (camuflado: manchas de dois tons da cor).
- 1.200 moedas cada, por carro. Liberados pela maestria (§2).

### 3.2 Adesivos (por carro)

- Polícia: faixas, brasão, número, xadrez. Ladrão: faixas, chamas, número, caveira. Um por vez em cada carro, ou nenhum.
- 900 moedas cada, por carro. Liberados pela maestria (§2). O "número" usa o número de partidas jogadas com o carro.

### 3.3 Rodas (por lado)

- Padrão, cromadas, esportivas pretas e rodão. Valem para todos os carros do lado (a moto só troca a cor do aro).
- 1.500 moedas cada. Liberadas por patente: cromadas na 2, esportivas na 4, rodão na 6.

### 3.4 Fumaça colorida (por lado)

- Cor da fumaça do pneu ao derrapar e do nitro da polícia: branca (grátis), azul, vermelha, verde, rosa, amarela.
- 1.000 moedas cada. Liberadas pela conquista nova "Derrape 100 curvas fechadas" (vale para os dois lados).

### 3.5 Acessórios (só ladrão)

- Aerofólio, rack de teto, antena com bandeirinha e escapamento soltando chama. Podem ser usados juntos.
- 1.200 moedas cada. Valem para todos os carros do ladrão; a moto só mostra a antena e o escapamento.
- Liberados por conquistas novas do ladrão: "Fuja 30 vezes" (aerofólio), "Pegue 100 caixas" (rack), "Destrua a viatura 25 vezes" (antena) e "Sobreviva 5 min no Sobrevivência" (escapamento).

## 4. Carros novos

| Lado | Carro | Preço | Libera |
|---|---|---|---|
| Polícia | Moto da Rocam (piloto e garupa que atira) | 7.500 | conquista nova "Use o nitro 30 vezes" |
| Polícia | Viatura descaracterizada (sedã escuro, giroflex no painel e na grade) | 12.500 | conquista nova "Prenda 50 ladrões" |
| Ladrão | Kombi | 7.500 | conquista nova "Abra 40 caixas ?" |
| Ladrão | Fusca envenenado (rebaixado, rodão, escapamento) | 12.500 | conquista nova "Fuja 50 vezes" |

- Cada um com 4 cores (polícia: branco, prata, azul-marinho, preto) e mockups antes de implementar.
- A moto da polícia segue a do ladrão: 15% maior, mesma área de batida, garupa sempre presente.

## 5. Loja e perfil

- Abas da loja: Carros, Pintura (seções "Cor" e "Acabamento"), Adesivos, Neon, Sirene/Buzina, Placa; Rodas, Fumaça e Acessórios entram na entrega 2.
- O catálogo só cresce no fim (o código de backup guarda posições): por carro (lista fixa da Parte 4), os 4 acabamentos, a lendária (grátis, só pelo "Resgatar") e os 4 adesivos.
- O perfil continua v3, com campos novos opcionais: `career.carXp` (XP por carro) e, em `equipped`, `finish` e `sticker` por carro. O código de backup ganha esses campos no fim das listas; os códigos antigos continuam valendo.

## 6. Entregas

1. Maestria por carro, acabamentos e adesivos (os dois são prêmios da maestria), aba Garagem.
2. Rodas, fumaça colorida e acessórios (+ conquistas novas).
3. Os 4 carros novos (mockups antes).

## 7. Testes

- Unidade: XP e níveis de maestria, o que cada nível libera, migração v3→v4, backup v4 ida e volta e códigos v3 aceitos, compra e uso de cada tipo novo, conquistas novas.
- Modelos: acabamentos mudam o material sem mudar a quantidade de malhas além do limite; adesivos, rodas e acessórios nos carros certos; a moto não mostra aerofólio nem rack.
- e2e: maestria aparece na loja; comprar um acabamento liberado e ver na vitrine.
