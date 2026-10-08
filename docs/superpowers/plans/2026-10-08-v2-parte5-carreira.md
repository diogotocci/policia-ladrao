# V2 Parte 5: Carreira, plano de implementação

**Goal:** desafios do dia, conquistas, patentes e sequência de dias; a loja passa a pedir desbloqueio e fica cerca de 3 vezes mais cara. Entrega em um PR: 0.17.0.

**Spec:** `docs/superpowers/specs/2026-10-08-v2-parte5-carreira-design.md`

**Architecture:**

- **Regras:** tudo puro em `src/meta/career.ts`.
  - Recebe "hoje" (data local) e um `MatchSummary` por partida.
  - Devolve a carreira nova, as moedas e os eventos para a tela de fim.
- **Loja:** `src/meta/shop.ts` pergunta a `career.ts` o que libera cada item (`unlockOf`, `meets`, `requirementText`).
- **Perfil:** vai para a v3 com `career`; o backup ganha o 11º campo.
- **Telas:** `src/ui/screens/careerScreen.ts` (Carreira, faixa da tela de fim, aviso da sequência).

## Tasks

1. **`meta/career.ts` (TDD):**
   - patentes, contadores, conquistas, desafios do dia e sequência;
   - `careerAfterMatch`, `unlockOf` e `meets`;
   - `parseCareer` e `careerFromStats`.
2. **`MatchStats`:** passa a contar as caixas ?, os bloqueios e as bombas que acertaram. O jogo informa a fração de vida no fim.
3. **Perfil v3:**
   - `settleCareer`;
   - chave `pl.profile.v3`;
   - backup v3, aceitando os códigos v1 e v2.
4. **Loja:** preços cerca de 3 vezes maiores; `canBuy` com o motivo "locked" e o texto `need`; a lista mostra o cadeado e o progresso.
5. **Telas:**
   - Carreira (3 abas);
   - botão e bolinha no início, sequência ao lado das moedas;
   - faixa na tela de fim e aviso da sequência;
   - patente 7 no ranking.
6. **App:** crédito da carreira junto com as moedas da partida (salvo antes da tela de fim); novidades zeradas ao abrir a Carreira.
7. **e2e:** Carreira e cadeado na loja.
8. **Revisão** por agente novo, ajustes e release 0.17.0.
