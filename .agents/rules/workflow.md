---
trigger: always_on
description: Which skills to use automatically, without waiting for the owner to ask.
---

# Workflow: skills that apply automatically

Skills live in `.agents/skills/<name>/SKILL.md` (mirrored to `.claude/skills/`). Before acting, check this table. If there is even a small chance a skill applies, read its `SKILL.md` and follow it. Process skills first (they define how), implementation skills second.

| Situation | Skill |
|---|---|
| New idea, feature, mechanic, screen or behavior change | `brainstorming`, then `writing-plans` |
| Engine/stack choice, game architecture, loop, input, save, performance | `game-studio`, then `web-game-foundations` |
| 3D rendering, cameras, materials, lighting, WebGL performance | `three-webgl-game` |
| HUD, menus, overlays, pause/end screens, mobile layout | `game-ui-frontend` and `frontend-design` |
| Review UI/UX/accessibility of a screen | `web-design-guidelines` |
| Execute a written plan | `subagent-driven-development` (preferred) or `executing-plans` |
| Two or more independent tasks | `dispatching-parallel-agents` |
| Any game logic (rules, AI, scoring, collisions, physics) | `test-driven-development` |
| Bug, failing test, odd behavior | `systematic-debugging` |
| Browser testing, screenshots, mobile viewport, smoke tests | `game-playtest` and `playwright-cli` |
| Before saying "done", "works", "passes" | `verification-before-completion` |
| Task finished, needs review / review feedback received | `requesting-code-review` / `receiving-code-review` |
| Any commit, push, branch, PR or merge | `ship-via-script` (mandatory) |
| Cross-module discovery or impact analysis | Graphify query (see `graphify.md`) |
| Owner says "grill me" | `grill-me` |
| Hand work over to another session | `handoff` |
| A capability no skill covers | `find-skills` |

Always-on rules in `.agents/rules/` (`coding-standards.md`, `minimal-code.md`, `graphify.md`, this file) apply to every task without being invoked.

## Git

The agent never commits, pushes, merges, rebases or opens PRs. It prepares `scratch/NN-<slug>.ps1` with the `ship-via-script` skill and gives the owner the command to run.
