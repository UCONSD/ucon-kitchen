import type { ChatMessage } from '../llm.js';
import { extractFacts, phraseResponse } from '../llm.js';
import { computeFirstValueConfidence } from './hardFloor.js';
import { applyCandidateFacts } from './materialize.js';
import { computeNextBestAction } from './nbq.js';
import type { NextBestAction, ProjectEvent, ProjectState } from './types.js';

export interface TurnResult {
  state: ProjectState;
  events: ProjectEvent[];
  reply: string;
  // The single mandate for this turn — computed from POST-extraction state, so it's both
  // "what the reply enacted" and "the fresh, non-stale action" at once. There is no separate
  // pre/post distinction anymore: extraction always happens before the mandate is decided.
  mandate: NextBestAction;
}

// One turn, four ordered steps — extraction and phrasing are two separate LLM calls so the
// mandate can sit strictly between them, decided from up-to-date state:
//   1. extractFacts(): LLM pulls candidate facts from the user's message. No mandate exists
//      yet and none is needed — extraction doesn't depend on what will be asked.
//   2. applyCandidateFacts(): engine materializes those candidates into Project State.
//   3. computeNextBestAction(): engine decides the mandate from the now-current state. This
//      is what fixes the lag bug — deciding from state that already reflects this turn's
//      answer means the mandate is never "the question that was just answered."
//   4. phraseResponse(): a second LLM call phrases a reply that acknowledges what the
//      homeowner said AND enacts the mandate from step 3, in the same reply.
export async function runTurn(state: ProjectState, history: ChatMessage[]): Promise<TurnResult> {
  const candidateFacts = await extractFacts(state, history);
  const { state: materialized, events } = applyCandidateFacts(state, candidateFacts);

  const mandate = computeNextBestAction(materialized);
  const reply = await phraseResponse(materialized, history, mandate);

  let nextState: ProjectState = { ...materialized, next_best_action: mandate };

  if (mandate === 'DELIVER_FIRST_VALUE') {
    const confidence = computeFirstValueConfidence(materialized);
    nextState = { ...nextState, conversation_stage: 'FIRST_VALUE', first_value_confidence: confidence };
    events.push({
      type: 'first_value.delivered',
      payload: { first_value_confidence: confidence },
      actor: 'system',
      created_at: new Date().toISOString(),
    });
  }

  return { state: nextState, events, reply, mandate };
}
