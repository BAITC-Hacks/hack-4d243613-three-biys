// /api/ai/techspec logic: confirmed card → technical documentation for students + skill tags. Owner: A.
import { callJson, loadPrompt } from '@/lib/llm';
import { TechSpecResponseSchema, type TechSpecRequest, type TechSpecResponse } from '@/lib/schemas';
import type { AgentStep } from '@/lib/types';

export async function techSpec(req: TechSpecRequest, trace: AgentStep[]): Promise<TechSpecResponse> {
  const system = await loadPrompt('techspec');
  const user = JSON.stringify({ card: req.fields }, null, 2);
  const out = await callJson({ endpoint: 'techspec', system, user, schema: TechSpecResponseSchema, trace, maxTokens: 2500 });
  return { techSpec: out.techSpec, skillsNeeded: [...new Set(out.skillsNeeded.map((s) => s.trim()).filter(Boolean))].slice(0, 8) };
}
