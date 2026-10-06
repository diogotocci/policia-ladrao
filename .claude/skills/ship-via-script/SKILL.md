---
name: ship-via-script
description: Use whenever work needs to be committed, pushed, put on a branch, opened as a PR or merged — including when another skill (writing-plans, executing-plans, subagent-driven-development, finishing-a-development-branch) says to commit. The agent never runs git commit/push or gh pr itself; it writes scratch/NN-<slug>.ps1 for the owner to run in PowerShell.
---

# Ship via script

The owner runs everything that changes Git history or the remote on Windows (PowerShell). The agent prepares the script; the owner runs it.

## When

- A task, feature or fix is done and passed `verification-before-completion`.
- Any skill says "commit", "push", "open a PR", "finish the branch".
- The owner asks for a commit, PR or branch.

Never run `git commit`, `git push`, `git merge`, `git rebase`, `git am`, `git checkout -b`/`switch`, `gh pr create`/`merge` yourself.

## Steps

1. List exactly the files of the change (`git status --porcelain`, `git diff --stat`). No build output, `scratch/` or other tasks' files.
2. Next number: highest `NN` in `scratch/*.ps1` + 1 (two digits).
3. Choose:
   - branch `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…` (kebab-case, English);
   - Conventional Commit messages in English, one per plan checkpoint;
   - PR title and body in English: what changes for players and developers, how it was validated.
4. Refresh the Graphify graph when indexed files changed (`.agents/rules/graphify.md`). The script also runs `graphify update .` and stops with `GRAPHIFY_UPDATE_FAILED` if it fails.
5. Copy `template.ps1` to `scratch/NN-<slug>.ps1`, keep exactly one of the two modes and fill every `<...>`:
   - **Mode A (patches)** when you worked in your own clone/sandbox: commit there with the final messages, export with `git format-patch origin/main -o scratch/NN-<slug>/`, and ship the folder with the script. The patches must apply on the current `origin/main`.
   - **Mode B (working tree)** when you edited the owner's folder directly: one `git add` with explicit paths + `git commit` per checkpoint.
6. Script text is ASCII-only English (Windows PowerShell 5.1 reads `.ps1` without BOM as ANSI).
7. Reply with a short summary and the command:
   ```
   powershell -ExecutionPolicy Bypass -File .\scratch\NN-<slug>.ps1
   ```
8. If the owner sends a failure ("STOPPED: ..."), use `systematic-debugging`, fix the cause and give a corrected script.

## Script rules

- `$ErrorActionPreference = "Stop"`, `Set-Location C:\dev\policia-ladrao`, and `Check` after every native command.
- Always branch from a freshly fetched `origin/main`.
- Validation (install, typecheck, lint, test, e2e, build) runs before any commit; when anything fails, nothing is pushed.
- Explicit `git add` paths, never a blind `-A`. The final `$left` check stops if indexed files were left out.
- No AI attribution anywhere: no `Co-authored-by` trailers for tools, no session links, no "Generated with" footers (`.agents/rules/coding-standards.md`).
- Ends with `Write-Host "SUCCESS PR opened"`.
