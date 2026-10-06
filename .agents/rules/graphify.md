---
trigger: always_on
description: Graphify discovery and refresh governance for every change in this repository.
---

# Graphify

This project keeps a Graphify knowledge graph in `graphify-out/` (`graph.json` and `GRAPH_REPORT.md` are tracked; the cache, manifest, HTML view and machine-specific files are ignored). Graphify has two independent responsibilities, **discovery** and **refresh**. Evaluate them separately.

The graph is built by `graphify update .` with local parsing (TypeScript, JavaScript, JSON, PowerShell and the heading structure of Markdown): no API key, about 3 seconds. Deeper semantic extraction of documents needs a full `/graphify` run inside an agent session; it is optional.

## 1. Discovery

Use Graphify before deep source discovery when it is materially applicable.

- Applicable: cross-module changes, architecture questions, data-flow mapping ("what reads `heliUntil`?", "how does a shot reach the HUD?"), impact analysis before refactors.
- Not applicable (skipping is valid): single-file edits, CSS tweaks, balance-number changes, copy changes, documentation wording.
- When `graphify-out/graph.json` exists, first run `graphify query "<question>"`; use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough.
- Graphify never overrides raw source, Git history, executable tests or official documentation.
- Do not claim Graphify usage in reports when it was not used.

## 2. Refresh

After the final indexed source change of a task, the graph must be refreshed before the final diff review and the commit.

### When refresh is required

Whenever a task adds, modifies, deletes, moves or renames a file the indexer includes. The index covers every repository file not excluded by `.gitignore` or `.graphifyignore`; in practice: `src/`, `tests/`, `e2e/`, `scripts/`, `eslint-rules/`, `.agents/hooks/`, `.agents/rules/`, Markdown documents (`docs/`, `AGENTS.md`, `README.md`), root configuration (`package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `vercel.json`) and `index.html`.

Excluded (no refresh needed): `.agents/skills/` and `.claude/` (vendored skills), `public/`, `pnpm-lock.yaml`, `skills-lock.json`, CSS files (no supported parser) and everything in `.gitignore` (`node_modules/`, `dist/`, `scratch/`, test results). A Markdown edit does need a refresh. Check `.graphifyignore` for the exact list; do not use extension-based shortcuts.

### Refresh order

- After: implementation, tests, the fix loop.
- Before: final diff review, commit, push, PR.
- If any indexed file changes after the refresh (a review fix, a failing test fix), the refresh is stale: fix, validate, run `graphify update .` again, review the graph diff, commit source and graph together.

### Running the refresh

```
graphify update .
```

Install once with `uv tool install graphifyy==0.9.77` (or `pipx install graphifyy==0.9.77`). The ship script (`ship-via-script` skill) runs the refresh automatically before committing and stops if it fails.

Commit legitimate graph changes together with the source change that caused them. Do not hide graph updates to make a PR smaller. Do not commit ignored transient files.

### Refresh failure

When indexed source changed and `graphify update .` fails:

- record `GRAPHIFY_UPDATE_FAILED`;
- do not claim the graph is current and do not continue as if the refresh succeeded;
- do not mark the task complete, do not commit or open the PR;
- keep the branch and report the exact failure.
