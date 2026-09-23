// POST /api/ingest/events — Collector activity events. STUB (H1): auth + validation only.
import { IngestEventsRequestSchema } from '@/lib/schemas';
import { checkIngestToken, fail, ok, parseBody } from '@/lib/server/api';

export async function POST(req: Request) {
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN');
  const parsed = await parseBody(req, IngestEventsRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error);
  return ok({ accepted: parsed.data.events.length });
}
