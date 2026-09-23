// POST /api/ai/voice-session — mints a short-lived OpenAI Realtime client secret for the voice interview.
// The real API key never leaves the server; the browser uses the ephemeral secret over WebRTC directly with OpenAI.
import { z } from 'zod';
import { loadPrompt } from '@/lib/llm';
import { MODELS } from '@/lib/llm/models';
import { CardFieldSchema } from '@/lib/schemas';
import { fail, ok, parseBody } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  draftText: z.string().min(1),
  questions: z.array(z.object({ id: z.string(), field: CardFieldSchema, question: z.string(), why: z.string(), gain: z.number() })).min(1),
  language: z.enum(['ru', 'en']).optional(),
});

export const voiceTools = [
  {
    type: 'function', name: 'submit_answer',
    description: 'Record the answer for one card field once the person has given usable information. Empty answer = skipped.',
    parameters: {
      type: 'object',
      properties: {
        field: { type: 'string', enum: ['context', 'need', 'users', 'data', 'constraints', 'expectedResult', 'successCriteria', 'contact'] },
        answer: { type: 'string', description: "1-3 sentences in the person's own words; empty string if skipped" },
      },
      required: ['field', 'answer'],
    },
  },
  { type: 'function', name: 'finish_interview', description: 'All questions are answered or the person wants to stop.', parameters: { type: 'object', properties: {} } },
];

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) return fail('LLM_UNAVAILABLE', 'Voice interview needs OPENAI_API_KEY (not available in replay mode)');
  const parsed = await parseBody(req, BodySchema);
  if ('error' in parsed) return fail('BAD_INPUT', parsed.error);
  const { draftText, questions, language } = parsed.data;
  const base = await loadPrompt('voice-interview');
  const instructions = `${base}\n\nDraft from the business:\n"""${draftText}"""\n\nQuestions to ask, in this order (field → question — why it matters, +points):\n${questions
    .map((q, i) => `${i + 1}. ${q.field} → ${q.question} — ${q.why} (+${q.gain})`).join('\n')}\n${language ? `\nSpeak ${language === 'ru' ? 'Russian' : 'English'}.` : ''}`;

  const session = {
    type: 'realtime',
    model: MODELS.openai.realtime,
    instructions,
    tools: voiceTools,
    tool_choice: 'auto',
    audio: {
      input: {
        transcription: { model: MODELS.openai.realtimeTranscribe },
        turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 700, interrupt_response: true, create_response: true },
      },
      output: { voice: 'marin' },
    },
  };
  try {
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expires_after: { anchor: 'created_at', seconds: 600 }, session }),
    });
    const json = (await res.json()) as { value?: string; expires_at?: number; error?: { message: string } };
    if (!res.ok || !json.value) return fail('LLM_UNAVAILABLE', json.error?.message ?? `OpenAI ${res.status}`);
    return ok({ clientSecret: json.value, expiresAt: json.expires_at ?? 0, model: MODELS.openai.realtime, instructions });
  } catch (e) {
    return fail('LLM_UNAVAILABLE', (e as Error).message);
  }
}
