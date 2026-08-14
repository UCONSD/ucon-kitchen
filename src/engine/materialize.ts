import { isServiceable } from './serviceability.js';
import { BUDGET_SOURCES } from './types.js';
import type {
  ApplianceTier,
  BudgetSource,
  CandidateFact,
  LayoutChange,
  MaterializableField,
  ProductLevel,
  ProjectEvent,
  ProjectScope,
  ProjectState,
  ProjectType,
  SizeClass,
} from './types.js';

// Upper sanity ceiling for a materialized budget figure. Not a business/qualification rule
// (those live in budgetFloor.ts) — purely a validation guard to reject absurd or injected
// amounts. Generous enough that no realistic kitchen budget is rejected; revisit from real leads.
const MAX_BUDGET_AMOUNT = 10_000_000;

// Runtime guard so an arbitrary LLM-proposed string can never be cast into BudgetSource.
function isBudgetSource(value: string): value is BudgetSource {
  return (BUDGET_SOURCES as readonly string[]).includes(value);
}

// Confidence-gated materialization, matching QUAL-SCOPE-001's pattern applied to every
// engine-materialized field, not just project_scope: high -> write + fact.captured event;
// medium -> held as a pending soft-correction (surfaced to the user next turn, not written
// as fact yet); low -> ignored, left for the NBQ ladder to ask directly. The LLM only ever
// proposes candidates — this function is the only place ProjectState is written.
export function applyCandidateFacts(
  state: ProjectState,
  candidates: CandidateFact[],
): { state: ProjectState; events: ProjectEvent[] } {
  let next: ProjectState = { ...state, pending_corrections: [...state.pending_corrections] };
  const events: ProjectEvent[] = [];

  for (const candidate of candidates) {
    if (candidate.confidence === 'low') continue;

    if (candidate.confidence === 'medium') {
      next.pending_corrections = [
        ...next.pending_corrections.filter((c) => c.field !== candidate.field),
        { field: candidate.field, value: candidate.value },
      ];
      continue;
    }

    const written = writeField(next, candidate.field, candidate.value);
    if (written === null) {
      // Engine rejected an invalid money-adjacent candidate (non-sane budget_amount or an
      // unrecognized budget_source). Ignore it entirely: no write, no fact.captured event, and no
      // change to pending state — so the NBQ ladder keeps asking (ASK_BUDGET stays put) instead
      // of advancing on a garbage value.
      continue;
    }
    next = written;
    next.pending_corrections = next.pending_corrections.filter((c) => c.field !== candidate.field);
    events.push({
      type: 'fact.captured',
      payload: {
        key: candidate.field,
        value: candidate.value,
        source: 'llm_inferred',
        confidence: candidate.confidence,
      },
      actor: 'llm',
      created_at: new Date().toISOString(),
    });
  }

  return { state: next, events };
}

// Returns the updated state, or null when the engine rejects the candidate as invalid. Only the
// money-adjacent fields validate and can reject; every other field writes as before.
function writeField(
  state: ProjectState,
  field: MaterializableField,
  value: CandidateFact['value'],
): ProjectState | null {
  switch (field) {
    case 'project_type':
      return { ...state, project_type: String(value) as ProjectType };
    case 'zip': {
      const zip = String(value);
      return { ...state, zip, serviceable: isServiceable(zip) };
    }
    case 'project_scope':
      return { ...state, project_scope: String(value) as ProjectScope };
    case 'budget_amount': {
      // Money-adjacent: coerce once and require a sane, positive amount within a generous ceiling.
      // An invalid figure (NaN, <= 0, absurdly large, or non-numeric text/array) is rejected — we
      // write neither the amount nor a derived budget_source, so ASK_BUDGET stays unresolved rather
      // than advancing on garbage. A valid stated amount IS a declared budget, so budget_source is
      // derived here (SYSTEM_ASSISTED budgets are engine-set, never on this extraction path; a
      // refusal carries no amount) — that derivation is unchanged.
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_BUDGET_AMOUNT) return null;
      return { ...state, budget_amount: amount, budget_source: 'CUSTOMER_DECLARED' };
    }
    case 'budget_source': {
      // Never trust an arbitrary LLM string on a money-adjacent field: accept only the declared
      // BudgetSource enum values. An unrecognized value is rejected so it can't mark the budget
      // "handled" and let ASK_BUDGET advance without a valid handled-budget state.
      const source = String(value);
      if (!isBudgetSource(source)) return null;
      return { ...state, budget_source: source };
    }
    case 'size_class':
      return { ...state, size_class: String(value) as SizeClass };
    case 'layout_change':
      return { ...state, layout_change: String(value) as LayoutChange };
    case 'product_level':
      return { ...state, product_level: String(value) as ProductLevel };
    case 'appliance_tier':
      return { ...state, appliance_tier: String(value) as ApplianceTier };
    case 'primary_pain_points':
      return { ...state, primary_pain_points: mergeArray(state.primary_pain_points, value) };
    case 'primary_must_haves':
      return { ...state, primary_must_haves: mergeArray(state.primary_must_haves, value) };
  }
}

// Pain points / must-haves accumulate across turns rather than overwrite (a homeowner's
// narrative reveals them incrementally). Capped at 4 — this slice only requires 1-2.
function mergeArray(existing: string[], value: CandidateFact['value']): string[] {
  const incoming = Array.isArray(value) ? value : [String(value)];
  const merged = [...existing];
  for (const item of incoming) {
    if (!merged.includes(item)) merged.push(item);
  }
  return merged.slice(0, 4);
}
