import { isBudgetHandled } from './budgetFloor.js';
import type { FirstValueConfidence, ProjectState } from './types.js';

export interface HardFloorResult {
  met: boolean;
  missing: string[];
  outOfArea: boolean;
}

// Hard floor per specs/2026-08-10-required-information-model.md §7, plus the pain/must-have
// clause the Conversation Playbook adds for the "they understood me" framing (§Goal).
export function evaluateHardFloor(state: ProjectState): HardFloorResult {
  const missing: string[] = [];

  if (!state.project_type) missing.push('project_type');
  if (!state.zip) missing.push('zip');
  const outOfArea = state.zip !== null && state.serviceable === false;
  if (state.project_scope === 'unknown_scope') missing.push('project_scope');
  if (!isBudgetHandled(state.budget_source)) missing.push('budget');
  if (state.size_class === 'UNKNOWN') missing.push('size_class');
  if (state.layout_change === 'UNKNOWN') missing.push('layout_change');
  if (state.product_level === 'UNKNOWN' && state.appliance_tier === 'UNKNOWN') {
    missing.push('product_level_or_appliance_tier');
  }
  if (state.primary_pain_points.length === 0 && state.primary_must_haves.length === 0) {
    missing.push('pain_point_or_must_have');
  }

  return { met: missing.length === 0 && !outOfArea, missing, outOfArea };
}

// specs/2026-08-10-required-information-model.md §7 confidence mapping. This slice doesn't
// track site_work_complexity / layout_type / island (out of scope per the loop spec's §4),
// and there's no photo/plan channel in a CLI harness — so HIGH (which requires photos/plans)
// is structurally unreachable here, and full_kitchen_project is always capped at LOW per the
// spec's explicit "site_work_complexity UNKNOWN forces LOW for full_kitchen_project" rule,
// since that driver can never be known in this harness. Both are real, worth noting during
// role-play rather than working around.
export function computeFirstValueConfidence(state: ProjectState): FirstValueConfidence {
  if (state.project_scope === 'full_kitchen_project') return 'LOW';
  const bothProductSignalsKnown = state.product_level !== 'UNKNOWN' && state.appliance_tier !== 'UNKNOWN';
  return bothProductSignalsKnown ? 'MEDIUM' : 'LOW';
}
