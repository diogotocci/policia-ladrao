# Backlog — ideias para próximas versões

Ideias anotadas durante o desenvolvimento. Cada item passa por brainstorming e entra na spec antes de virar código.

## Pendente

### Fases (anotado em 2026-10-05)

**Ideia (Diogo):** com a gamificação, o jogador vai passando de fase e fica mais difícil. A primeira regra que escala é o **tempo de fuga do ladrão** (hoje 1:30, em `BALANCE.match.escapeTime`): cada fase vencida aumenta o tempo que o ladrão precisa sobreviver. Decidir no brainstorming: o que mais escala por fase (nível inicial da IA, tráfego, curvas fechadas), se a fase é por lado e como ela conversa com o ranking.

### Mais coisas na loja (anotado em 2026-10-09)

**Pedido (Diogo):** mais carros, modelos e cosméticos, para o jogador ter motivo para continuar jogando depois de comprar tudo. Virou a V2 Parte 6 (`docs/superpowers/specs/2026-10-09-v2-parte6-loja2-design.md`): entrega 1 (maestria, acabamentos, adesivos, 0.21) e entrega 2 (rodas, fumaça colorida, acessórios do ladrão, 0.22) feitas; entrega 3 (os 4 carros novos, 0.23) e entrega 4 (Camburão, Rodoviária PRF, Sedã clássico e Carro-forte, 0.24) feitas. Ideias que ficaram de fora: SUV tático, buggy de praia, viatura antiga anos 70, moto de trilha da polícia, táxi roubado, moto de entrega, ambulância roubada, hatch rebaixado com som.

### V3: conta, servidor e Google Play

Virou a V3 Parte 1 (`docs/superpowers/specs/2026-10-12-v3-parte1-conta-play-design.md`). Entrega 1 (servidor, login com Google, nome de usuário, progresso na nuvem, Perfil, excluir conta, privacidade e termos, 0.25; admin pela conta, 0.26) entrega 2 (ranking global, 0.27) entrega 3 (eventos e painel /admin, 0.28) e entrega 4 (pacote Android, assetlinks, imagens e textos da loja, guia do Play Console, 0.29) feitas. Falta publicar (`docs/play-store.md`):

- **Conta de desenvolvedor no Play Console:** ainda não criada (anotado em 2026-10-15). O `.aab` já foi gerado no computador do Diogo, e a variável `ANDROID_SHA256_FINGERPRINTS` já tem a impressão da chave de envio; falta a da chave da Play, que só existe depois do primeiro envio.
- Depois dela: criar o app, teste interno, teste fechado de 14 dias com 12 testadores e produção.

Denúncia de nome pela bandeira de cada linha do Ranking Global, salva no banco (0.30); a aba Denúncias do /admin para revisar e agir (forçar troca de nome, banir com desfazer, descartar; spec `docs/superpowers/specs/2026-10-15-denuncias-admin-design.md`, 0.31). Ideia para depois: conferir os recordes pelo replay da partida (semente + comandos). Dinheiro de verdade continua fora.

## Feito

- **Denúncias no /admin (anotado em 2026-10-13):** aba Denúncias com fila, histórico e as ações forçar troca de nome, banir (com desfazer) e descartar (0.31). Ficaram de fora: ocultar sozinho por número de denúncias, tirar só do ranking, suspensão com prazo e aviso por e-mail.
- **Progressão e retenção (anotado em 2026-10-04):** moedas por partida (V2 Parte 1), dificuldade com multiplicador (Parte 2), loja só de cosméticos (Parte 4) e Carreira com desafios do dia, conquistas, patentes por lado e sequência de dias (Parte 5). Progresso no aparelho com código de backup.
- **Loja com desbloqueio (anotado em 2026-10-08):** preços ~3x mais altos, carros, cores, neon, sons e placa liberados pela Carreira e depois comprados (Parte 5).
- **Reforço da polícia: bloqueio de via (anotado em 2026-10-05):** entrou como o especial "Bloqueio" da polícia na Parte 3, com viatura atravessada, spike e batida de verdade.
- **Desafios do dia sem repetir (playtest 2026-10-08):** 21 desafios, 7 por nível, sem repetir o do dia anterior (0.19.0).
