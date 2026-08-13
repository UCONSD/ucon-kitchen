import type { BudgetSource, ProjectScope } from './types.js';

// Verbatim from specs/2026-08-10-qualification-rules-engine.md §4.2. v1 business
// assumptions, not computed — revisit from real leads.
export const MIN_BUDGET_BY_SCOPE: Record<ProjectScope, number | null> = {
  cabinetry_only: 15000,
  cabinetry_install: 22000,
  full_kitchen_project: 30000,
  unknown_scope: null,
};

// "Budget handled" per QUAL-SUFFICIENCY-001: any explicit source other than UNKNOWN counts —
// a declared number, an explicit refusal, or system-assisted all satisfy the hard floor. A
// below-floor declared budget is still "handled": FIRST_VALUE's job is to *say* the budget
// looks tight for the scope, not to withhold the verdict. Qualification's NOT_FIT routing is
// a separate, later engine — out of scope for this slice.
export function isBudgetHandled(budgetSource: BudgetSource): boolean {
  return budgetSource !== 'UNKNOWN';
}

export interface BudgetFloorCheck {
  floor: number | null;
  belowFloor: boolean;
}

export function checkBudgetFloor(
  scope: ProjectScope,
  amount: number | null,
  source: BudgetSource,
): BudgetFloorCheck {
  const floor = MIN_BUDGET_BY_SCOPE[scope];
  if (floor === null || source !== 'CUSTOMER_DECLARED' || amount === null) {
    return { floor, belowFloor: false };
  }
  return { floor, belowFloor: amount < floor };
}
