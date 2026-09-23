// POST /api/ai/discover — insights with verified evidence; logic in src/lib/ai/discover.ts, prompt in src/prompts/discover.md.
import { discover } from '@/lib/ai/discover';
import { LlmError } from '@/lib/llm';
import { DiscoverRequestSchema } from '@/lib/schemas';
import { fail, ok, parseBody } from '@/lib/server/api';
import type { AgentStep } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  const parsed = await parseBody(req, DiscoverRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error, trace);
  try {
    return ok(await discover(parsed.data, trace), trace);
  } catch (e) {
    if (e instanceof LlmError) return fail(e.code, e.message, trace);
    return fail('INTERNAL', (e as Error).message, trace);
  }
}
