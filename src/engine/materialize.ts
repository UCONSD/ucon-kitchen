import { isServiceable } from './serviceability.js';
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

    next = writeField(next, candidate.field, candidate.value);
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

function writeField(
  state: ProjectState,
  field: MaterializableField,
  value: CandidateFact['value'],
): ProjectState {
  switch (field) {
    case 'project_type':
      return { ...state, project_type: String(value) as ProjectType };
    case 'zip': {
      const zip = String(value);
      return { ...state, zip, serviceable: isServiceable(zip) };
    }
    case 'project_scope':
      return { ...state, project_scope: String(value) as ProjectScope };
    case 'budget_amount':
      // A customer-stated budget figure IS a declared budget. Derive budget_source here so a
      // materialized amount always clears the budget hard floor even when the extraction pass
      // emitted the number without a separate budget_source candidate (the ASK_BUDGET-repeat
      // bug). SYSTEM_ASSISTED budgets are engine-set and never arrive on this extraction path;
      // an explicit refusal never carries an amount, so CUSTOMER_DECLARED is unambiguous here.
      return { ...state, budget_amount: Number(value), budget_source: 'CUSTOMER_DECLARED' };
    case 'budget_source':
      return { ...state, budget_source: String(value) as BudgetSource };
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
