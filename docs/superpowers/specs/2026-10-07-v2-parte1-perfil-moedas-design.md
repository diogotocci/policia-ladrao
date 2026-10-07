# Polícia × Ladrão: V2, Parte 1: perfil e moedas (design)

Data: 2026-10-07. Status: aprovado em conversa, aguardando revisão desta spec escrita.

## 1. Contexto: a V2

**Objetivo (Diogo, 2026-10-07):** lançar para o público e fazer as pessoas voltarem. A V2 usa só a moeda do jogo. Dinheiro de verdade, conta de usuário e servidor ficam para a V3, mas o formato do progresso já nasce pronto para isso.

A V2 é dividida em partes. Cada parte tem a sua spec, o seu plano e os seus PRs, e sai como versão jogável:

| Parte | Conteúdo |
|---|---|
| **1. Perfil e moedas** (esta spec) | Moeda única, ganho por partida, saldo, estatísticas, backup por código. |
| 2. Dificuldade | Fácil, médio e difícil; multiplicador de moedas por dificuldade. |
| 3. Modos de jogo | Nome para o modo atual (sugestão: "Fuga") e o modo Sobrevivência (sem tempo, ganha quem zerar o outro, itens ficam mais fortes com o tempo), com itens novos. |
| 4. Loja | Skins de carros (polícia: blazer, esportivo, caveirão; ladrão: picape de caçamba aberta, moto com carona, van preta), cosméticos e melhorias pequenas; regra do ranking para carro melhorado. |
| 5. Gamificação | Desafios diários, conquistas, patentes, sequência de dias. |

Itens do backlog que entram nas partes: fases (Parte 3), reforço com bloqueio de via (Parte 3), progressão (Partes 1, 4 e 5).

**Decisões de produto da V2 que valem para todas as partes:**

- Uma moeda só, ganha nos dois lados, compra qualquer coisa.
- Nada de caixa-surpresa paga (loot box): o ECA Digital proíbe em jogos que menores podem acessar.
- Melhorias compradas são pequenas (limite a decidir na Parte 4, ordem de +10% no total), para o jogo não ficar fácil.

## 2. Objetivo da Parte 1

Cada partida terminada rende moedas, o saldo aparece no jogo e fica salvo no aparelho, e o jogador consegue levar o progresso para outro aparelho com um código.

**Critérios de sucesso:**

- Terminar uma partida mostra a conta das moedas ganhas e soma ao saldo.
- O saldo e as estatísticas continuam depois de recarregar a página e de reabrir o app instalado.
- Copiar o código num aparelho e restaurar em outro deixa os dois com o mesmo progresso.
- Nada disso muda a jogabilidade nem o ranking.

**Fora da Parte 1:** loja e gastos (Parte 4), multiplicador por dificuldade (Parte 2), conta e servidor (V3).

## 3. Ganho de moedas

Só partidas que chegam ao fim rendem moedas. Sair pela pausa não rende nada.

| Parcela | Regra | Limite |
|---|---|---|
| Tempo | 1 moeda a cada 3 s de partida (arredonda para baixo) | 30 |
| Dano | 1 moeda a cada 4 de dano causado no carro adversário (arredonda para baixo) | 25 |
| Caixas | 2 moedas por caixa da sua cor | sem limite |
| Vitória | multiplica a soma por 2 | |

- Uma partida rende de cerca de 25 (derrota curta) a 120 moedas (vitória longa com muito dano).
- Exemplo: vitória em 1:09.9, 100 de dano, 4 caixas → (23 + 25 + 8) × 2 = **112**.
- "Dano causado" soma os eventos `hit` cujo alvo é o adversário, de qualquer fonte: tiro, batida, bomba, investida.
- "Caixa da sua cor" conta os eventos `pickup` do jogador com item válido. `wrong` e `none` não contam.
- Os valores ficam em `BALANCE.rewards`, para balancear sem mexer no código.
- A Parte 2 acrescenta um multiplicador por dificuldade (ponto de partida: fácil ×0,75, médio ×1, difícil ×1,5).

## 4. Perfil do jogador

Um único registro versionado no aparelho, chave `pl.profile.v1`:

```
{
  v: 1,
  coins: number,          // saldo, inteiro ≥ 0
  stats: {
    matches: number,      // partidas terminadas
    wins: number,
    escapes: number,      // vitórias do ladrão por fuga
    arrests: number,      // vitórias da polícia
    coinsEarned: number   // total ganho na vida
  },
  welcomeGranted: boolean // bônus de boas-vindas já creditado
}
```

- O formato aceita campos novos nas próximas partes (inventário, skin escolhida, conquistas) por migração de versão: `v: 1` → `v: 2`.
- **Boas-vindas para quem já joga:** na primeira carga do perfil, cada recorde que já existe no ranking local vale 50 moedas, creditadas uma única vez (`welcomeGranted`).
- O ranking (`pl.ranking.v2`) continua separado e sem mudanças.

## 5. Backup por código

- O botão **Progresso** da tela inicial abre um diálogo. Ele mostra moedas, partidas, vitórias e fugas, o código do progresso e os botões "Copiar código", "Restaurar" e "Fechar".
- **Formato do código:** prefixo `PL1-`, depois o perfil em JSON compacto (uma lista de números, para o código ficar curto) codificado em base32 (só letras maiúsculas e algarismos, sem confusão entre maiúsculas e minúsculas ao digitar) e um verificador CRC32, em blocos de 4 caracteres separados por hífen.
- O verificador pega código colado incompleto ou editado à mão sem querer. Não impede trapaça proposital, o que é aceitável sem conta.
- **Restaurar** abre um campo para colar o código, valida e pede confirmação: "Isso substitui o progresso deste aparelho (X moedas) pelo do código (Y moedas)."
- **Código inválido:** a mensagem diz o que fazer ("Código incompleto ou com erro. Copie de novo no outro aparelho.").

## 6. Telas

Mockups: `v2-parte1-perfil-moedas.html` (entregue na conversa de 2026-10-07). Visual igual ao das telas atuais: asfalto, amarelo de placa, azul e vermelho.

- **Tela inicial:**
  - selo com o saldo no topo à esquerda (ícone de moeda + valor);
  - botão Progresso (ícone de perfil) ao lado do som;
  - o resto da tela não muda.
- **Fim de partida:**
  - no cartão do resultado, abaixo do tempo, entra o quadro de recompensa: uma linha por parcela (Tempo, Dano com o valor, Caixas com a contagem, Vitória ×2) e o total "+N moedas";
  - o total conta de 0 até N em cerca de 0,8 s, sem animação com "reduzir movimento";
  - o motivo e o nível ficam numa linha só, para caber.
- **Diálogo de Progresso:** como na seção 5. Segue o padrão do "Como jogar": foco preso dentro, conteúdo de trás inerte, Esc fecha.

## 7. Arquitetura

Unidades novas, cada uma testável sozinha:

| Unidade | Papel | Depende de |
|---|---|---|
| `src/meta/rewards.ts` | `matchStats(events)` acumula dano causado e caixas certas; `rewardFor(result, stats)` devolve as parcelas e o total. Puro. | `BALANCE.rewards` |
| `src/meta/profile.ts` | Tipo `Profile`, `emptyProfile()`, `parseProfile(raw)` (valida e migra), `applyMatch(profile, result, reward)`, `grantWelcome(profile, board)`. Puro. | `rewards`, tipos do ranking |
| `src/meta/backup.ts` | `encodeBackup(profile)` e `decodeBackup(code)` com CRC32. Puro. | `profile` |
| `src/storage/profileStore.ts` | `loadProfile(storage)` e `saveProfile(storage, profile)`. Perfil corrompido vai para `pl.profile.corrupt` e começa um novo. | `profile` |
| `src/ui/screens/progress.ts` | Diálogo de Progresso. | `backup`, `dom` |

Mudanças em código existente:

- **`src/game.ts`:** acumula os eventos de cada passo com `matchStats` e entrega `stats` junto com o resultado em `onEnd`. Aproveitar para tirar essa responsabilidade de dentro de `startGame`, que já passa do limite de linhas.
- **`MatchResult` (`flow.ts`):** ganha `stats?: { damageDealt: number; rightBoxes: number }`.
- **`src/app.ts`:**
  - carrega o perfil e aplica as boas-vindas;
  - ao fim de cada partida aplica a recompensa e salva;
  - passa saldo e recompensa para as telas;
  - "Jogar de novo" e "Trocar de lado" não creditam de novo: o crédito acontece uma vez por partida, no evento de fim.
- **`renderTitle` e `renderEnd`:** recebem `coins` e `reward` para mostrar.

A simulação (`src/sim`) não muda e continua pura.

## 8. Erros e casos de borda

- **Navegador sem armazenamento** (modo privado, bloqueio): o perfil vive só na memória da sessão e o diálogo de Progresso avisa "Seu progresso não está sendo salvo neste navegador".
- **Perfil salvo corrompido ou de versão desconhecida:** guarda o texto original em `pl.profile.corrupt` e começa um perfil novo. Nunca apaga sem guardar.
- **Saldo:** inteiro, nunca negativo. Valores fora do formato no perfil ou no código são rejeitados pela validação.
- **Partida encerrada pela pausa (Sair, Reiniciar):** não rende nada e não conta em `matches`.
- **Duas abas abertas:** a última gravação vence. Aceitável na V2.

## 9. Testes

- **Unitários:**
  - parcelas, limites e multiplicador de `rewardFor`, incluindo o exemplo da seção 3 (112);
  - `matchStats` com eventos de vários tipos;
  - `parseProfile` (válido, campos faltando, tipos errados, versão futura);
  - `applyMatch` e `grantWelcome` (só uma vez);
  - ida e volta de `encodeBackup`/`decodeBackup`, código truncado e código com um caractere trocado;
  - `profileStore` com armazenamento quebrado.
- **Telas:**
  - saldo na tela inicial;
  - quadro de recompensa no fim (parcelas e total);
  - diálogo de Progresso (copiar, restaurar com confirmação, código inválido, foco e Esc).
- **e2e:** jogar até o fim com `escape=4`, ver "+N moedas", voltar ao início e ver o saldo, recarregar e conferir que continua, restaurar um código e ver o saldo trocar.

## 10. Versão

Parte 1 é `feat`: sobe a versão minor (0.10.0 → 0.11.0, ou a seguinte se outra PR sair antes). A V2 completa vira 1.0.0 quando o Diogo declarar o lançamento.
