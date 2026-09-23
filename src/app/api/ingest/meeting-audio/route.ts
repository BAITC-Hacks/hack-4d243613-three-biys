// POST /api/ingest/meeting-audio — multipart audio chunk → transcription. STUB (H1): accepts form, no transcription.
import { checkIngestToken, fail, ok } from '@/lib/server/api';

export async function POST(req: Request) {
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN');
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('BAD_INPUT', 'Expected multipart/form-data');
  }
  const meetingId = String(form.get('meetingId') ?? '');
  const seq = Number(form.get('seq') ?? 0);
  if (!meetingId || !(form.get('audio') instanceof Blob)) return fail('BAD_INPUT', 'meetingId and audio are required');
  return ok({ meetingId, seq, text: '', transcriptLength: 0 });
}
