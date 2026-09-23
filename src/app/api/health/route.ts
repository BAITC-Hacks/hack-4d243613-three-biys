// GET /api/health — Collector "Test connection".
import { demoMode } from '@/lib/llm';
import { ok } from '@/lib/server/api';
import { storageKind } from '@/lib/server/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok({ ok: true as const, mode: demoMode() === 'replay' ? 'replay' : 'live', storage: storageKind() });
}
