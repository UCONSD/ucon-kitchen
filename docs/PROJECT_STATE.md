# Project State — Design Foundation (v2)

Status: **design foundation, synced with** `specs/2026-08-10-qualification-rules-engine.md`
and `specs/2026-08-10-required-information-model.md`.
This is the system the conversational AI sits on top of. Agree this before writing the AI layer.

## The one principle everything hangs on

**The chat transcript is not the database.** The conversation is an input/output interface.
The source of truth is:

1. **Project State** — the current structured picture of one homeowner's kitchen project.
2. **Events** — an append-only log of everything that happened.

The **LLM emits events**. A **deterministic rules engine** reads state + events and computes
**status transitions**. The LLM never sets a status directly.

```
CUSTOMER  --(text, photos, uploads, activity)-->  LLM (understand / extract)  --emits EVENTS-->
   PROJECT STATE (source of truth)  -->  RULES / QUALIFICATION ENGINE  -->  status + Next Best Action
```

### Events vs. materialized state (do not build full event-sourcing replay)

```
Events are immutable history.
`projects` contains the current materialized state.
The rules engine updates `projects` transactionally AND appends the corresponding event.
```

Do **not** rebuild current state by replaying the whole event log on every read. `events` is
the audit/source history; `projects` (and its sibling tables) hold the current materialized
state. One transaction writes both. Full event-sourcing with replay is not needed for MVP.

---

## 1. State dimensions (independent — never one enum standing in for another)

Four dimensions answer four different questions, and they are **orthogonal**:

```
qualification = is the project a fit?
intent        = does the customer want to continue?
identity      = can we identify them?
handoff       = is it OK to spend designer time now?
```

```
conversation_stage       DISCOVERY | FIRST_VALUE | DESIGN_REVIEW
qualification_status      UNASSESSED | INSUFFICIENT_DATA | POTENTIAL_FIT
                          | QUALIFIED | NEEDS_REVIEW | NOT_FIT
handoff_status            NOT_READY | READY | ASSIGNED
intent_status            ACTIVE | PAUSED | WITHDRAWN
customer_identity_status  ANONYMOUS | CONTACT_PROVIDED | CONTACT_VERIFIED
next_best_action          ASK_ZIP | ASK_SCOPE | ASK_BUDGET | REQUEST_PHOTOS
                          | DELIVER_FIRST_VALUE | SAVE_PROJECT | HUMAN_DESIGN_REVIEW
                          | OUT_OF_AREA_REVIEW | NURTURE | NOT_A_FIT | REQUEST_PLANS
```

- **conversation_stage** is the discovery lifecycle. `FIRST_VALUE` is the first
  customer-visible milestone (target 8–12 min, ceiling ~15).
- **handoff is its own dimension**, not a stage. **The designer work queue keys on
  `handoff_status = READY`, never on `qualification_status`.**
- **qualification_status** is the automation-eligibility verdict.
- **intent_status** is set by explicit customer signals only — no timer/scheduler. `ACTIVE`
  is the default (abandoned browser stays `ACTIVE`; abandonment recorded via analytics).
- **customer_identity_status** is syntactic only: `CONTACT_PROVIDED` = a syntactically valid
  email/phone; `CONTACT_VERIFIED` = future. Provided != verified.

These replace the v1 draft's `current_stage` / `qualification_outcome` / `is_saved`.

---

## 2. Data model (PostgreSQL / Supabase)

Typed columns for well-known fields; a `facts` table for provenance-tracked facts; an
`events` table as the append-only spine. `projects` holds current materialized state.

### `projects` — one row per kitchen project (current materialized state)

Status / dimension fields:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | channel-independent Project ID |
| `created_at` / `updated_at` | timestamptz | |
| `conversation_stage` | enum | default `DISCOVERY` |
| `qualification_status` | enum | default `UNASSESSED` |
| `handoff_status` | enum | default `NOT_READY` |
| `intent_status` | enum | default `ACTIVE` |
| `customer_identity_status` | enum | default `ANONYMOUS` |
| `next_best_action` | enum | nullable |
| `channel` | enum | `web` (MVP); later `sms`, `email`, `whatsapp` |
| `assigned_designer_id` | uuid FK null | set only when `handoff_status = ASSIGNED` (post-v1) |

Cost-driver fields (FIRST_VALUE model — see the Required Information Model spec). Fields
marked *(engine)* are engine-materialized from customer narrative/photos, never client-written:

| Column | Type | Notes |
|--------|------|-------|
| `project_type` | enum | `occupied_remodel | vacant_remodel | new_construction` |
| `project_scope` | enum *(engine)* | `cabinetry_only | cabinetry_install | full_kitchen_project | unknown_scope` |
| `zip` | text | **string**, never integer; serviceability + regional context |
| `layout_type` | enum | `ONE_WALL | GALLEY | L_SHAPED | U_SHAPED | OTHER` |
| `island` | enum | `NONE | EXISTING | PLANNED` |
| `size_class` | enum *(engine)* | `COMPACT | STANDARD | LARGE | VERY_LARGE | UNKNOWN` |
| `layout_change` | enum *(engine)* | `KEEP_BASIC_LAYOUT | MODERATE_CHANGE | MAJOR_RECONFIGURATION | UNKNOWN` |
| `site_work_complexity` | enum *(engine)* | `LOW | MODERATE | HIGH | UNKNOWN` |
| `product_level` | enum *(engine)* | `STANDARD_CUSTOM | PREMIUM_CUSTOM | ARCHITECTURAL_CUSTOM | UNKNOWN` |
| `appliance_tier` | enum *(engine)* | `MAINSTREAM | PREMIUM | LUXURY_INTEGRATED | UNKNOWN` |
| `budget_amount` | int null | USD |
| `budget_source` | enum | `UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED` |
| `plans_available` | bool null | `new_construction`; if true -> `REQUEST_PLANS` |
| `primary_pain_points` | text[] | 1–2 items; what's wrong today |
| `primary_must_haves` | text[] | 1–2 items; desired outcomes |
| `timeline` | text null | not a FIRST_VALUE gate |
| `style_direction` | text null | coarse only; detail is post-FIRST_VALUE |
| `details` | jsonb | flexible narrative: existing conditions, needs, appliance prefs |

Derived output:

| Column | Type | Notes |
|--------|------|-------|
| `first_value_confidence` | enum *(derived)* | `LOW | MEDIUM | HIGH`; drives budget-range width + summary wording |

Status, engine-materialized, and derived columns are **service-role write only** (RLS). The
client and the LLM cannot write them.

### `facts` — provenance-tracked facts

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `key` | text | e.g. `budget`, `project_scope`, `layout_change`, `product_level` |
| `value` | jsonb | |
| `source` | enum | `customer | llm_inferred | external_listing | designer | site_verification` |
| `captured_at` | timestamptz | |
| `confidence` | enum | `high | medium | low` |
| `verification_status` | enum | `unverified | customer_confirmed | verified` |

Materialized cost-driver fields carry a `facts` confidence so `first_value_confidence` and the
summary can hedge.

### `events` — append-only log (immutable history)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `type` | text | see section 3 |
| `payload` | jsonb | |
| `actor` | enum | `system | llm | customer | designer` |
| `created_at` | timestamptz | |

Never updated or deleted. Written in the same transaction that updates `projects`.

### `messages` — the transcript (interface, NOT source of truth)

`id`, `project_id`, `role` (`customer | assistant | designer`), `content`, `created_at`.

### `files` — uploads linked to Project State

`id`, `project_id`, `storage_path` (Supabase Storage), `kind`
(`current_kitchen | inspiration | appliance | floor_plan | pdf_doc`), `uploaded_at`.
Photos/plans can materialize `layout_type`, `island`, `size_class`, product/appliance signals.

### Identity / contact

Captured only after first value. A **syntactically valid** email or phone advances
`customer_identity_status` to `CONTACT_PROVIDED` (provided != verified; no authenticity check
in v1). Anonymous-until-save (anonymous Supabase Auth user upgraded in place on save so
`auth.uid()` never changes).

---

## 3. Events (the vocabulary the LLM emits)

MVP set — extend deliberately:

```
conversation.started
message.received / message.sent
fact.captured            { key, value, source, confidence }
scope.updated            { project_type | project_scope | pain_points | must_haves | style | appliances }
file.uploaded            { file_id, kind }
budget.captured          { amount | none, budget_source }
first_value.delivered    { first_value_confidence }
intent.updated           { intent_status }              # explicit signals only
qualification.evaluated  { qualification_status, rule_set_version, rule_results[], missing_fields[], evaluated_at }
identity.captured        { customer_identity_status }
handoff.ready
handoff.assigned         { designer_id }                # post-v1
conversation.abandoned   { at_stage }                   # analytics; does NOT change intent_status
conversation.resumed
```

Funnel analytics (§30–31 of the brief) are derived from this stream and mirrored to
**PostHog**. Postgres `events` is the system of record; PostHog is the analytics view.

---

## 4. Rules & guards (owned by the engine; full logic in the specs)

Qualification/handoff logic: `specs/2026-08-10-qualification-rules-engine.md`.
Cost-driver / FIRST_VALUE model: `specs/2026-08-10-required-information-model.md`.

- Only the **service role** writes `qualification_status`, `handoff_status`, `conversation_stage`,
  `next_best_action`, the engine-materialized cost drivers (`project_scope`, `size_class`,
  `layout_change`, `site_work_complexity`, `product_level`, `appliance_tier`), and the derived
  `first_value_confidence`. The client/LLM cannot.
- Each evaluation updates `projects` transactionally AND appends a versioned event.
- The **designer queue is filtered by `handoff_status = READY`**, not `qualification_status`.
- `handoff_status = READY` only if `qualification_status = QUALIFIED`
  AND `customer_identity_status IN (CONTACT_PROVIDED, CONTACT_VERIFIED)`
  AND `intent_status = ACTIVE`. Enum conditions use set membership, not `>=`.
- Engine-materialized categories come from an LLM candidate only at sufficient confidence;
  else the relevant `ASK_*` next_best_action. The engine writes both `projects` and `facts`.
- FIRST_VALUE hard floor (see RIM spec): `project_type`, `zip`, `project_scope`, budget handled,
  `size_class`, `layout_change`, and at least one of `product_level` / `appliance_tier`.
  UNKNOWN drivers lower `first_value_confidence` rather than block.
- Out-of-area ZIP -> `qualification_status = NEEDS_REVIEW` (retained), never discarded.
- RLS: an anonymous visitor can read/write only **their own** project, and only
  customer-writable fields.

---

## 5. Layer separation (do not collapse these)

1. **Project State** — structured truth (this doc).
2. **Required Information Model** — what we must KNOW per project type (spec written).
3. **Conversation Playbook** — modules + how each field is obtained (next spec).
4. **Deterministic Rules** — the qualification spec.
5. **Next Best Question / Action** — given what we know, what's missing, what matters most now.
6. **LLM conversational layer** — natural language and reasoning only.

The LLM owns 3 and 6. The system owns 1, 2, 4, 5. Business-critical transitions are deterministic.

---

## 6. Open questions (implementation / later specs — not blocking)

- Anonymous session keying and in-place upgrade to a permanent Supabase Auth user on save.
- Which `details` narrative (esp. occupied-remodel existing conditions) gets promoted to typed
  columns once patterns repeat across the first ~50–100 conversations.
- **Conversation Playbook + Next Best Question v1** — module ordering, ask-vs-infer, when a
  photo replaces a question, and the single most-valuable-next-question rule (next spec).
