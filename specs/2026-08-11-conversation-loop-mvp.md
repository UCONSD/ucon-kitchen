# Feature Spec: Conversation Loop MVP (thin vertical slice)

> Copy of `specs/spec-template.md`, filled in. Infrastructure slice: the first working
> conversational loop that proves the architecture end to end. NOT the product.
> Pairs with `docs/PROJECT_STATE.md` and the three design specs (whose policy this slice does
> NOT yet implement).
> Mode: **Full** (anonymous auth + Supabase RLS). A clean-session security review of the RLS
> policies is the gate before this slice is considered "done".

---

## 0. Filter

- **Whose time does this save?** Ours as builders — this is a foundational slice, so normally
  "backlog". It is justified because it is the smallest thing that de-risks the whole
  architecture (does "chat is not the database" actually hold end to end?) before we invest in
  qualification, NBQ, and cost drivers.
- **Framework:** risk-reduction slice; proves the persistence + event model before more is built.
- **Without code?** No — this is the runtime spine.

## 1. Problem

The design layer is agreed but unproven in code. We need one working loop that shows a message
produces a persisted event and a materialized state change, and the conversation resumes from
stored state — before building anything on top.

## 2. User

A single anonymous visitor on the web page (the developer, role-playing). No real customer data.

## 3. Behavior

1. Visitor opens the page; an anonymous Supabase Auth session is created and one `projects` row
   is created, keyed to `auth.uid()`, `conversation_stage = DISCOVERY`.
2. Visitor types a message. It is persisted to `messages`.
3. The orchestrator calls the LLM (OpenAI Responses API) and streams the reply into the UI.
4. The assistant reply is persisted to `messages`; at least one `event` is appended
   (`message.received` / `message.sent`, and/or a trivial `fact.captured`), and `projects` is
   updated — `projects` + `events` written in one transaction.
5. On page reload, the conversation continues from stored `messages` / state (no reset).

## 4. Project State impact (minimal subset only)

Create only what the loop needs — not the full model:

- `projects`: `id`, `created_at`, `updated_at`, `conversation_stage` (default `DISCOVERY`),
  `details jsonb`. (Other cost-driver columns are deferred to later slices.)
- `messages`: `id`, `project_id`, `role`, `content`, `created_at`.
- `events`: `id`, `project_id`, `type`, `payload jsonb`, `actor`, `created_at`.

The LLM emits events; it does NOT write `conversation_stage` or any status directly. `projects`
holds current materialized state; `events` is immutable history; both are written in the same
transaction (no full event-sourcing replay).

## 5. Acceptance Criteria (definition of done)

- [ ] Opening the page creates an anonymous session and exactly one `projects` row for it.
- [ ] A typed message is persisted and the LLM reply streams back and is persisted.
- [ ] Each turn appends at least one row to `events`, written in the same transaction as the
      `projects` update.
- [ ] Reloading the page resumes the same conversation from stored state — nothing is lost.
- [ ] The LLM/client cannot write `conversation_stage` (RLS: status is service-role only).
- [ ] Error case: an LLM/API failure mid-turn leaves the DB consistent (no half-written turn).

## 6. Out of Scope (explicitly deferred)

Qualification engine, NBQ ladder, cost-driver fields and their inference, First Value Summary,
budget logic, photos/plans, `project_type` branching, designer dashboard, PostHog, Stripe,
production RLS hardening beyond the status-write guard, the opening triad / trust-contract copy.

## 7. Data & Risk Notes (Full mode)

- **Auth:** anonymous Supabase Auth; one project per `auth.uid()`.
- **RLS:** a visitor can read/write only their own project's `messages` and customer-writable
  fields; `conversation_stage` and any status field are service-role write only. **A clean-session
  security review of these policies is mandatory before "done".**
- **Business logic stays out of the AI SDK** (streaming/UI only).
- **Cost/abuse:** dev only, but keep the loop bounded (one LLM call per user turn).
- Separate **dev** Supabase project; no real/customer data.

## 8. Decision Log

| Date | Decision | Why | Alternatives rejected |
|------|----------|-----|-----------------------|
| 2026-08-11 | First code session is a thin vertical slice proving persistence + events + resume | De-risk the architecture before building qualification/NBQ | Building the full conversational product at once |
| 2026-08-11 | Minimal schema now (`projects`/`messages`/`events` subset); other cost-driver columns deferred | Schema-first but scoped to the loop | Migrating the full `projects` model up front |
| 2026-08-11 | `projects` + `events` written in one transaction; no replay | Matches PROJECT_STATE materialized-state rule | Full event-sourcing replay |
