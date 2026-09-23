// /api/ai/card logic: draft + answers → card fields, null when not stated. Owner: A.
import { callJson, loadPrompt } from '@/lib/llm';
import { CardResponseSchema, type CardRequest, type CardResponse } from '@/lib/schemas';
import type { AgentStep } from '@/lib/types';

export async function buildCard(req: CardRequest, trace: AgentStep[]): Promise<CardResponse> {
  const system = await loadPrompt('card');
  const user = JSON.stringify({ draftText: req.draftText, answers: req.answers }, null, 2);
  const out = await callJson({ endpoint: 'card', system, user, schema: CardResponseSchema, trace });
  // Guard: a field whose answer was empty/negative cannot be filled from that answer.
  const fields = { ...out.fields };
  const fieldSource = { ...out.fieldSource };
  for (const a of req.answers) {
    const empty = /^(\s*|-|no|нет|n\/a|none|не знаю|i don'?t know)$/i.test(a.answer.trim());
    if (empty && fieldSource[a.field] === 'answer') { fields[a.field] = null; delete fieldSource[a.field]; }
  }
  for (const k of Object.keys(fields) as (keyof typeof fields)[]) if (fields[k] === null) delete fieldSource[k];
  return { fields, fieldSource };
}
