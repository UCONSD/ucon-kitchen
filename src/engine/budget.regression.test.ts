import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, type ProjectState } from './types.js';
import { applyCandidateFacts } from './materialize.js';
import { computeNextBestAction } from './nbq.js';
import { evaluateHardFloor } from './hardFloor.js';

// Regression for the live happy-path ASK_BUDGET bug. Homeowner utterance:
//   "Our budget is around $85,000."
// Bug: the explicit figure was undercalled to medium -> parked in pending_corrections
// (budget_amount=null), and even when materialized, budget_source was never set, so the
// budget hard floor stayed unmet and ASK_BUDGET repeated. Corrected extraction emits
// budget_amount=85000 @ HIGH; the engine must materialize it, derive budget_source, and
// advance the mandate past ASK_BUDGET — no confirmation turn.
//
// This is an ENGINE-level regression (deterministic, no network). The extraction-prompt
// half (explicit $ figure -> HIGH) is validated on a live roleplay run.

function parkedAtAskBudget(): ProjectState {
  // Minimal state where ASK_BUDGET is the sole remaining blocker.
  return {
    ...createInitialState(),
    project_type: 'occupied_remodel',
    zip: '92130',
    serviceable: true,
    project_scope: 'cabinetry_install',
  };
}

test('explicit $85,000 budget materializes without confirmation and unblocks ASK_BUDGET', () => {
  const base = parkedAtAskBudget();
  assert.equal(computeNextBestAction(base), 'ASK_BUDGET', 'precondition: ASK_BUDGET is the blocker');

  const { state } = applyCandidateFacts(base, [
    { field: 'budget_amount', value: 85000, confidence: 'high' },
  ]);

  assert.equal(state.budget_amount, 85000, 'amount materialized');
  assert.equal(state.budget_source, 'CUSTOMER_DECLARED', 'source derived from the declared amount');
  assert.equal(state.pending_corrections.length, 0, 'not parked in pending_corrections');
  assert.ok(!evaluateHardFloor(state).missing.includes('budget'), 'budget clears the hard floor');
  assert.notEqual(computeNextBestAction(state), 'ASK_BUDGET', 'mandate advances beyond ASK_BUDGET');
});

test('confidence gate is unchanged for inferred categorical drivers', () => {
  // Guard against over-broadening: a MEDIUM categorical inference must still be held as a
  // pending soft-correction, not written as fact.
  const { state } = applyCandidateFacts(parkedAtAskBudget(), [
    { field: 'size_class', value: 'LARGE', confidence: 'medium' },
  ]);
  assert.equal(state.size_class, 'UNKNOWN', 'medium categorical is not materialized');
  assert.equal(state.pending_corrections.length, 1, 'medium categorical is held for confirmation');
});
