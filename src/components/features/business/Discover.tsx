'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentStep, SourcesSnapshot } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { discover, getSources } from '@/lib/api-client';
import { AgentTrace, AiNoticeBanner, InsightCard, PrivacyPanel } from '@/components/domain';
import { Button } from '@/components/ui';

export function Discover() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { insights, setInsights } = useStore();
  const [sources, setSources] = useState<SourcesSnapshot | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [trace, setTrace] = useState<AgentStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSources().then((res) => (res.ok ? setSources(res.data) : setSourcesError(res.error.message)));
  }, []);

  const analyze = async () => {
    setBusy(true); setError(null);
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
    const res = await discover({ period: { from, to } });
    setBusy(false);
    setTrace(res.trace);
    if (!res.ok) return setError(res.error.message);
    setInsights(res.data.insights);
  };

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Discover problems worth solving</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">Sources</h2>
        {sourcesError && <p className="text-sm text-amber-700">{sourcesError}</p>}
        {sources && (
          <>
            <p className="text-sm text-muted">
              {sources.meetings.length} meetings · {sources.aggregates.length} team-week aggregates · {sources.chats.length} chat messages
            </p>
            <PrivacyPanel privacy={sources.privacy} live={sources.live} />
            <details className="text-sm">
              <summary className="cursor-pointer">Meetings & chats</summary>
              <ul className="mt-2 space-y-1">
                {sources.meetings.map((m) => (
                  <li key={m.id}>{m.date} · {m.title} · {m.team} {m.origin === 'live' && <b>(live)</b>}</li>
                ))}
                {sources.chats.map((c) => (
                  <li key={c.id}>{c.date} · #{c.channel} · {c.role}: {c.text}</li>
                ))}
              </ul>
            </details>
          </>
        )}
      </section>

      <section className="space-y-3">
        <Button loading={busy} onClick={analyze}
          >
          {busy ? 'Analyzing…' : 'Analyze last 4 weeks'}
        </Button>
        {error && <div className="rounded-control bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {trace.length > 0 && <AgentTrace steps={trace} />}
        {insights.length > 0 && <AiNoticeBanner />}
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} useLabel="Use as draft" onUse={() => router.push(`/business/new?insight=${i.id}`)} />
          ))}
        </div>
      </section>
    </div>
  );
}
