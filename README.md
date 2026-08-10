# UCON Kitchen — Conversational Kitchen Design & Qualification Platform

Mobile-first web app where a homeowner talks to an **AI Design Assistant** instead of
operating a cabinet configurator. The AI runs a professional discovery conversation,
turns it into a **structured Project State**, establishes budget and project fit,
qualifies the project with deterministic rules, and hands a prepared brief to a human
designer.

> One-sentence brief: build a mobile-first, persistent, conversational kitchen project
> app that uses AI to conduct discovery, convert conversation into structured project
> data, establish budget/fit, preserve context across sessions, and hand qualified
> projects to a human designer — **without** building a traditional kitchen planner or
> production configurator in the MVP.

## This is a standalone project

This repository is **fully isolated** from the UCON Field App. It shares Andriy's
**accounts and workflow**, not its data or codebase:

- Shared: Google Cloud billing, GitHub org (`UCONSD`), Vercel account, the 6-phase
  development workflow (`specs/`, `DECISIONS.md`, FULL/LIGHT modes), git author
  `andrew@ucon.us`.
- **Not shared:** database, auth, storage, deployment, domain. A change here can never
  touch live Field App data. See `DECISIONS.md`.

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js + React + TypeScript |
| Hosting | Vercel — `project.ucon.us` (marketing stays on Squarespace `ucon.us`) |
| AI | OpenAI Responses API |
| AI orchestration | Vercel AI SDK (streaming only — **no business logic inside the SDK**) |
| Database | PostgreSQL via **Supabase** |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Analytics | PostHog + Google Ads conversion events |
| Payments | Stripe (only when paid milestones are introduced — not MVP) |

## Core architectural principle

**The chat transcript is not the database.** The conversation is an input/output
interface. The source of truth is the structured **Project State** plus an append-only
**event log**. The **LLM emits events; a deterministic rules engine computes milestone
transitions.** This keeps a smart conversation from sitting on top of a dumb system.

Read `docs/PROJECT_STATE.md` first — it is the foundation everything else sits on.

## Repository map

```
README.md              You are here
CLAUDE.md              Rules for Claude Code sessions in this repo
DECISIONS.md           Architectural decision log (append at release)
docs/
  PROJECT_STATE.md     Schema + milestones + events + rules (design foundation)
  ARCHITECTURE.md      Layered modular monolith; layer boundaries
  ROADMAP.md           MVP scope: must-have / out-of-scope / nice-to-have
  PRODUCT_BRIEF.md     Full product & technical handoff brief (source material)
specs/
  spec-template.md     Copy per feature to specs/YYYY-MM-DD-feature-name.md
  session-checklist.md Paste at the top of every dev session
  drafts/              In-progress specs
```

## Workflow (same as Field App)

Phases: 0-Filter → 1-Spec → 2-Design → 3-Implementation → 4-Validation → 5-Release.
Chat/Cowork sessions do Phases 0–2 and review. Claude Code writes production code.
No spec in `specs/` → no dev session.
