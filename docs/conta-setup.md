# Conta (V3): configurar o login com Google e o banco

Passo a passo para ligar a conta em produção (spec V3 Parte 1, §9). Sem estas variáveis, as rotas `/api/*` da conta respondem 503 e o jogo mostra "Conecte-se para entrar pela primeira vez".

## 1. Banco no Neon

1. Em <https://neon.tech>, crie uma conta e um projeto (região mais próxima: `AWS São Paulo (sa-east-1)`, se aparecer; senão `US East`).
2. Em **Connection details**, copie a *connection string* com `?sslmode=require` (começa com `postgresql://`).
3. As tabelas são criadas sozinhas na primeira requisição. Não precisa rodar nada.

Dá também para criar pelo painel da Vercel: **Storage → Create Database → Neon**. Assim a `DATABASE_URL` já entra nas variáveis do projeto.

## 2. Client ID do Google

1. Em <https://console.cloud.google.com>, crie um projeto "Polícia × Ladrão".
2. **APIs e serviços → Tela de permissão OAuth**:
   - tipo **Externo**;
   - nome do app, e-mail de suporte, logo (opcional);
   - links da política de privacidade (`https://<domínio>/privacidade`) e dos termos (`https://<domínio>/termos`);
   - escopos: só os básicos (`openid`, `email`, `profile`).
   - Publique o app (**Publicar app**). Com esses escopos não precisa de verificação do Google.
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - tipo **Aplicativo da Web**;
   - **Origens JavaScript autorizadas:** `https://<domínio do jogo>`. Coloque também o domínio próprio, se tiver. Os previews da Vercel (`*-git-*.vercel.app`) não funcionam, porque o Google não aceita curinga; teste no domínio de produção.
   - URIs de redirecionamento: deixe vazio.
4. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).

## 3. Variáveis na Vercel

Em **Settings → Environment Variables**, no ambiente *Production*:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Neon |
| `GOOGLE_CLIENT_ID` | o ID do cliente do passo 2 |
| `SESSION_SECRET` | um texto aleatório longo (veja abaixo) |

Para gerar o `SESSION_SECRET` no PowerShell:

```
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Trocar o `SESSION_SECRET` desconecta todo mundo (cada um entra de novo com o Google; o progresso fica).

Depois de salvar as variáveis, faça um **Redeploy** do último deploy de produção.

## 4. Conferir

1. Abra `https://<domínio>/api/config`. Deve mostrar o seu Client ID.
2. Abra o jogo, entre com o Google, escolha o nome de usuário e jogue uma partida.
3. No Neon, em **Tables**, `users` e `profiles` devem ter uma linha cada.
4. Abra `https://<domínio>/excluir-conta` em outro navegador: o login funciona (não precisa excluir).

## Testando no computador

`pnpm dev` e o preview usam um servidor de conta falso, sem Google e sem banco (veja o README). Para testar contra as funções de verdade, use `vercel dev` com as variáveis puxadas por `vercel env pull` e abra o jogo com `?realapi`. Para isso, `http://localhost:3000` precisa estar nas origens autorizadas do Client ID.
