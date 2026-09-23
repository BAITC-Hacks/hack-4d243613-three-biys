// POST /api/ai/card — ApiResult envelope; logic in src/lib/ai/card.ts, prompt in src/prompts/card.md.
import { buildCard } from '@/lib/ai/card';
import { LlmError } from '@/lib/llm';
import { CardRequestSchema } from '@/lib/schemas';
import { fail, ok, parseBody } from '@/lib/server/api';
import type { AgentStep } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  const parsed = await parseBody(req, CardRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error, trace);
  try {
    return ok(await buildCard(parsed.data, trace), trace);
  } catch (e) {
    if (e instanceof LlmError) return fail(e.code, e.message, trace);
    return fail('INTERNAL', (e as Error).message, trace);
  }
}
