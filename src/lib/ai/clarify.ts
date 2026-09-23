// /api/ai/clarify logic: extract what the draft states, ask ≥3 questions ranked by rating gain. Owner: A.
import { callJson, loadPrompt } from '@/lib/llm';
import { GAIN_FOR_FIELD } from '@/lib/rating';
import { ClarifyResponseSchema, type ClarifyRequest, type ClarifyResponse } from '@/lib/schemas';
import type { AgentStep } from '@/lib/types';

export async function clarify(req: ClarifyRequest, trace: AgentStep[]): Promise<ClarifyResponse> {
  const system = await loadPrompt('clarify');
  const user = JSON.stringify({ draftText: req.draftText, industry: req.industry ?? null, alreadyKnownFields: req.fields ?? {} }, null, 2);
  const out = await callJson({ endpoint: 'clarify', system, user, schema: ClarifyResponseSchema, trace });
  // Server-side, deterministic: gain comes from the rating engine, never from the model; sort by it.
  const questions = out.questions
    .map((q, i) => ({ ...q, id: q.id || `q${i + 1}`, gain: GAIN_FOR_FIELD[q.field] }))
    .sort((a, b) => b.gain - a.gain);
  // Never let the model "extract" a field the draft doesn't contain: the draft (or known fields) must mention it.
  const extracted = { ...out.extracted };
  for (const [k, v] of Object.entries(extracted) as [keyof typeof extracted, string | null][]) {
    if (v && k !== 'title' && !req.fields?.[k] && !overlaps(req.draftText, v)) {
      extracted[k] = null;
      questions.push({ id: `q-${k}`, field: k, question: `Could you describe "${k}" in your own words?`, why: 'The model proposed text that is not grounded in your draft, so it was dropped.', gain: GAIN_FOR_FIELD[k] });
    }
  }
  return { extracted, questions };
}

// Cheap grounding check: at least half of the content words of the value appear in the draft.
function overlaps(draft: string, value: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 3);
  const d = new Set(norm(draft));
  const v = norm(value);
  if (!v.length) return true;
  return v.filter((w) => d.has(w)).length / v.length >= 0.5;
}
