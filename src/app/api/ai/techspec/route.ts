// POST /api/ai/techspec — ApiResult envelope; logic in src/lib/ai/techspec.ts, prompt in src/prompts/techspec.md.
import { techSpec } from '@/lib/ai/techspec';
import { LlmError } from '@/lib/llm';
import { TechSpecRequestSchema } from '@/lib/schemas';
import { fail, ok, parseBody } from '@/lib/server/api';
import type { AgentStep } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  const parsed = await parseBody(req, TechSpecRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error, trace);
  try {
    return ok(await techSpec(parsed.data, trace), trace);
  } catch (e) {
    if (e instanceof LlmError) return fail(e.code, e.message, trace);
    return fail('INTERNAL', (e as Error).message, trace);
  }
}
