// Single LLM wrapper (rules/agent.md): every model call goes through here.
// STUB (H1): replay-only. H2 adds OpenAI → NVIDIA fallback, zod + repair retry, DEMO_MODE record/replay.
import type { ZodType } from 'zod';
import type { AgentStep } from '@/lib/types';

export type DemoMode = 'live' | 'record' | 'replay';
export type Provider = 'openai' | 'nvidia' | 'replay';

export function demoMode(): DemoMode {
  const m = process.env.DEMO_MODE as DemoMode | undefined;
  if (m === 'live' || m === 'record' || m === 'replay') return m;
  return process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY ? 'live' : 'replay';
}

export class LlmError extends Error {
  constructor(public code: 'LLM_INVALID' | 'LLM_UNAVAILABLE', message: string) {
    super(message);
  }
}

export interface LlmCallOptions<T> {
  endpoint: string;            // fixture namespace, e.g. 'clarify'
  system: string;
  user: string;
  schema: ZodType<T>;
  trace: AgentStep[];
  timeoutMs?: number;
  maxTokens?: number;
}

export function step(trace: AgentStep[], partial: Omit<AgentStep, 'id' | 'ts'>): AgentStep {
  const s: AgentStep = { id: `s${trace.length + 1}`, ts: new Date().toISOString(), ...partial };
  trace.push(s);
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function callJson<T>(opts: LlmCallOptions<T>): Promise<T> {
  step(opts.trace, { kind: 'error', label: 'LLM wrapper not implemented yet (H2)' });
  throw new LlmError('LLM_UNAVAILABLE', 'LLM wrapper not implemented yet');
}
