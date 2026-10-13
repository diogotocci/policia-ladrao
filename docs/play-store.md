# Google Play: do pacote à loja

Passo a passo da V3 Parte 1, entrega 4 (spec `docs/superpowers/specs/2026-10-12-v3-parte1-conta-play-design.md`, §2, §7 a §9).

O app da Play é um **TWA** (Trusted Web Activity): um app Android que abre `https://policia-ladrao.xyz` em tela cheia, sem barra de navegador. Cada deploy na Vercel atualiza o jogo dentro do app. Um pacote novo só é necessário quando muda algo do próprio pacote: ícone, nome, versão do Android ou o ID.

| | |
|---|---|
| ID do pacote | `br.com.diogotocci.policialadrao` (não muda depois de publicado) |
| Configuração | `android/twa-manifest.json` |
| Script do pacote | `scripts/android-build.ps1` (Bubblewrap 1.27, API alvo 36, mínima 24 = Android 7) |
| Imagens da loja | `store/` |

## 1. Conta de desenvolvedor

1. Em <https://play.google.com/console>, crie a conta **pessoal**. A taxa é US$ 25, paga uma vez.
2. Faça a verificação de identidade com documento e a confirmação do celular. Pode levar alguns dias.
3. Em conta pessoal criada depois de novembro de 2023, a produção só libera depois de um **teste fechado com pelo menos 12 testadores, inscritos por 14 dias seguidos** (seção 7).

## 2. Criar o app no Play Console

**Todos os apps → Criar app**:

- Nome: `Polícia × Ladrão`
- Idioma padrão: Português (Brasil)
- App ou jogo: **Jogo**
- Gratuito ou pago: **Gratuito**
- Aceite as declarações (políticas do programa e leis de exportação dos EUA).

## 3. Gerar o pacote (.aab)

No Windows, na pasta do repositório:

```
powershell -ExecutionPolicy Bypass -File .\scripts\android-build.ps1 -VersionCode 1
```

- **Primeira vez:** o Bubblewrap pergunta se pode instalar o JDK 17 e o SDK do Android. Responda **Yes** e aceite a licença.
- **Chave de envio:** o script cria a chave em `android\upload-key.keystore` e pede uma senha.
  - Use só letras e números na senha: o Bubblewrap se perde com aspas, `%`, `&` e outros símbolos.
  - Guarde a senha e uma cópia do arquivo num lugar seguro, como o gerenciador de senhas e um backup.
  - A chave nunca vai para o git.
  - Se perder, dá para pedir a troca da chave de envio no Play Console, mas demora.
- **Saída:**
  - `android\out\policia-ladrao-<versão>-<código>.aab` vai para a Play.
  - O `.apk` serve para instalar direto num celular pelo cabo.
- **Impressão SHA-256:** o script mostra a da chave de envio. Ela entra no passo 5.
- **`-VersionCode`:** precisa crescer a cada envio para a Play (1, 2, 3…). O nome da versão segue o `package.json`.

## 4. Teste interno (o primeiro envio)

1. **Testar → Teste interno → Criar versão**.
2. Na primeira vez, aceite o **Play App Signing** (assinatura de apps do Google Play). O Google guarda a chave que assina o app de verdade.
3. Envie o `.aab`, dê um nome à versão (por exemplo `0.29.0 (1)`) e publique para os testadores internos (o seu e-mail).

## 5. Ligar o app ao site (`assetlinks.json`)

Sem isso o app abre com a barra do navegador em cima.

1. **Configuração → Integridade do app → Assinatura de apps**: copie o **SHA-256 da chave de assinatura do app**.
2. Na Vercel, em **Settings → Environment Variables**, crie a variável `ANDROID_SHA256_FINGERPRINTS` em **Production**, com as duas impressões separadas por vírgula. A primeira é a da Play; a segunda é a da chave de envio, que permite testar o `.apk` pelo cabo.
   ```
   AA:BB:...:FF,11:22:...:99
   ```
3. Faça o **Redeploy** e confira se `https://policia-ladrao.xyz/.well-known/assetlinks.json` mostra as duas impressões.
4. Para validar, use a [ferramenta do Google](https://developers.google.com/digital-asset-links/tools/generator): hospedagem `policia-ladrao.xyz`, pacote `br.com.diogotocci.policialadrao` e a impressão da Play.
5. Desinstale e instale de novo o app pelo link do teste interno. Ele deve abrir sem barra.

Confira também, no app de teste:

- **Entrar com Google:** o botão abre a escolha da conta e volta para o jogo.
- **Paisagem e tela cheia:** o jogo abre deitado e ocupa a tela toda.
- **Botão voltar do Android:** durante a partida, ele pausa.
- **Excluir conta:** funciona dentro do app.

## 6. Ficha da loja e Conteúdo do app

### Ficha principal da loja (**Expandir → Ficha principal**)

- **Nome do app (até 30):** `Polícia × Ladrão`
- **Descrição curta (até 80):** `Perseguição de carros na cidade: prenda o ladrão ou fuja da polícia em 1:30.`
- **Descrição completa:**

```
Polícia × Ladrão é uma perseguição de carros em 3D pela cidade. Escolha um lado e jogue contra o computador:

• Polícia: alcance o ladrão, atire e prenda antes que ele fuja.
• Ladrão: aguente 1 minuto e 30 segundos de perseguição e suma no horizonte, ou destrua a viatura.

Dois modos: Perseguição, com o relógio da fuga, e Sobrevivência, sem relógio, com o caos subindo até alguém cair. Três dificuldades, do Fácil ao Difícil, que paga mais moedas.

Pegue as caixas no caminho para ganhar tiro mais forte, nitro, bomba, óleo na pista, bloqueio policial, helicóptero e outros especiais.

Ganhe moedas em cada partida e monte a sua garagem: viaturas, Rocam, Camburão, Rodoviária PRF, Caveirão, esportivo, Kombi, Fusca envenenado, carro-forte e mais, com pinturas, adesivos, rodas, neon, fumaça colorida, sirenes e placa personalizada.

Na Carreira: desafios do dia, conquistas, patentes de Recruta a Delegado e de Pivete a Chefão, maestria de cada carro e sequência de dias.

Ranking global com o seu nome de usuário, por modo, lado e dificuldade, e o ranking do aparelho com a placa de iniciais.

Seu progresso fica salvo na sua conta Google e vai com você para outro celular. Funciona sem internet depois do primeiro login.

Sem anúncios e sem compras com dinheiro.
```

- **Ícone:** `store/icone-512.png`
- **Recurso gráfico:** `store/destaque-1024x500.jpg`
- **Capturas de tela do telefone:** as 6 de `store/capturas/`, em 1920×1080, paisagem. Vale trocar por capturas tiradas no seu celular quando o app estiver no teste interno.
- **Categoria:** Jogos → **Corrida**. Tags: corrida, ação, carros.
- **E-mail de contato:** `diogotocci@gmail.com`. Site: `https://policia-ladrao.xyz`.

### Conteúdo do app (**Política → Conteúdo do app**)

| Item | Resposta |
|---|---|
| Política de privacidade | `https://policia-ladrao.xyz/privacidade` |
| Acesso ao app | "Todas ou algumas funcionalidades são restritas": **login com Google obrigatório; qualquer conta Google entra**. Instrução para os revisores: "Toque em Fazer login com o Google, use qualquer conta Google e escolha um nome de usuário." |
| Anúncios | Não contém anúncios |
| Conteúdo gerado pelo usuário | Só o nome de usuário, visível no ranking. Ele passa por um filtro de palavrões ao ser escolhido, e cada linha do Ranking Global tem uma bandeira para denunciar o nome (com confirmação; a denúncia fica salva para revisão); os termos dizem que nomes ofensivos podem ser trocados ou removidos. |
| Classificação do conteúdo (IARC) | Categoria Jogo. Violência: **sim, violência de desenho/fantasia** (carros batendo e tiros em carros, sem pessoas feridas, sem sangue). Medo, sexo, linguagem, drogas, jogos de azar: não. Interação entre usuários: **não há chat**; os usuários veem o nome de usuário dos outros no ranking. Compartilha localização: não. Compras digitais: não. |
| Público-alvo | **13 a 15, 16 a 17 e 18+** (não marque menores de 13: o app fica fora do programa Família). O app não é feito para crianças. |
| App de notícias | Não |
| Apps de saúde, financeiros, governamentais | Não |
| Exclusão de conta | URL: `https://policia-ladrao.xyz/excluir-conta`. Os dados apagados e o que fica (estatísticas sem vínculo) estão na política. |

### Segurança dos dados (**Conteúdo do app → Segurança dos dados**)

- **O app coleta ou compartilha dados do usuário?** Sim.
- **Os dados são criptografados em trânsito?** Sim.
- **Os usuários podem pedir a exclusão?** Sim, no app e no link de exclusão de conta.
- **Dados coletados** (todos **coletados, não compartilhados**; ficam guardados nos servidores do jogo, então a resposta para "processados de forma efêmera" é **Não**; nenhum é opcional, porque a conta é obrigatória):

| Tipo | Dado | Para quê |
|---|---|---|
| Informações pessoais | Nome | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais | Endereço de e-mail | Gerenciamento da conta |
| Informações pessoais | IDs do usuário (conta e nome de usuário) | Funcionalidade do app, Gerenciamento da conta |
| Atividade no app | Interações com o app (partidas, compras com moedas do jogo, resgates, denúncias de nomes) | Funcionalidade do app (progresso e ranking), Estatísticas |
| Atividade no app | Outro conteúdo gerado pelo usuário (nome de usuário e recordes no ranking) | Funcionalidade do app |
| Informações e desempenho do app | Diagnóstico: não. Outros: versão do app | Estatísticas |

- **Não coletados:** localização, informações financeiras, saúde, mensagens, fotos e vídeos (a foto do perfil do Google não é guardada), arquivos, agenda, contatos, histórico de navegação, IDs de dispositivo e de publicidade.

## 7. Teste fechado (12 testadores × 14 dias)

1. **Testar → Teste fechado → Criar faixa** (por exemplo "Amigos").
2. **Testadores:** crie uma lista de e-mails (as contas Google de quem vai testar) ou use um Grupo do Google. São pelo menos 12 pessoas.
3. Envie a mesma versão do teste interno para essa faixa e mande o **link de inscrição** para os testadores. Cada um precisa aceitar pelo link e instalar o app pela Play.
4. Os 12 precisam ficar inscritos por **14 dias seguidos**. Peça que joguem de vez em quando: o Google olha se o app foi usado.
5. Depois dos 14 dias, o Painel mostra **Solicitar acesso à produção**. Responda o questionário sobre o teste: o que os testadores acharam e o que mudou.
6. Com o acesso liberado: **Produção → Criar versão**, com o mesmo `.aab` ou um novo com `-VersionCode` maior, países (Brasil, ou todos) e enviar para revisão. A primeira revisão costuma levar de alguns dias a uma semana.

## 8. Depois de publicado

- **O jogo atualiza sozinho:** as mudanças no site (mergeadas na `main`) chegam ao app sem passar pela Play.
- **Pacote novo, só quando muda o pacote** (ícone, nome, cores do `twa-manifest.json`, versão do Android exigida pela Play): rode o script com o próximo `-VersionCode` e envie para a faixa de produção.
- **Todo ano a Play sobe a API alvo** (em 2026 é a 36). Quando o Bubblewrap lançar a versão nova, troque a versão no script; ele já confere se o pacote mira pelo menos a 36.
- **O `.vercel.app` antigo:** deixe redirecionando para `policia-ladrao.xyz` só depois que os jogadores do endereço antigo tiverem entrado pelo menos uma vez (o progresso local fica preso ao endereço).
