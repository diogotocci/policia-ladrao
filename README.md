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
- **Loja:** carros novos para cada lado, pinturas, neon, sirenes e buzinas, e placa personalizada. Os itens são desbloqueados na Carreira e depois comprados.
- **Carreira:** 3 desafios por dia (sorteados entre 21, sem repetir o do dia anterior), conquistas, patentes por lado (Recruta a Delegado, Pivete a Chefão) e sequência de dias. Recompensas são resgatadas na tela da Carreira.
- O progresso fica no aparelho. Em "Progresso" há um código de backup para levar para outro aparelho.

## Tecnologia

TypeScript, Vite, Three.js (3D low-poly, qualidade automática), Web Audio (sons e música sintetizados, sem arquivos de áudio), Vitest com jsdom, Playwright e pnpm. Deploy na Vercel.

A simulação (`src/sim`) é determinística a 60 Hz e não conhece Three.js, DOM nem a loja; os números de balanceamento ficam em `src/config/balance.ts`.

| Pasta | O que tem |
|---|---|
| `src/sim` | regras do jogo: carros, IA, itens, colisões, tráfego, modos |
| `src/render` | cena 3D, modelos dos carros, efeitos, retrovisor |
| `src/audio` | sintetizador, efeitos, sirenes e música |
| `src/ui` | telas (título, escolha, fim, ranking, loja, carreira) e HUD |
| `src/meta` | moedas, perfil, backup, loja e carreira |
| `src/storage` | ranking e preferências salvas no aparelho |
| `src/pwa` | service worker e cache offline |
| `api` | função da Vercel que confere a senha do modo admin |
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

Só com `?debug`: `traffic=0` (sem tráfego), `escape=N` (fuga em N segundos), `mode=survival`, `mystery=0..1` (fração de caixas amarelas), `give=item1,item2` (itens no início). Com `?app` o jogo abre pelas telas normais mesmo com esses parâmetros.

### Modo admin (testes)

Em "Progresso" há o botão **Admin**: com a senha, a loja fica toda liberada e grátis (o que for pego fica no perfil). A senha é só a variável de ambiente `ADMIN_PASSWORD` na Vercel (Settings → Environment Variables); a função `api/admin.ts` confere no servidor, e a senha nunca entra no código do jogo. Sem a variável, ou fora da Vercel (`pnpm dev`), o admin não liga.

## Contribuindo

Regras do projeto e dos agentes de código em [AGENTS.md](AGENTS.md). Código, comentários, commits e PRs em inglês; textos do jogo e specs em português. Cada PR termina com o commit `chore(release): x.y.z`.
