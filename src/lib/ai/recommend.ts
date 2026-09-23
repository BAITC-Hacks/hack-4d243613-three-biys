// /api/ai/recommend logic (optional): nicer reasons for rule-based matches. Never ranks or hides tasks. Owner: A.
import { callJson, loadPrompt } from '@/lib/llm';
import { RecommendResponseSchema, type RecommendRequest, type RecommendResponse } from '@/lib/schemas';
import type { AgentStep } from '@/lib/types';

export async function recommend(req: RecommendRequest, trace: AgentStep[]): Promise<RecommendResponse> {
  const system = await loadPrompt('recommend');
  const user = JSON.stringify({ team: req.team, tasks: req.tasks }, null, 2);
  const out = await callJson({ endpoint: 'recommend', system, user, schema: RecommendResponseSchema, trace });
  const known = new Set(req.tasks.map((t) => t.id));
  const reasons: Record<string, string> = {};
  for (const [id, r] of Object.entries(out.reasons)) if (known.has(id) && r.trim()) reasons[id] = r.trim();
  return { reasons };
}
