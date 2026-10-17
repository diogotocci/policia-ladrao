# Polícia × Ladrão

Jogo de perseguição para celular deitado (webapp instalável, funciona offline). Uma viatura persegue um ladrão numa avenida com tráfego, curvas, quebra-molas e caixas de itens. Você escolhe o lado e o computador joga com o outro.

## Como se joga

- O carro acelera sozinho: troque de faixa com ◀ ▶, freie quando precisar e atire.
- Pegue só as caixas da sua cor (azul é da polícia, vermelha é do ladrão). A do adversário tira vida.
- A caixa amarela "?" gira uma roleta: um item bom do seu lado ou um efeito ruim.
- **Perseguição:** a polícia vence destruindo o ladrão; o ladrão vence aguentando 1:30 ou destruindo a viatura.
- **Sobrevivência:** sem relógio e com mais vida; o caos sobe com o tempo (mais tráfego, mais dano, obras na pista).
- Três dificuldades (Fácil, Médio, Difícil), com ranking local por modo e dificuldade.

Itens: tiros, bombas, óleo, miguelito e fumaça do ladrão; bloqueio, nitro, metralhadora, reforço e helicóptero da polícia. A tela "Como jogar" dentro do jogo explica cada um.

### Teclado (desktop)

| Tecla | Ação |
|---|---|
| ← → ou A D | trocar de faixa |
| ↓ ou S | frear |
| Espaço | atirar |
| B | especial (bomba, óleo, bloqueio, nitro...) |
| Esc | pausar |
| M | som liga/desliga |

## Progresso, loja e carreira

- Cada partida paga moedas (tempo, dano, caixas, vitória; o Difícil paga mais).
- **Loja:** carros novos para cada lado, pinturas e acabamentos, adesivos, rodas, neon, fumaça colorida, acessórios do ladrão (aerofólio, rack, antena, escapamento com chama), sirenes e buzinas, e placa personalizada. Os itens são desbloqueados na Carreira (patentes, conquistas e maestria de cada carro) e depois comprados.
- **Carreira:** 3 desafios por dia (sorteados entre 21, sem repetir o do dia anterior), conquistas, patentes por lado (Recruta a Delegado, Pivete a Chefão) e sequência de dias. Recompensas são resgatadas na tela da Carreira.
- **Conta (V3):** entrar com o Google é obrigatório. O progresso fica no aparelho e na conta (sobe sozinho depois de cada mudança; sem internet, sobe quando a conexão voltar) e vai junto para outro celular. O nome de usuário (único) é o que aparece no ranking.
- **Ranking global:** cada vitória (e o tempo vivo do ladrão na Sobrevivência) entra sozinha no global, com o nome de usuário; o ranking do aparelho continua com a placa de iniciais. O global mostra o top 100 de cada quadro (modo, lado e dificuldade), com o melhor de cada jogador, o carro e a patente; a sua posição aparece embaixo quando está fora do top. O servidor guarda como suspeito, e não mostra, o resultado que não pode ser de uma partida de verdade.
- No Perfil (botão do canto da tela inicial): trocar o nome, Sair e **Excluir minha conta**. A exclusão também pode ser feita na web, em `/excluir-conta`. Política de privacidade em `/privacidade` e termos em `/termos`.

## Tecnologia

TypeScript, Vite, Three.js (3D low-poly, qualidade automática), Web Audio (sons e música sintetizados, sem arquivos de áudio), Vitest com jsdom, Playwright e pnpm. Deploy na Vercel.

A simulação (`src/sim`) é determinística a 60 Hz e não conhece Three.js, DOM nem a loja; os números de balanceamento ficam em `src/config/balance.ts`.

| Pasta | O que tem |
|---|---|
| `src/sim` | regras do jogo: carros, IA, itens, colisões, tráfego, modos |
| `src/render` | cena 3D, modelos dos carros, efeitos, retrovisor |
| `src/audio` | sintetizador, efeitos, sirenes e música |
| `src/ui` | telas (título, escolha, fim, ranking, loja, carreira) e HUD |
| `src/meta` | moedas, perfil, loja, carreira, nome de usuário e junção de perfis |
| `src/account` | conta no jogo: API, servidor falso do localhost, telas de entrada e sincronização |
| `src/storage` | ranking e preferências salvas no aparelho |
| `src/pwa` | service worker e cache offline |
| `api` | funções da Vercel: conta (login com Google, sessão, nome, progresso, excluir) |
| `tests`, `e2e` | testes unitários (Vitest) e de navegador (Playwright) |
| `docs/superpowers/specs` | specs de cada parte |

## Rodando localmente

Requer Node 22.12 ou mais novo e pnpm 12.

```
pnpm install
pnpm dev          # servidor de desenvolvimento
pnpm test         # testes unitários
pnpm typecheck
pnpm lint         # Prettier + ESLint
pnpm e2e          # testes no navegador (1a vez: pnpm exec playwright install chromium)
pnpm build        # gera dist/
```

### Parâmetros de URL úteis

| Parâmetro | Efeito |
|---|---|
| `?debug` | expõe `window.__game` e desliga o service worker |
| `?role=thief` | começa direto uma partida como ladrão (`police` é o padrão) |
| `?seed=N` | partida com semente fixa (reproduzível) |
| `?quality=low`, `medium` ou `high` | força a qualidade gráfica |
| `?mute` | começa sem som |
| `?curves=0` | pista reta |
| `?login` | (localhost) começa sem login, para testar as telas de entrada |
| `?realapi` | (localhost) usa o servidor de verdade em vez do falso |

Só com `?debug`: `traffic=0` (sem tráfego), `escape=N` (fuga em N segundos), `mode=survival`, `mystery=0..1` (fração de caixas amarelas), `give=item1,item2` (itens no início). Com `?app` o jogo abre pelas telas normais mesmo com esses parâmetros.

### Conta no localhost

Em `localhost` o jogo usa um servidor de conta falso (`src/account/devApi.ts`), guardado no próprio navegador: já entra numa "Conta de Teste" com o nome `Teste`, sem Google e sem banco. Com `?login` ele começa sem login, com o botão "Entrar (conta de teste)". Os testes e2e usam esse servidor.

Os testes do servidor (`tests/api`) rodam num Postgres em memória (PGlite). Em produção, as funções em `api/` precisam das variáveis `DATABASE_URL` (Neon), `GOOGLE_CLIENT_ID`, `SESSION_SECRET` e `ADMIN_EMAIL` na Vercel; sem elas, as rotas respondem 503. Passo a passo em [docs/conta-setup.md](docs/conta-setup.md).

### App Android (Google Play)

O app da Play é um TWA que abre o site em tela cheia. O pacote sai de `scripts/android-build.ps1` (Bubblewrap), a partir de `android/twa-manifest.json`; as imagens da loja ficam em `store/`. O passo a passo da conta, da ficha, dos formulários e do teste fechado está em [docs/play-store.md](docs/play-store.md).

### Painel /admin

`/admin` mostra contas criadas, jogadores ativos, retenção, partidas por modo, lado e dificuldade, vitórias, carros e itens mais usados e comprados, duração das partidas e versões em uso, com filtro de 7, 30 ou 90 dias. Só abre para a conta admin; os números vêm dos eventos de uso que o jogo manda (`api/_lib/events.ts`). No localhost a página mostra números de exemplo.

### Modo admin (testes)

A conta Google `diogotocci@gmail.com` entra sempre em modo admin: a loja fica toda liberada e grátis (o que for pego fica no perfil). Quem decide é o servidor, pelo e-mail que o Google confirmou (`api/_lib/users.ts`); não há senha nem botão, e nenhuma outra conta vira admin.

## Contribuindo

Regras do projeto e dos agentes de código em [AGENTS.md](AGENTS.md). Código, comentários, commits e PRs em inglês; textos do jogo e specs em português. Cada PR termina com o commit `chore(release): x.y.z`.
