// Audio transcription (Collector meeting notes). Goes through the OpenAI SDK; model IDs from models.ts. Owner: A.
import OpenAI from 'openai';
import { LlmError, step } from './index';
import { MODELS } from './models';
import type { AgentStep } from '@/lib/types';

export async function transcribeChunk(audio: Blob, filename: string, trace: AgentStep[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new LlmError('LLM_UNAVAILABLE', 'OPENAI_API_KEY is required for transcription');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = new File([audio], filename, { type: audio.type || 'audio/webm' });
  for (const model of [MODELS.openai.transcribe, MODELS.openai.transcribeFallback]) {
    const t0 = Date.now();
    try {
      const res = await client.audio.transcriptions.create({ file, model, response_format: 'text' }, { timeout: 60_000, maxRetries: 0 });
      const text = typeof res === 'string' ? res : (res as { text: string }).text;
      step(trace, { kind: 'llm_call', label: `transcribe ${filename}`, provider: 'openai', model, output: text, durationMs: Date.now() - t0 });
      return text.trim();
    } catch (e) {
      step(trace, { kind: 'error', label: `${model}: ${(e as Error).message}`, provider: 'openai', model, durationMs: Date.now() - t0 });
    }
  }
  throw new LlmError('LLM_UNAVAILABLE', 'Transcription failed on both models');
}
