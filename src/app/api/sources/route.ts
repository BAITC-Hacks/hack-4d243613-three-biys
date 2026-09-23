// GET /api/sources — SourcesSnapshot: seed history + live Collector data, aggregated with k=5. No token needed.
import { getSnapshot } from '@/lib/server/sources';
import { fail, ok } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await getSnapshot(5));
  } catch (e) {
    return fail('INTERNAL', (e as Error).message);
  }
}
