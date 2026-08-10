# Dev Session Checklist — UCON Kitchen

> Paste this at the top of every named dev session.
> Session name: `[UCON Kitchen] — [Feature] — Session N`
> Mode: Full / Light / Hotfix

---

## Before opening Claude

- [ ] Spec file exists in `/specs/` (if not — STOP, write it first; no spec = no session)
- [ ] Mode chosen. Touches auth / RLS / money / live data / anonymous traffic / PII →
      **Full**, no exceptions
- [ ] Confirmed: the change respects "chat is not the database" — LLM emits events, rules
      engine computes transitions

## Phase 3 — Implementation

- [ ] First prompt = full spec + "Give me an implementation plan, do not write code yet"
- [ ] Plan approved by me before any code
- [ ] Build incrementally: minimal working version → test → next layer
- [ ] I review every diff before commit
- [ ] Rule: I do not commit code I cannot explain in my own words
      (If unclear → ask "Explain what this block does and why")
- [ ] Business logic stays out of the AI SDK; state transitions stay in the rules engine

## Phase 4 — Validation

- [ ] **Security review in a CLEAN session** (Full mode): new chat, no dev context,
      prompt: "Here is a diff. Find bugs, vulnerabilities, and RLS/permission problems."
- [ ] Every acceptance criterion from the spec tested by hand, on real data
- [ ] Tested on a **phone** (mobile-first product), not just on my Mac
- [ ] Error case tested (kill network mid-conversation, upload a wrong file, hit the rate
      limit, AI timeout)
- [ ] Anonymous/abuse path checked: can an unauthenticated visitor do only what they
      should, and is AI cost bounded?

## Phase 5 — Release

- [ ] Commit message says WHAT and WHY (not "fix stuff"); author = `andrew@ucon.us`
- [ ] Architectural decisions copied to `DECISIONS.md` (four columns)
- [ ] Analytics events for this feature verified in PostHog
- [ ] Spec file updated with final state (what shipped vs. what was planned)

## Hotfix mode only

- [ ] Fixed and tested (Phase 3 + acceptance test)
- [ ] SAME DAY: spec written retroactively
- [ ] SAME DAY: security review if the fix touched auth or RLS
