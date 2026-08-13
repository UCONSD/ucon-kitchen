import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { createInitialState } from './engine/types.js';
import { runTurn } from './engine/orchestrate.js';
import type { ChatMessage } from './llm.js';

loadEnvLocal();

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const OPENING_MESSAGE = `Hi! I'm here to help figure out if your kitchen project idea and budget line up, and
what direction makes sense — should take about 10 minutes. Two quick things: your project
stays with us, this isn't a lead marketplace, and I'm here to help figure out what's
realistic, not to push your budget higher.

So — tell me about your kitchen and what you'd like to change.`;

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const history: ChatMessage[] = [];
  let state = createInitialState();

  console.log(`\nAssistant: ${OPENING_MESSAGE}\n`);

  while (true) {
    const userInput = await rl.question('You: ');
    if (userInput.trim().toLowerCase() === 'exit' || userInput.trim().toLowerCase() === 'quit') {
      break;
    }

    history.push({ role: 'user', content: userInput });

    const result = await runTurn(state, history);
    state = result.state;
    history.push({ role: 'assistant', content: result.reply });

    console.log(`\nAssistant: ${result.reply}\n`);
    console.log('--- debug: Project State ---');
    console.log(JSON.stringify(state, null, 2));
    console.log(`mandate: ${result.mandate}`);
    console.log('-----------------------------\n');

    if (state.conversation_stage === 'FIRST_VALUE') {
      console.log('FIRST_VALUE delivered. Type "exit" to end, or keep chatting.\n');
    }
  }

  rl.close();
}

function loadEnvLocal() {
  const path = new URL('../.env.local', import.meta.url);
  if (!existsSync(path)) return;
  const contents = readFileSync(path, 'utf-8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
