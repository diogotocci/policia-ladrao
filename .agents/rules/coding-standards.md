---
trigger: always_on
description: Coding standards for every source, test, script, config and technical document in this repository.
---

# Coding Standards

These rules apply to all source code, tests, scripts, configuration, logs, technical documentation, commit messages and generated development artifacts in this repository.

## Language

All technical content is written in English:

- identifiers (functions, classes, types, variables, constants), technical file names;
- tests and test names;
- comments, JSDoc;
- developer-facing errors, logs, console and CLI output, script messages;
- configuration keys, storage keys, commit messages, PR titles and bodies.

User-facing product copy is Brazilian Portuguese (titles, buttons, HUD labels, toasts, end-screen reasons, rules on the side-choice cards). Never mix Portuguese identifiers into code.

Conversations with the owner, the product spec (`docs/superpowers/specs/`), plans (`docs/superpowers/plans/`), `AGENTS.md` and `docs/backlog.md` stay in Portuguese: they are product documents written for the owner.

Bad:

```ts
const carroAtual = getPlayer();
function carregarRanking() {}
```

Good:

```ts
const currentCar = getPlayer();
function loadBoard() {}
```

## Naming

Use descriptive English names (`escapeTime`, `policeTurboOffUntil`, `rearviewRect`). Avoid vague names (`data`, `obj`, `tmp`, `foo`, `result2`). Booleans read as questions: `isBehind`, `hasGun`, `curvesOn`, `canShoot`.

## Functions

Functions have one clear responsibility, a descriptive name, no hidden side effects, few parameters (prefer an options object above four), predictable return types, and fail explicitly at boundaries. Keep them small enough to understand and test; ESLint warns above the size and complexity budgets.

## Comments

Comments explain why something exists, constraints, invariants and non-obvious behavior (units, coordinate conventions, game-feel decisions from playtests). Do not restate the code. Do not write implementation-history comments; Git history explains changes.

## AI attribution

Never add AI, assistant or model attribution to repository artifacts: no tool names, no "AI-generated", no AI `Co-authored-by` trailers, no session links, no "Generated with" footers. This applies to source, comments, docs, commit messages and bodies, Git trailers, PR descriptions, scripts, logs, UI and metadata. Repository artifacts describe the software and the engineering decisions, not which tool assisted.

## Emojis

No emojis in technical output: console, logs, scripts, shell/CLI output, test output, build output and developer-facing errors. Use plain status words (`INFO`, `WARN`, `ERROR`, `PASS`, `FAIL`, `SUCCESS`, `STOPPED`).

Product copy may use emojis where they are part of the game UI (item icons, the "Bomba acertou!" notice, ranking result markers).

## Logging

Production source (`src/`) does not log to the console (ESLint `no-console` is an error). Debug information goes to the `?debug` overlay. Never log secrets, tokens or complete environment variables.

## Error handling

Do not silently swallow errors. Empty `catch` blocks are allowed only where failure is expected and harmless (blocked storage, missing vibration or fullscreen API, autoplay restrictions) and must say why in a comment.

## Type safety

Do not bypass type errors. Avoid `any`; prefer `unknown` at external boundaries and validate it (stored ranking, URL parameters, service worker messages). No `@ts-ignore` or unsafe casts to silence valid errors. If a cast is unavoidable, isolate it and explain why.

## External input

Treat as untrusted: URL parameters, `localStorage` content, service worker cache responses, device APIs. Invalid input falls back explicitly (for example, a corrupted ranking becomes an empty board without breaking the game).

## Architecture invariants

- `src/sim/**` and `src/config/**` are pure TypeScript: no Three.js, DOM, audio, input or browser globals. ESLint enforces it.
- Every gameplay number lives in `src/config/balance.ts`.
- The simulation is deterministic: randomness comes only from the seeded RNG states in the world.

## Tests

Test names are English sentences describing behavior. Tests use synthetic fixtures, are deterministic (seeded worlds, fixed steps), avoid arbitrary sleeps (prefer bounded polling such as `waitForFunction`), and do not depend on test order or shared mutable state. New logic is written test-first (`test-driven-development` skill).

## Scripts

Scripts (PowerShell ship scripts, Node scripts, hooks) use English identifiers and output, no emojis, fail with non-zero exit codes when a check fails, avoid destructive behavior by default, never print secrets, and support non-interactive execution.

## Configuration

Configuration and storage keys use English (`pl.ranking.v2`, `pl.sound`). Do not add configuration for features that do not exist yet. No placeholder secrets.

## Dependencies

Do not add dependencies unnecessarily. Before adding one, weigh necessity, maintenance, security, license, bundle impact and fit. Prefer the platform (Web APIs, WebAudio, CSS) and what is already installed (see `minimal-code.md`).

## Formatting and linting

Prettier owns formatting (`.prettierrc.json`); ESLint owns correctness and architecture (`eslint.config.mjs`). Run `pnpm lint` (Prettier check + ESLint). Do not disable lint rules globally to solve a local problem; fix the code. Errors block; warnings are refactoring pressure to address when touching the code.

## Versioning

`package.json` `version` follows Semantic Versioning and is shown on the title screen footer. Every PR bumps it exactly once, in its last commit (`chore(release): x.y.z`), based on the highest-impact change in the PR:

- **major** (`x`): a breaking change for players or their data (saved ranking or settings no longer compatible, a removed mode). While the version is `0.y.z`, a breaking change bumps the minor instead; `1.0.0` is set only when the owner declares the launch.
- **minor** (`y`): new player-facing behavior (`feat`): a new mechanic, item, screen, setting or rule change. Resets the patch to 0.
- **patch** (`z`): everything else (`fix`, `perf`, `refactor`, `style`, `test`, `docs`, `chore`, `ci`, `build`).

The PR title or body states the new version.

## Completion quality

A change is complete only when:

- the required behavior is implemented and covered by tests;
- `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass, and the relevant e2e specs pass;
- the Graphify refresh is done when indexed files changed (`graphify.md`);
- the spec is updated when game behavior changes;
- `package.json` `version` is bumped according to Versioning;
- no unrelated changes are included.
