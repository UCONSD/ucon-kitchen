# Feature Spec: [FEATURE NAME]

> Copy this file to `/specs/YYYY-MM-DD-feature-name.md` before opening a dev session.
> Mode: **Full** / Light / Hotfix (circle one)
> Full is MANDATORY if this touches: auth, permissions (RLS), money, live data,
> anonymous/public traffic, or PII.

---

## 0. Filter (answer before writing anything else)

- **Whose time does this save, and how many hours/month?**
  (If the answer is "mine as a builder" → backlog, stop here.)
- **Decision framework check** (cash → margin → capacity → risk → founder dependency):
- **Could this be solved without code?** (SOP, manual step for the first 20–50 customers,
  off-the-shelf tool):

## 1. Problem

One sentence. What is broken or missing today.

## 2. User

Who exactly uses this. A name, not a role.
(e.g., "A homeowner on their phone, mid-remodel-anxiety, unwilling to fill a form."
Or: "Sarah, the designer, opening a project the AI prepared.")

## 3. Behavior

What the user sees and does, step by step. Describe the experience, NOT the
implementation.

1.
2.
3.

## 4. Project State impact

This app is schema-first. Before behavior, state what changes in the model.

- **State fields** read/written:
- **Events emitted** (append-only): e.g., `fact.captured`, `budget.captured`,
  `qualification.evaluated`, `handoff.requested`
- **Milestone transitions** this can trigger, and the **rule** that guards each:
- Confirm: does the LLM only emit events here, with the rules engine computing
  transitions? (It must.)

## 5. Acceptance Criteria

3–5 checkable statements. Each must be testable by a human clicking through the app.

- [ ]
- [ ]
- [ ]
- [ ] Error case: what happens when it fails (network drop, bad upload, no permission,
      AI timeout, rate limit hit)?

## 6. Out of Scope

Explicitly list what this feature does NOT do. Scope-creep protection.
(See `docs/ROADMAP.md` — the "What NOT to build now" list is binding.)

-
-

## 7. Data & Risk Notes (Full mode only)

- What tables does this read or write?
- Does it touch **RLS policies** or auth? → If yes, security review in Phase 4 is
  mandatory.
- Does it expose **anonymous/public** endpoints? → Rate limiting + AI-cost/abuse controls
  required.
- Does it handle **PII** (contact, address, photos)? → State access scoping.
- Does it modify or migrate live data? → Dry-run on a copy first.

## 8. Decision Log

Any architectural choice made during the build. Copy final entries to `DECISIONS.md`
(four columns) at release.

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
|      |          |     |                       |
