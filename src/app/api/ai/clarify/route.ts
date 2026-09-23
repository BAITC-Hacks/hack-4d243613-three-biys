// POST /api/ai/clarify — ApiResult envelope; logic in src/lib/ai/clarify.ts, prompt in src/prompts/clarify.md.
import { clarify } from '@/lib/ai/clarify';
import { LlmError } from '@/lib/llm';
import { ClarifyRequestSchema } from '@/lib/schemas';
import { fail, ok, parseBody } from '@/lib/server/api';
import type { AgentStep } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  const parsed = await parseBody(req, ClarifyRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error, trace);
  try {
    return ok(await clarify(parsed.data, trace), trace);
  } catch (e) {
    if (e instanceof LlmError) return fail(e.code, e.message, trace);
    return fail('INTERNAL', (e as Error).message, trace);
  }
}
