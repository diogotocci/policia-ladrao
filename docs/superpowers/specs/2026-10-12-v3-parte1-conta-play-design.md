# Polícia × Ladrão: V3, Parte 1: conta, nuvem, ranking global, painel e Google Play

Data: 2026-10-12. Status: aprovada; entrega 1 feita (0.25.0, admin pela conta em 0.26.0); entrega 2 feita (0.27.0); entrega 3 feita (0.28.0).

## 1. Objetivo

Publicar o jogo na Google Play (pedido do Diogo, 2026-10-12) com login e tudo o que a loja exige, e saber como o jogo está sendo jogado.

**Decisões do Diogo (2026-10-12):**

- **Login:** só com Google, e obrigatório. O motivo é saber quantas pessoas criaram conta e montar um painel: acessos, modos mais jogados, carros mais comprados e mais usados, dificuldade mais jogada etc.
- **Na nuvem:** o progresso e um ranking global.
- **Nome de usuário:** o ranking global usa um nome de usuário único escolhido pelo jogador. A placa não serve, porque não é única.
- **Progresso que já existe no celular:** vai para a conta.
- **Sem internet:** dá para jogar e sincronizar depois.
- **Painel:** página /admin no próprio site, só para a conta do Diogo.
- **Público:** 13 anos ou mais, fora do programa Família do Google.
- **Play Console:** o Diogo ainda não tem conta de desenvolvedor.

**Fora da Parte 1:**

- dinheiro de verdade (compras e anúncios);
- iPhone na App Store, que exigiria "Entrar com Apple" junto do Google (vai para o backlog);
- verificação das partidas por replay contra trapaça (fica uma checagem de plausibilidade, ver §5);
- multiplayer.

## 2. Regras da Google Play que entram

| Regra | Como atendemos |
|---|---|
| App que cria conta precisa permitir excluir a conta **dentro do app** | Perfil → "Excluir minha conta" (§4.5). |
| ...e também por um **link na web**, sem precisar reinstalar o app | Página `/excluir-conta`: entra com Google e exclui (§4.5). O link vai no formulário de Segurança dos dados. |
| Excluir a conta apaga os dados do jogador | Apaga conta, progresso, nome de usuário e recordes. Os eventos do painel ficam sem nenhum vínculo com a pessoa, e a política de privacidade diz isso (§6). |
| Política de privacidade | Página `/privacidade` em português, com o link na ficha da loja. |
| Formulário de Segurança dos dados | Respostas prontas na §8. |
| Classificação indicativa (IARC) | Questionário no Play Console: violência de desenho, sem sangue, sem compras e sem chat. |
| Público-alvo | 13 anos ou mais. Não marcar crianças, para ficar fora das regras de Família. |
| API alvo | A partir de 31/08/2026, apps novos precisam mirar o Android 16 (API 36). O pacote é gerado já assim (§7). |
| Conta pessoal nova no Play Console | Teste fechado com **12 testadores por 14 dias seguidos** antes de liberar a produção. Fica no checklist (§9). |

## 3. Arquitetura

- **App:** continua sendo o mesmo site (PWA) na Vercel. Na Play, ele vai embrulhado num **TWA** (Trusted Web Activity, gerado pelo Bubblewrap). Cada deploy na Vercel já atualiza o jogo. Só é preciso mandar um pacote novo à loja quando muda algo do pacote: ícone, nome ou versão do Android.
- **Servidor:** funções da Vercel em `api/`.
- **Banco:** Postgres no Neon, pelo driver `@neondatabase/serverless`.
- **Login:** Google Identity Services, o botão oficial "Fazer login com o Google".
  - O servidor confere o token do Google (assinatura e `aud` = Client ID) e abre uma sessão.
  - A sessão é um cookie `HttpOnly`, `Secure` e `SameSite=Lax`, de 90 dias, assinado com `SESSION_SECRET`.
  - Não guardamos senha nem token do Google.
- **Variáveis na Vercel:** `GOOGLE_CLIENT_ID`, `DATABASE_URL` e `SESSION_SECRET`. A conta admin é fixa no código do servidor: `diogotocci@gmail.com` (decidido em 2026-10-12, já na entrega 1).
  - `ADMIN_PASSWORD`, o botão Admin e a senha saem: o modo admin da loja fica sempre ligado para a conta admin e nunca para outra.
- **A simulação continua sem rede e sem a loja:** nada muda em `src/sim`.

**Tabelas:**

| Tabela | Campos | Para quê |
|---|---|---|
| `users` | `id`, `google_sub` (único), `email`, `username` (único, sem diferenciar maiúsculas), `created_at`, `last_seen_at` | a conta |
| `profiles` | `user_id`, `data` (o perfil v3 em JSON), `rev`, `updated_at` | o progresso na nuvem |
| `records` | `user_id`, `mode`, `side`, `difficulty`, `time_ms`, `hp`, `car`, `match_id` (único), `created_at` | o ranking global |
| `events` | `id`, `user_id` (fica vazio depois de excluir a conta), `type`, `data` (JSON), `app_version`, `created_at` | o painel |

## 4. Conta e progresso

### 4.1 Primeira vez

1. O título fica atrás de uma tela "Entrar com Google", com o nome do jogo, um texto curto ("Seu progresso fica salvo na sua conta") e os links da política de privacidade e dos termos.
2. Depois do login, se a conta ainda não tem nome de usuário, aparece "Escolha seu nome de usuário".
   - 3 a 16 caracteres: letras, números e `_`.
   - Único, sem diferenciar maiúsculas.
   - Passa por um filtro de palavrões.
   - Pode ser trocado uma vez a cada 30 dias.
3. **Progresso:** se a conta é nova e o celular tem progresso, ele sobe para a conta. Se a conta já tem progresso de outro aparelho e este também tem, o jogo pergunta qual manter, mostrando as moedas, as patentes e a quantidade de carros de cada um.

### 4.2 Depois

- O login fica no aparelho por 90 dias e renova sozinho a cada abertura com internet.
- **Sem internet:** quem já entrou uma vez joga normalmente. Partidas, compras e eventos ficam numa fila no aparelho e sobem quando a conexão voltar.
- **Sem internet e sem nunca ter entrado:** aparece "Conecte-se para entrar pela primeira vez".

### 4.3 Sincronização

- O perfil inteiro sobe depois de cada partida e de cada compra ou resgate, e desce ao abrir o jogo.
- Cada versão salva leva um número (`rev`).
- **Conflito** (dois aparelhos, um deles offline): os dois perfis são juntados, para que nada conquistado se perca.
  - Itens comprados, conquistas e resgates: a união dos dois.
  - XP dos lados, maestria e contadores: o maior de cada.
  - Moedas e o que está em uso: os do perfil salvo por último.
  - Ranking local: a união dos dois.
- **Código de backup:** some da tela de Progresso, porque a conta faz esse papel. Na migração, cada aparelho leva o seu progresso para a conta ao entrar (com a escolha da §4.1 quando os dois têm progresso).

### 4.4 Perfil

A tela de perfil (o botão do canto) mostra:

- foto e nome do Google, nome de usuário (com "Trocar") e e-mail;
- "Sair";
- "Excluir minha conta";
- links da privacidade e dos termos.

### 4.5 Excluir a conta

- **No app:** Perfil → "Excluir minha conta".
  - A confirmação explica o que some e pede para digitar o nome de usuário.
  - O servidor apaga `users`, `profiles` e `records` e deixa `events.user_id` vazio.
  - O aparelho apaga o progresso local e volta para a tela de entrar.
- **Na web:** `/excluir-conta` é uma página simples, fora do jogo, com "Entrar com Google" → mesmo aviso → "Excluir".
- É imediato; não há período de espera.

## 5. Ranking global

- **Quadros:** os mesmos de hoje (modo × lado × dificuldade), com o top 100 de cada um. Cada jogador aparece só uma vez, com seu melhor resultado.
- **Mostra:** posição, nome de usuário, tempo, carro e a patente do lado.
- **Abas:** a tela de Ranking ganha "Global" e "Neste aparelho"; Global é a padrão.
- **Quando sobe:** um recorde sobe junto com o fim da partida, com `match_id` único.
- **Checagem de plausibilidade no servidor:**
  - o tempo fica dentro dos limites do modo (uma fuga na Perseguição dura exatamente o tempo de fuga);
  - cada partida terminou depois da anterior pelo menos o tempo que ela durou (com folga de 20%), contando pela hora em que acabou, para que recordes enviados juntos depois de jogar offline não virem suspeitos;
  - a hora em que acabou não pode estar no futuro nem ter mais de 30 dias;
  - o carro é do lado certo e a patente vai de 1 a 7;
  - o resultado precisa bater com o evento `match_end` da mesma partida (modo, lado, dificuldade, tempo e resultado). Os recordes enviados antes da 0.28 continuam valendo.
  - Fora disso o recorde é guardado como suspeito e não aparece. A verificação por replay vai para o backlog.
- **Iniciais de arcade:** ficam só no ranking do aparelho, com a placa de sempre (decidido em 2026-10-12). O global usa o nome de usuário.
- **Global sem digitar nada:** a partida sobe sozinha para o global no fim. A tela de fim mostra a linha "Ranking global" (enviando, a posição, "seu melhor continua em…" ou "sobe quando a internet voltar") junto da placa ou do "Recorde salvo!"; se a partida só entra no global, aparece uma caixinha só com essa linha.
- **Offline:** o recorde fica numa fila no aparelho e sobe quando a conexão volta (o `match_id` evita duplicar).
- **Partidas com `?debug`** não sobem em produção (as regras delas são alteradas para teste).

## 6. Painel (/admin)

- A página só abre para a conta admin (`diogotocci@gmail.com`). O servidor confere a sessão em todas as consultas.
- **Eventos gravados** (sem dados pessoais além do id da conta):
  - `session_start`: versão do app e se é o app da Play ou o navegador;
  - `match_end`: modo, lado, dificuldade, carro, venceu, motivo, tempo, nível máximo da IA, moedas;
  - `purchase`: item e preço;
  - `claim`: o que foi resgatado;
  - `username_set`;
  - `account_deleted`.
- **Telas:**
  - contas criadas por dia;
  - jogadores ativos por dia, semana e mês;
  - retenção D1/D7/D30 por semana de criação;
  - partidas por modo, lado e dificuldade;
  - vitórias por lado e dificuldade;
  - carros mais usados e mais comprados;
  - itens da loja mais comprados;
  - duração média das partidas;
  - versões do app em uso.
  - Cada tela tem filtro de período.
- **Modo admin da loja:** fica ligado para a conta admin (sem senha), com o mesmo selo "admin" de hoje. As peças pegas de graça no modo admin não contam como compras no painel.
- **Como foi feito (0.28.0):**
  - os eventos ficam numa fila no aparelho (como os recordes, presos à conta) e sobem junto da sincronização, antes dos recordes;
  - `account_created`, `username_set` e `account_deleted` são gravados pelo próprio servidor;
  - a retenção D1/D7/D30 aparece como um número só para as contas criadas no período (não por semana);
  - partidas com `?debug` ou `?curves=0` não contam em produção;
  - o painel é a página `admin.html` (`/admin`), separada do jogo; no localhost mostra números de exemplo.

## 7. Pacote Android (TWA)

- **Gerado com o Bubblewrap** a partir do `manifest.webmanifest`: tela cheia, paisagem, ícone e splash.
- **ID do pacote:** `br.com.diogotocci.policialadrao`, a confirmar (não muda depois de publicado).
- **API alvo:** Android 16 (API 36), versão mínima Android 7. A versão do pacote segue a do jogo (0.x → versionCode).
- **`/.well-known/assetlinks.json`:** servido pela Vercel com a impressão SHA-256 da chave de assinatura da Play (Play App Signing). Sem ele o app abre com a barra do navegador.
- **Login dentro do TWA:** roda no Chrome do aparelho, com a conta Google que já está nele. O botão do Google funciona como no navegador.
- **O projeto Android fica em `android/`:** gerado uma vez, versionado, e o `.aab` sai por um script.

## 8. Formulário de Segurança dos dados (respostas)

- **Coleta dados:** sim.
  - Nome e e-mail, para a conta.
  - ID do usuário.
  - Interações no app: partidas e compras com moedas do jogo, para estatística do próprio jogo.
- **Compartilha com terceiros:** não.
- **Criptografia em trânsito:** sim (HTTPS).
- **Permite pedir exclusão:** sim, no app e em `/excluir-conta`.
- **Anúncios, localização, contatos, fotos e pagamentos:** não.

## 9. Checklist do Diogo (fora do código)

1. Criar a conta de desenvolvedor no Play Console: pessoal, US$ 25, com verificação de identidade.
2. No Google Cloud, criar o projeto e o OAuth Client ID "Aplicativo da Web", com os domínios do jogo autorizados, e configurar a tela de consentimento.
3. Criar o banco no Neon e pôr `DATABASE_URL`, `GOOGLE_CLIENT_ID` e `SESSION_SECRET` na Vercel.
4. Ficha da loja:
   - ícone 512×512;
   - imagem de destaque 1024×500;
   - de 4 a 8 capturas em paisagem;
   - descrição curta e completa em português;
   - categoria Corrida;
   - e-mail de contato.
   - Gero as imagens e os textos.
5. Juntar 12 testadores (contas Google) para o teste fechado e mantê-los inscritos por 14 dias. Depois disso, pedir o acesso à produção.

## 10. Entregas

1. **Servidor e conta:**
   - banco, login obrigatório com Google, nome de usuário;
   - nuvem do progresso com migração e jogo offline;
   - Perfil, Sair, Excluir conta (no app e em `/excluir-conta`);
   - privacidade e termos.
2. **Ranking global.**
3. **Eventos e painel /admin**, e o modo admin pela conta.
4. **Pacote Android (TWA), `assetlinks`, ficha da loja e guia do Play Console.**

Mockups antes das telas novas: entrar, nome de usuário, escolher progresso, perfil, excluir conta, ranking global e painel.

## 11. Testes

- **Unidade:**
  - conferência do token e da sessão (com chaves de teste);
  - regras do nome de usuário;
  - junção de perfis em conflito;
  - fila offline;
  - checagem de plausibilidade do ranking;
  - exclusão apagando tudo e deixando os eventos sem vínculo;
  - permissão do /admin.
- **e2e:**
  - Com `?debug`, um login de teste em `localhost` (nunca em produção) para os testes continuarem rodando sem o Google.
  - Fluxo: entrar → escolher nome → jogar → recorde no ranking global → excluir conta.
- **Banco nos testes:** um Postgres local nos testes de servidor; o Neon só em produção.
