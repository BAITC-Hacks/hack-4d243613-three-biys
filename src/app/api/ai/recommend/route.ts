// POST /api/ai/recommend — STUB (H1): validates input, returns LLM_UNAVAILABLE until the AI layer lands.
import { RecommendRequestSchema } from '@/lib/schemas';
import { fail, parseBody } from '@/lib/server/api';
import type { AgentStep } from '@/lib/types';

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  const parsed = await parseBody(req, RecommendRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error, trace);
  return fail('LLM_UNAVAILABLE', 'recommend is not implemented yet; set NEXT_PUBLIC_MOCK_AI=1 in the browser meanwhile', trace);
}
