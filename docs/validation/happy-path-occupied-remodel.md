# Happy Path Validation — occupied_remodel

Reusable starter prompt for a Phase 4 (Validation) session. Run this verbatim from a
fresh roleplay session. **Do not expand scope beyond this validation. No code changes
unless the validation exposes a concrete bug.**

## Prompt

Run a clean `occupied_remodel` happy-path validation from a fresh roleplay session.

Use this exact homeowner message:

> We've lived here for 8 years. The kitchen feels cramped, the island is too small, and we never have enough storage. We'd like a bigger island and a pantry, but we don't want to move everything around.

Then enter ZIP:

`92130`

For each turn show:

- Project State
- `action_enacted_this_turn`
- `next_best_action_after_turn`
- assistant response

## Expected

- `project_type = occupied_remodel`
- pain points and must-haves are preserved
- `layout_change` materializes reasonably
- `zip = "92130"`
- `serviceable = true`
- `next_best_action_after_turn` advances and does not remain stale
- assistant only executes the engine-selected action
- no code changes unless the validation exposes a concrete bug

## Notes for the live run

The roleplay needs the live OpenAI Responses API, so run it where there is network +
API key (Terminal or Claude Code on the Mac):

```
cd ~/dev/ucon-kitchen && npm run roleplay
```

A cloud Cowork session cannot make this call (egress allowlist blocks
`api.openai.com`), so it can validate the deterministic engine but not live LLM
extraction/phrasing. On a prior cloud run the deterministic engine passed 10/10
(T1 mandate `ASK_ZIP`, T2 mandate `ASK_SCOPE`, state materialized as expected).

The two things that still need eyes on a **live** run, because they are the
LLM-extraction half the engine test could not exercise:

1. Does extraction call `project_type = occupied_remodel` at **HIGH** confidence
   (materialized), not medium (which would divert it into `pending_corrections`
   instead of writing it)?
2. Does `layout_change` come through at HIGH ("don't want to move everything
   around" -> `KEEP_BASIC_LAYOUT`), and do the phrased replies acknowledge what was
   said AND ask exactly the engine-mandated question each turn?
