// Helpers for API routes: ApiResult envelope, zod body parsing, ingest auth. Owner: A.
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import type { AgentStep, ApiResult } from '@/lib/types';

type ErrCode = Extract<ApiResult<unknown>, { ok: false }>['error']['code'];

export function ok<T>(data: T, trace: AgentStep[] = []) {
  return NextResponse.json({ ok: true, data, trace } satisfies ApiResult<T>);
}

export function fail(code: ErrCode, message: string, trace: AgentStep[] = []) {
  const status = code === 'BAD_INPUT' ? 400 : code === 'UNAUTHORIZED' ? 401 : code === 'LLM_UNAVAILABLE' ? 503 : code === 'LLM_INVALID' ? 502 : 500;
  return NextResponse.json({ ok: false, error: { code, message }, trace } satisfies ApiResult<never>, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: string }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: 'Body must be JSON' };
  }
  const r = schema.safeParse(json);
  if (!r.success) return { error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  return { data: r.data };
}

export function checkIngestToken(req: Request): boolean {
  const expected = process.env.INGEST_TOKEN;
  // No token configured: open only for a local dev run; a production deploy must set INGEST_TOKEN.
  if (!expected) return process.env.NODE_ENV !== 'production' || !process.env.VERCEL;
  const header = req.headers.get('authorization') ?? '';
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
