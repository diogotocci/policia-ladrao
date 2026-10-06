---
trigger: always_on
description: Write the least code that solves the problem; reuse before building.
---

# Minimal code

The best code is the code you never wrote. Before writing anything, walk this ladder and stop at the first step that solves the problem:

1. Does this need to exist at all? If the requirement does not ask for it, skip it.
2. Does it already exist in this codebase? Reuse it (search `src/` first; Graphify `query` helps for cross-module questions).
3. Does the language or the standard library do it? Use it.
4. Does the platform do it natively (Web APIs, CSS, WebAudio, Three.js already in use)? Use it.
5. Does an installed dependency already do it? Use it. Adding a new dependency needs a reason (see `coding-standards.md`).
6. Can it be one clear line? Write one line.
7. Only then write the smallest new code that satisfies the requirement and its tests.

This never removes safety: input validation, error handling, accessibility and the tests that prove behavior are part of the requirement. No speculative abstractions, options or extension points for features that do not exist yet.

Inspired by the "ponytail" ruleset (github.com/DietrichGebert/ponytail), restated for this project.
