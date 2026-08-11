# Feature Spec: Conversation Playbook + Next Best Question v1

> Copy of `specs/spec-template.md`, filled in. **Behavior only** — no new fields, no pricing
> math, no engineering. Turns the Required Information Model into a natural conversation.
> Pairs with `specs/2026-08-10-required-information-model.md`,
> `specs/2026-08-10-qualification-rules-engine.md`, and `docs/PROJECT_STATE.md`.
> Mode: **Light** (behavior/design; the LLM + orchestration layer). The fields it fills and
> the gates it feeds are defined elsewhere; nothing here writes status directly.

> This spec makes many **choices** (module order, when to ask ZIP/budget/photo, ask-vs-infer
> thresholds, project_type branching, the NBQ priority rule). Every such choice is tagged
> **[A]** inline and collected in "Assumptions for review" at the end.

---

## Goal and the one test

Prove we can obtain the **FIRST_VALUE hard floor in 8–12 minutes without it feeling like a
form**. The single review test:

> Could a real homeowner move through this conversation naturally in 8–12 minutes and get a
> useful FIRST_VALUE, without feeling they filled out a form?

Hard floor to reach (from the RIM spec): `project_type`, `zip` (serviceable), `project_scope`,
budget handled, `size_class`, `layout_change`, and at least one of `product_level` /
`appliance_tier`. **[A]** Plus at least one `primary_pain_point` or `primary_must_have` (for
the "they understood me" framing — needed to *deliver* the summary, not to compute the number).

**The hard floor is non-negotiable.** FIRST_VALUE is never delivered without it. `LOW`
confidence is allowed only when *accuracy enhancers* are unknown — never when a hard-floor
field is missing.

## 0. Filter

- **Whose time?** The customer's (no interrogation) and the designer's (a usable brief). It
  is the make-or-break of the whole funnel: this is where trust and budget realism happen.
- **Framework:** capacity + margin; risk = a form-like experience that kills conversion, or
  over-asking that burns AI cost. Mitigated by the stop condition and one-response-per-turn.
- **Without code?** No — this is the conversational behavior itself, but it is defined as
  policy (priorities + guards), not hardcoded prompts.

## 1. Problem

The system knows *what* to collect (RIM) and *how* to decide (Qualification), but not *how the
conversation behaves*: what to say first, what to ask vs infer, and which single question to
ask next. Without this, the LLM either interrogates (a 45-min questionnaire) or drifts.

## 2. User

- A **homeowner** who wants to be understood, not processed. Mobile, impatient, may drop a
  photo instead of typing.
- The **orchestrator/engine**, which consumes the fields this conversation produces.

## 3. Core principles

- **Priorities and guards, not a script.** The playbook has NO "question 1, 2, 3". The first
  2–3 steps are fairly rigid (project context, ZIP, budget approach); after that the agent
  picks the single most valuable open gap.
- **Know, don't ask.** A field is **CLOSED** once known at sufficient confidence from
  narrative / photo / plan. Closed fields are never asked (reuse `SCOPE_CONFIDENCE_THRESHOLD
  = high`: high -> closed; medium -> confirm, don't open-ask; low -> ask). **[A]**
- **One response-required question per turn.** A turn may include a **soft correction
  invitation** on a medium-confidence inference (which needs no separate answer) plus at most
  one question that actually requires a response. Example:
  "I'm reading that as an L-shaped kitchen with a small island — correct me if I'm off. What
  ZIP is the project in?" — the user answers ZIP; if the inference is wrong they fix it
  naturally. **[A]**
- **Prefer a photo when it consolidates.** One "could you share a photo?" can close
  `layout_type`, `island`, `size_class`, and product hints at once — cheaper than four questions.
- **Stop when good enough — but only above the hard floor.** As soon as the hard floor is met
  at acceptable confidence, DELIVER_FIRST_VALUE — do not gold-plate. Never deliver below it.

## 4. The playbook

### 4.1 Opening / trust contract

The first agent turn sets a light expectation, gives **two** trust signals, and invites a
story — it does not interrogate and does not over-explain. **[A]** Content:

1. Light expectation: "about 10 minutes, and we'll tell you whether your ideas and budget line
   up and what direction makes sense."
2. **Two** trust signals only (not the whole list — reciting every reassurance sounds like
   someone insisting too hard they're not a scam):
   - "your project stays with us — this isn't a lead marketplace", and
   - "I'm here to help figure out what's realistic, not to push your budget higher".
   The rest (no spam / no chasing / no commission) lives in UI/privacy copy or is said
   contextually later. **[A]**
3. An open invitation, not a question list: "Tell me about your kitchen and what you'd like to
   change." **[A]**
4. A soft, optional photo offer: "If you have a photo of your kitchen — or inspiration pics —
   drop them in anytime; it helps and saves questions." **[A]**

### 4.2 Early gates (the semi-rigid opening triad)

Before free-form NBQ, three things are obtained early — but each is skipped if the opening
narrative already closed it (know-don't-ask). **[A]** Proposed order:

1. **Project context** — `project_type` + roughly what they want. Usually free from the opening
   story; confirm rather than ask if inferable.
2. **ZIP** — asked within the first ~2 exchanges, framed as "where's the project located? a ZIP
   is fine — it lets us factor in local pricing." Early because serviceability is a hard gate;
   no point in deep discovery out of area. **[A]** (Placed after a little rapport, not as the
   very first line.)
3. **Budget approach** — not necessarily the number: "Do you already have a budget in mind, or
   would you like help figuring out what's realistic?" Handles all three budget states. Raised
   in the first third of the conversation because budget realism is the point, but framed
   collaboratively, never as the opener. **[A]**

Guards: if ZIP is out of area -> stop deep discovery, hand to the OUT_OF_AREA_REVIEW path
gracefully (still polite, lead retained). Do not deliver FIRST_VALUE before the hard floor.

### 4.3 Modules and branching by project_type

Shared modules: Project Basics, Physical Scale, Change Complexity, Product Level, Appliances,
Budget, Customer Value. Timeline and Style are light/optional for FIRST_VALUE.

Branching mainly affects Existing Conditions + Change Complexity: **[A]**

- **occupied_remodel** — probe the current kitchen (what's wrong / what stays) and living-there
  reality; these feed `layout_change` and `site_work_complexity`.
- **vacant_remodel** — similar but lighter logistics; often a gut, which shifts
  `layout_change` / `site_work_complexity`.
- **new_construction** — no existing kitchen. Note `plans_available`; if plans are handy,
  `REQUEST_PLANS` **opportunistically** (they consolidate `layout_type` / `size_class` /
  `island`). Plans are **not required** for FIRST_VALUE (per RIM) — if the customer says they
  aren't handy, continue without them. Skip "what's wrong with your current kitchen".

### 4.4 Ask-vs-infer policy

For each hard-floor / driver field, the default acquisition mode: **[A]**

| Field | Default | Notes |
|-------|---------|-------|
| project_type | infer from narrative, confirm | rarely a direct question |
| zip | **ask** | inference unreliable; always ask |
| project_scope | infer, confirm | QUAL-SCOPE-001 confidence gate |
| size_class | infer from photo/narrative | ask only if no photo and unclear |
| layout_type / island | infer from photo | ask if no photo |
| layout_change | infer from what they describe changing | never ask them to classify |
| site_work_complexity | infer from narrative | targeted follow-up only for full_kitchen_project when unclear |
| product_level | infer from inspiration photos / narrative; else the human-legible prompt | never "what material tier?" |
| appliance_tier | infer from brand mentions / photos | ask only if no signal |
| budget | **ask / offer assist** | the collaborative budget-approach question |
| pain_points / must_haves | infer from narrative | almost always free |

Rule: **medium confidence -> confirm** (as a soft correction invitation, section 3) rather than
a fresh open question; **high -> closed**; **low -> ask**. Never re-ask a closed field.

### 4.5 Next Best Question — priority + guards (not a formula-for-its-own-sake)

Each turn after the opening triad: compute the set of **open, non-guarded** gaps, then act on
the single highest-priority one (a question or a consolidating photo request). Priority ladder
**[A]** — customer value sits **above** accuracy enhancers, because without it we cannot keep
the FIRST_VALUE promise ("they understood me"), even though it isn't a pricing input:

```
P0  Serviceability (zip)                      — until known
P1  project_type + project_scope              — frame everything
P2  Budget approach                            — the verdict target
P3  Hard-floor cost blockers:                  size_class, layout_change,
                                               and at-least-one of product_level/appliance_tier
P4  Customer value (pain_points / must_haves)  — if still missing after narrative; required for delivery
P5  Accuracy enhancers by verdict leverage:    site_work_complexity (esp. full_kitchen_project)
                                               > second product/appliance signal
                                               > layout_type / island
P6  Low verdict-value (timeline, style detail) — only if essentially free
```

Modifiers and guards (override the ladder):

- **Closed-field guard:** never ask a field known at high confidence.
- **One response-required question per turn** (soft corrections allowed alongside).
- **Photo-consolidation:** if >= 2 of {layout_type, island, size_class, product_level} are open
  and no usable photo yet, a single photo request outranks the individual asks. **[A]**
  **Guard:** do NOT repeat a photo request once the customer has declined or said they don't
  have one — fall back to targeted questions. **[A]**
- **Confirm-not-ask** at medium confidence.
- **Stop / budget condition:**
  ```
  IF hard floor met:
      DELIVER_FIRST_VALUE
      (unless one cheap question would raise first_value_confidence a full tier, within budget)
  ELSE IF turn/time budget reached AND hard floor NOT met:
      do NOT deliver FIRST_VALUE
      give a short progress summary of what we understand so far
      name the single missing blocker
      ask it, or offer to save & resume
  ```
  LOW confidence is allowed only from unknown accuracy enhancers, never from a missing
  hard-floor field. **[A]**
- **Turn/time budget:** ~12–16 turns or ~12 minutes — this triggers the "progress summary +
  blocker" branch above, NOT a below-floor delivery. **[A]**
- **Serviceability short-circuit:** out-of-area ZIP ends deep discovery (section 4.2 guard).

The output each turn is a `next_best_action` (ASK_*, REQUEST_PHOTOS, REQUEST_PLANS,
DELIVER_FIRST_VALUE, OUT_OF_AREA_REVIEW). The LLM phrases it naturally; the *choice* is the
engine's.

## 5. Worked example (occupied_remodel, ~9 minutes) — illustrative

- **Agent (opening):** light expectation + two trust signals + "tell me about your kitchen and
  what you'd like to change." *(trust contract delivered)*
- **Customer:** "We've been in our house 8 years, the kitchen feels cramped, tiny island, not
  enough storage. I'd love a bigger island and a pantry. Here's a photo." *(narrative + photo
  close: project_type=occupied_remodel, pain_points=[cramped, small island, storage],
  must_haves=[bigger island, pantry]; photo infers layout_type=L_SHAPED, island=EXISTING,
  size_class=STANDARD)*
- **Agent:** soft correction + one response-required question: "I'm reading that as an L-shaped
  kitchen with a small island — correct me if I'm off. What ZIP is the project in?" *(user
  answers ZIP; fixes inference only if wrong)*
- **Customer:** gives ZIP (serviceable); "we'd keep it roughly where it is but want the island
  much bigger." *(layout_change materialized = MODERATE_CHANGE)*
- **Agent:** budget approach (P2): "do you have a number in mind, or want help finding a
  realistic range?" *(budget_source + amount, or assist)*
- **Customer:** "maybe $60–70k. We love Wolf appliances." *(budget declared; appliance_tier
  inferred = PREMIUM / LUXURY_INTEGRATED)*
- **Agent (NBQ):** customer value already captured from narrative (P4 satisfied); hard floor
  still needs `project_scope` + a `product_level` read. Asks the human-legible product prompt.
  *(project_scope + product_level materialized)*
- Hard floor met -> **DELIVER_FIRST_VALUE** at MEDIUM/HIGH confidence: a summary of their
  project + "your budget and scope look aligned for a moderate reconfiguration at this level;
  here's the direction; a designer can take it from here."

Total: one open story + a photo + ~4 targeted turns. No form.

## 6. Acceptance Criteria

- [ ] The opening turn gives a light expectation + **two** trust signals + an **open
      invitation**, before any interrogation; it does not recite every reassurance.
- [ ] The opening triad (project context, ZIP, budget approach) is obtained within the first
      ~3 exchanges **unless already closed** by narrative/photo.
- [ ] No CLOSED field is ever re-asked; medium-confidence fields are surfaced as **soft
      corrections**, not re-opened questions.
- [ ] Each turn issues at most **one response-required question** (a soft correction may
      accompany it); never a batch of questions.
- [ ] When >= 2 physical/product fields are open and no photo exists, the agent requests a
      photo — but **not again** once the customer has declined / has none.
- [ ] **Hard floor is never bypassed:** if the turn/time budget is reached with the hard floor
      unmet, the agent gives a progress summary, names the single missing blocker, and asks it
      or offers save/resume — it does NOT deliver a below-floor FIRST_VALUE.
- [ ] `LOW` first_value_confidence appears only from unknown accuracy enhancers, never from a
      missing hard-floor field.
- [ ] Out-of-area ZIP short-circuits deep discovery gracefully (lead retained).
- [ ] `new_construction` treats plans as **opportunistic** (REQUEST_PLANS if handy) and
      proceeds without them if not; it never asks "what's wrong with your current kitchen".
- [ ] **The review test:** a reviewer role-playing a homeowner completes the flow in 8–12 min
      and reports it felt like a conversation, not a form.

## 7. Out of Scope

- Any new Project State fields (none introduced here).
- Pricing math and the budget-range function; the FIRST_VALUE Summary *wording* template.
- Engineering, style detail, Site Verification.
- The literal LLM system prompts / copywriting — this defines behavior policy (priorities +
  guards); prompt authoring is implementation.
- Multi-channel (SMS/WhatsApp), voice.

## 8. Data & Risk Notes

- **Light**: no direct writes to status/RLS here; the orchestrator sets `next_best_action`
  (already service-role) and the engine materializes fields per QUAL-SCOPE-001 etc.
- Cost/abuse: one-response-per-turn + stop condition + turn budget bound AI spend per
  anonymous conversation (a real concern for public traffic).
- No PII beyond ZIP until save.

## 9. Decision Log

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
| 2026-08-10 | Playbook is priorities + guards, not a numbered script | The conversation must adapt to what's already known | Fixed question sequence |
| 2026-08-10 | Semi-rigid opening triad = project context -> ZIP -> budget approach | Serviceability and budget framing must come early; project context is usually free | Asking ZIP/budget last; or no rigid steps |
| 2026-08-10 | Field CLOSED at high confidence; confirm at medium; ask at low | Know-not-ask; avoids re-interrogation | Always asking; trusting low-confidence inference |
| 2026-08-10 | **Hard floor never bypassed;** budget-reached-without-floor -> progress summary + blocker + save/resume, NOT a LOW-confidence delivery | Confidence cannot substitute for a missing hard-floor field | Delivering FIRST_VALUE at LOW confidence below the floor |
| 2026-08-10 | **Customer value ranked above accuracy enhancers** in NBQ | Without a pain/must-have the FIRST_VALUE promise ("understood me") fails, even though it's not a pricing input | Ranking pain/must-have after site/product enhancers |
| 2026-08-10 | **One response-required question per turn**; soft corrections allowed alongside | Keeps flow natural without banning quick confirmations | Strict one-utterance-per-turn (broke its own example) |
| 2026-08-10 | Opening gives two trust signals, not the whole list | Reciting every reassurance sounds like over-insisting | Full trust recital up front |
| 2026-08-10 | REQUEST_PLANS opportunistic, not blocking | RIM: plans aren't required for FIRST_VALUE | Treating plans as mandatory for new construction |
| 2026-08-10 | Photo request not repeated after a decline | Otherwise NBQ loops on "ask for a photo" with >=2 open fields | Re-requesting a photo each turn |
| 2026-08-10 | Stop at hard floor + acceptable confidence | Prevents gold-plating and runaway AI cost | Collecting until "complete" |

---

## Assumptions for review (all tagged [A] above)

1. **Opening:** light expectation + two trust signals + open invitation + optional photo offer.
2. **Opening triad order:** project context -> ZIP (first ~2 exchanges) -> budget approach
   (first third), each skipped if already closed.
3. **Ask-vs-infer defaults:** the table in 4.4; high=closed / medium=soft-correction / low=ask.
4. **project_type branching:** differs mainly in Existing Conditions + Change Complexity; new
   construction uses plans opportunistically.
5. **NBQ priority ladder** (P0–P6, customer value above enhancers) and modifiers: photo
   consolidation (+ no-repeat-after-decline guard), one-response-per-turn, the hard-floor stop
   condition, and a **~12–16 turn / ~12 min** budget that triggers a progress summary (not a
   below-floor delivery).
6. **Delivery requirement:** hard floor + at least one pain_point/must_have before
   DELIVER_FIRST_VALUE.

### Next step after this spec

With Playbook v1 agreed, the conversational layer is ready to be **implemented** (Claude Code):
the orchestrator that runs opening -> triad -> NBQ loop -> FIRST_VALUE, wired to the engine and
the Supabase-backed Project State. Role-play tests on real dialogues will quickly show which
assumptions were smart and which only looked good in Markdown.
