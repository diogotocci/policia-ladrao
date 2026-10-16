# Denúncias no /admin: revisar e agir

Pedido do Diogo em 13/10/2026; brainstorming em 15/10/2026. Continua a denúncia pela bandeira do Ranking Global (0.30), que hoje só guarda cada denúncia na tabela `reports`.

## 1. Decisões

| Ponto | Decisão |
|---|---|
| Ações | **Forçar troca de nome**, **Banir** (com Desfazer) e **Descartar**. Tirar só do ranking ficou de fora. |
| Aviso ao jogador | Sim, curto: na tela de nome ("Escolha outro nome") e na tela de conta suspensa. |
| Ocultar sozinho | Não. Nada muda para o jogador até o admin agir. |
| Histórico | Sim: seção "Decididos" com data, nome, ação, quantas denúncias e Desfazer para banimento. |

## 2. A aba

- O painel ganha duas abas no topo: **Números** (o painel de hoje) e **Denúncias**, com um contador de contas para revisar.
- **Para revisar:** uma linha por conta denunciada, da que tem mais denúncias para a que tem menos (empate: a mais recente primeiro).
  - O nome atual em destaque. Se o jogador trocou de nome depois da denúncia, mostra "denunciado como @nome".
  - Quantas denúncias (cada pessoa denuncia uma vez), a primeira e a última (horário de Brasília) e até 3 de quem denunciou, com "e mais N".
  - Botões **Forçar troca de nome**, **Banir** e **Descartar**. Banir pede confirmação na própria linha.
- **Decididos:** as 50 últimas decisões. Nome trocado mostra o nome novo quando já existe. Banido tem **Desfazer**.
- Funciona no computador e no celular (os botões descem para baixo do nome).

## 3. O que cada ação faz

Toda ação tira as denúncias daquela conta da fila e grava uma linha no histórico. Depois disso, quem já tinha denunciado pode denunciar de novo.

- **Forçar troca de nome**
  - A conta fica sem nome na hora e sai do ranking (o ranking só mostra contas com nome).
  - O nome antigo fica bloqueado para sempre, para qualquer conta.
  - No próximo acesso o jogador cai na tela de nome com o aviso "Seu nome @x foi considerado ofensivo e saiu do ranking. Escolha outro para continuar; seu progresso e seus recordes continuam com você." Sem a espera de 30 dias.
  - Recordes e progresso ficam; o ranking volta a mostrar a conta com o nome novo.
- **Banir**
  - A conta não entra mais: login recusado e a sessão aberta acaba no próximo pedido ao servidor.
  - Some do ranking. O progresso fica guardado, para o Desfazer.
  - O jogo mostra "Conta suspensa": o nome, o motivo (Termos, nome ofensivo), o e-mail para contestar, **Entrar com outra conta** e o link para excluir a conta.
  - A exclusão de conta continua funcionando para conta banida (exigência da Play), pela página `/excluir-conta`.
- **Descartar:** o nome está ok; nada muda para o jogador.
- **Desfazer (banimento):** a conta volta a entrar e a aparecer no ranking.
- A conta admin não pode ser alvo de ação.

## 4. Servidor

- Tabelas novas, criadas sozinhas como as outras:
  - `moderation`: id, conta (some o vínculo se a conta for excluída), nome na hora, ação (`rename`, `ban`, `unban`, `dismiss`), quantas denúncias, data.
  - `blocked_names`: nomes tirados à força; a escolha de nome recusa como já usado.
- Colunas novas em `users`: `banned_at` e `notice` (o aviso de nome trocado, que some quando ele escolhe outro).
- `GET /api/admin/stats?view=reports` (fila e histórico) e `POST /api/admin/stats` (`{ userId, action }`), só para a conta admin. Sem função nova na Vercel: tudo fica na função do painel (limite de 12 do plano Hobby).
- Conta banida: o login e `/api/me` respondem a conta com `banned: true` (o jogo mostra "Conta suspensa"); qualquer outro pedido com sessão responde `403 { error: 'banned' }`, menos excluir a conta.

## 5. Textos legais

- Termos: nomes ofensivos podem ser trocados à força, e a conta pode ser suspensa.
- Privacidade: o histórico de decisões guarda o nome e a ação; some o vínculo com a pessoa quando a conta é excluída.

## 6. Fora desta entrega

Ocultar sozinho por número de denúncias, tirar só do ranking, suspensão por prazo, aviso por e-mail.

Mockups: aba no computador e no celular, tela "Escolha outro nome" e tela "Conta suspensa" (15/10/2026).
