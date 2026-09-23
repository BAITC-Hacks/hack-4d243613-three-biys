// POST /api/ai/recommend — optional; adds reasons to rule-based matches. Logic in src/lib/ai/recommend.ts.
import { recommend } from '@/lib/ai/recommend';
import { LlmError } from '@/lib/llm';
import { RecommendRequestSchema } from '@/lib/schemas';
import { fail, ok, parseBody } from '@/lib/server/api';
import type { AgentStep } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  const parsed = await parseBody(req, RecommendRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error, trace);
  try {
    return ok(await recommend(parsed.data, trace), trace);
  } catch (e) {
    if (e instanceof LlmError) return fail(e.code, e.message, trace);
    return fail('INTERNAL', (e as Error).message, trace);
  }
}
