import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import {
  FACT_CONFIDENCES,
  MATERIALIZABLE_FIELDS,
  type CandidateFact,
  type NextBestAction,
  type ProjectState,
} from './engine/types.js';

const MODEL_ID = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Two passes, not one, so the mandate the phrasing pass enacts can be computed from
// POST-extraction state. A single combined call (extract + phrase together) forces the
// mandate to be decided from stale pre-message state, which either re-asks something the
// user just answered or — once that was banned — leaves the assistant silent for a turn
// while the engine catches up next time. Splitting removes the race entirely: extract,
// materialize, THEN decide, THEN phrase.

// ---------------------------------------------------------------------------------------
// Pass 1 — extraction only. No mandate, no reply. Runs the same regardless of what will be
// asked, since extraction is independent of the question being asked.
// ---------------------------------------------------------------------------------------

const extractionSchema = z.object({
  candidate_facts: z.array(
    z.object({
      field: z.enum(MATERIALIZABLE_FIELDS),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
      confidence: z.enum(FACT_CONFIDENCES),
    }),
  ),
});

export async function extractFacts(state: ProjectState, history: ChatMessage[]): Promise<CandidateFact[]> {
  const { output } = await generateText({
    model: openai(MODEL_ID),
    system: buildExtractionPrompt(state),
    messages: history,
    output: Output.object({ schema: extractionSchema }),
  });
  return output.candidate_facts;
}

function buildExtractionPrompt(state: ProjectState): string {
  return `You are extracting structured facts from a homeowner's message in a kitchen-remodel
discovery conversation. You are not replying to them — only pulling out candidate facts, each
with a confidence level. Extract everything you have genuine signal for, regardless of what
question was most recently asked. Never invent values; only emit a candidate where there is
real signal.

Confidence levels:
- "high": stated explicitly, or an unambiguous, confident read from context.
- "medium": a reasonable inference from narrative, not stated outright.
- "low": a guess. Do not emit low-confidence guesses at all unless they might help prioritize
  what to ask about later — prefer omitting over guessing.

project_type heuristics:
- Language describing a kitchen they currently live with — "we've lived here N years",
  "our current kitchen", "we've been in this house", "the kitchen we have now", any
  first-person present-tense description of an existing kitchen they occupy — is
  project_type = "occupied_remodel" at HIGH confidence. This is the most common case; do
  not undercall it as medium/low when the signal is this direct.
- "we just bought it, nobody's living there yet", "it's vacant", "we haven't moved in" ->
  project_type = "vacant_remodel", high confidence.
- "we're building", "new construction", "haven't broken ground", "our builder" ->
  project_type = "new_construction", high confidence.

budget heuristics:
- An explicitly stated budget figure — "$85,000", "our budget is about 85k", "we've set aside
  eighty grand", any concrete amount the homeowner gives as what they can spend — is
  budget_amount at HIGH confidence AND budget_source = "CUSTOMER_DECLARED" at HIGH. Do not
  undercall a clearly stated number as medium; medium is only for a genuine inference (a figure
  they mention that may not be their budget). An explicit refusal ("I'd rather not say") is
  budget_source = "CUSTOMER_REFUSED" at HIGH confidence, with no amount.

Use these exact field names and enum values when you have signal for them:
- project_type: "occupied_remodel" | "vacant_remodel" | "new_construction"
- zip: a 5-digit string
- project_scope: "cabinetry_only" | "cabinetry_install" | "full_kitchen_project"
- budget_amount: a number (USD)
- budget_source: "CUSTOMER_DECLARED" | "CUSTOMER_REFUSED" | "SYSTEM_ASSISTED"
- size_class: "COMPACT" | "STANDARD" | "LARGE" | "VERY_LARGE"
- layout_change: "KEEP_BASIC_LAYOUT" | "MODERATE_CHANGE" | "MAJOR_RECONFIGURATION"
- product_level: "STANDARD_CUSTOM" | "PREMIUM_CUSTOM" | "ARCHITECTURAL_CUSTOM"
- appliance_tier: "MAINSTREAM" | "PREMIUM" | "LUXURY_INTEGRATED"
- primary_pain_points: array of short strings (what's wrong today)
- primary_must_haves: array of short strings (desired outcomes)

ALREADY KNOWN (don't re-emit these unless the homeowner is correcting a prior value):
${describeKnownState(state)}

Respond with the structured output only.`;
}

// ---------------------------------------------------------------------------------------
// Pass 2 — phrasing only. Takes a mandate that was computed by the engine from
// POST-extraction state (see engine/orchestrate.ts) and phrases a reply enacting it. The
// LLM does not choose or override the mandate.
// ---------------------------------------------------------------------------------------

const phrasingSchema = z.object({
  reply: z.string().describe('What you say to the homeowner, in natural conversational language.'),
});

export async function phraseResponse(
  state: ProjectState,
  history: ChatMessage[],
  mandatedAction: NextBestAction,
): Promise<string> {
  const { output } = await generateText({
    model: openai(MODEL_ID),
    system: buildPhrasingPrompt(state, mandatedAction),
    messages: history,
    output: Output.object({ schema: phrasingSchema }),
  });
  return output.reply;
}

function buildPhrasingPrompt(state: ProjectState, mandatedAction: NextBestAction): string {
  return `You are UCON's AI Design Assistant, running a discovery conversation with a San Diego
homeowner about a kitchen remodel. You are role-playing this for internal testing — the
"homeowner" is a developer, but respond exactly as you would to a real customer.

TONE: warm, professional, concise. You are not a form.

The Project State below already reflects everything extracted from the homeowner's latest
message — so if they just answered a question, that answer is already captured in "CURRENT
KNOWN PROJECT STATE" below. Your reply should briefly acknowledge what they just told you
(referencing the conversation naturally) AND THEN ask exactly the assigned question below, in
the same reply. Do not produce an acknowledge-only reply that ends without asking the
assigned question — the only exception is DELIVER_FIRST_VALUE or OUT_OF_AREA_REVIEW, which
end the discovery portion of the conversation by design.

THIS TURN'S ASSIGNED ACTION (decided deterministically — you do not choose or override it):
${describeMandate(mandatedAction)}

Do not ask about, or deliver, anything other than what's specified above — even if the
homeowner's message raises other topics, or you think something else would be more valuable
to ask; whatever else they raised is already captured in Project State and will inform a
later turn's mandate. The one exception: you may add a brief soft-correction alongside the
assigned question (see PENDING SOFT CORRECTIONS below) — that does not count as asking
something else.

Never assess whether the budget is realistic, sufficient, or too high or too low, and never
compare the budget to the scope, on any turn before DELIVER_FIRST_VALUE. If the homeowner just
gave a budget, acknowledge the number plainly (e.g. "got it — $85,000") and move straight to the
assigned question; the budget-vs-scope alignment verdict is delivered only at First Value.

CURRENT KNOWN PROJECT STATE (do not re-ask any of these):
${describeKnownState(state)}
${describePendingCorrections(state)}

Respond with the structured output only.`;
}

function describeMandate(action: NextBestAction): string {
  switch (action) {
    case 'ASK_ZIP':
      return 'Ask for the project ZIP code — e.g. "What ZIP is the project in? It helps me factor in local pricing." This is the only thing to ask about this turn.';
    case 'ASK_PROJECT_CONTEXT':
      return "Ask what kind of project this is (remodeling the kitchen while still living there, remodeling a currently vacant property, or new construction) and briefly what they'd like to change, if you don't already have a confident read from extraction. This is the only thing to ask about this turn.";
    case 'ASK_SCOPE':
      return 'Ask, in plain language (not category names), whether this is cabinetry only, cabinetry plus installation, or a full kitchen project involving walls/plumbing/electrical. This is the only thing to ask about this turn.';
    case 'ASK_BUDGET':
      return 'Ask about their budget approach: do they already have a number in mind, or would they like help figuring out a realistic range? This is the only thing to ask about this turn.';
    case 'ASK_SIZE_CLASS':
      return 'Ask roughly how big the kitchen feels: compact, average, large, or very large. This is the only thing to ask about this turn.';
    case 'ASK_LAYOUT_CHANGE':
      return "Ask, in plain language, whether they're keeping the basic layout, making a moderate change, or doing a major reconfiguration (moving walls, plumbing, gas). This is the only thing to ask about this turn.";
    case 'ASK_PRODUCT_OR_APPLIANCE':
      return 'Ask, in plain human language, whether they picture a well-designed custom kitchen with good materials, or whether premium finishes, specialty details, and higher-end appliances (Sub-Zero/Wolf/Gaggenau-class) matter to them. This is the only thing to ask about this turn.';
    case 'ASK_CUSTOMER_VALUE':
      return "Ask what's bugging them most about the current kitchen, or the one thing they'd most love the new kitchen to have. This is the only thing to ask about this turn.";
    case 'DELIVER_FIRST_VALUE':
      return 'The hard floor is met. Deliver a First Value summary: briefly reflect what you understood about their project, say whether their budget and scope look aligned for the level of work described (or name the caveat if not), and say a designer can take it from here. Do not ask any further question.';
    case 'OUT_OF_AREA_REVIEW':
      return "Their ZIP is outside the current San Diego service area. Let them down gracefully and warmly: their project is being flagged for a closer look by the team rather than continuing automated discovery, and it's retained, not discarded. Do not continue discovery questions.";
  }
}

function describeKnownState(state: ProjectState): string {
  const lines: string[] = [];
  if (state.project_type) lines.push(`- project_type: ${state.project_type}`);
  if (state.zip) lines.push(`- zip: ${state.zip} (serviceable: ${state.serviceable})`);
  if (state.project_scope !== 'unknown_scope') lines.push(`- project_scope: ${state.project_scope}`);
  if (state.budget_source !== 'UNKNOWN') {
    lines.push(`- budget_source: ${state.budget_source}${state.budget_amount ? `, amount: $${state.budget_amount}` : ''}`);
  }
  if (state.size_class !== 'UNKNOWN') lines.push(`- size_class: ${state.size_class}`);
  if (state.layout_change !== 'UNKNOWN') lines.push(`- layout_change: ${state.layout_change}`);
  if (state.product_level !== 'UNKNOWN') lines.push(`- product_level: ${state.product_level}`);
  if (state.appliance_tier !== 'UNKNOWN') lines.push(`- appliance_tier: ${state.appliance_tier}`);
  if (state.primary_pain_points.length) lines.push(`- pain_points: ${state.primary_pain_points.join('; ')}`);
  if (state.primary_must_haves.length) lines.push(`- must_haves: ${state.primary_must_haves.join('; ')}`);
  return lines.length ? lines.join('\n') : '(nothing known yet)';
}

function describePendingCorrections(state: ProjectState): string {
  if (state.pending_corrections.length === 0) return '';
  const lines = state.pending_corrections.map(
    (c) => `- ${c.field}: guessed "${Array.isArray(c.value) ? c.value.join(', ') : c.value}" at medium confidence — offer this as a soft correction this turn, don't ask it as a fresh question.`,
  );
  return `\nPENDING SOFT CORRECTIONS (mention briefly, inviting a fix if wrong):\n${lines.join('\n')}`;
}
