# Desempenho no celular

Como o jogo se ajusta a celulares mais fracos sem mudar a interface (0.32, depois do teste num Realme C61: Unisoc T612, GPU Mali-G57 MP1, tela de 90 Hz).

## Níveis de qualidade

| Nível | Densidade de pixels | Sombras | Antisserrilhado (MSAA) |
|---|---|---|---|
| `high` | até 2 | 2048 | sim |
| `medium` | até 1,5 | 1024 | sim |
| `low` | 1 | não | não |
| `lowest` | 0,75 (o navegador amplia) | não | não |

- **Durante a partida:** se a média fica abaixo de 45 fps por 3 s, o jogo desce um nível (`src/render/renderer.ts`). Nunca sobe sozinho dentro da partida.
- **Entre partidas:** o nível em que o aparelho parou fica salvo (`pl.quality.v1`) e a próxima partida já começa nele. Antes, toda partida começava em `high` e levava uns 9 s gaguejando até chegar em `low`.
- **Primeira vez:** celular (tela de toque) começa em `medium`; computador, em `high`.
- **Nova tentativa:** a cada 5 partidas num nível salvo, uma começa um nível acima. Se ela aguenta 1 minuto sem descer, esse nível passa a ser o salvo. Assim uma partida ruim (celular quente, download em segundo plano) não deixa a imagem baixa para sempre.
- O MSAA é escolhido quando o contexto WebGL é criado: uma partida que começa em `low` ou `lowest` desenha sem ele.

## Sem travadas no meio da partida

- **Shaders compilados antes:** na contagem 3-2-1, todos os materiais da cena (inclusive os escondidos: explosões, caixas, helicóptero) e o retrovisor são compilados (`src/render/warmup.ts`). Antes, cada efeito novo compilava o shader na primeira vez que aparecia, uma travada de 100 a 300 ms no celular. Medido: de 6 compilações em 46 s de jogo para nenhuma.
- **Sem leitura do log dos shaders em produção** (`checkShaderErrors`), que esperava cada compilação terminar na linha principal. Com `?debug` e nos testes continua ligado.
- **HUD:** só mexe na página quando um valor muda (tempo, vida, distância). Medido: cerca de 40% menos trabalho de layout e estilo por quadro.

## Tela "Preparando a partida…"

Entre a escolha do lado e o 3-2-1 (mockup aprovado em 16/10/2026, 0.33). A partida é montada atrás dela (`prepareMatch` em `src/render/warmup.ts`):

1. Todos os shaders compilam, inclusive o retrovisor.
2. Tudo é desenhado uma vez numa imagem escondida de 16×16, com os objetos escondidos visíveis e sem cortar o que está fora da câmera. Assim modelos e texturas já estão na placa de vídeo, e as sombras já compiladas, quando aparecem pela primeira vez.
3. Começa o 3-2-1.

- A barra acompanha a montagem; embaixo, uma dica do "Como jogar".
- Limite de 6 s: um celular que não termina joga mesmo assim, e o que faltou não é desenhado depois no meio da partida.
- Enquanto monta, a pista atrás é redesenhada só de vez em quando, para sobrar o celular para a montagem.
- Com `?debug` (testes) não há espera: os shaders compilam durante a contagem, como antes.
- Num navegador sem compilação paralela (`KHR_parallel_shader_compile`), a página fica parada com a tela de carregamento à vista até terminar.

## Telas de 90 e 120 Hz

Num celular de 90 Hz que não consegue desenhar todos os quadros, o jogo alternava quadros de 1 e 2 atualizações da tela (55, 70, 48 fps), o que parece engasgo. Agora (`src/render/pacer.ts`), se os quadros passam de 1,25 atualização em média, o jogo desenha a cada duas atualizações: 45 fps estáveis em 90 Hz, 60 em 120 Hz. A simulação tem passo fixo, então velocidades e tempos não mudam. Telas de 60 Hz e computadores ficam como estavam.

## Medir num celular

Abra `https://policia-ladrao.xyz/?fps` no Chrome do celular. Aparece no canto: fps, nível, chamadas de desenho, ½ quando o ritmo está pela metade, e o tamanho em pixels que está sendo desenhado. As regras da partida são as normais.
