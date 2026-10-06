# <One line: what this branch does>. Validates, refreshes the Graphify graph, commits, pushes and opens the PR.
# Run with:  powershell -ExecutionPolicy Bypass -File .\scratch\<NN>-<slug>.ps1
$ErrorActionPreference = "Stop"
Set-Location C:\dev\policia-ladrao
function Check($step) { if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: $step failed. Nothing was pushed. Send me the output." -ForegroundColor Red; exit 1 } }

# pnpm 12 (local install when available, otherwise npx)
$pnpmExe = (Get-Command pnpm.exe, pnpm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1).Source
$pnpmMajor = 0
if ($pnpmExe) { try { $pnpmMajor = [int]((& $pnpmExe --version) -split '\.')[0] } catch { $pnpmMajor = 0 } }
function P { if ($pnpmMajor -ge 12) { & $pnpmExe @args } else { & npx.cmd --yes pnpm@12.8.1 @args } }

# Leftovers from an interrupted run
if (Test-Path .git\index.lock) { Remove-Item .git\index.lock -Force }
if (Test-Path .git\objects\maintenance.lock) { Remove-Item .git\objects\maintenance.lock -Force }
Get-ChildItem .git\objects -Recurse -Filter 'tmp_obj_*' -ErrorAction SilentlyContinue | Remove-Item -Force
if (Test-Path .git\rebase-merge) { git rebase --abort }
if (Test-Path .git\rebase-apply) { git am --abort }
if (Test-Path .git\CHERRY_PICK_HEAD) { git cherry-pick --abort }

$branch = "<branch>"
$slug = "<NN>-<slug>"

# ===== Mode A: patches (the agent worked in its own clone and left scratch\<NN>-<slug>\*.patch) =====
# Delete this block when using mode B.
git stash push --include-untracked -m $slug; Check 'stash local work'
git fetch origin; Check 'fetch'
git switch -C $branch origin/main; Check 'create branch'
git am -3 (Get-ChildItem ".\scratch\$slug\*.patch" | Sort-Object Name | ForEach-Object { $_.FullName }); Check 'apply patches'
# local work stays in the stash (git stash list); nothing is lost

# ===== Mode B: working tree (the agent edited this folder directly) =====
# Delete this block when using mode A.
git stash push --include-untracked -m $slug; Check 'stash local work'
git fetch origin; Check 'fetch'
git switch -C $branch origin/main; Check 'create branch'
git checkout 'stash@{0}' -- .; Check 'restore modified files'
$newFiles = $null
try { $newFiles = git ls-tree -r --name-only 'stash@{0}^3' 2>$null } catch { $newFiles = $null }
if ($newFiles) { git checkout 'stash@{0}^3' -- .; Check 'restore new files' }
$global:LASTEXITCODE = 0
git reset -q; Check 'reset index'
git stash drop; Check 'drop stash'

# ===== Validation (only scripts that exist in package.json) =====
P install --frozen-lockfile; Check 'pnpm install'
P typecheck; Check 'typecheck'
P lint; Check 'lint'
P test; Check 'unit tests'
P exec playwright install chromium; Check 'install Playwright chromium'
P e2e; Check 'e2e tests'
P build; Check 'build'

# ===== Graphify refresh (rules: .agents/rules/graphify.md) =====
if (-not (Get-Command graphify -ErrorAction SilentlyContinue)) {
  Write-Host "INFO graphify not found, installing graphifyy 0.9.77"
  if (Get-Command uv -ErrorAction SilentlyContinue) { uv tool install graphifyy==0.9.77 }
  elseif (Get-Command pipx -ErrorAction SilentlyContinue) { pipx install graphifyy==0.9.77 }
  else { py -m pip install --user graphifyy==0.9.77 }
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
}
if (-not (Get-Command graphify -ErrorAction SilentlyContinue)) { Write-Host "GRAPHIFY_UPDATE_FAILED: graphify is not installed (install uv or pipx, then rerun)." -ForegroundColor Red; exit 1 }
graphify update .
if ($LASTEXITCODE -ne 0) { Write-Host "GRAPHIFY_UPDATE_FAILED: graphify update returned $LASTEXITCODE. Nothing was pushed." -ForegroundColor Red; exit 1 }

# ===== Commits =====
# Mode A: the patches are the commits. A changed graph is folded into the last one.
$graphChanged = git status --porcelain -- graphify-out
if ($graphChanged) { git add -- graphify-out/graph.json graphify-out/GRAPH_REPORT.md; Check 'add graph'; git commit --amend --no-edit; Check 'amend graph' }
# Mode B: one commit per plan checkpoint, explicit paths; the graph goes with the last source commit.
# git add -- <path1> <path2>; Check 'add <step>'
# git commit -m "<type(scope): message>"; Check 'commit <step>'
# git add -- <last paths> graphify-out/graph.json graphify-out/GRAPH_REPORT.md; Check 'add <last step>'
# git commit -m "<type(scope): message>"; Check 'commit <last step>'

$left = git status --porcelain -- src tests e2e docs public scripts eslint-rules .agents graphify-out index.html package.json pnpm-lock.yaml vite.config.ts vercel.json
if ($left) { Write-Host "STOPPED: files left out of the commits:`n$left" -ForegroundColor Red; exit 1 }

git push -u origin $branch; Check 'push'
gh pr create --base main --head $branch --title "<type(scope): title>" --body "<What changes for players and developers, and how it was validated.>"; Check 'open PR'

Write-Host ""
Write-Host "SUCCESS PR opened" -ForegroundColor Green
