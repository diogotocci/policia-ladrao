---
name: ship-via-script
description: Use whenever work needs to be committed, pushed, put on a branch, opened as a PR or merged — including when another skill (writing-plans, executing-plans, subagent-driven-development, finishing-a-development-branch) says to commit. The agent never runs git commit/push or gh pr itself; it writes scratch/NN-<slug>.ps1 for the user to run in PowerShell.
---

# Ship via script

O usuário executa no Windows (PowerShell) tudo que mexe em histórico ou remoto. Você prepara o script; ele roda.

## Quando
- Uma tarefa, feature ou correção terminou e passou em `verification-before-completion`.
- Qualquer skill mandar "commit", "push", "open a PR", "finish the branch".
- O usuário pedir commit/PR/branch.

Nunca execute `git commit`, `git push`, `git merge`, `git rebase`, `git am`, `git checkout -b/switch`, `gh pr create/merge`.

## Passos
1. `git status --porcelain` e `git diff --stat` para listar exatamente os arquivos da mudança. Não inclua lixo (builds, `scratch/`, arquivos de outra tarefa).
2. Descubra o próximo número: maior `NN` em `scratch/*.ps1` + 1 (comece em `01`, dois dígitos).
3. Escolha:
   - branch: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…` (kebab-case, inglês);
   - mensagem de commit em Conventional Commits, em inglês;
   - título e corpo da PR em inglês: o que muda para o jogador/dev, como foi validado.
4. Leia `package.json` (se existir) e coloque na validação **só** os scripts que existem (install, test, lint, typecheck, build, e2e). Se ainda não há `package.json`, omita a validação.
5. Copie `template.ps1` (nesta pasta) para `scratch/NN-<slug>.ps1` e preencha todos os `<...>`. Mantenha comentarios e mensagens em portugues, sem acentos (o PowerShell 5.1 le .ps1 sem BOM como ANSI).
6. Se você trabalhou fora da pasta do usuário (clone/sandbox), gere `scratch/<slug>.patch` com `git format-patch` e use o bloco "Modo patch" do template no lugar de `git add`/`git commit`.
7. Responda ao usuário com o resumo da mudança e o comando, exatamente assim:
   ```
   powershell -ExecutionPolicy Bypass -File .\scratch\NN-<slug>.ps1
   ```
8. Se ele mandar a saída de erro ("PAROU: …"), use `systematic-debugging`, corrija e gere um novo script (próximo número) — não edite o que falhou.

## Regras do script
- `$ErrorActionPreference = "Stop"`, `Set-Location C:\dev\policia-ladrao` e a função `Check` após cada comando nativo.
- Base sempre `origin/main`. Sempre `git fetch origin` antes.
- `git add` com caminhos explícitos, nunca `-A` às cegas.
- Validação **antes** do commit; se algo falhar, nada é enviado.
- Termina com `Write-Host "=== PR aberta ===" -ForegroundColor Green`.
