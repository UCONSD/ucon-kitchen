# Project State — Design Foundation

Status: **design draft** (Phase 2). This is the system the conversational AI sits on top
of. Design and agree this before writing the AI layer.

## The one principle everything hangs on

**The chat transcript is not the database.** The conversation is an input/output
interface. The source of truth is:

1. **Project State** — the current structured picture of one homeowner's kitchen project.
2. **Events** — an append-only log of everything that happened.

The **LLM emits events**. A **deterministic rules engine** reads state + events and
computes **milestone transitions**. The LLM never sets a milestone directly. This is what
keeps a smart conversation from running on a dumb system.

```
CUSTOMER
   │  (text, photos, uploads)
   ▼
CONVERSATION UI  ──►  LLM (understand / extract)  ──►  emits EVENTS
                                                          │
                                                          ▼
                                                  PROJECT STATE (source of truth)
                                                          │
                                                          ▼
                                                  RULES / QUALIFICATION ENGINE
                                                          │
                                                          ▼
                                         milestone transition + Next Best Action
```

---

## 1. Milestone state machine

`current_stage` tracks the furthest discovery progression reached. Qualification outcome
and "saved" are tracked separately (they are not strictly linear — a customer can save
after two minutes, and qualification is a computed verdict).

### Discovery stages (linear)

```
VISITOR_STARTED
   → PROJECT_UNDERSTOOD        (type, pain points, needs, style, appliances captured)
   → BUDGET_ESTABLISHED        (declared, refused, or "help me" — all three handled)
   → FIRST_VALUE_DELIVERED     (summary + initial assessment shown to customer)
   → QUALIFIED                 (passed deterministic gates)
   → HANDOFF_READY             (brief prepared for a human designer)
```

The **first customer-visible milestone** is `FIRST_VALUE_DELIVERED`:
"We understand your project well enough to tell you whether your expectations and budget
look realistic and what direction makes sense next." Target: 8–12 minutes of
conversation, hard ceiling ~15.

### Qualification outcome (computed verdict, separate field)

```
PENDING → one of:
   QUALIFIED           → proceed to HANDOFF_READY
   NURTURE             → real lead, not ready / soft mismatch; no designer yet
   NOT_SERVICEABLE     → outside service area
   BUDGET_MISMATCH     → budget vs requested scope don't align
```

### Saved (orthogonal boolean)

`is_saved` flips true once identity/contact is captured (§7 of the brief: offered after a
few meaningful answers, not up front). A project can be saved at any point from
`PROJECT_UNDERSTOOD` onward. **`HANDOFF_READY` requires `is_saved = true`.**

---

## 2. Data model (PostgreSQL / Supabase)

Typed columns for well-known fields; a `facts` table for anything needing provenance; an
`events` table as the append-only spine. Keep it relational — this is why we chose
Postgres over Firestore.

### `projects` — one row per kitchen project

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | channel-independent Project ID |
| `created_at` / `updated_at` | timestamptz | |
| `current_stage` | enum | see §1 |
| `qualification_outcome` | enum | `pending` default |
| `is_saved` | bool | identity captured |
| `channel` | enum | `web` (MVP); later `sms`, `email`, `whatsapp` |
| `assigned_designer_id` | uuid FK null | set at/after `HANDOFF_READY` |

### `project_state` core fields (columns on `projects` or a 1:1 table)

Well-known, queryable fields:

| Field | Example |
|-------|---------|
| `project_type` | `occupied_remodel` \| `vacant_remodel` \| `new_construction` |
| `zip` | `92037` (serviceability, local context, regional pricing — **not** a wealth proxy) |
| `budget_amount` | `80000` (nullable) |
| `budget_source` | `customer_declared` \| `assisted` \| `refused` \| `unknown` |
| `style_direction` | `warm contemporary` |
| `timeline` | e.g. `3-6 months` \| `exploring` |
| `plans_available` | bool (relevant for `new_construction`) |

Flexible/less-structured detail (pain points, needs, must/nice-to-haves, household use,
appliance preferences) can live in a `details jsonb` column for the MVP, promoted to typed
columns as they prove out.

### `facts` — provenance-tracked facts (§14 of brief)

For any fact where **where it came from matters**. This is what lets the app tell a
customer-declared budget from an inferred one, or a 2019 listing photo from current
condition.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `key` | text | e.g. `budget`, `property_value`, `existing_kitchen_condition` |
| `value` | jsonb | |
| `source` | enum | `customer` \| `llm_inferred` \| `external_listing` \| `designer` \| `site_verification` |
| `captured_at` | timestamptz | |
| `confidence` | enum | `high` \| `medium` \| `low` |
| `verification_status` | enum | `unverified` \| `customer_confirmed` \| `verified` |

Rule of thumb: a customer-declared budget is `source=customer, confidence=high`; a listing
photo is `source=external_listing, confidence=low` as current condition until the customer
confirms. Appliance model numbers must be re-verified before engineering/production
(future).

### `events` — append-only log (source of truth for funnel + transitions)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `type` | text | see event list below |
| `payload` | jsonb | |
| `actor` | enum | `system` \| `llm` \| `customer` \| `designer` |
| `created_at` | timestamptz | |

Never updated or deleted. Milestone transitions are derived from events, not written
ad hoc.

### `messages` — the transcript (interface, NOT source of truth)

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `project_id` | uuid FK |
| `role` | `customer` \| `assistant` \| `designer` |
| `content` | text |
| `created_at` | timestamptz |

### `files` — uploads linked to Project State (§12)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `storage_path` | text | Supabase Storage |
| `kind` | enum | `current_kitchen` \| `inspiration` \| `appliance` \| `floor_plan` \| `pdf_doc` |
| `uploaded_at` | timestamptz | |

### Identity / contact

Captured only after first value (§7). Store `name`, `email`, `phone`, `zip`, `address`
(address later/optional) linked to `project_id`, gated behind Supabase Auth once the
visitor saves. Anonymous-until-save is a core UX requirement.

---

## 3. Events (the vocabulary the LLM emits)

MVP set — extend deliberately, not casually:

```
conversation.started
message.received / message.sent
fact.captured                 { key, value, source, confidence }
scope.updated                 { project_type | pain_points | needs | style | appliances }
file.uploaded                 { file_id, kind }
budget.captured               { amount | refused | unknown, source }
first_value.delivered
qualification.evaluated       { outcome, reasons[], failed_gates[] }
identity.captured             → sets is_saved
project.saved
handoff.requested
handoff.assigned              { designer_id }
conversation.abandoned        { at_stage }
conversation.resumed
```

Funnel analytics (§30–31: started, first meaningful answer, photos uploaded, budget
reached, disclosed/refused, first milestone, abandonment stage, returned, paid step) are
derived from this same event stream and mirrored to **PostHog**. Postgres `events` is the
system of record; PostHog is the analytics view.

---

## 4. Deterministic rules (the SOP behind qualification)

These are **rules, not LLM judgment** (§19). Write them as an SOP first; they become the
qualification engine. Values in `CAPS` are configurable constants.

```
Serviceability
  IF zip NOT IN SERVICE_AREA
    → qualification_outcome = NOT_SERVICEABLE

Budget vs scope
  IF budget_amount < MINIMUM_VIABLE_BUDGET  AND  scope = full_custom
    → qualification_outcome = BUDGET_MISMATCH

New construction
  IF project_type = new_construction  AND  plans_available = true
    → next_best_action = REQUEST_PLANS

Qualification gate
  IF serviceable
     AND current_stage >= FIRST_VALUE_DELIVERED
     AND budget handled (declared OR explicitly refused OR assisted)
     AND no disqualifying gate failed
    → qualification_outcome = QUALIFIED
    → next_best_action = HUMAN_DESIGN_REVIEW
```

### Transition guards (invariants the engine enforces)

- Cannot reach `QUALIFIED` unless `current_stage >= FIRST_VALUE_DELIVERED` and the budget
  question has been handled.
- Cannot reach `HANDOFF_READY` unless `qualification_outcome = QUALIFIED` **and**
  `is_saved = true`.
- A failed serviceability or budget gate routes to `NOT_SERVICEABLE` / `BUDGET_MISMATCH` /
  `NURTURE` — **never** silently to a designer.
- Only the backend/rules engine writes `qualification_outcome`, `current_stage`,
  `assigned_designer_id`. The client (and the LLM) cannot.

### Row Level Security (Supabase, FULL mode)

- Anonymous visitor: can read/write only **their own** project (session-scoped) and only
  the customer-writable fields.
- `qualification_outcome`, `current_stage`, `assigned_designer_id`, `facts.source` for
  non-customer sources → backend-service-role writes only.
- Designers: read projects where `qualification_outcome = QUALIFIED`; write notes/status.

---

## 5. Layer separation (do not collapse these)

Per the brief (§18), the LLM must not run on one giant system prompt. Distinct layers:

1. **Project State** — structured truth (this doc).
2. **Required Information Model** — what we need to know per project type.
3. **Conversation Playbook** — modules: Basics, Existing Kitchen, Needs, Style,
   Appliances, Budget, Timeline (customer must not feel they're filling a form).
4. **Deterministic Rules** — §4 above.
5. **Next Best Question / Action** — given what we know, what's missing, and what matters
   most now.
6. **LLM conversational layer** — natural language and reasoning only.

The LLM owns 3 and 6. The system owns 1, 2, 4, 5. Business-critical transitions are
deterministic.

---

## 6. Open design questions (resolve in Phase 2 before implementation specs)

- `MINIMUM_VIABLE_BUDGET` and `SERVICE_AREA` (ZIP list or radius) — concrete values.
- Full-custom vs simpler scope: how is `scope` derived for the budget-mismatch rule?
- Anonymous session model: how a pre-auth visitor's project is keyed and later bound to a
  Supabase Auth user on save.
- Which `details` fields get promoted to typed columns for MVP vs left in `jsonb`.
- Required Information Model per `project_type` (occupied / vacant / new construction lead
  to different workflows — §9 of brief).
