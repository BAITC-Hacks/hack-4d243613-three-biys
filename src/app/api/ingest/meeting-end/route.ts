// POST /api/ingest/meeting-end — assemble the chunks into a MeetingNote (origin: live). Bearer INGEST_TOKEN.
import { IngestMeetingEndRequestSchema } from '@/lib/schemas';
import { checkIngestToken, fail, ok, parseBody } from '@/lib/server/api';
import { finishMeeting } from '@/lib/server/sources';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN');
  const parsed = await parseBody(req, IngestMeetingEndRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error);
  try {
    return ok({ meeting: await finishMeeting(parsed.data.meetingId) });
  } catch (e) {
    return fail('INTERNAL', (e as Error).message);
  }
}
