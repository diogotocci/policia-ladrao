# Polícia × Ladrão: V2, Parte 2: dificuldade (design)

Data: 2026-10-07. Status: aprovado em conversa, aguardando revisão desta spec escrita.

Contexto da V2 e das partes: `2026-10-07-v2-parte1-perfil-moedas-design.md`, seção 1.

## 1. Objetivo

O jogador escolhe **Fácil**, **Médio** ou **Difícil** antes de jogar. A dificuldade muda o computador e o tráfego, paga moedas diferentes e tem ranking próprio.

**Critérios de sucesso:**

- O Médio joga exatamente como a versão 0.11.
- No Fácil e no Difícil, a diferença aparece no nível do computador, no tráfego e no helicóptero, nos valores da seção 2.
- As moedas usam o multiplicador da dificuldade.
- Cada dificuldade tem o seu ranking, e os recordes de antes viram os do Médio.
- O jogo lembra a última dificuldade escolhida.

**Fora da Parte 2:** dano diferente no carro do jogador (decidido: as regras do jogador não mudam), fases e modos de jogo (Parte 3).

## 2. O que muda

| | Fácil | Médio | Difícil |
|---|---|---|---|
| Nível inicial do computador | 1 | 1 | 3 |
| Sobe de nível a cada | 60 s | 45 s | 30 s |
| Nível máximo | 10 | 10 | 10 |
| Tráfego (multiplica a quantidade alvo) | ×0,7 | ×1 | ×1,3 |
| Helicóptero quando o computador é a polícia | a cada 1,2 s | a cada 1 s | a cada 0,7 s |
| Multiplicador de moedas | ×0,75 | ×1 | ×1,5 |

- O nível do computador já controla reação, desvio de quebra-mola, bomba e curva, investida da viatura e frequência das bombas do ladrão. Nada disso muda de forma; só o nível muda.
- O helicóptero do jogador (quando o jogador é a polícia) continua a cada 0,7 s em todas as dificuldades.
- O tráfego arredonda para o inteiro mais próximo, com mínimo de 1 carro quando o tráfego está ligado.
- Moedas: `total = arredonda para baixo((tempo + dano + caixas) × vitória × dificuldade)`. Exemplo: o caso da Parte 1 (112) no Difícil vira 168.
- Os valores ficam em `BALANCE.difficulties`, para balancear sem mexer no código. O Médio repete os valores de hoje (`levelEvery: 45`, `heliFireIntervalAi: 1`).

## 3. Escolha da dificuldade

- **Onde:** seletor no topo da tela "Escolha seu lado", entre Voltar e Como jogar. São três opções, cada uma com o multiplicador de moedas embaixo ("moedas ×0,75", "moedas ×1", "moedas ×1,5"). O título "Escolha seu lado" desce para a linha de baixo.
- **Padrão:** a última escolha fica salva no aparelho (chave `pl.difficulty`). Na primeira vez vem Médio. Valor inválido também vira Médio.
- **"Jogar de novo" e "Trocar de lado"** mantêm a dificuldade.
- **Acessibilidade:** o seletor é um grupo de opções exclusivas (`radiogroup`). As setas ← → trocam a opção, e a escolha é anunciada.

## 4. Ranking

- Um ranking por dificuldade, cada um com Polícia e Ladrão e as mesmas regras de hoje (top 10, só vitórias, desempate do ladrão pela vida).
- Chave nova `pl.ranking.v3`, no formato `{ easy: Board, normal: Board, hard: Board }`. Na primeira carga sem v3, o v2 vira o `normal` e os outros começam vazios. O v2 fica guardado, sem apagar.
- **Tela do ranking:** o seletor de dificuldade fica no topo e as abas de lado embaixo, como no mockup. Vinda do fim da partida, abre na dificuldade e no lado da partida. Vinda da tela inicial, abre na última dificuldade escolhida.
- **Recorde:** "qualifica" e "insere" sempre usam o ranking da dificuldade da partida.
- **Boas-vindas da Parte 1:** conta os recordes de todas as dificuldades. Para quem migra, isso dá o mesmo número de antes.

## 5. Fim de partida

- A linha do motivo ganha um selo com a dificuldade ("Fácil", "Médio" ou "Difícil"), com cor própria: Fácil verde, Médio cinza, Difícil vermelho.
- O quadro de moedas ganha a linha "Fácil ×0,75" ou "Difícil ×1,5" depois da linha da vitória. No Médio a linha não aparece.

Mockups: `v2-parte2-dificuldade.html` (entregue na conversa de 2026-10-07).

## 6. Arquitetura

| Unidade | Mudança |
|---|---|
| `src/config/balance.ts` | `type Difficulty = 'easy' \| 'normal' \| 'hard'` e `BALANCE.difficulties: Record<Difficulty, { startLevel; levelEvery; traffic; heliFireIntervalAi; coins }>`. Sai `difficulty.levelEvery` e `items.police.heliFireIntervalAi`; fica `difficulty.maxLevel`. |
| `src/sim/world.ts` | `createWorld({ difficulty?: Difficulty })`, com padrão `'normal'`; `WorldState.difficulty`; nível inicial = `startLevel`. |
| `src/sim/rules.ts` | `levelAt(time, difficulty)`. |
| `src/sim/traffic.ts` | `trafficTarget(level, difficulty)`. |
| `src/sim/projectiles.ts` | O helicóptero do computador usa `BALANCE.difficulties[w.difficulty].heliFireIntervalAi`. |
| `src/meta/rewards.ts` | `rewardFor(r, stats, difficulty)`; `Reward` ganha `difficulty: Difficulty`. |
| `src/meta/profile.ts` | `settleMatch(p, result, player, difficulty)`. |
| `src/storage/ranking.ts` | `Boards`, `emptyBoards()`, `loadBoards()`/`saveBoards()` com a migração do v2. As funções por `Board` (`qualifies`, `insert`) não mudam. |
| `src/storage/difficulty.ts` | `loadDifficulty(storage)` e `saveDifficulty(storage, d)`. Nunca lançam erro. |
| `src/ui/screens/difficultyPicker.ts` | Seletor reutilizado na escolha do lado e no ranking. |
| `src/ui/screens/flow.ts` | A dificuldade fica fora da máquina de estados, porque é uma preferência do app e não um estado de tela. A única exceção é o ranking: `ranking.difficulty` e a ação `difficultyTab`. |
| `src/game.ts`, `src/app.ts` | Passam a dificuldade para a partida, a recompensa, o ranking e as telas. |

A simulação continua pura e determinística: a dificuldade é um parâmetro da partida.

## 7. Erros e casos de borda

- **Armazenamento indisponível:** a dificuldade vale só na sessão e o ranking segue como hoje.
- **Ranking v3 corrompido:** comporta-se como o v2 de hoje (descarta entradas inválidas). Se o arquivo inteiro for ilegível, começa vazio sem apagar o v2.
- **Dificuldade desconhecida no `createWorld`:** cai para Médio.

## 8. Testes

- **Simulação:**
  - nível inicial e ritmo de subida por dificuldade, com `levelAt` nas bordas (44,9/45; 59,9/60; 29,9/30);
  - quantidade de tráfego por dificuldade, com o mínimo de 1;
  - helicóptero do computador por dificuldade, e o do jogador sempre 0,7 s;
  - o Médio deixa os testes de computador contra computador iguais a hoje (ladrão vence 30% a 70%);
  - no Fácil, a polícia controlada pelo computador vence menos que no Difícil, contando as mesmas sementes.
- **Moedas:** 112 × 1,5 = 168 no Difícil; o Fácil arredonda para baixo.
- **Ranking:** migração do v2 para o `normal`, v3 com lixo, cada dificuldade separada.
- **Telas:**
  - seletor (clique, setas, `aria-checked`);
  - escolha do lado lembrando a última;
  - ranking abrindo na dificuldade certa;
  - selo e linha do multiplicador no fim.
- **e2e:** escolher Difícil, jogar até o fim com `escape=4`, ver o selo e "×1,5", abrir o ranking já no Difícil, recarregar e ver a escolha mantida.

## 9. Versão

`feat`: 0.11.1 → 0.12.0.
