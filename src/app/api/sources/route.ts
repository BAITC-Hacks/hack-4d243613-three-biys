// GET /api/sources — SourcesSnapshot (seed + live, aggregated with k=5). STUB (H1): empty snapshot.
import { ok } from '@/lib/server/api';
import { aggregateActivity } from '@/lib/discover/aggregate';
import type { SourcesSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { aggregates, privacy } = aggregateActivity([], 5);
  const snapshot: SourcesSnapshot = { meetings: [], aggregates, privacy, chats: [], live: { devices: 0 } };
  return ok(snapshot);
}
