import { isBudgetHandled } from './budgetFloor.js';
import { evaluateHardFloor } from './hardFloor.js';
import type { NextBestAction, ProjectState } from './types.js';

// The P0-P6 priority ladder from specs/2026-08-10-conversation-playbook.md §4.5, reduced to
// the fields this slice actually tracks (no photos, no site_work_complexity/layout_type/
// island — see hardFloor.ts). This is the engine's own "ground truth" pick for the debug
// view, computed independently of whatever the LLM proposed that turn, so the two can be
// compared during role-play. It does not gate anything by itself — only the hard-floor
// delivery check in orchestrate.ts does.
export function computeNextBestAction(state: ProjectState): NextBestAction {
  // P0 - serviceability
  if (state.zip === null) return 'ASK_ZIP';
  if (state.serviceable === false) return 'OUT_OF_AREA_REVIEW';

  // P1 - project context + scope
  if (state.project_type === null) return 'ASK_PROJECT_CONTEXT';
  if (state.project_scope === 'unknown_scope') return 'ASK_SCOPE';

  // P2 - budget approach
  if (!isBudgetHandled(state.budget_source)) return 'ASK_BUDGET';

  // P3 - hard-floor cost blockers
  if (state.size_class === 'UNKNOWN') return 'ASK_SIZE_CLASS';
  if (state.layout_change === 'UNKNOWN') return 'ASK_LAYOUT_CHANGE';
  if (state.product_level === 'UNKNOWN' && state.appliance_tier === 'UNKNOWN') {
    return 'ASK_PRODUCT_OR_APPLIANCE';
  }

  // P4 - customer value (required for delivery, not a pricing input)
  if (state.primary_pain_points.length === 0 && state.primary_must_haves.length === 0) {
    return 'ASK_CUSTOMER_VALUE';
  }

  // Hard floor met -> deliver. Otherwise P5 (reduced): the second product/appliance signal
  // is the only accuracy enhancer this slice can still ask for.
  if (evaluateHardFloor(state).met) return 'DELIVER_FIRST_VALUE';
  if (state.product_level === 'UNKNOWN' || state.appliance_tier === 'UNKNOWN') {
    return 'ASK_PRODUCT_OR_APPLIANCE';
  }
  return 'DELIVER_FIRST_VALUE';
}
