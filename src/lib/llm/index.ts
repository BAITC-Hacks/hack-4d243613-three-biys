// Single LLM wrapper (rules/agent.md): every model call goes through here. Owner: A.
//
// - Providers: OpenAI (primary) and NVIDIA (OpenAI-compatible), chosen by LLM_PROVIDER; the other is the fallback.
// - Output: JSON only, validated with zod. Invalid → ONE repair retry (we send the validation errors back) → LlmError('LLM_INVALID').
// - Rate-limit / auth / network → fallback provider → replay fixture → LlmError('LLM_UNAVAILABLE').
// - DEMO_MODE: live | record (save responses to fixtures/replay/<endpoint>-<hash>.json) | replay (serve fixtures, never call).
//   No key at all → replay. Replay falls back to the latest fixture for the endpoint when the exact hash is missing.
// - Every step (llm_call with prompt/input/output, validation, error) is pushed to `trace` for the "How the AI works" panel.
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import type { ZodType } from 'zod';
import type { AgentStep } from '@/lib/types';
import { MODELS, NVIDIA_BASE_URL } from './models';

export type DemoMode = 'live' | 'record' | 'replay';
export type Provider = 'openai' | 'nvidia';
export type ModelTask = 'json' | 'discover';

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
  task?: ModelTask;
  timeoutMs?: number;
  maxTokens?: number;
}

export function step(trace: AgentStep[], partial: Omit<AgentStep, 'id' | 'ts'>): AgentStep {
  const s: AgentStep = { id: `s${trace.length + 1}`, ts: new Date().toISOString(), ...partial };
  trace.push(s);
  return s;
}

const FIXTURE_DIR = path.join(process.cwd(), 'fixtures', 'replay');

function hashOf(endpoint: string, system: string, user: string) {
  return createHash('sha1').update(`${endpoint}\n${system}\n${user}`).digest('hex').slice(0, 10);
}

interface Fixture { endpoint: string; hash: string; recordedAt: string; provider: Provider; model: string; system: string; user: string; output: unknown }

async function readFixture(endpoint: string, hash: string): Promise<{ fixture: Fixture; exact: boolean } | null> {
  const exact = path.join(FIXTURE_DIR, `${endpoint}-${hash}.json`);
  try {
    return { fixture: JSON.parse(await fs.readFile(exact, 'utf8')), exact: true };
  } catch { /* fall through to latest */ }
  try {
    const files = (await fs.readdir(FIXTURE_DIR)).filter((f) => f.startsWith(`${endpoint}-`) && f.endsWith('.json'));
    if (!files.length) return null;
    const stats = await Promise.all(files.map(async (f) => ({ f, t: (await fs.stat(path.join(FIXTURE_DIR, f))).mtimeMs })));
    stats.sort((a, b) => b.t - a.t);
    return { fixture: JSON.parse(await fs.readFile(path.join(FIXTURE_DIR, stats[0].f), 'utf8')), exact: false };
  } catch {
    return null;
  }
}

async function writeFixture(fx: Fixture) {
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  await fs.writeFile(path.join(FIXTURE_DIR, `${fx.endpoint}-${fx.hash}.json`), JSON.stringify(fx, null, 2));
}

function providerOrder(): Provider[] {
  const first = (process.env.LLM_PROVIDER === 'nvidia' ? 'nvidia' : 'openai') as Provider;
  const all: Provider[] = first === 'openai' ? ['openai', 'nvidia'] : ['nvidia', 'openai'];
  return all.filter((p) => (p === 'openai' ? !!process.env.OPENAI_API_KEY : !!process.env.NVIDIA_API_KEY));
}

function client(p: Provider) {
  return p === 'openai'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: process.env.NVIDIA_BASE_URL || NVIDIA_BASE_URL });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(trimmed); } catch { /* try to find the outermost object */ }
  const a = trimmed.indexOf('{'); const b = trimmed.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(trimmed.slice(a, b + 1));
  throw new Error('no JSON object in response');
}

function isUnavailable(e: unknown): boolean {
  const status = (e as { status?: number }).status;
  return status === 401 || status === 402 || status === 403 || status === 429 || (status !== undefined && status >= 500) || status === undefined;
}

async function rawCall(p: Provider, model: string, system: string, user: string, opts: { timeoutMs: number; maxTokens: number }): Promise<string> {
  const res = await client(p).chat.completions.create(
    {
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0,
      max_tokens: opts.maxTokens,
      ...(p === 'openai' ? { response_format: { type: 'json_object' as const } } : {}),
    },
    { timeout: opts.timeoutMs, maxRetries: 0 },
  );
  return res.choices[0]?.message?.content ?? '';
}

export async function callJson<T>(opts: LlmCallOptions<T>): Promise<T> {
  const { endpoint, system, user, schema, trace } = opts;
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const maxTokens = opts.maxTokens ?? 2000;
  const task: ModelTask = opts.task ?? 'json';
  const mode = demoMode();
  const hash = hashOf(endpoint, system, user);

  const validate = (raw: unknown, label: string) => {
    const r = schema.safeParse(raw);
    step(trace, {
      kind: 'validation', label: `${label}: ${r.success ? 'valid' : 'invalid'}`,
      validation: { ok: r.success, errors: r.success ? undefined : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
    });
    return r;
  };

  if (mode === 'replay') {
    const fx = await readFixture(endpoint, hash);
    if (!fx) {
      step(trace, { kind: 'error', label: `replay: no fixture for ${endpoint}` });
      throw new LlmError('LLM_UNAVAILABLE', `No replay fixture for "${endpoint}" and no API key set`);
    }
    step(trace, {
      kind: 'llm_call', label: `replay fixture ${endpoint}-${fx.fixture.hash}${fx.exact ? '' : ' (latest, input differs)'}`,
      provider: 'replay', model: fx.fixture.model, prompt: system, input: user, output: fx.fixture.output,
    });
    const r = validate(fx.fixture.output, 'fixture');
    if (!r.success) throw new LlmError('LLM_INVALID', 'Replay fixture does not match schema');
    return r.data;
  }

  const providers = providerOrder();
  let lastErr: unknown;
  for (const p of providers) {
    const model = MODELS[p][task];
    let userMsg = user;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      let text: string;
      try {
        text = await rawCall(p, model, system, userMsg, { timeoutMs, maxTokens });
      } catch (e) {
        lastErr = e;
        step(trace, { kind: 'error', label: `${p}/${model}: ${(e as Error).message}`, provider: p, model, durationMs: Date.now() - t0 });
        break; // this provider is unavailable → next provider
      }
      let raw: unknown;
      try {
        raw = extractJson(text);
      } catch {
        raw = null;
      }
      step(trace, { kind: 'llm_call', label: `${p}/${model}${attempt ? ' (repair retry)' : ''}`, provider: p, model, prompt: system, input: userMsg, output: raw ?? text, durationMs: Date.now() - t0 });
      const r = validate(raw, attempt ? 'repair' : 'response');
      if (r.success) {
        if (attempt) trace[trace.length - 1].validation!.repaired = true;
        if (mode === 'record') await writeFixture({ endpoint, hash, recordedAt: new Date().toISOString(), provider: p, model, system, user, output: raw });
        return r.data;
      }
      // Repair retry: send the errors back once.
      userMsg = `${user}\n\nYour previous answer was not valid JSON for the required schema. Errors:\n${r.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}\nReturn ONLY the corrected JSON object.`;
    }
    if (lastErr && !isUnavailable(lastErr)) break;
    if (!lastErr) throw new LlmError('LLM_INVALID', `${p}/${model} returned invalid JSON twice`);
    lastErr = undefined;
  }

  // Live failed everywhere → last resort: replay fixture.
  const fx = await readFixture(endpoint, hash);
  if (fx) {
    step(trace, { kind: 'llm_call', label: `fallback to replay fixture ${endpoint}-${fx.fixture.hash}`, provider: 'replay', model: fx.fixture.model, output: fx.fixture.output });
    const r = validate(fx.fixture.output, 'fixture');
    if (r.success) return r.data;
  }
  throw new LlmError('LLM_UNAVAILABLE', providers.length ? 'All providers failed and no replay fixture found' : 'No API key configured and no replay fixture found');
}

// Loads a prompt from src/prompts/<name>.md (prompts never live inline).
export async function loadPrompt(name: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'src', 'prompts', `${name}.md`), 'utf8');
}
