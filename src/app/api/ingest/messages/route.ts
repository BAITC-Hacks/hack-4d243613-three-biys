// POST /api/ingest/messages — chat source (roadmap, not built; kept so the contract is stable). Validates and counts only.
import { IngestMessagesRequestSchema } from '@/lib/schemas';
import { checkIngestToken, fail, ok, parseBody } from '@/lib/server/api';

export async function POST(req: Request) {
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN');
  const parsed = await parseBody(req, IngestMessagesRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error);
  return ok({ accepted: parsed.data.messages.length });
}
