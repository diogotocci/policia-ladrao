# <Uma linha: o que esta branch faz>, valida e abre a PR.
# Rode com:  powershell -ExecutionPolicy Bypass -File .\scratch\<NN>-<slug>.ps1
$ErrorActionPreference = "Stop"
Set-Location C:\dev\policia-ladrao
function Check($what) { if ($LASTEXITCODE -ne 0) { Write-Host "PAROU: $what falhou. Nada foi enviado. Me mande a saida." -ForegroundColor Red; exit 1 } }

if (Test-Path .git\index.lock) { Remove-Item .git\index.lock -Force }
if (Test-Path .git\rebase-merge) { git rebase --abort }
if (Test-Path .git\rebase-apply) { git am --abort }

git fetch origin; Check 'fetch'
git switch -C <branch> origin/main; Check 'criar branch'

# --- Modo patch (so se o agente gerou scratch\<slug>.patch; senao apague este bloco) ---
# git am -3 .\scratch\<slug>.patch; Check 'git am'

# --- Validacao (apenas scripts que existem no package.json) ---
# pnpm install --frozen-lockfile; Check 'pnpm install'
# pnpm test; Check 'testes'
# pnpm lint; Check 'lint'
# pnpm build; Check 'build'

# --- Commit (modo working tree; apague se usou modo patch) ---
git add -- <caminho1> <caminho2>; Check 'git add'
git commit -m "<type(scope): message>"; Check 'commit'

git push -u origin <branch>; Check 'push'
gh pr create --base main --head <branch> --title "<type(scope): title>" --body "<O que muda e como foi validado.>"; Check 'abrir PR'

Write-Host ""
Write-Host "=== PR aberta ===" -ForegroundColor Green
