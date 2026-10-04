# Backlog — ideias para próximas versões

Ideias anotadas durante o desenvolvimento. **Nada aqui está aprovado nem implementado**: cada item passa por brainstorming e entra na spec antes de virar código.

## Progressão e retenção (anotado em 2026-10-04)

**Objetivo (Diogo):** manter os jogadores interessados; gamificar.

**Ideia original:** cada partida rende uma recompensa: **dinheiro** jogando de ladrão, **medalhas** jogando de polícia. Acumulando, o jogador troca por:

- melhorias;
- carros novos;
- especiais;
- resistência a quebra-mola;
- etc.

**Pontos para decidir no brainstorming** (só levantados, sem decisão):

- **Quanto ganha.** Fixo por partida ou proporcional ao desempenho? Por exemplo: tempo de fuga, dano causado, caixinhas, quebra-molas evitados, vitória.
- **Moedas.** Separadas por lado (dinheiro só compra coisas de ladrão, medalha só de polícia) ou conversíveis?
- **Equilíbrio contra a IA.** Melhorias permanentes deixam o jogo mais fácil com o tempo. Talvez a dificuldade da IA acompanhe, ou as melhorias sejam pequenas e os itens das caixinhas continuem decidindo.
- **Ranking.** Partidas com carro melhorado contam no mesmo top 10 ou num separado?
- **Persistência.** Hoje é tudo local (`localStorage`). Progresso de longo prazo pode pedir backup ou conta; sem conta, limpar o navegador perde tudo.
- **Cosméticos × poder.** Pinturas, giroscópios, buzinas e fumaça não mexem no equilíbrio e podem ser boa parte da loja.
- **Outros ganchos.**
  - desafios diários;
  - conquistas (ex.: "fugir 5 min sem levar bomba");
  - sequência de dias jogando;
  - níveis de patente (recruta → delegado / batedor de carteira → chefão).
