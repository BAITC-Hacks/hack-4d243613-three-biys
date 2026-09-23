// POST /api/ingest/events — Collector activity events (≤500 per batch). Bearer INGEST_TOKEN.
import { IngestEventsRequestSchema } from '@/lib/schemas';
import { checkIngestToken, fail, ok, parseBody } from '@/lib/server/api';
import { appendEvents } from '@/lib/server/sources';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN');
  const parsed = await parseBody(req, IngestEventsRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error);
  try {
    const accepted = await appendEvents(parsed.data.deviceId, parsed.data.team, parsed.data.events);
    return ok({ accepted });
  } catch (e) {
    return fail('INTERNAL', (e as Error).message);
  }
}
