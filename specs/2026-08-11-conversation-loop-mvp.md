# Feature Spec: Conversation Loop MVP — behavior slice (occupied_remodel happy path)

> Copy of `specs/spec-template.md`, filled in. A thin vertical slice that proves the
> **conversational brain** end to end — extraction -> Project State -> Next Best Question ->
> FIRST_VALUE hard-floor gate — on ONE happy path. NOT the product, and NOT the auth/persistence
> plumbing. Pairs with `docs/PROJECT_STATE.md` and the three design specs.
> Mode: **Light** (dev role-play; no real auth, no live/customer data, no RLS yet). NOTE: making
> any of this public / adding real auth + RLS + save-resume is **Full** mode and is a separate,
> gated step — explicitly out of this session.

---

## Session shape: hard 90-minute timebox

- **0–15 min — define the implementation slice:** `conversation -> extraction -> Project State
  -> NBQ -> response`. No pretty UI, no pricing engine.
- **15–75 min — build a minimal orchestrator for ONE happy path (`occupied_remodel`):** opening,
  ZIP, budget approach, materialize a few cost drivers, compute the next action, and reach /
  not-reach the FIRST_VALUE hard floor.
- **75–90 min — role-play 3–5 dialogues** and record only the *real* problems.

If the slice shows one of today's assumptions is bad, fix that assumption by fact — don't
redesign.

## 0. Filter

- **Whose time?** Ours as builders — a risk-reduction slice. Justified because it's the smallest
  thing that shows the conversational brain actually works (does NBQ pick sensibly? is the hard
  floor really enforced?) before investing further.
- **Without code?** No — this is the runtime behavior.

## 1. Problem

The design layer is agreed but the loop's *intelligence* is unproven. We need to watch the
system extract facts from natural conversation, materialize Project State, choose a reasonable
Next Best Question, and refuse to deliver FIRST_VALUE below the hard floor — on one path.

## 2. User

The developer, role-playing a San Diego homeowner with an `occupied_remodel`. No real customer
data.

## 3. Behavior (the happy path)

1. **Opening:** light expectation + two trust signals + open invitation (per the Playbook, kept
   minimal — not polished copy).
2. Homeowner narrates; the LLM **emits candidate facts** (pain points, must-haves, and any
   inferable cost drivers). The **engine materializes** them into Project State.
3. The orchestrator runs the **opening triad**: confirms project context, asks **ZIP**, asks
   **budget approach** — skipping any already closed by narrative.
4. Each turn, the **engine computes `next_best_action`** from the NBQ priority ladder
   (serviceability -> context/scope -> budget -> hard-floor blockers -> customer value ->
   enhancers), one response-required question per turn.
5. When the **hard floor** is met (`project_type`, serviceable `zip`, `project_scope`, budget
   handled, `size_class`, `layout_change`, at least one of `product_level`/`appliance_tier`, plus
   a pain/must-have), the system **delivers FIRST_VALUE** with a `first_value_confidence`.
   Otherwise it does NOT deliver — it gives a short progress summary and asks the missing blocker.
6. A **debug view** shows the full Project State after every turn (raw, not styled).

## 4. Project State impact (subset for this path)

Materialize only what the happy path touches (LLM emits candidates; engine writes state + events,
one transaction): `conversation_stage`, `project_type` (=occupied_remodel), `zip`, `project_scope`,
`budget_amount` + `budget_source`, `size_class`, `layout_change`, one of `product_level` /
`appliance_tier`, `primary_pain_points[]` / `primary_must_haves[]`, plus the derived
`first_value_confidence` and `next_best_action`. Other columns/fields stay untouched. LLM never
writes status directly.

## 5. Acceptance Criteria (completion criterion — must be concrete)

- [ ] I can open the local MVP and **talk to it as a homeowner**.
- [ ] I can **see the Project State after every turn** (debug view).
- [ ] The system chooses a **reasonable Next Best Question** each turn (follows the ladder; no
      re-asking a closed field; one response-required question per turn).
- [ ] The system **never delivers FIRST_VALUE below the hard floor**; if the floor isn't met it
      gives a progress summary + the missing blocker.
- [ ] When the floor is met, it delivers a FIRST_VALUE with a `first_value_confidence`.
- [ ] 3–5 role-play dialogues completed; real problems recorded (not cosmetic nits).

## 6. Out of Scope (do NOT build this session)

Pricing math / budget-range function; designer dashboard; property intelligence; appliance
database; Three.js / any 3D; WhatsApp / multi-channel; **full auth + save-resume + production
RLS**; persistence across reload; other `project_type` branches (vacant / new_construction);
polished UI; over-polishing the prompt. A minimal/ephemeral state store for the session is fine —
durable persistence is not the point here.

## 7. Data & Risk Notes

- **Light**: dev role-play, no real/customer data, no public traffic. Auth + RLS + save-resume
  are deferred (a **Full**-mode, security-reviewed step before anything customer-facing).
- Business logic stays **out of the AI SDK** (streaming/UI only); the engine owns extraction
  gating, materialization, NBQ, and the hard-floor gate.
- Keep it a **modular monolith** with clean boundaries even in the slice.
- Cost: one LLM call per user turn.

## 8. Decision Log

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
| 2026-08-11 | First code session proves the conversational BRAIN (extraction -> state -> NBQ -> hard-floor gate) on one happy path, not the persistence/auth plumbing | The risky, unproven part is the intelligence, not CRUD | An infra-only slice (persistence + resume + RLS first) |
| 2026-08-11 | Single happy path = `occupied_remodel`; other types deferred | One end-to-end path proves the loop; branching is cheap to add later | Building all three project_types at once |
| 2026-08-11 | Full auth / save-resume / production RLS explicitly deferred | Not needed to prove the brain; keeps the 90-min box honest | Building auth + resume now |
| 2026-08-11 | Hard 90-min timebox with a fixed phase split and a concrete completion criterion | Goal is "the product first answers", not "design the product" | Open-ended build |
| 2026-08-11 | Debug view of Project State after each turn | We must watch state evolve and NBQ behave; that's the whole point | A polished chat UI with hidden state |
