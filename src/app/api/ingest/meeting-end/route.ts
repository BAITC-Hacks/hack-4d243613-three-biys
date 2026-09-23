// POST /api/ingest/meeting-end — finalize a meeting transcript. STUB (H1).
import { IngestMeetingEndRequestSchema } from '@/lib/schemas';
import { checkIngestToken, fail, ok, parseBody } from '@/lib/server/api';
import type { MeetingNote } from '@/lib/types';

export async function POST(req: Request) {
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN');
  const parsed = await parseBody(req, IngestMeetingEndRequestSchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error);
  const meeting: MeetingNote = {
    id: parsed.data.meetingId, date: new Date().toISOString(), title: 'Meeting', team: 'unknown', transcript: '', origin: 'live',
  };
  return ok({ meeting });
}
