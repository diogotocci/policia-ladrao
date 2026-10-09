# Polícia × Ladrão: V2, Parte 4: loja e skins (design)

Data: 2026-10-07. Status: aprovado em conversa (layout A, preços, extras e os 6 carros em 3D).

Contexto da V2: `2026-10-07-v2-parte1-perfil-moedas-design.md`, seção 1. Mockups: `mockup-loja.html` (layouts e telas) e as imagens 3D `caveirao-3d.png`, `carros-policia-3d.png` e `carros-ladrao-3d.png`, entregues na conversa.

## 1. Objetivo

Uma loja onde as moedas compram carros e personalização. **Tudo é só visual:** nada muda o jogo, o equilíbrio ou o ranking.

**Decisões do Diogo (2026-10-07):**

- skins só visuais e o mesmo ranking;
- a primeira skin sai com ~10 partidas;
- extras: pintura, placa personalizada, neon e sirene/buzina;
- layout A (garagem);
- o Caveirão refeito a partir das fotos de referência;
- os 6 carros aprovados nas imagens 3D.

**Critérios de sucesso:**

- Comprar e usar um carro, uma pintura, um neon, um som ou a placa leva no máximo 3 toques a partir da loja, sempre com confirmação.
- O carro escolhido aparece na tela inicial, na escolha de lado e na partida, com a pintura, o neon e a placa.
- Nenhuma compra muda a simulação. Os testes de equilíbrio não mudam e a área de batida é a mesma para todos os carros.
- Um progresso antigo (v1), local ou por código, abre sem perder moedas nem estatísticas.
- A partida continua leve no celular: um carro da loja custa no máximo 12 malhas a mais que o carro padrão.

**Fora da Parte 4:** compra com dinheiro de verdade; melhorias de desempenho; skins para o computador adversário; missões e conquistas (Parte 5).

## 2. Catálogo e preços

Uma partida rende ~75 moedas na Perseguição e ~120 no Sobrevivência.

| Item | Polícia | Ladrão | Preço |
|---|---|---|---|
| Carro padrão | Viatura | Sedã | grátis |
| Carro 1 | Esportivo | Picape | 800 |
| Carro 2 | Blazer | Moto com carona | 1.500 |
| Carro 3 | Caveirão | Van preta | 3.000 |
| Pintura | 3 cores por carro, contando o padrão | igual | 300 cada |
| Neon | 4 cores, valem para todos os carros do lado | igual | 600 cada |
| Som | 2 sirenes: Americana, Choque | 3 buzinas: Corneta, Grave, Dupla | 500 cada |
| Placa | letras e números à escolha, uma só para os dois lados | | 400, uma vez |

**Pinturas:** a cor original de cada carro é grátis. Os carros da polícia sempre usam as quatro cores de viatura: branco, prata, azul-marinho e preto (playtest 2026-10-08).

| Carro | Original | Pinturas |
|---|---|---|
| Viatura | branca | prata, azul-marinho, preta |
| Esportivo | preto | branco, prata, azul-marinho |
| Blazer | branca | prata, azul-marinho, preta |
| Caveirão | preto | branco, prata, azul-marinho |
| Sedã | vermelho | amarelo, verde, roxo |
| Picape | laranja | vinho, azul, verde-oliva |
| Moto | vermelha | verde-limão, azul, amarela |
| Van preta | preta | branca, cinza, vinho |

**Outras cores:**

- Neon, nos dois lados: azul, roxo, verde e rosa.
- A pintura troca a cor principal da lataria. Faixas, letreiros e detalhes ficam iguais.
- Os ids, os preços e as cores ficam em `src/meta/shop.ts`. A ordem dos itens no catálogo nunca muda; itens novos entram no fim, porque o código de backup guarda as posições.

## 3. Regras

**Comprar:**

- Toda compra pede confirmação: "Comprar X? N moedas. Saldo depois: M." Os botões são "Cancelar" e "Comprar e usar".
- Sem moedas suficientes, o botão vira "Faltam N" e fica desativado.
- Uma pintura só se compra para um carro que você já tem. Enquanto não tem, ela aparece com cadeado e a frase "Compre o carro primeiro".
- O que já foi comprado não se compra de novo.
- Comprar já coloca o item em uso.

**Usar:**

- **Carro:** um em uso por lado.
- **Pintura:** uma por carro. Zero é a cor original; cada carro lembra a sua.
- **Neon e som:** um por lado, ou nenhum. "Sem neon", a sirene padrão e a buzina padrão são grátis.
- **Placa:**
  - depois de comprada, o texto muda quando quiser, sem pagar de novo;
  - texto vazio tira a placa do carro;
  - aceita de 1 a 7 caracteres, só A–Z e 0–9, convertidos para maiúsculas.

**Onde aparece:**

- **Na partida:**
  - Só o carro do jogador aparece personalizado. O adversário (computador) e o carro de reforço usam os carros padrão.
  - A área de batida, a velocidade e os itens são os mesmos para todos.
- **Nas telas:** o início e a escolha de lado mostram, girando, o carro em uso de cada lado. A escolha de lado também mostra o nome do carro e o atalho "trocar", que abre a loja naquele lado.
- **No ranking:** um recorde salvo com placa em uso guarda a placa e mostra uma plaquinha ao lado das iniciais. Recordes antigos continuam sem placa.

**Sons:**

- **Sirene:** o estilo vale na partida quando o jogador é a polícia. Do lado ladrão, a sirene que se ouve é a do computador, a padrão.
- **Buzina:**
  - toca quando o jogador é o ladrão e alcança um carro do tráfego até 18 m à frente na mesma faixa (|Δx| < 1,5 m);
  - toca no máximo uma vez a cada 4 s;
  - a buzina padrão também toca, porque abrir caminho no tráfego faz parte do clima.
- **Na loja:** cada som tem "Ouvir" antes de comprar.

## 4. Visual dos carros

- Os modelos são feitos de peças simples mescladas por material, como os carros de hoje. Cada um fica em `src/render/models/`.
- Cada modelo segue os nomes que o resto do jogo usa:
  - `shell`, `greenhouse`, `headlights`, `taillights`, `bumpers` e `wheel`, para dano, sujeira e vidro trincado;
  - `lightbar-red` e `lightbar-blue`, para o giroflex piscar.
- **Pintura:** o material principal de cada modelo é marcado (`userData.paint`) e recebe a cor escolhida na criação do carro, antes do dano guardar a cor original para a sujeira.
- **Neon:** um plano embaixo do carro com degradê radial e mistura aditiva (`neon`), sem luz extra. Os modelos novos já vêm com ele.
- **Placa:** um plano na traseira, no padrão Mercosul: faixa azul "BRASIL" e texto preto. A posição é definida por carro.
- **Câmera da perseguição** sobe e recua por carro, para os carros grandes não taparem a pista:

  | Carro | Câmera sobe | Câmera recua |
  |---|---|---|
  | Caveirão | +0,35 m | +1,5 m |
  | Van | +0,2 m | +0,6 m |
  | Demais | 0 | 0 |

- **Blazer** (playtest 2026-10-09): picape cabine dupla com a caçamba fechada por uma capota, da mesma altura da Picape do ladrão (antes estava do tamanho do Caveirão). A câmera não sobe mais.
- **Caveirão** (playtest 2026-10-08): desenhado 12% menor. O atirador fica na janela do carona, não em cima do teto.
- **Atirador:** a posição dele é definida por carro.
- **Moto:** fica 15% maior que o tamanho real, para ser vista na pista. A área de batida continua a de um carro. O carona é o atirador desde o começo da partida: sem arma, só vai na garupa; com arma, atira. Não existe uma segunda figura para trocar de lugar.
- **Van** (playtest 2026-10-08, fotos de referência): van de teto alto, comprida e lisa, não blindada. Tem nariz curto inclinado, janelas só na cabine, faixa cinza embaixo e portas traseiras sem janela, com lanternas altas nos cantos. Fica menor que o Caveirão.
- **Roda:** gira conforme o raio de cada carro (`userData.r`).
- **Placas de titânio** (item do ladrão): todos os carros do ladrão têm as três placas, com os mesmos nomes do Sedã.

## 5. Perfil e backup

**Perfil v2:**

```ts
interface ProfileV2 {
  v: 2;
  coins: number;
  stats: ProfileStats;
  welcomeGranted: boolean;
  owned: string[]; // ids comprados
  equipped: {
    police: { car: CarId; neon: NeonId | null; sound: SoundId | null };
    thief: { car: CarId; neon: NeonId | null; sound: SoundId | null };
    paint: Partial<Record<CarId, number>>; // 0 = original; 1..3
    plate: string; // '' = sem placa
  };
}
```

**Migração e validação:**

- O perfil v2 fica numa chave nova, `pl.profile.v2`. Na primeira vez, o jogo lê o `pl.profile.v1` e nunca o apaga: uma versão antiga ainda aberta (cache ou outra aba) continua com o progresso dela, em vez de recusar o v2 e gravar um perfil vazio por cima.
- Um v1 vira v2 ao carregar: nada comprado, carros padrão em uso e sem placa.
- A validação descarta ids desconhecidos.
- Ela também corrige o que estiver em uso e não tiver sido comprado: o item volta ao padrão.

**Código de backup:**

- Continua começando com `PL1-`.
- O v2 acrescenta ao array as posições dos itens comprados no catálogo e o que está em uso.
- Códigos v1, de 8 campos, continuam aceitos e são migrados.
- Sem nada da loja, o código continua com 8 campos, do mesmo tamanho de antes.
- Um teste fixa a ordem inteira do catálogo.

## 6. Loja (layout A, "garagem")

- **Entrada:**
  - no início, o botão "Loja", ao lado de "Ranking";
  - na escolha de lado, o atalho "trocar" embaixo de cada carro.
- **Topo:** "Voltar", o título "Loja", a troca Polícia/Ladrão e o saldo.
- **Esquerda, a vitrine:**
  - o carro grande em 3D, girando, mostrando o que está selecionado na lista;
  - o carro aparece na vitrine antes de ser comprado;
  - embaixo, o nome e o botão principal, conforme o item: "Comprar · N", "Usar", "Em uso" ou "Faltam N".
- **Direita, a lista:**
  - abas Carros, Pintura, Neon, Sirene (polícia) ou Buzina (ladrão), e Placa;
  - cada linha mostra o nome, uma amostra (ícone do carro ou bolinha de cor) e o estado: preço, "Em uso", "Usar" ou cadeado;
  - um toque na linha só seleciona e mostra na vitrine; o botão principal é que compra ou usa.
- **Aba Sons:** cada linha tem "Ouvir".
- **Aba Placa:**
  - a placa Mercosul ao vivo, com o campo de texto;
  - "Comprar · 400" antes da compra; "Salvar" e "Tirar placa" depois.
- **Voltar:** retorna para quem abriu a loja, o início ou a escolha de lado. O botão Voltar do Android faz o mesmo.

**Fluxo:** `title → shop(side, from:'title')`; `choose → shop(side, from:'choose')`; `shop → back → origem`.

## 7. Testes

- **Unidade:**
  - catálogo: preços, ids únicos, ordem estável;
  - compra: saldo, item já comprado, pintura bloqueada;
  - usar: só itens comprados;
  - placa: texto aceito e recusado;
  - migração v1→v2 e validação com ids desconhecidos;
  - backup v2 ida e volta, e códigos v1 aceitos;
  - ranking com placa;
  - fluxo da loja;
  - mixer: estilo da sirene e buzina com intervalo;
  - modelos: todos constroem, têm as peças nomeadas e não passam do limite de malhas;
  - aparência: pintura, neon e placa aplicados, e a câmera sobe.
- **e2e:** com moedas no perfil, abrir a loja, comprar o Esportivo, voltar e ver "Esportivo" na escolha de lado. A partida começa com o carro novo.
- **Equilíbrio:** os testes atuais, sem mudar limites. A simulação não importa nada da loja.

## Modo admin (playtest 2026-10-09)

- Em "Progresso", o botão **Admin** pede uma senha. Certa: a loja fica toda liberada (sem pedir patente ou conquista) e grátis, sem a confirmação de compra, com a etiqueta "admin" no título. "Sair do admin" volta ao normal; o que foi pego continua no perfil.
- A senha é só a variável de ambiente `ADMIN_PASSWORD` na Vercel. A função `api/admin.ts` confere no servidor (`POST /api/admin`, resposta `{ ok }`); a senha nunca vai para o código do jogo. Sem a variável, sem rede ou no `pnpm dev`, o admin não liga. O estado fica em `pl.admin` no aparelho.
