// POST /api/ingest/meeting-audio — multipart: audio (webm/opus ≤ 25 MB), meetingId, title, team, seq, startedAt.
// Transcribes the chunk with OpenAI and appends it to the meeting in progress. Bearer INGEST_TOKEN.
import { LlmError } from '@/lib/llm';
import { transcribeChunk } from '@/lib/llm/transcribe';
import { checkIngestToken, fail, ok } from '@/lib/server/api';
import { appendMeetingChunk } from '@/lib/server/sources';
import type { AgentStep } from '@/lib/types';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const trace: AgentStep[] = [];
  if (!checkIngestToken(req)) return fail('UNAUTHORIZED', 'Bad or missing INGEST_TOKEN', trace);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('BAD_INPUT', 'Expected multipart/form-data', trace);
  }
  const audio = form.get('audio');
  const meetingId = String(form.get('meetingId') ?? '').trim();
  const seq = Number(form.get('seq') ?? 0);
  if (!meetingId || !(audio instanceof Blob)) return fail('BAD_INPUT', 'meetingId and audio are required', trace);
  if (audio.size > MAX_BYTES) return fail('BAD_INPUT', 'audio chunk exceeds 25 MB', trace);
  try {
    const text = await transcribeChunk(audio, `${meetingId}-${seq}.webm`, trace);
    const m = await appendMeetingChunk({
      meetingId, title: String(form.get('title') ?? 'Meeting'), team: String(form.get('team') ?? 'unknown'),
      startedAt: String(form.get('startedAt') ?? new Date().toISOString()),
    }, seq, text);
    const transcriptLength = Object.values(m.parts).join(' ').length;
    return ok({ meetingId, seq, text, transcriptLength }, trace);
  } catch (e) {
    if (e instanceof LlmError) return fail(e.code, e.message, trace);
    return fail('INTERNAL', (e as Error).message, trace);
  }
}
