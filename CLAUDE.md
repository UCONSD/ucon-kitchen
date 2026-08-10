# CLAUDE.md — UCON Kitchen

Rules for Claude (Claude Code and chat) working in this repository.

## What this project is

Conversational Kitchen Design & Qualification Platform. AI Design Assistant runs
discovery, builds structured Project State, qualifies, hands off to a human designer.
MVP ends at the human-designer handoff — **not** a kitchen planner or production
configurator. See `README.md` and `docs/ROADMAP.md` for scope.

## This repo is isolated from the UCON Field App

Never assume shared code, schema, auth, or data with `ucon-field-app`. They share only
accounts and workflow. Do not import from or reference the Field App codebase.

## Development workflow (mandatory)

6 phases: 0-Filter → 1-Spec → 2-Design → 3-Implementation → 4-Validation → 5-Release.

- Chat / Cowork sessions: Phases 0–2 (filter, spec, design) and reviewing Claude Code's
  work. **Production code is written in Claude Code sessions, not in chat.**
- Before any feature, run **Phase 0**: whose time does it save; framework
  cash → margin → capacity → risk → founder dependency; could it be an SOP instead.
- Every spec must match `specs/spec-template.md` and live in `specs/` before a dev
  session opens. No spec = no session.
- Architectural decisions end with a drafted `DECISIONS.md` entry to commit at release.
- Andriy is not a professional developer: explain steps in plain language, one command
  at a time, with expected output. Show code/diffs before applying ("show first, then
  change"). Understand root cause before any fix.

## Modes

- **FULL** (mandatory) when work touches: auth, permissions/RLS, money, or live data.
  Requires a clean-session security review + real-device acceptance testing before merge
  to `main`.
- **LIGHT** for low-risk internal work.
- **HOTFIX** when prod is broken: fix + retroactive spec + same-day security review if it
  touched auth/rules.

### FULL-mode surfaces specific to this app

- **Supabase Row Level Security (RLS)** policies — the equivalent of Firestore rules.
  Any RLS change is FULL mode.
- **Anonymous visitor traffic** — public, unauthenticated. Rate-limiting and abuse/cost
  control (AI inference is paid per conversation) are security concerns, not features.
- **PII** — homeowner contact, address, photos. Privacy and access scoping are FULL mode.
- **Budget / qualification** data is money-adjacent → FULL mode.

## Non-negotiable architecture rules

- The **chat transcript is not the database.** Project State + append-only events are the
  source of truth. See `docs/PROJECT_STATE.md`.
- The **LLM never writes milestone transitions directly.** It emits events; the
  deterministic rules engine computes transitions.
- **No business logic inside the Vercel AI SDK.** The SDK is a streaming/UI layer only.
- Build a **modular monolith**, not microservices. Keep clean boundaries between:
  conversation, project state, qualification, rules, files, human review, analytics.
- **Automation First → Human When Valuable → Deterministic Validation When Critical.**
  For the first 20–50 customers, if a human can do a backend step in five minutes, keep
  it manual. Automate only after usage shows repetition.

## Git hygiene

- Commit author must be `andrew@ucon.us` (`git config user.email andrew@ucon.us`).
- Repo lives at `~/dev/ucon-kitchen` on both machines — **outside iCloud** (iCloud
  corrupts git repos). Sync via `git push` / `git pull`.
- Remote: `github.com/UCONSD/ucon-kitchen` (private). PAT in macOS Keychain.
- Cowork/Claude Desktop can read/write docs and specs but **cannot `git commit/push`**
  (sandbox has no write access to `.git/objects`). After any Cowork edit, run
  `git add/commit/push` in Terminal or Claude Code.

## Ownership rule

"Own on write, not read." Cowork/chat owns `specs/` and `docs/` for writing; Claude Code
owns code for writing; either can read anything.
