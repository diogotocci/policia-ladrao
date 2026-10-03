# AGENTS.md — policia-ladrao

Jogo mobile (webapp/PWA) feito do zero. Este arquivo é lido automaticamente por Claude Code (via `CLAUDE.md`), Codex, Cursor, Gemini CLI, Copilot e outros agentes. **As regras daqui têm precedência sobre as skills.**

## 1. Skills — use sem esperar o usuário pedir

As skills ficam em `.agents/skills/<nome>/SKILL.md` (fonte da verdade) e são espelhadas em `.claude/skills/` para o Claude Code.
Antes de responder ou agir, verifique a tabela abaixo. Se houver ~1% de chance de uma skill se aplicar, **leia o SKILL.md e siga-o**, anunciando "Usando <skill> para <objetivo>".
Skills de processo vêm primeiro (definem o como); skills de implementação vêm depois.

| Situação | Skill |
|---|---|
| Nova ideia, feature, mecânica, tela ou mudança de comportamento | `brainstorming` → depois `writing-plans` |
| Escolher stack/engine, arquitetura do jogo, loop, input, save, performance | `game-studio` (roteador) → `web-game-foundations` |
| Render 3D: cena, câmeras, materiais, iluminação, performance WebGL (Three.js) | `three-webgl-game` |
| HUD, menus, overlays, telas de pause/game over, layout responsivo no celular | `game-ui-frontend` + `frontend-design` |
| Revisar UI/UX/acessibilidade de qualquer tela | `web-design-guidelines` |
| Executar um plano já escrito | `subagent-driven-development` (preferido) ou `executing-plans` |
| 2+ tarefas independentes | `dispatching-parallel-agents` |
| Escrever qualquer código de lógica (regras, IA dos NPCs, pontuação, colisão) | `test-driven-development` |
| Bug, teste falhando, comportamento estranho | `systematic-debugging` |
| Testar o jogo no navegador, screenshots, viewport mobile, smoke test | `game-playtest` + `playwright-cli` |
| Antes de dizer "pronto", "funciona", "passou" | `verification-before-completion` |
| Terminou uma tarefa/feature, quer revisão | `requesting-code-review`; ao receber feedback: `receiving-code-review` |
| **Qualquer commit, push, branch, PR ou merge** | **`ship-via-script`** (obrigatório — ver seção 2) |
| Usuário diz "grill me" / quer estressar uma ideia | `grill-me` |
| Usuário quer passar o trabalho para outra sessão | `handoff` |
| Precisa de uma capacidade que nenhuma skill cobre | `find-skills` |

### Mapeamento de nomes (skills do Superpowers)
- `superpowers:<nome>` = `.agents/skills/<nome>`.
- `superpowers:finishing-a-development-branch` → **use `ship-via-script`**.
- `superpowers:using-git-worktrees` → não usado; trabalhe na pasta do projeto.
- Os passos `git commit` que aparecem em planos (`writing-plans`) e nas skills de execução **não são executados pelo agente**: viram checkpoints acumulados no próximo script de ship.

## 2. Git: o agente nunca commita, faz push nem abre PR

O usuário executa tudo de git que altera histórico/remoto por um script PowerShell no terminal dele.
- **Proibido** ao agente: `git commit`, `git push`, `git merge`, `git rebase`, `git am`, `gh pr create/merge`, criar/trocar branch.
- **Permitido**: `git status`, `git diff`, `git log`, `git show`, `git format-patch` (para gerar patch).
- Quando houver algo para commitar/abrir PR: siga `.agents/skills/ship-via-script/SKILL.md`, gere `scratch/NN-<slug>.ps1` e entregue ao usuário o comando:
  `powershell -ExecutionPolicy Bypass -File .\scratch\NN-<slug>.ps1`

## 3. Projeto
- Repositório: `https://github.com/diogotocci/policia-ladrao` · branch padrão: `main` · pasta local: `C:\dev\policia-ladrao` (Windows).
- Stack: TypeScript + Vite + Three.js (3D low-poly estilizado, qualidade automática), Vitest (+ jsdom), Playwright, pnpm. Spec: `docs/superpowers/specs/2026-10-03-policia-ladrao-design.md`.
- Comandos: `pnpm install` · `pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm build` · `pnpm e2e` (1ª vez: `pnpm exec playwright install chromium`).
- `src/sim/**` é TypeScript puro (sem `three`, DOM ou `window`); números de jogo só em `src/config/balance.ts`.
- Mobile first: toque, retrato/paisagem, safe areas, 60 fps em celular médio.
- Idioma: conversas e docs em português; código, commits e PRs em inglês (Conventional Commits).

## 4. Manutenção das skills
- Atualizar as de terceiros: `npx skills update` e depois `node scripts/sync-skills.mjs`.
- Adicionar: `npx skills add <owner/repo> -s <skill> -a universal --copy -y` e depois `node scripts/sync-skills.mjs`.
- Skills vendorizadas manualmente (não rastreadas pelo `skills-lock.json`): ver `.agents/VENDORED.md`.
