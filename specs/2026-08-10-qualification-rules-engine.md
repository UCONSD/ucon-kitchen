# Feature Spec: Qualification Rules Engine (v2)

> Copy of `specs/spec-template.md`, filled in. **v2** — revised after Phase-1 review
> (adds `handoff_status`, `intent_status`, and a formal `budget_source` enum).
> Mode: **Full** (touches RLS, anonymous/public traffic, budget/qualification — money-adjacent)
> Full is MANDATORY if this touches: auth, permissions (RLS), money, live data, anonymous
> traffic, or PII.

---

## Philosophy (read first)

The rules engine decides **automation eligibility, not ultimate customer worth**.

```
QUALIFIED      -> auto human handoff (designer-ready)
POTENTIAL_FIT / INSUFFICIENT_DATA / NEEDS_REVIEW -> queue / nurture / founder review
NOT_FIT        -> no designer
```

A wrong disqualification costs a real customer, so the engine is conservative: when unsure
it routes to review or nurture, it never silently discards a lead.

## 0. Filter

- **Whose time does this save?** The designer's. It ensures scarce human design time is
  spent only on projects with **minimum sufficient information** — not on empty or
  unqualified leads. Capacity protection is the whole point.
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
- **The designer**, who must only see `QUALIFIED` projects, and a **founder/manual review
  queue** for `NEEDS_REVIEW` (e.g., high-value out-of-area).

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

Handoff is its **own** dimension — it is NOT a `conversation_stage`. A project can be in
`conversation_stage = DESIGN_REVIEW` while `handoff_status` moves NOT_READY -> READY -> ASSIGNED.

`qualification_status` meaning:
- **UNASSESSED** — not yet evaluated.
- **INSUFFICIENT_DATA** — evaluated but required fields missing; carries `missing_fields[]`.
- **POTENTIAL_FIT** — serviceable, no clear mismatch, progressing; not yet all QUALIFIED criteria met.
- **QUALIFIED** — minimum sufficient info met (section 4.3) -> designer-ready, auto-handoff eligible.
- **NEEDS_REVIEW** — ambiguous or out-of-area-but-worth-a-look -> manual/founder review; **not discarded**.
- **NOT_FIT** — clear no (e.g., declared budget below the scope-appropriate floor) -> no designer.

`intent_status` meaning (deterministic, engine-set — not LLM judgment):
- **ACTIVE** — the customer sent a message or confirmed intent within the current session /
  activity window. Required for auto-handoff.
- **PAUSED** — inactivity beyond the window, or an explicit "not right now". Does **not**
  disqualify, but **blocks auto-handoff** until the customer returns (re-sets ACTIVE).
- **WITHDRAWN** — explicit opt-out / "stop". Blocks handoff; routes to NURTURE/closed.

- **Fields read:** `zip`, `project_type`, `project_scope`, `budget_amount`, `budget_source`,
  `conversation_stage`, `intent_status`, `customer_identity_status`.
- **Fields written (service role only):** `qualification_status`, `handoff_status`,
  `next_best_action`; `conversation_stage` advances proposed by the engine. LLM never writes them.
- **Confirm:** LLM only emits `fact.captured` / `budget.captured` / activity signals; the engine
  computes all status fields. [OK]

### 4.2 Constants (this release)

```
RULE_SET_VERSION = 1

# Scope-dependent budget floors (USD). full_kitchen_project = 30000 (confirmed).
# cabinetry_only / cabinetry_install: TO CONFIRM (examples shown, not final).
MIN_BUDGET_BY_SCOPE = {
  cabinetry_only:       <confirm, e.g. 15000>,
  cabinetry_install:    <confirm, e.g. 22000>,
  full_kitchen_project: 30000,
  unknown_scope:        null    # never fail the budget gate on unknown scope; ASK_SCOPE
}

SERVICE_AREA_ZIPS = <San Diego allowlist>   # configurable; MVP = San Diego only

# budget_source is a fixed enum:
BUDGET_SOURCE = UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED
```

### 4.3 Rules (SOP as code, each with a stable rule_id + version)

```
QUAL-SERVICE-001  (serviceability)
  IF zip IN SERVICE_AREA_ZIPS       -> serviceable = yes
  IF zip NOT IN SERVICE_AREA_ZIPS   -> serviceable = no
        qualification_status = NEEDS_REVIEW  (reason = OUT_OF_AREA)
        next_best_action = OUT_OF_AREA_REVIEW
        # Preserve the lead for founder review. Do NOT auto-route to a designer, do NOT discard.

QUAL-BUDGET-001  (scope-aware budget floor; only when a number was declared)
  floor = MIN_BUDGET_BY_SCOPE[project_scope]
  IF project_scope = unknown_scope
        -> do not fail; next_best_action = ASK_SCOPE
  ELSE IF budget_source = CUSTOMER_DECLARED AND budget_amount < floor
        -> qualification_status = NOT_FIT  (reason = BUDGET_BELOW_SCOPE_FLOOR)
        -> next_best_action = NURTURE
  # budget_source in {CUSTOMER_REFUSED, SYSTEM_ASSISTED, UNKNOWN} never fails this gate.

QUAL-INTENT-001  (intent)
  intent_status = ACTIVE   IF customer active within the activity window
  intent_status = PAUSED   IF inactive beyond the window OR explicit "not now"
  intent_status = WITHDRAWN IF explicit opt-out
  # PAUSED/WITHDRAWN never set NOT_FIT by themselves; they gate handoff (QUAL-HANDOFF-001).

QUAL-SUFFICIENCY-001  (what QUALIFIED actually requires)
  QUALIFIED requires ALL of:
     serviceable = yes
     project_type known
     project_scope minimally known
     budget status handled (CUSTOMER_DECLARED>=floor OR CUSTOMER_REFUSED OR SYSTEM_ASSISTED)
     conversation_stage >= FIRST_VALUE
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
        AND customer_identity_status >= CONTACT_PROVIDED
        AND intent_status = ACTIVE
  # handoff_status = ASSIGNED is out of scope for v1 (no designer assignment yet).
```

### 4.4 Audit event (`qualification.evaluated`)

Every evaluation emits a versioned, per-rule trace so any past decision can be reconstructed.

```json
{
  "outcome": "NOT_FIT",
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

Why versioned: when the floor changes from $30k to $40k next year, "why was this January
lead rejected?" must still be answerable. Decision -> rule -> version -> audit trail.

## 5. Acceptance Criteria

- [ ] `conversation_stage`, `qualification_status`, `handoff_status`, `intent_status`,
      `customer_identity_status`, `next_best_action` are **separate** fields; no enum value of
      one appears in another. `HANDOFF_READY` is not a `conversation_stage`.
- [ ] `handoff_status` becomes `READY` only when QUAL-HANDOFF-001 holds; a `QUALIFIED` project
      with `intent_status = PAUSED` stays `handoff_status = NOT_READY`.
- [ ] A serviceable project missing `project_scope` is `INSUFFICIENT_DATA` with
      `missing_fields = ["project_scope"]` — not `QUALIFIED`.
- [ ] `QUALIFIED` is set only when all QUAL-SUFFICIENCY-001 criteria hold (incl. `intent_status = ACTIVE`).
- [ ] `cabinetry_only` at $18k is NOT auto-`NOT_FIT` on the full-project floor; the budget gate
      uses the scope-appropriate floor.
- [ ] `budget_source` is one of `UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED`;
      only `CUSTOMER_DECLARED` below floor yields `NOT_FIT`; the other three never fail the gate.
- [ ] An out-of-area ZIP yields `NEEDS_REVIEW` + `OUT_OF_AREA_REVIEW`, retained for founder review.
- [ ] `intent_status = WITHDRAWN` blocks handoff and routes to NURTURE/closed, without setting `NOT_FIT`.
- [ ] `qualification.evaluated` includes `rule_set_version` and per-rule `rule_id + rule_version + result [+ reason]`.
- [ ] The client/LLM cannot write any status field — a client-side write is rejected by RLS.

## 6. Out of Scope

- Weighted qualification scoring (no "AI score 87.4%").
- Property Intelligence / property-value / ZIP-wealth signals.
- Appliance tiers, project-type weighting, new-construction preference.
- Contact **verification** (`CONTACT_VERIFIED`) and designer **assignment**
  (`handoff_status = ASSIGNED`): the enum values exist, but neither is built in v1.
- County/state/radius service rules (San Diego ZIP allowlist only).

## 7. Data & Risk Notes (Full mode only)

- **Tables read:** `projects` (+ `facts` for budget provenance). **Written:**
  `qualification_status`, `handoff_status`, `next_best_action`, `conversation_stage`, plus
  append-only `qualification.evaluated` events.
- **RLS:** all status fields are **service-role write only**; anonymous/customer role cannot
  write them. Clean-session security review mandatory (Phase 4). Test that a client write fails.
- **Anonymous/public:** engine runs on unauthenticated visitors -> confirm rate limiting and
  that a visitor cannot force `QUALIFIED` by crafting inputs.
- **Identity:** `customer_identity_status` must derive from real captured contact, not a flag
  the client can flip. A blank/obviously-fake email stays `ANONYMOUS`.
- **PII:** at qualification only ZIP is needed; contact captured only at save.
- **Migration:** none (new tables, pre-launch).

## 8. Decision Log

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
| 2026-08-10 | Split state into independent dimensions (conversation_stage / qualification_status / handoff_status / intent_status / next_best_action + identity) | One enum standing in for another produces state spaghetti; lifecycle != qualification != handoff | Single `current_stage` enum mixing all (v1) |
| 2026-08-10 | `handoff_status = NOT_READY | READY | ASSIGNED` as its own dimension | `HANDOFF_READY` was wrongly a `conversation_stage`; keep lifecycle and handoff separate | Adding HANDOFF_READY to the stage enum |
| 2026-08-10 | Formal `intent_status = ACTIVE | PAUSED | WITHDRAWN`; ACTIVE required for auto-handoff | "customer intent still active" was too vague and handed qualification back to the LLM | Leaving intent implicit |
| 2026-08-10 | Formal `budget_source = UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED` | Makes acceptance tests unambiguous | Free-form budget source strings |
| 2026-08-10 | `POTENTIAL_FIT` + `INSUFFICIENT_DATA`; `QUALIFIED` = minimum sufficient info | `QUALIFIED` must mean designer-ready | v1's easy QUALIFIED |
| 2026-08-10 | Scope-dependent budget floor (`MIN_BUDGET_BY_SCOPE`) | $27k cabinetry-only != $32k full remodel | Universal $30k floor |
| 2026-08-10 | Out-of-area -> `NEEDS_REVIEW` + `OUT_OF_AREA_REVIEW`, retained | Don't destroy business intelligence | Hard `NOT_SERVICEABLE` that hides the lead |
| 2026-08-10 | Versioned audit (`rule_set_version` + per-rule id/version/result) | Reconstruct past decisions after thresholds change | `failed_gates[]` strings only |
| 2026-08-10 | Photos NOT required for `QUALIFIED` in v1 | Keep the gate light; avoid rule-monster | Mandatory photos |

---

### Open items to confirm before implementation

1. **Budget floors** for `cabinetry_only` and `cabinetry_install` (full_kitchen_project = 30000
   confirmed). Confirm the coarse `project_scope` values map cleanly to the four buckets.
2. **Exact San Diego ZIP coverage** for `SERVICE_AREA_ZIPS` (city vs metro/county).
3. **How `project_scope` is derived** early in conversation (LLM-inferred vs asked) — affects
   when the budget gate runs vs. when it should `ASK_SCOPE`.
