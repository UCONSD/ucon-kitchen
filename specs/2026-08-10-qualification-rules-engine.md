# Feature Spec: Qualification Rules Engine (v2)

> Copy of `specs/spec-template.md`, filled in. **v2** — open items closed, final polish
> applied; ready for implementation. Adds `handoff_status`, `intent_status`, formal
> `budget_source`, concrete constants, `project_scope` derivation, simplified intent, and
> the designer-queue operational rule.
> Mode: **Full** (touches RLS, anonymous/public traffic, budget/qualification — money-adjacent)
> Full is MANDATORY if this touches: auth, permissions (RLS), money, live data, anonymous
> traffic, or PII.

---

## Philosophy (read first)

The rules engine decides **automation eligibility, not ultimate customer worth**.

```
QUALIFIED      -> a fit; eligible for auto handoff
POTENTIAL_FIT / INSUFFICIENT_DATA / NEEDS_REVIEW -> queue / nurture / founder review
NOT_FIT        -> no designer
```

Four **independent** dimensions answer four different questions:

```
qualification = is the project a fit?
intent        = does the customer want to continue?
identity      = can we identify them?
handoff       = is it OK to spend designer time now?
```

A wrong disqualification costs a real customer, so the engine is conservative: when unsure
it routes to review or nurture, it never silently discards a lead.

## 0. Filter

- **Whose time does this save?** The designer's. It ensures scarce human design time is
  spent only on projects with **minimum sufficient information**. Capacity protection is the point.
- **Framework (cash -> margin -> capacity -> risk -> founder dependency):** capacity + margin;
  risk is a wrong disqualification, mitigated by NEEDS_REVIEW/NURTURE routing.
- **Without code?** The logic is an SOP (section 4). It must run identically on every
  conversation, so it is codified deterministically. This spec is the SOP.

## 1. Problem

There is no deterministic layer that decides which conversations are ready for a designer.
Left to the LLM it would be inconsistent and unauditable. The v1 draft also made
`QUALIFIED` too easy, so it meant "not disqualified" rather than "designer-ready".

## 2. User

- A **San Diego homeowner**, anonymous, on their phone. Never sees "qualification" — only a
  First Value Summary.
- **The designer**, whose work queue is **`handoff_status = READY`** projects. Qualification
  alone does NOT put a project in the designer queue (see the operational rule in 4.5). A
  separate **founder/manual review queue** holds `NEEDS_REVIEW` (e.g., high-value out-of-area).

## 3. Behavior

As facts arrive, the engine re-evaluates and writes the project's status/action. Invisible
to the customer except through the assessment they receive.

1. LLM extracts a fact and emits `fact.captured`.
2. Engine runs the rule set (section 4) against current Project State.
3. Engine writes the state dimensions (section 4.1) and emits `qualification.evaluated` with a
   versioned, per-rule audit trail.

## 4. Project State impact

### 4.1 Independent state dimensions (never one enum standing in for another)

```
conversation_stage       DISCOVERY | FIRST_VALUE | DESIGN_REVIEW
qualification_status      UNASSESSED | INSUFFICIENT_DATA | POTENTIAL_FIT
                          | QUALIFIED | NEEDS_REVIEW | NOT_FIT
handoff_status            NOT_READY | READY | ASSIGNED
intent_status            ACTIVE | PAUSED | WITHDRAWN
customer_identity_status  ANONYMOUS | CONTACT_PROVIDED | CONTACT_VERIFIED
next_best_action          ASK_ZIP | ASK_SCOPE | ASK_BUDGET | REQUEST_PHOTOS
                          | DELIVER_FIRST_VALUE | SAVE_PROJECT | HUMAN_DESIGN_REVIEW
                          | OUT_OF_AREA_REVIEW | NURTURE | NOT_A_FIT
```

Handoff is its **own** dimension — not a `conversation_stage`. A project can be in
`conversation_stage = DESIGN_REVIEW` while `handoff_status` moves NOT_READY -> READY -> ASSIGNED.

`qualification_status` meaning:
- **UNASSESSED** — not yet evaluated.
- **INSUFFICIENT_DATA** — evaluated but required fields missing; carries `missing_fields[]`.
- **POTENTIAL_FIT** — serviceable, no clear mismatch, progressing; not yet all QUALIFIED criteria met.
- **QUALIFIED** — minimum sufficient info met (section 4.3) -> a fit, eligible for handoff.
- **NEEDS_REVIEW** — ambiguous or out-of-area-but-worth-a-look -> manual/founder review; **not discarded**.
- **NOT_FIT** — clear no (e.g., declared budget below the scope-appropriate floor) -> no designer.

`intent_status` (deterministic, explicit signals only — **no timer/scheduler in v1**):
- **ACTIVE** — default / customer currently interacting. An abandoned browser stays ACTIVE
  (abandonment is recorded by analytics via `conversation.abandoned`, not by flipping intent).
- **PAUSED** — explicit "later / not now". Does not disqualify; blocks auto-handoff.
- **WITHDRAWN** — explicit "stop / not interested". Blocks handoff; routes to NURTURE/closed.
- Recency is checked **at the moment of handoff**, not by a background job.

`customer_identity_status` (syntactic only — provided != verified; no authenticity heuristic in v1):
- **ANONYMOUS** — no syntactically valid contact supplied.
- **CONTACT_PROVIDED** — a syntactically valid email or phone supplied.
- **CONTACT_VERIFIED** — future (out of scope v1). We do NOT try to judge whether a valid-looking
  address is a "real" person.

- **Fields read:** `zip`, `project_type`, `project_scope`, `budget_amount`, `budget_source`,
  `conversation_stage`, `intent_status`, `customer_identity_status`.
- **Fields written (service role only):** `qualification_status`, `handoff_status`,
  `project_scope`, `next_best_action`; `conversation_stage` advances proposed by the engine.
  LLM never writes them.
- **Confirm:** LLM only emits `fact.captured` / `budget.captured` / activity signals; the engine
  computes and materializes all status fields. [OK]

### 4.2 Constants (this release — v1 business assumptions, revise from real leads)

```
RULE_SET_VERSION = 1

# Scope-dependent budget floors (USD). v1 business assumptions, not computed.
MIN_BUDGET_BY_SCOPE = {
  cabinetry_only:       15000,
  cabinetry_install:    22000,
  full_kitchen_project: 30000,
  unknown_scope:        null    # never fail the budget gate on unknown scope; ASK_SCOPE
}

BUDGET_SOURCE = UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED

SCOPE_CONFIDENCE_THRESHOLD = high   # at/above -> accept candidate; below -> ASK_SCOPE

# Service area: City of San Diego residential ZIPs (v1 starting allowlist).
# ZIPs are STRINGS (never integers — leading zeros break integer storage nationwide).
# Config-driven; verify against an authoritative USPS/city list before launch and widen
# to San Diego County by adding ZIPs. Deliberately excludes separate cities
# (Coronado, Chula Vista, National City, El Cajon, La Mesa, Santee, Poway, Del Mar, etc.).
SERVICE_AREA_ZIPS = [
  "92037", "92101", "92102", "92103", "92104", "92105", "92106", "92107", "92108", "92109",
  "92110", "92111", "92113", "92114", "92115", "92116", "92117", "92119", "92120", "92121",
  "92122", "92123", "92124", "92126", "92127", "92128", "92129", "92130", "92131", "92139",
  "92145", "92154", "92173"
]
```

### 4.3 Rules (SOP as code, each with a stable rule_id + version)

```
QUAL-SERVICE-001  (serviceability)
  IF zip IN SERVICE_AREA_ZIPS       -> serviceable = yes
  IF zip NOT IN SERVICE_AREA_ZIPS   -> serviceable = no
        qualification_status = NEEDS_REVIEW  (reason = OUT_OF_AREA)
        next_best_action = OUT_OF_AREA_REVIEW
        # Preserve the lead for founder review. Do NOT auto-route to a designer, do NOT discard.

QUAL-SCOPE-001  (how project_scope is obtained and materialized)
  The LLM PROPOSES a scope candidate (with confidence); it never writes scope itself.
  candidate = LLM-inferred project_scope + confidence
  The ENGINE decides and materializes:
    IF confidence >= SCOPE_CONFIDENCE_THRESHOLD
        -> engine writes projects.project_scope = candidate
        -> engine appends fact.captured { key: project_scope, value: candidate,
                                          source: llm_inferred, confidence }
    ELSE (low confidence or ambiguous)
        -> projects.project_scope stays unknown_scope; next_best_action = ASK_SCOPE
  # Materialization is the engine's job. Appending fact.captured WITHOUT updating
  # projects.project_scope is a bug.
  # Evidence-grounded confidence: a candidate counts as high confidence ONLY when the
  # conversation contains an explicit textual signal for it. A driver the model asserts with
  # no quotable signal is NOT high, regardless of the model's self-reported confidence -> it
  # stays unknown_scope -> ASK_SCOPE. This rule applies to all high-stakes engine-materialized
  # drivers, especially project_scope and budget (they set the budget floor / verdict).

QUAL-BUDGET-001  (scope-aware budget floor; only when a number was declared)
  floor = MIN_BUDGET_BY_SCOPE[project_scope]
  IF project_scope = unknown_scope
        -> do not fail; next_best_action = ASK_SCOPE
  ELSE IF budget_source = CUSTOMER_DECLARED AND budget_amount < floor
        -> qualification_status = NOT_FIT  (reason = BUDGET_BELOW_SCOPE_FLOOR)
        -> next_best_action = NURTURE
  # budget_source in {CUSTOMER_REFUSED, SYSTEM_ASSISTED, UNKNOWN} never fails this gate.

QUAL-INTENT-001  (intent — explicit signals only, no scheduler)
  intent_status = ACTIVE     default / customer currently interacting (also: abandoned browser)
  intent_status = PAUSED     explicit "later / not now"
  intent_status = WITHDRAWN  explicit "stop / not interested"
  # Abandonment is recorded by analytics (conversation.abandoned), NOT by flipping intent.
  # PAUSED/WITHDRAWN never set NOT_FIT by themselves; they gate handoff.

QUAL-SUFFICIENCY-001  (what QUALIFIED actually requires)
  QUALIFIED requires ALL of:
     serviceable = yes
     project_type known
     project_scope != unknown_scope
     budget status handled (CUSTOMER_DECLARED>=floor OR CUSTOMER_REFUSED OR SYSTEM_ASSISTED)
     conversation_stage IN (FIRST_VALUE, DESIGN_REVIEW)
     intent_status = ACTIVE
  # Photos are NOT required for QUALIFIED in v1.
  IF all met            -> qualification_status = QUALIFIED,  next_best_action = HUMAN_DESIGN_REVIEW
  IF serviceable but required field missing
                        -> qualification_status = INSUFFICIENT_DATA, missing_fields = [...]
  IF serviceable, no mismatch, progressing, not yet complete
                        -> qualification_status = POTENTIAL_FIT

QUAL-HANDOFF-001  (handoff guard)
  SET handoff_status = READY
     ONLY IF qualification_status = QUALIFIED
        AND customer_identity_status IN (CONTACT_PROVIDED, CONTACT_VERIFIED)
        AND intent_status = ACTIVE   (checked at the moment of handoff)
  IF a currently-READY project loses a condition (e.g. intent_status -> WITHDRAWN)
        -> handoff_status returns to NOT_READY
  # handoff_status = ASSIGNED is out of scope for v1 (no designer assignment yet).
```

### 4.4 Audit event (`qualification.evaluated`)

Every evaluation emits a versioned, per-rule trace so any past decision can be reconstructed.
The verdict field is named `qualification_status` — the same term used everywhere else.

```json
{
  "qualification_status": "NOT_FIT",
  "evaluated_at": "2026-08-10T18:22:04Z",
  "rule_set_version": 1,
  "rule_results": [
    { "rule_id": "QUAL-SERVICE-001", "rule_version": 1, "result": "PASS" },
    { "rule_id": "QUAL-BUDGET-001",  "rule_version": 1, "result": "FAIL",
      "reason": "Declared budget 27000 below floor 30000 for full_kitchen_project" }
  ],
  "missing_fields": []
}
```

Why versioned: when a floor changes next year, "why was this January lead rejected?" must
still be answerable. Decision -> rule -> version -> audit trail.

### 4.5 Operational rule — the designer queue

The designer work queue contains **`handoff_status = READY`** projects. **Qualification alone
does not put a project in the designer queue.**

Edge case (correct behavior): a customer who became `QUALIFIED` then said "stop" has
`intent_status = WITHDRAWN` and `handoff_status = NOT_READY`, so they leave the queue even
though `qualification_status` may still read `QUALIFIED`. The dimensions are independent by
design, so the queue must key on `handoff_status`, never on `qualification_status`.

## 5. Acceptance Criteria

- [ ] The six dimensions are **separate** fields; no enum value of one appears in another.
      `HANDOFF_READY` is not a `conversation_stage`.
- [ ] `SERVICE_AREA_ZIPS` are stored and compared as **strings**; `projects.zip` is `text`.
- [ ] `handoff_status` becomes `READY` only when QUAL-HANDOFF-001 holds; a `QUALIFIED` project
      with `intent_status = PAUSED` stays `NOT_READY`.
- [ ] The **designer queue is filtered by `handoff_status = READY`**, not `qualification_status`.
      A project that was `QUALIFIED` then `WITHDRAWN` is absent from the designer queue.
- [ ] Enum conditions use **set membership** (`IN (...)`), not `>=` ordering: handoff requires
      `customer_identity_status IN (CONTACT_PROVIDED, CONTACT_VERIFIED)` and
      `conversation_stage IN (FIRST_VALUE, DESIGN_REVIEW)`.
- [ ] A high-confidence scope inference causes the **engine** to write `projects.project_scope`
      AND append `fact.captured`; a low-confidence one leaves `unknown_scope` + `ASK_SCOPE`.
- [ ] `customer_identity_status = CONTACT_PROVIDED` requires only a syntactically valid email/phone;
      no attempt is made to judge authenticity (that is `CONTACT_VERIFIED`, future).
- [ ] `cabinetry_only` at $18k passes the budget gate (floor 15000); `full_kitchen_project` at $27k is `NOT_FIT`.
- [ ] `budget_source` is one of the four enum values; only `CUSTOMER_DECLARED` below floor yields `NOT_FIT`.
- [ ] A ZIP not in `SERVICE_AREA_ZIPS` yields `NEEDS_REVIEW` + `OUT_OF_AREA_REVIEW`, retained.
- [ ] `intent_status`: "later" -> `PAUSED`; "stop" -> `WITHDRAWN`; closed browser stays `ACTIVE`
      and emits `conversation.abandoned`.
- [ ] `qualification.evaluated` uses `qualification_status` (not `outcome`) and includes
      `rule_set_version` + per-rule `rule_id + rule_version + result [+ reason]`.
- [ ] The client/LLM cannot write any status field — a client-side write is rejected by RLS.

## 6. Out of Scope

- Weighted qualification scoring (no "AI score 87.4%").
- Property Intelligence / property-value / ZIP-wealth signals.
- Appliance tiers, project-type weighting, new-construction preference.
- Contact **verification** (`CONTACT_VERIFIED`) and designer **assignment**
  (`handoff_status = ASSIGNED`): enum values exist, neither is built in v1.
- Judging contact **authenticity** (v1 only checks syntactic validity).
- Any **intent lifecycle scheduler / background timer**.
- County/state/radius service rules (San Diego ZIP allowlist only).

## 7. Data & Risk Notes (Full mode only)

- **Tables read:** `projects` (+ `facts` for provenance). **Written:** `qualification_status`,
  `handoff_status`, `project_scope`, `next_best_action`, `conversation_stage`, plus append-only
  `qualification.evaluated` events.
- **RLS:** all status fields are **service-role write only**; anonymous/customer role cannot
  write them. Clean-session security review mandatory (Phase 4). Test that a client write fails.
- **Anonymous/public:** engine runs on unauthenticated visitors -> confirm rate limiting and
  that a visitor cannot force `QUALIFIED` by crafting inputs.
- **Identity:** `customer_identity_status` derives from a syntactically valid captured contact,
  not a flag the client can flip.
- **PII:** at qualification only ZIP is needed; contact captured only at save.
- **Migration:** none (new tables, pre-launch). `zip` and ZIP allowlist are `text`.

## 8. Decision Log

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
| 2026-08-10 | Split state into independent dimensions (conversation_stage / qualification_status / handoff_status / intent_status / next_best_action + identity) | One enum standing in for another produces state spaghetti | Single `current_stage` enum (v1) |
| 2026-08-10 | `handoff_status` its own dimension; **designer queue keys on `handoff_status = READY`**, not `qualification_status` | A QUALIFIED-then-WITHDRAWN customer must leave the queue; keeps the four dimensions orthogonal | Designer queue filtered by `qualification_status = QUALIFIED` |
| 2026-08-10 | Formal `intent_status`, explicit signals only, no scheduler | Vague intent handed qualification to the LLM; avoid a timer MVP doesn't need | Implicit intent; an activity-window timer |
| 2026-08-10 | Formal `budget_source` enum | Unambiguous acceptance tests | Free-form strings |
| 2026-08-10 | `POTENTIAL_FIT` + `INSUFFICIENT_DATA`; `QUALIFIED` = minimum sufficient info | `QUALIFIED` must mean designer-ready | v1's easy QUALIFIED |
| 2026-08-10 | Scope-dependent budget floors; v1 values 15000 / 22000 / 30000 as business assumptions | $27k cabinetry-only != $32k full remodel; tune from real leads | Universal $30k floor |
| 2026-08-10 | `project_scope`: LLM proposes candidate; **engine** validates confidence, writes `projects.project_scope`, appends `fact.captured` | LLM may propose but not materialize; avoids fact/state divergence | LLM sets scope; always asking explicitly |
| 2026-08-10 | ZIPs stored/compared as **strings** | Integers break on leading zeros when widened nationwide | Integer ZIPs |
| 2026-08-10 | Enum business logic uses **set membership `IN (...)`**, not `>=` ordering | Adding an enum value later must not silently change a rule | `>=` on enum order |
| 2026-08-10 | Audit payload field is **`qualification_status`** (not `outcome`) | One term system-wide; avoid naming drift | `outcome` |
| 2026-08-10 | Identity = **syntactic validity only** (provided != verified); no authenticity heuristic | Don't guess if a valid email is a "real" person in v1 | "Obviously fake" detection |
| 2026-08-10 | Out-of-area -> `NEEDS_REVIEW`, retained | Don't destroy business intelligence | Hard `NOT_SERVICEABLE` hiding the lead |
| 2026-08-10 | Versioned audit (`rule_set_version` + per-rule id/version/result) | Reconstruct past decisions after thresholds change | `failed_gates[]` strings only |
| 2026-08-10 | Photos NOT required for `QUALIFIED` in v1 | Keep the gate light; avoid rule-monster | Mandatory photos |

---

### Status: green light for implementation

Open items are closed and the final polish is applied. Do not keep polishing this engine
before real conversations. The **next spec** is the **Required Information Model +
Conversation Playbook v1**: what the AI asks for occupied remodel / vacant remodel / new
construction, what is mandatory vs optional, and how the Next Best Question is chosen.
