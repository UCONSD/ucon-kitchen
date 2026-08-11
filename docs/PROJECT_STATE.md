# Project State — Design Foundation (v2)

Status: **design draft, synced with** `specs/2026-08-10-qualification-rules-engine.md` (v2).
This is the system the conversational AI sits on top of. Design and agree this before
writing the AI layer.

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

---

## 1. State dimensions (independent — never one enum standing in for another)

A project is described by several **orthogonal** dimensions. Keeping them separate is what
prevents state spaghetti. (Full semantics live in the qualification spec; summarized here.)

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

- **conversation_stage** is the discovery lifecycle. `FIRST_VALUE` is the first
  customer-visible milestone: "we understand your project well enough to tell you whether
  budget/scope look realistic and what's next" (target 8–12 min conversation, ceiling ~15).
- **handoff is its own dimension**, not a stage. A project can be in
  `conversation_stage = DESIGN_REVIEW` while `handoff_status` moves NOT_READY -> READY -> ASSIGNED.
- **qualification_status** is the automation-eligibility verdict (see spec philosophy:
  QUALIFIED -> auto handoff; POTENTIAL_FIT / INSUFFICIENT_DATA / NEEDS_REVIEW -> queue / nurture /
  founder review; NOT_FIT -> no designer).
- **intent_status** and **customer_identity_status** are engine-set gates on auto-handoff;
  neither is a boolean the client can flip.

These replace the v1 draft's `current_stage` / `qualification_outcome` / `is_saved`.

---

## 2. Data model (PostgreSQL / Supabase)

Typed columns for well-known fields; a `facts` table for provenance-tracked facts; an
`events` table as the append-only spine.

### `projects` — one row per kitchen project

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
| `project_type` | enum | `occupied_remodel | vacant_remodel | new_construction` |
| `project_scope` | enum | `cabinetry_only | cabinetry_install | full_kitchen_project | unknown_scope` |
| `zip` | text | serviceability + local context (not a wealth proxy) |
| `budget_amount` | int null | USD |
| `budget_source` | enum | `UNKNOWN | CUSTOMER_DECLARED | CUSTOMER_REFUSED | SYSTEM_ASSISTED` |
| `style_direction` | text null | |
| `timeline` | text null | |
| `plans_available` | bool null | relevant for `new_construction` |
| `channel` | enum | `web` (MVP); later `sms`, `email`, `whatsapp` |
| `assigned_designer_id` | uuid FK null | set only when `handoff_status = ASSIGNED` (post-v1) |
| `details` | jsonb | flexible: pain points, needs, household use, appliance prefs |

Status columns are **service-role write only** (RLS). The client and the LLM cannot write them.

### `facts` — provenance-tracked facts

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `key` | text | e.g. `budget`, `property_value`, `existing_kitchen_condition` |
| `value` | jsonb | |
| `source` | enum | `customer | llm_inferred | external_listing | designer | site_verification` |
| `captured_at` | timestamptz | |
| `confidence` | enum | `high | medium | low` |
| `verification_status` | enum | `unverified | customer_confirmed | verified` |

### `events` — append-only log (source of truth for funnel + transitions)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `type` | text | see section 3 |
| `payload` | jsonb | |
| `actor` | enum | `system | llm | customer | designer` |
| `created_at` | timestamptz | |

Never updated or deleted. Status transitions are derived from events, not written ad hoc.

### `messages` — the transcript (interface, NOT source of truth)

`id`, `project_id`, `role` (`customer | assistant | designer`), `content`, `created_at`.

### `files` — uploads linked to Project State

`id`, `project_id`, `storage_path` (Supabase Storage), `kind`
(`current_kitchen | inspiration | appliance | floor_plan | pdf_doc`), `uploaded_at`.

### Identity / contact

Captured only after first value. `name`, `email`, `phone`, `zip`, `address` (address
later/optional) linked to `project_id`. Capturing a real contact advances
`customer_identity_status` to `CONTACT_PROVIDED`; a blank/obviously-fake contact stays
`ANONYMOUS`. Anonymous-until-save is a core UX requirement (anonymous Supabase Auth user,
upgraded in place on save so `auth.uid()` never changes).

---

## 3. Events (the vocabulary the LLM emits)

MVP set — extend deliberately:

```
conversation.started
message.received / message.sent
fact.captured            { key, value, source, confidence }
scope.updated            { project_type | project_scope | pain_points | needs | style | appliances }
file.uploaded            { file_id, kind }
budget.captured          { amount | none, budget_source }
first_value.delivered
intent.updated           { intent_status }              # ACTIVE | PAUSED | WITHDRAWN
qualification.evaluated  { outcome, rule_set_version, rule_results[], missing_fields[], evaluated_at }
identity.captured        { customer_identity_status }
handoff.ready
handoff.assigned         { designer_id }                # post-v1
conversation.abandoned   { at_stage }
conversation.resumed
```

Funnel analytics (§30–31 of the brief) are derived from this same stream and mirrored to
**PostHog**. Postgres `events` is the system of record; PostHog is the analytics view.

---

## 4. Rules & guards (owned by the engine; full logic in the spec)

The qualification/handoff logic lives in `specs/2026-08-10-qualification-rules-engine.md`.
Invariants the state model must enforce:

- Only the **service role** writes `qualification_status`, `handoff_status`,
  `conversation_stage`, `next_best_action`. The client/LLM cannot.
- `handoff_status = READY` only if `qualification_status = QUALIFIED`
  AND `customer_identity_status >= CONTACT_PROVIDED` AND `intent_status = ACTIVE`.
- Out-of-area ZIP -> `qualification_status = NEEDS_REVIEW` (retained), never discarded.
- `budget_source in {CUSTOMER_REFUSED, SYSTEM_ASSISTED, UNKNOWN}` never fails the budget gate.
- Every evaluation appends a versioned `qualification.evaluated` event.
- RLS: an anonymous visitor can read/write only **their own** project, and only
  customer-writable fields.

---

## 5. Layer separation (do not collapse these)

The LLM must not run on one giant system prompt. Distinct layers:

1. **Project State** — structured truth (this doc).
2. **Required Information Model** — what we need to know per project type.
3. **Conversation Playbook** — modules: Basics, Existing Kitchen, Needs, Style, Appliances,
   Budget, Timeline (customer must not feel they're filling a form).
4. **Deterministic Rules** — the qualification spec.
5. **Next Best Question / Action** — given what we know, what's missing, what matters most now.
6. **LLM conversational layer** — natural language and reasoning only.

The LLM owns 3 and 6. The system owns 1, 2, 4, 5. Business-critical transitions are deterministic.

---

## 6. Open questions (resolve before implementation)

From the qualification spec, still open:

- **Budget floors** for `cabinetry_only` and `cabinetry_install` (`full_kitchen_project = 30000`).
- **Exact San Diego ZIP coverage** for `SERVICE_AREA_ZIPS` (city vs metro/county).
- **How `project_scope` is derived** early in conversation (LLM-inferred vs asked).

Model-level, still open:

- Anonymous session keying and in-place upgrade to a permanent Supabase Auth user on save.
- The activity window that sets `intent_status = PAUSED` (how long is "inactive").
- Which `details` fields get promoted to typed columns for MVP.
- Required Information Model per `project_type` (occupied / vacant / new construction differ).
