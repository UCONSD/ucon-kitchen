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

## Session context and discipline

**Spec.** A coding session does not start without a filled-in spec based on
`docs/spec-template.md`. No spec, no session. The template itself explains the
structure and the size limit.

**Usable context is ~100k tokens**, regardless of the advertised window size.
Watch the counter on every turn.

**At ~100k the session ends.** Not "carry on carefully" — close it and open a new
one with a new spec. Work produced past that line costs more to verify than to
redo.

**Auto-compact is a red flag.** On compaction the model drops whatever it judged
unimportant, and does not report what. If compaction fired during coding, the
session's output is treated as suspect and re-verified in full, and the session
is not continued.

**Code review is always a separate session**, never the one that wrote the code.
Tests written by the same model in the same line of reasoning turn CI green on
wrong code: a misreading of the task lands in the code and in the test
identically.

**The planning session does not make decisions the coding session will make on
its own from its own context.** A spec says WHICH files change and what the
result must be. It does not say HOW to write the code.

**Progressive disclosure.** This file holds pointers, not architecture: "need the
architecture — read that file". CLAUDE.md is always in context, so it carries
only what is always needed.

**Code comments explain "why this way and not otherwise"**, not what the line
does. They are the project's main long-lived context: specs are archived once
executed, the code stays.

## Feature workflow

**Uncertainty goes left.** The first one or two stories of an epic are done with
the owner in the loop, turn by turn — that is where every design decision gets
made. The rest run as a loop with review at the end.

**Tracer bullet.** A new feature starts as one thin scenario driven all the way
through every layer (Postgres → API → UI → report). Everything else is grown on
top of that once it runs end to end.

**Epic stories are written immediately before work on the epic starts**, not in
advance. After the first story the remaining ones change.

**No parallelism inside an epic.** Between epics, parallelise along the
dependency graph.

**When the result is wrong, first locate the error.**
- Error in the spec → fix the spec and regenerate the code in full. Do not patch
  code against a spec that is wrong.
- Error in the coding → do not touch the spec.

**Blast radius = 0** (a couple of lines in one file): no spec needed. Review by a
separate session is still mandatory.

**Do not give screenshots to the coding agent** — they are expensive in tokens.
Hand it the structure instead.
