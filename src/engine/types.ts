// Subset of docs/PROJECT_STATE.md this happy path touches. See
// specs/2026-08-11-conversation-loop-mvp.md §4 for exactly which fields are in scope.

export type ProjectType = 'occupied_remodel' | 'vacant_remodel' | 'new_construction';

export type ProjectScope =
  | 'cabinetry_only'
  | 'cabinetry_install'
  | 'full_kitchen_project'
  | 'unknown_scope';

export const BUDGET_SOURCES = ['UNKNOWN', 'CUSTOMER_DECLARED', 'CUSTOMER_REFUSED', 'SYSTEM_ASSISTED'] as const;
export type BudgetSource = (typeof BUDGET_SOURCES)[number];

export type SizeClass = 'COMPACT' | 'STANDARD' | 'LARGE' | 'VERY_LARGE' | 'UNKNOWN';

export type LayoutChange = 'KEEP_BASIC_LAYOUT' | 'MODERATE_CHANGE' | 'MAJOR_RECONFIGURATION' | 'UNKNOWN';

export type ProductLevel = 'STANDARD_CUSTOM' | 'PREMIUM_CUSTOM' | 'ARCHITECTURAL_CUSTOM' | 'UNKNOWN';

export type ApplianceTier = 'MAINSTREAM' | 'PREMIUM' | 'LUXURY_INTEGRATED' | 'UNKNOWN';

export type FirstValueConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type ConversationStage = 'DISCOVERY' | 'FIRST_VALUE';

// PROJECT_STATE.md's canonical next_best_action enum is coarser than the Conversation
// Playbook's NBQ ladder (P3 covers three distinct hard-floor blockers under one umbrella).
// Extended here with the granular ASK_* actions the ladder actually needs, scoped to this
// dev harness — flagged as a real design-layer gap to report back, not silently papered over.
// Exported as a const array (not just a type) so llm.ts's zod schema and this type stay in
// sync from one source of truth.
export const NEXT_BEST_ACTIONS = [
  'ASK_ZIP',
  'ASK_PROJECT_CONTEXT',
  'ASK_SCOPE',
  'ASK_BUDGET',
  'ASK_SIZE_CLASS',
  'ASK_LAYOUT_CHANGE',
  'ASK_PRODUCT_OR_APPLIANCE',
  'ASK_CUSTOMER_VALUE',
  'DELIVER_FIRST_VALUE',
  'OUT_OF_AREA_REVIEW',
] as const;
export type NextBestAction = (typeof NEXT_BEST_ACTIONS)[number];

export const FACT_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type FactConfidence = (typeof FACT_CONFIDENCES)[number];

export const MATERIALIZABLE_FIELDS = [
  'project_type',
  'zip',
  'project_scope',
  'budget_amount',
  'budget_source',
  'size_class',
  'layout_change',
  'product_level',
  'appliance_tier',
  'primary_pain_points',
  'primary_must_haves',
] as const;
export type MaterializableField = (typeof MATERIALIZABLE_FIELDS)[number];

export interface CandidateFact {
  field: MaterializableField;
  value: string | number | string[];
  confidence: FactConfidence;
}

export interface ProjectEvent {
  type: string;
  payload: Record<string, unknown>;
  actor: 'llm' | 'system';
  created_at: string;
}

export interface PendingCorrection {
  field: MaterializableField;
  value: string | number | string[];
}

export interface ProjectState {
  conversation_stage: ConversationStage;
  project_type: ProjectType | null;
  zip: string | null;
  serviceable: boolean | null;
  project_scope: ProjectScope;
  budget_amount: number | null;
  budget_source: BudgetSource;
  size_class: SizeClass;
  layout_change: LayoutChange;
  product_level: ProductLevel;
  appliance_tier: ApplianceTier;
  primary_pain_points: string[];
  primary_must_haves: string[];
  first_value_confidence: FirstValueConfidence | null;
  next_best_action: NextBestAction | null;
  // Medium-confidence candidates held for a soft-correction prompt, not yet written to the
  // authoritative field above. Keyed by field; last-write-wins within a turn.
  pending_corrections: PendingCorrection[];
}

export function createInitialState(): ProjectState {
  return {
    conversation_stage: 'DISCOVERY',
    project_type: null,
    zip: null,
    serviceable: null,
    project_scope: 'unknown_scope',
    budget_amount: null,
    budget_source: 'UNKNOWN',
    size_class: 'UNKNOWN',
    layout_change: 'UNKNOWN',
    product_level: 'UNKNOWN',
    appliance_tier: 'UNKNOWN',
    primary_pain_points: [],
    primary_must_haves: [],
    first_value_confidence: null,
    next_best_action: 'ASK_PROJECT_CONTEXT',
    pending_corrections: [],
  };
}
