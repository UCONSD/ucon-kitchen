# Architecture — UCON Kitchen

## Shape: modular monolith

One Next.js app on Vercel, one Supabase project. **Not** microservices. Clean internal
module boundaries so parts can be extracted later if volume justifies it — not before.

Modules (each owns its data access and exposes a narrow interface):

```
conversation   — chat UI + LLM orchestration (streaming). No business logic.
project-state   — the structured source of truth (see docs/PROJECT_STATE.md)
qualification   — deterministic verdict from state + rules
rules           — deterministic guards and transitions; the SOP as code
files           — uploads, linked to Project State (Supabase Storage)
human-review    — designer view + takeover of the same conversation
analytics        — event stream → PostHog + Google Ads conversions
```

## MVP data / control flow

```
CUSTOMER
   ▼
WEB CONVERSATIONAL UI            (Next.js / React / TS, mobile-first, project.ucon.us)
   ▼
CONVERSATION ORCHESTRATOR        (Vercel AI SDK: streaming/UI only)
   ▼
LLM                              (OpenAI Responses API — natural conversation + extraction)
   ▼   emits EVENTS
STRUCTURED PROJECT STATE         (Postgres / Supabase — source of truth)
   ▼
RULES / QUALIFICATION ENGINE     (deterministic)
   ▼
NEXT BEST QUESTION / ACTION
   ▼
HUMAN DESIGNER WHEN REQUIRED
```

## Hard boundaries (do not cross)

- **Business logic never lives in the AI SDK.** The SDK streams tokens and renders UI.
- **The LLM never writes milestone/qualification state.** It emits events; the rules
  engine computes transitions.
- **The chat transcript is not the database.** `messages` is an interface record; truth is
  Project State + events.
- These same layers extend to the future lifecycle (design → site verification →
  engineering → cabinetry → production) — they **must remain conceptually separate** so the
  future Engineering Protection Engine and pricing/manufacturing layers can slot in without
  a rewrite:

```
CUSTOMER UI → PROJECT/CONFIG MODEL → RULES/CONSTRAINT ENGINE → PRICING ENGINE
→ ENGINEERING VALIDATION → MANUFACTURING MODEL → CAD/CAM/CNC
```

## Channel-independent identity (build-in now, use later)

A Project exists independently of the channel it came through. Web is the MVP channel and
the source of truth; SMS/email/WhatsApp are later "doors, not the house" — messages from
any channel resolve to the same Project ID. Do not build per-channel customer databases.

```
Customer → Project ID → Conversation / Project State
                ▲
     Web / SMS / Email / WhatsApp
```

MVP builds only the Web door, but the Project ID and event model are already
channel-agnostic, so adding a door later does not require reshaping the core.

## Environments

- `project.ucon.us` — production (Vercel). Marketing site stays on Squarespace `ucon.us`;
  ad/website CTAs link straight into the conversation (no generic chat bubble).
- Supabase: separate project from the Field App. RLS is the security boundary (FULL mode
  for any policy change).
- Secrets in Vercel/Supabase env — never committed. See `.gitignore`.
