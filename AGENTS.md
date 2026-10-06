# AGENTS.md — policia-ladrao

Jogo mobile (webapp/PWA) feito do zero. Este arquivo é lido automaticamente por Claude Code (via `CLAUDE.md`), Codex, Cursor, Gemini CLI, Copilot e outros agentes. **As regras daqui têm precedência sobre as skills.**

## 1. Regras sempre ativas e skills — use sem esperar o usuário pedir

**Antes de qualquer tarefa, leia e siga todas as regras de `.agents/rules/*.md` com `trigger: always_on`** (o Claude Code recebe esse conteúdo automaticamente pelo hook de início de sessão; outros agentes devem lê-las):

- `workflow.md` — qual skill usar em cada situação (brainstorming, TDD, debugging, verificação, revisão, ship…), sem o usuário invocar;
- `coding-standards.md` — padrões de código (inglês no código, sem atribuição de IA, sem emojis em saída técnica, tipos, testes, lint);
- `minimal-code.md` — escrever o mínimo de código: reusar antes de criar;
- `graphify.md` — quando consultar o grafo do projeto e quando atualizá-lo.

As skills ficam em `.agents/skills/<nome>/SKILL.md` (fonte da verdade) e são espelhadas em `.claude/skills/` para o Claude Code. Se houver ~1% de chance de uma skill se aplicar, **leia o SKILL.md e siga-o**, anunciando "Usando <skill> para <objetivo>". Skills de processo vêm primeiro; skills de implementação depois.

### Mapeamento de nomes (skills do Superpowers)
- `superpowers:<nome>` = `.agents/skills/<nome>`.
- `superpowers:finishing-a-development-branch` → **use `ship-via-script`**.
- `superpowers:using-git-worktrees` → não usado; trabalhe na pasta do projeto.
- Os passos `git commit` que aparecem em planos (`writing-plans`) e nas skills de execução **não são executados pelo agente**: viram checkpoints acumulados no próximo script de ship.

## 2. Git: o agente nunca commita, faz push nem abre PR

O usuário executa tudo de git que altera histórico/remoto por um script PowerShell no terminal dele.
- **Proibido** ao agente: `git commit`, `git push`, `git merge`, `git rebase`, `git am`, `gh pr create/merge`, criar/trocar branch.
- **Permitido**: `git status`, `git diff`, `git log`, `git show`, `git format-patch` (para gerar patch).
- Commits e PRs nunca levam atribuição de IA (sem `Co-authored-by` de ferramenta, link de sessão ou rodapé "Generated with").
- Quando houver algo para commitar/abrir PR: siga `.agents/skills/ship-via-script/SKILL.md`, gere `scratch/NN-<slug>.ps1` e entregue ao usuário o comando:
  `powershell -ExecutionPolicy Bypass -File .\scratch\NN-<slug>.ps1`

## 3. Projeto
- Repositório: `https://github.com/diogotocci/policia-ladrao` · branch padrão: `main` · pasta local: `C:\dev\policia-ladrao` (Windows).
- Stack: TypeScript + Vite + Three.js (3D low-poly estilizado, qualidade automática), Vitest (+ jsdom), Playwright, pnpm. Spec: `docs/superpowers/specs/2026-10-03-policia-ladrao-design.md`.
- Comandos: `pnpm install` · `pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm lint` (Prettier + ESLint) · `pnpm lint:fix` · `pnpm lint:types` (opcional, só avisos) · `pnpm build` · `pnpm e2e` (1ª vez: `pnpm exec playwright install chromium`).
- TypeScript: o projeto compila com o TypeScript 7 (`typescript7`, binário `tsc`); o pacote `typescript` aponta para a API do TypeScript 6 só porque o typescript-eslint ainda não suporta o 7.
- Segurança de dependências: o Dependabot abre PR sozinho quando alguma lib tem vulnerabilidade conhecida (só correções de segurança, sem PRs de atualização de rotina); o CI do GitHub (`.github/workflows/ci.yml`) valida typecheck, lint, testes e build em toda PR.
- Grafo do projeto: `graphify update .` (instalar com `uv tool install graphifyy==0.9.77`); `graphify query "<pergunta>"` para descoberta. Ver `.agents/rules/graphify.md`.
- `src/sim/**` é TypeScript puro (sem `three`, DOM ou `window`); números de jogo só em `src/config/balance.ts`.
- Mobile first: toque, retrato/paisagem, safe areas, 60 fps em celular médio.
- Idioma: conversas, spec, planos, backlog e este arquivo em português; código, comentários, testes, scripts, mensagens técnicas, commits e PRs em inglês (Conventional Commits). Texto do jogo (UI) em português. Detalhes em `.agents/rules/coding-standards.md`.

## 4. Manutenção das skills
- Atualizar as de terceiros: `npx skills update` e depois `node scripts/sync-skills.mjs`.
- Adicionar: `npx skills add <owner/repo> -s <skill> -a universal --copy -y` e depois `node scripts/sync-skills.mjs`.
- Skills vendorizadas manualmente (não rastreadas pelo `skills-lock.json`): ver `.agents/VENDORED.md`.
