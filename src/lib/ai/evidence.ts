// Evidence verification for Discover: quotes must be verbatim substrings, metrics must repeat real aggregate numbers,
// suggested fields must be grounded in the cited evidence. Unsupported evidence / insights are dropped. Owner: A.
import type { AgentStep, Evidence, Insight, SourcesSnapshot } from '@/lib/types';
import { step } from '@/lib/llm';

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

export function aggregateId(a: SourcesSnapshot['aggregates'][number]) {
  return `${a.team}:${a.week}`;
}

function numbersIn(s: string): number[] {
  return (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function aggregateNumbers(a: SourcesSnapshot['aggregates'][number]): Set<number> {
  const n = new Set<number>([a.contributors]);
  for (const t of a.transfers) { n.add(t.count); n.add(t.contributors); }
  for (const s of a.topSwitches) { n.add(s.count); n.add(s.contributors); }
  for (const h of Object.values(a.hoursByCategory)) { n.add(h); n.add(Math.round(h)); }
  return n;
}

export function verifyEvidence(ev: Evidence, snap: SourcesSnapshot): { ok: true; evidence: Evidence } | { ok: false; reason: string } {
  if (ev.sourceType === 'meeting') {
    const m = snap.meetings.find((x) => x.id === ev.sourceId);
    if (!m) return { ok: false, reason: `unknown meeting ${ev.sourceId}` };
    if (!ev.quote || norm(ev.quote).length < 10) return { ok: false, reason: 'quote missing or too short' };
    if (!norm(m.transcript).includes(norm(ev.quote))) return { ok: false, reason: `quote is not verbatim in ${m.id}` };
    return { ok: true, evidence: { ...ev, date: m.date, metric: undefined } };
  }
  if (ev.sourceType === 'activity') {
    const a = snap.aggregates.find((x) => aggregateId(x) === ev.sourceId);
    if (!a) return { ok: false, reason: `unknown aggregate ${ev.sourceId}` };
    if (!ev.metric) return { ok: false, reason: 'metric missing' };
    const nums = numbersIn(ev.metric);
    if (!nums.length) return { ok: false, reason: 'metric has no number' };
    const real = aggregateNumbers(a);
    const bad = nums.filter((n) => !real.has(n));
    if (bad.length) return { ok: false, reason: `metric numbers not in ${ev.sourceId}: ${bad.join(', ')}` };
    return { ok: true, evidence: { ...ev, quote: undefined } };
  }
  return { ok: false, reason: `unsupported source type ${ev.sourceType}` };
}

// A suggested field is kept only if most of its content words come from the cited evidence text.
function grounded(text: string, evidenceText: string): boolean {
  const words = (s: string) => norm(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 3);
  const pool = new Set(words(evidenceText));
  const w = words(text);
  return w.length > 0 && w.filter((x) => pool.has(x)).length / w.length >= 0.5;
}

export function verifyInsights(insights: Insight[], snap: SourcesSnapshot, trace: AgentStep[]): { insights: Insight[]; dropped: number } {
  const kept: Insight[] = [];
  let dropped = 0;
  insights.forEach((ins, i) => {
    const evidence: Evidence[] = [];
    const reasons: string[] = [];
    for (const ev of ins.evidence) {
      const r = verifyEvidence(ev, snap);
      if (r.ok) evidence.push(r.evidence); else { reasons.push(r.reason); dropped++; }
    }
    if (!evidence.length) {
      step(trace, { kind: 'validation', label: `insight "${ins.title}" dropped: no verifiable evidence`, validation: { ok: false, errors: reasons } });
      return;
    }
    const evidenceText = evidence.map((e) => e.quote ?? e.metric ?? '').join(' ');
    const suggestedFields: Insight['suggestedFields'] = {};
    for (const k of ['context', 'need', 'data'] as const) {
      const v = ins.suggestedFields?.[k];
      if (v && grounded(v, evidenceText)) suggestedFields[k] = v;
      else if (v) reasons.push(`suggestedFields.${k} not grounded in evidence`);
    }
    const counts = evidence.flatMap((e) => (e.metric ? numbersIn(e.metric) : []));
    const frequency = counts.length ? Math.max(...counts) : Math.max(1, evidence.filter((e) => e.sourceType === 'meeting').length);
    kept.push({ ...ins, id: ins.id || `ins-${i + 1}`, evidence, suggestedFields, frequency });
    step(trace, {
      kind: 'validation', label: `insight "${ins.title}": ${evidence.length} evidence verified${reasons.length ? `, ${reasons.length} dropped` : ''}`,
      validation: { ok: true, errors: reasons.length ? reasons : undefined },
    });
  });
  return { insights: kept, dropped };
}
