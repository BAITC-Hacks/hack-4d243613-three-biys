// /api/ai/discover logic: sources in the period → one validated LLM call → evidence verification. Owner: A.
import { callJson, loadPrompt, step } from '@/lib/llm';
import { DiscoverResponseSchema, type DiscoverRequest, type DiscoverResponse } from '@/lib/schemas';
import { getSnapshot } from '@/lib/server/sources';
import type { AgentStep, SourcesSnapshot } from '@/lib/types';
import { aggregateId, verifyInsights } from './evidence';

function weekStart(week: string): string {
  // ISO week → Monday date (UTC)
  const [y, w] = week.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * 86400000 + (w - 1) * 7 * 86400000);
  return monday.toISOString().slice(0, 10);
}

export function filterSnapshot(snap: SourcesSnapshot, period: DiscoverRequest['period']): SourcesSnapshot {
  const from = period.from.slice(0, 10); const to = period.to.slice(0, 10);
  return {
    ...snap,
    meetings: snap.meetings.filter((m) => m.date >= from && m.date <= to),
    // a week counts if its Monday falls inside the period (allowing the period to start mid-week)
    aggregates: snap.aggregates.filter((a) => { const d = weekStart(a.week); const fromMonday = new Date(Date.parse(from) - 6 * 86400000).toISOString().slice(0, 10); return d >= fromMonday && d <= to; }),
  };
}

export async function discover(req: DiscoverRequest, trace: AgentStep[]): Promise<DiscoverResponse> {
  const t0 = Date.now();
  const full = await getSnapshot(5);
  const snap = filterSnapshot(full, req.period);
  step(trace, {
    kind: 'tool_call', label: `sources(${req.period.from}..${req.period.to})`,
    detail: { meetings: snap.meetings.length, aggregates: snap.aggregates.length, privacy: snap.privacy }, durationMs: Date.now() - t0,
  });
  const input = {
    period: req.period,
    // live = captured by the Windows Collector; history = earlier recorded meetings. Live first so the model reads them first.
    meetings: [...snap.meetings]
      .sort((a, b) => (a.origin === b.origin ? 0 : a.origin === 'live' ? -1 : 1))
      .map((m) => ({ id: m.id, source: m.origin === 'live' ? 'live' : 'history', date: m.date, team: m.team, title: m.title, transcript: m.transcript })),
    aggregates: snap.aggregates.map((a) => ({
      id: aggregateId(a), date: weekStart(a.week), team: a.team, week: a.week, contributors: a.contributors,
      hoursByCategory: a.hoursByCategory, transfers: a.transfers, topSwitches: a.topSwitches,
    })),
  };
  const system = await loadPrompt('discover');
  // Live Collector meetings get their own pass so they are never drowned out by the longer history; run both in parallel.
  const live = input.meetings.filter((m) => m.source === 'live');
  const liveCall = live.length
    ? callJson({
        endpoint: 'discover-live', system,
        user: JSON.stringify({ period: req.period, meetings: live, aggregates: [], note: 'Only live meetings. Return one insight per live meeting that states any need, goal or problem.' }, null, 1),
        schema: DiscoverResponseSchema, trace, task: 'discover', maxTokens: 1500, timeoutMs: 60_000,
      }).catch(() => ({ insights: [], dropped: 0 }))
    : Promise.resolve({ insights: [], dropped: 0 });
  const [liveOut, out] = await Promise.all([
    liveCall,
    callJson({ endpoint: 'discover', system, user: JSON.stringify(input, null, 1), schema: DiscoverResponseSchema, trace, task: 'discover', maxTokens: 3000, timeoutMs: 90_000 }),
  ]);
  const liveIds = new Set(live.map((m) => m.id));
  const liveVerified = verifyInsights(liveOut.insights.map((x, i) => ({ ...x, id: `live-${i + 1}` })), snap, trace);
  const verified = verifyInsights(out.insights, snap, trace);
  // History insights that only restate a live one (same live meeting cited) are skipped to avoid duplicates.
  const rest = verified.insights.filter((x) => !x.evidence.some((e) => liveIds.has(e.sourceId)));
  return { insights: [...liveVerified.insights, ...rest], dropped: liveVerified.dropped + verified.dropped };
}
