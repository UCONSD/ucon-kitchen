# Feature Spec: Required Information Model v1 (FIRST_VALUE)

> Copy of `specs/spec-template.md`, filled in. Defines the minimum information the system
> must KNOW to deliver `FIRST_VALUE`. Pairs with the Qualification Rules Engine spec and
> `docs/PROJECT_STATE.md`.
> Mode: **Light** (requirements/design). NOTE: implementing these fields touches the
> `projects` schema and the RLS/write-path for engine-materialized fields — that migration
> is **Full** mode (clean-session security review) when it lands.

---

## Founding principle (read first)

**The Required Information Model defines what the system must KNOW, not what it must ASK.**

Mandatory information != mandatory questions. A single uploaded photo or floor plan can
materialize `layout_type`, `island`, an approximate `size_class`, product aspirations, and
existing conditions at once. Asking five questions when one image already answered them is
bad UX. The Conversation Playbook (next spec) decides *how* to obtain each field; this spec
only defines *what* must be known and *why*.

**Inclusion test for any FIRST_VALUE field:** could the answer materially change our verdict
"$X looks realistic / unrealistic" *before a designer has looked at the project*? If no, it
is not a FIRST_VALUE requirement.

**Customers never self-classify.** The customer describes what they want in natural language;
the **engine materializes** the category (same pattern as `project_scope` in QUAL-SCOPE-001).
We never ask "what is your site_work_complexity?".

## 0. Filter

- **Whose time does this save?** The designer's (a complete-enough brief, no re-discovery)
  and the customer's (no interrogation). It also protects the credibility of FIRST_VALUE —
  a realism verdict is only honest if the cost drivers behind it are known.
- **Framework:** capacity + margin (right leads, less human triage); risk = giving a false
  realism verdict from missing drivers, mitigated by confidence + caveats.
- **Without code?** This is the SOP for what discovery must obtain. Codified so it runs the
  same every time.

## 1. Problem

The Qualification Engine knows *how* to decide, but nothing yet defines *what* the
conversation must obtain. Without a defined minimum, the AI will either under-collect (and
give a meaningless "budget looks fine") or over-ask (a 45-minute questionnaire). We need the
smallest set of cost drivers that lets us honestly judge budget/scope realism.

## 2. User

- A **homeowner** who must not feel interrogated; many fields should come from their story
  and any photos/plans, not a checklist.
- The **rules engine**, which needs the cost drivers to bound a budget range and run
  QUAL-SUFFICIENCY-001.
- The **designer**, who inherits a complete-enough brief and does not repeat discovery.

## 3. Why realism = a small set of cost drivers

Budget realism is a function of a handful of variables, not of exhaustive detail:

```
realistic_budget ≈ f(scope, physical_scale, change_complexity, product_level, region)
```

So the FIRST_VALUE minimum is exactly these drivers plus the qualification-gate inputs — no
countertops, door styles, hardware brands, exact appliances, colors, or storage inventories.

## 4. The FIRST_VALUE minimum information model

Grouped by cost driver. Each field is an enum with an `UNKNOWN` where inference may be
partial. "Obtained via" lists acceptable sources — **any** of them satisfies the requirement.

### PROJECT CONTEXT
- **project_type** — `occupied_remodel | vacant_remodel | new_construction`. Drives logistics
  and which deltas apply (section 6). Obtained via: direct question or narrative.
- **zip** — string. Serviceability gate + regional cost context. Obtained via: direct question.

### SCOPE
- **project_scope** — `cabinetry_only | cabinetry_install | full_kitchen_project | unknown_scope`.
  (Defined in the Qualification spec; materialized by the engine.) What we are doing.

### PHYSICAL SCALE
- **layout_type** — `ONE_WALL | GALLEY | L_SHAPED | U_SHAPED | OTHER`. Obtained via: "which is
  closest to your kitchen?" or inferred from photos/plans.
- **island** — `NONE | EXISTING | PLANNED`. Obtained via: question, photo, or narrative.
- **size_class** — `COMPACT | STANDARD | LARGE | VERY_LARGE | UNKNOWN`. Rough feel, not sq ft or
  linear feet (homeowners don't know those, and sq ft correlates poorly with cabinetry). A
  150 sq ft kitchen with three walls of cabinets can exceed a 200 sq ft one-wall kitchen.
  Obtained via: "roughly how big does it feel: compact / average / large / very large?" or
  improved from photos/plans.

### CHANGE COMPLEXITY
- **layout_change** — `KEEP_BASIC_LAYOUT | MODERATE_CHANGE | MAJOR_RECONFIGURATION | UNKNOWN`.
  The single biggest hidden budget multiplier. Swapping fridge/pantry positions vs moving the
  sink to a new island and relocating gas are wildly different. Obtained via: the customer
  describes what they want to change; the **engine materializes** the category. Never asked as
  a classification.
- **site_work_complexity** — `LOW | MODERATE | HIGH | UNKNOWN`. Especially for
  `full_kitchen_project`. "Rip and replace in the same footprint" vs "remove a wall, redo
  floor, plumbing, electrical, ceiling, HVAC" can have identical kitchen size and identical
  cabinets but very different project budgets. Obtained via: narrative -> engine materializes.
  For `full_kitchen_project` this is effectively required: if `UNKNOWN`, the First Value
  Summary must show **low confidence and a wide range** (see section 7).

### PRODUCT LEVEL
- **product_level** — `STANDARD_CUSTOM | PREMIUM_CUSTOM | ARCHITECTURAL_CUSTOM | UNKNOWN`.
  Answers "what level of product", which `project_scope` does NOT capture: `cabinetry_only`
  in a simple painted slab can cost less than `cabinetry_only` in premium veneer with complex
  interiors and expensive hardware. `ARCHITECTURAL_CUSTOM` is the high tier where premium
  veneers, integrated interiors, complex detailing and architectural integration appear
  ("luxury" is too subjective). Obtained via: NOT "what material tier do you want?" (they
  don't know) but a human-legible prompt — e.g. "a well-designed custom kitchen with good
  materials, or are premium veneers, specialty finishes, integrated interiors and
  architectural detailing important to you?" — and, often more informative, inspiration
  photos. Engine materializes.
- **appliance_tier** — `MAINSTREAM | PREMIUM | LUXURY_INTEGRATED | UNKNOWN`. A real budget
  signal. `LUXURY_INTEGRATED` captures that Sub-Zero/Wolf/Gaggenau-class appliances are often
  an integrated ecosystem that drives cabinetry requirements, not merely "expensive". Obtained
  via: brand mentions, narrative, or appliance photos. Exact model numbers are NOT needed for
  FIRST_VALUE.

### ECONOMICS
- **budget_amount** (int, USD, nullable) + **budget_source**
  (`UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED`). From the Qualification
  spec. The product must work when budget is declared, refused, or unknown.

### CUSTOMER VALUE
- **primary_pain_points[]** — 1–2 items, free text. What's wrong / frustrating today.
- **primary_must_haves[]** — 1–2 items, free text. Desired outcomes.
  Pain points and desired outcomes are distinct entities (useful later for conversation and
  reporting), so they are separate fields even if each holds only 1–2 items. Needed to say
  "this direction makes sense" and so the customer feels understood — NOT a full needs inventory.

### DERIVED OUTPUT (not customer input, not a cost driver)
- **first_value_confidence** — `LOW | MEDIUM | HIGH`. A **derived state** the engine computes
  from how many drivers are known and whether photos/plans exist. It drives the width of the
  budget range and the wording of the First Value Summary (section 7). Stored, service-role
  written.

## 5. What is explicitly NOT a FIRST_VALUE requirement

Deferred to later modules / to the designer / to Site Verification (they fail the inclusion
test — they don't move the realism verdict pre-designer):

- Countertop material, door style, cabinet construction details, hardware brand.
- Exact appliance model numbers.
- Full needs inventory (pantry specifics, seating counts, storage lists).
- Detailed style (specific colors, finishes) beyond the coarse `product_level` signal.
- Exact measurements / true geometry — that is Site Verification's job later.
- A structured `existing_conditions` field — for v1 existing conditions live as narrative in
  `facts` / `details` (with provenance); promote to typed fields only once patterns repeat
  across the first ~50–100 conversations.
- Photos and floor plans are **not required**, but when present they materialize several
  fields above and improve estimates.

## 6. Per-project-type deltas

- **occupied_remodel** — also capture existing conditions, what's wrong / what stays (as
  narrative in `facts`/`details`, not a typed field yet), and the reality that people live
  there (raises `site_work_complexity` and logistics).
- **vacant_remodel** — similar, but logistics simpler; often a full gut, which affects
  `layout_change` / `site_work_complexity`.
- **new_construction** — no existing kitchen. Add **plans_available** (bool); if true ->
  `next_best_action = REQUEST_PLANS`. `layout_type` / `size_class` / `island` come from the
  plans rather than an existing room.

## 7. "Known enough for FIRST_VALUE" and confidence

FIRST_VALUE is delivered when the engine can produce a **bounded** realism assessment. Each
driver left `UNKNOWN` widens the range and lowers `first_value_confidence` rather than
blocking outright.

**Hard floor (required to attempt any verdict):**

```
project_type
zip (serviceable)
project_scope
budget handled
size_class
layout_change
AND at least one of: product_level, appliance_tier
```

Rationale for the last clause: without any product/appliance signal we would price the same
"large kitchen" identically for mainstream vs Sub-Zero/Wolf — not honest.

**Accuracy enhancers (UNKNOWN -> wider band + lower confidence):** `site_work_complexity`,
`layout_type`, `island`, and the second of product_level/appliance_tier. For
`full_kitchen_project`, `site_work_complexity = UNKNOWN` forces low confidence.

**`first_value_confidence` mapping:**

```
HIGH   — nearly all drivers known; photos/plans present
MEDIUM — hard floor known; 1–2 secondary drivers unknown
LOW    — hard floor barely met; site/product complexity uncertain
```

The First Value Summary states its confidence and what would sharpen it ("a photo of your
kitchen would let us tighten this"), rather than pretending to precision.

## 8. Acceptance Criteria

- [ ] Each driver is stored as its defined enum (with `UNKNOWN` where applicable), not free
      text; `size_class` is a class, never raw sq ft / linear feet.
- [ ] `layout_change`, `site_work_complexity`, `product_level`, `size_class`, `project_scope`
      are **engine-materialized** from customer narrative/photos — never asked as a
      classification and never client-written.
- [ ] Hard floor enforced: FIRST_VALUE requires `project_type`, `zip`, `project_scope`, budget
      handled, `size_class`, `layout_change`, **and at least one of** `product_level` /
      `appliance_tier`.
- [ ] For `full_kitchen_project`, `site_work_complexity = UNKNOWN` yields
      `first_value_confidence = LOW` and a wide range in the summary.
- [ ] `first_value_confidence` is a derived `LOW|MEDIUM|HIGH` value, service-role written,
      driving range width and summary wording; it is not a customer input.
- [ ] `primary_pain_points[]` and `primary_must_haves[]` are separate array fields.
- [ ] Uploading a photo/plan can satisfy `layout_type` / `island` / `size_class` without asking
      the corresponding questions (know-not-ask verified end to end).
- [ ] `new_construction` sets `plans_available` and, if true, `REQUEST_PLANS`; no "existing
      kitchen" fields are required.
- [ ] No deferred field (section 5) is required; every mandatory field passes the inclusion test.

## 9. Out of Scope

- The **Conversation Playbook + Next Best Question** logic (the next spec) — *how* to obtain
  each field, module ordering, and choosing the most valuable next question.
- Site Verification geometry; pricing math; the actual budget-range model (the engine consumes
  these drivers — the pricing function itself is separate).
- Any field from section 5.

## 10. Data & Risk Notes

- **New `projects` columns:** `layout_type`, `island`, `size_class`, `layout_change`,
  `site_work_complexity`, `product_level`, `appliance_tier`, `first_value_confidence`,
  `primary_pain_points[]`, `primary_must_haves[]` (+ `plans_available`). Engine-materialized
  and derived ones are **service-role write only** (RLS) — migration + RLS review is **Full**
  mode at implementation.
- Each materialized field carries a confidence (via `facts`) so the summary can hedge.
- No live-data migration (pre-launch).

## 11. Decision Log

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
| 2026-08-10 | Required Information Model defines what the system must KNOW, not what it must ASK | Photos/plans/narrative can materialize many fields; asking per field is bad UX | Fixed questionnaire |
| 2026-08-10 | Size via `layout_type` + `island` + `size_class`, not sq ft / linear feet | Homeowners don't know those; sq ft correlates poorly with cabinetry | Square footage / linear feet |
| 2026-08-10 | Separate `product_level` from `project_scope` | Scope = what we do; product_level = at what level — different cost drivers | Folding product level into scope |
| 2026-08-10 | `layout_change` 4-value enum, engine-materialized | Huge budget swing minor vs major reconfiguration; customer can't classify | `yes/no` boolean |
| 2026-08-10 | Add `site_work_complexity`; for full_kitchen_project, UNKNOWN forces LOW confidence | Same kitchen/cabinets, very different budget with structural/MEP work | Omitting it |
| 2026-08-10 | Hard floor also requires **at least one of** product_level / appliance_tier | Otherwise mainstream vs Sub-Zero/Wolf priced identically — dishonest | size_class + layout_change alone |
| 2026-08-10 | Enum names: `STANDARD_/PREMIUM_/ARCHITECTURAL_CUSTOM`; `MAINSTREAM/PREMIUM/LUXURY_INTEGRATED` | Neutral internal levels; avoid marketing-package names; capture integrated-appliance reality | `VALUE/PREMIUM/LUXURY_CUSTOM`; a flat "luxury" appliance tier |
| 2026-08-10 | `first_value_confidence` (LOW/MEDIUM/HIGH) as an explicit derived output | Range width + summary wording must reflect what we actually know; no false precision | Confidence left conceptual |
| 2026-08-10 | Split `primary_pain_points[]` / `primary_must_haves[]` | Pain and desired outcome are distinct; useful for conversation/reporting | One combined field |
| 2026-08-10 | No structured `existing_conditions` in v1; keep as narrative in facts/details | Avoid bloating the model; promote only when patterns repeat | Typed existing_conditions now |
| 2026-08-10 | Inclusion test gates every mandatory field | Prevents rule-monster; keeps FIRST_VALUE minimal | Collecting detail that doesn't move the verdict |

---

### Open items — CLOSED in this version

1. Hard floor includes at-least-one of product_level/appliance_tier; site_work_complexity
   near-required for full_kitchen_project (LOW confidence if UNKNOWN).
2. Enum names finalized (product_level, appliance_tier above).
3. No structured existing_conditions in v1 — narrative in facts/details.
Added: `first_value_confidence` derived output; pain_points/must_haves split.

### Next spec

**Conversation Playbook + Next Best Question v1** — turning this information model into a
natural conversation: module ordering, how each field is obtained (ask vs infer from
photos), when a photo replaces a question, and the rule that picks the single most valuable
next question given what we know, what's missing, and what matters most now.
