<!--
SOURCE OF TRUTH: project "UCON Business OS" → templates/coding-session-spec-template.md
This file is a COPY. Edit the source only, then refresh the copies in:
  ucon-field-app/docs/spec-template.md
  ucon-cabinet-engine/docs/spec-template.md
  ucon-kitchen/docs/spec-template.md
Version: 2026-08-30
-->

# [ID] Story title

<!--
SIZE LIMIT: a filled-in spec is ~1500 tokens (≈3 pages).
This is not a guideline, it is the filter. If it does not fit, the spec holds
either more than one story, or decisions the coding session should make itself.
Split it or cut it — do not raise the limit.

A spec says WHICH files change and what the result must be.
It does not say HOW to write the code.
-->

**Status:** draft | ready for session | executed | archived
**Epic:**
**Date:**

---

## 1. Intent

<!--
~300 tokens (half a page). What is needed and why, in plain words,
with no solution inside.
Does not fit in half a page — it is more than one story. Split it.
-->



---

## 2. Input/Output matrix

<!--
The main section. Anything expressible as "input range → expected output" goes
here: rows map straight into code and into tests. One row = one test case.
Include the edges: empty, zero, maximum, wrong type, duplicate.
The more behaviour moves into the table, the less the agent has to invent.
-->

| # | Input (range/condition) | Expected output |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |

---

## 3. Acceptance criteria

<!--
ONLY what did not fit the matrix: behaviour over time, side effects, state in
the database after the operation, what the user sees.
If a criterion can be rewritten as a matrix row, rewrite it and delete it here.
Phrase each one as observable behaviour, checkable without argument.
-->

- AC-1 —
- AC-2 —

---

## 4. NOT-list

<!--
MANDATORY SECTION. An empty NOT-list means the spec is not ready.
What the agent will want to do "while it is in there" but must not: refactoring
neighbouring code, renames, "improving" styles, extra abstractions, new
dependencies, schema migrations, handling cases outside the Intent.
Be concrete: "do not touch X", not "do not do anything unnecessary".
-->

- DO NOT
- DO NOT
- DO NOT

---

## 5. Non-functional

<!--
EMPTY by default.
Fill this in only if I am actually going to work on it in THIS story:
performance, load limits, security, data migration.
Anything written here "just in case" the agent will try to implement —
and burn the session on it.
-->

_none_

---

## 6. Files to read first

<!--
Concrete paths and fragments the agent reads BEFORE coding, so it does not burn
context on search.
Give the file plus what to look at in it (function, line range, section).
"Read all of src/" is not allowed: it is a refusal to plan.
-->

| Path | What to look at | Why |
|---|---|---|
|  |  |  |

---

## Pre-session check

<!-- Any line failed — do not open the session. -->

- [ ] Intent fits in half a page.
- [ ] Everything expressible as a table is in the table, not in the AC.
- [ ] NOT-list is not empty.
- [ ] Non-functional is empty, or I really am doing it in this story.
- [ ] Files to read first are concrete paths with the fragments named.
- [ ] The spec nowhere says how to write the code.
- [ ] Total size ≈1500 tokens.
