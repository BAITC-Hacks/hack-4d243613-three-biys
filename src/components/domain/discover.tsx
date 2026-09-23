'use client';

// Discover and AI transparency: evidence chips, insight cards, the privacy panel, the agent trace and field
// suggestions. Owner: B (design). Presentational only: props in, callbacks out, no store or API access.
// Export names and base props match the placeholders in ./index.tsx and PLAN.md §5; every added prop is optional.
// Style "Brutal tech" (docs/DESIGN.md): square corners, 2px graphite borders, hard shadows, hairline separators
// inside, lime only as a fill or an indicator. Client module: PrivacyPanel reads the clock, several parts use useId.

import { Fragment, useId, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import {
  Activity, ArrowRight, Brain, Check, ChevronRight, CircleCheck, CircleX, CornerDownRight, FileText, MessageSquare,
  Mic, ShieldCheck, Sparkles, TriangleAlert, Users, Wrench, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AgentStep, Evidence, Insight, PrivacyStats, SourcesSnapshot } from '@/lib/types';

/* ------------------------------------------------------------------ shared styles */

/** Readable text on lime-soft fills. Lime itself is never a text color on light backgrounds. */
const LIME_INK = 'text-[#365314]';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const PANEL = 'border-2 border-border bg-surface text-foreground shadow-card';
/** Small uppercase caption: section labels, source types, step kinds. */
const CAPTION = 'text-[11px] font-bold uppercase leading-4 tracking-wider';
/** Hard lift on hover, pressed on click. No movement under prefers-reduced-motion. */
const BTN = clsx(
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center border-2 border-border font-bold',
  'transition-[translate,box-shadow,background-color] duration-150 ease-out motion-reduce:transition-none',
  'hover:shadow-card motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5',
  'active:shadow-none motion-safe:active:translate-x-0 motion-safe:active:translate-y-0',
  'disabled:pointer-events-none disabled:opacity-50',
  FOCUS,
);
const BTN_PRIMARY = clsx(BTN, 'gap-2.5 bg-primary px-4 py-2.5 text-sm text-primary-foreground');
const BTN_SMALL = clsx(BTN, 'gap-1.5 bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-accent-soft');
/** <summary> without the native marker: a rotating chevron replaces it. */
const SUMMARY = clsx('cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden', FOCUS);
const CHEVRON = 'size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none';

/* ------------------------------------------------------------------ helpers */

/** English plural: plural(1, 'step', 'steps') → 'step', plural(5, 'step', 'steps') → 'steps'. */
function plural(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many;
}

const NUMBER = new Intl.NumberFormat('en-GB');
const SECONDS = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
// Calendar days are formatted in UTC, so a date-only value never shifts with the viewer's time zone.
const DAY_SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DAY_LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// Moments use the viewer's time zone, so they are rendered only once the client clock is known (useClock).
const MOMENT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function num(n: number): string {
  return NUMBER.format(Number.isFinite(n) ? n : 0);
}

/** "2026-08-25" or an ISO timestamp → its calendar day "2026-08-25", or null when unreadable. */
function isoDay(value: string | undefined): string | null {
  return /^\d{4}-\d{2}-\d{2}/.exec(value?.trim() ?? '')?.[0] ?? null;
}

/** "2026-08-25" → "25 Aug" (short) or "25 August 2026" (long). */
function formatDay(day: string, long = false): string {
  const [y, m, d] = day.split('-').map(Number);
  const ts = Date.UTC(y, m - 1, d);
  return (long ? DAY_LONG : DAY_SHORT).format(ts);
}

/** 840 → "840 ms", 14210 → "14.2 s". */
function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${SECONDS.format(ms / 1000)} s`;
}

/** Duration string for <time dateTime>, e.g. "PT1.250S". */
function isoDuration(ms: number): string {
  return `PT${(ms / 1000).toFixed(3)}S`;
}

/** "just now", "5 min ago", "3 h ago"; null after a day (the caller shows the moment instead). */
function ago(ts: number, now: number): string | null {
  const minutes = Math.floor(Math.max(0, now - ts) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : null;
}

/** Pretty JSON for the trace panel. Strings that hold JSON are parsed first; plain text stays as is. */
function pretty(value: unknown): string {
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^[[{]/.test(text) && /[\]}]$/.test(text)) {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // Not JSON after all (e.g. a repair prompt with JSON inside): show the text.
      }
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/* ------------------------------------------------------------------ clock */

const CLOCK_STEP_MS = 15_000;
/** The Collector sends a batch every 30 s: a source counts as live if it sent something within this window. */
const LIVE_WINDOW_MS = 10 * 60_000;

function subscribeClock(onTick: () => void): () => void {
  const timer = setInterval(onTick, CLOCK_STEP_MS);
  return () => clearInterval(timer);
}

/** Wall clock rounded down to the step, so repeated reads agree (useSyncExternalStore requires a stable value). */
function readClock(): number | null {
  return Math.floor(Date.now() / CLOCK_STEP_MS) * CLOCK_STEP_MS;
}

/** No clock on the server or during hydration: server HTML never depends on the time or the time zone. */
function readServerClock(): number | null {
  return null;
}

function useClock(): number | null {
  return useSyncExternalStore(subscribeClock, readClock, readServerClock);
}

/* ------------------------------------------------------------------ EvidenceChip */

const SOURCE: Record<Evidence['sourceType'], { label: string; Icon: LucideIcon }> = {
  meeting: { label: 'Meeting', Icon: Mic },
  activity: { label: 'Activity', Icon: Activity },
  chat: { label: 'Chat', Icon: MessageSquare },
};
const UNKNOWN_SOURCE = { label: 'Source', Icon: FileText };

/** Activity evidence cites a weekly team aggregate as "Team:2026-W38"; the team is worth showing. */
function activityTeam(sourceId: string): string | null {
  const i = sourceId.lastIndexOf(':');
  return i > 0 ? sourceId.slice(0, i).trim() || null : null;
}

/** One piece of evidence: a verbatim quote from a meeting or a real metric from the weekly aggregates. */
export function EvidenceChip({ evidence, className }: { evidence: Evidence; className?: string }) {
  const { label, Icon } = SOURCE[evidence.sourceType] ?? UNKNOWN_SOURCE;
  const quote = evidence.quote?.trim();
  const metric = evidence.metric?.trim();
  const team = evidence.sourceType === 'activity' ? activityTeam(evidence.sourceId ?? '') : null;
  const day = isoDay(evidence.date);
  const where = [label, team, day ? formatDay(day, true) : evidence.date].filter(Boolean).join(', ');
  const what = [quote && `“${quote}”`, metric].filter(Boolean).join('; ');

  return (
    <figure
      title={what ? `${where}: ${what}` : where}
      className={clsx('min-w-0 border border-border bg-surface px-3 py-2', className)}
    >
      <figcaption className={clsx(CAPTION, 'flex min-w-0 flex-wrap items-center gap-x-1.5 text-muted')}>
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-foreground" strokeWidth={2.25} />
        <span className="text-foreground">{label}</span>
        {team && (
          <>
            <span aria-hidden="true">·</span>
            <span className="normal-case tracking-normal">{team}</span>
          </>
        )}
        {(day || evidence.date) && (
          <>
            <span aria-hidden="true">·</span>
            {day ? <time dateTime={day}>{formatDay(day)}</time> : <span>{evidence.date}</span>}
          </>
        )}
      </figcaption>
      {quote && <blockquote className="mt-1 line-clamp-2 text-sm leading-snug text-foreground">“{quote}”</blockquote>}
      {metric && (
        <p className="mt-1 line-clamp-2 font-mono text-[13px] leading-snug tabular-nums text-foreground">{metric}</p>
      )}
      {!quote && !metric && <p className="mt-1 truncate text-sm text-muted">{evidence.sourceId}</p>}
    </figure>
  );
}

/* ------------------------------------------------------------------ InsightCard */

const IMPACT: Record<Insight['impact'], { label: string; bars: number; pill: string; bar: string }> = {
  low: { label: 'low', bars: 1, pill: 'bg-surface text-foreground', bar: 'bg-foreground' },
  medium: { label: 'medium', bars: 2, pill: 'bg-surface text-foreground', bar: 'bg-foreground' },
  high: { label: 'high', bars: 3, pill: 'bg-primary text-primary-foreground', bar: 'bg-accent' },
};
const BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5'];

/** Impact as text plus signal bars, so the level never depends on color alone. */
function ImpactPill({ impact }: { impact: Insight['impact'] }) {
  const meta = IMPACT[impact] ?? IMPACT.medium;
  return (
    <span className={clsx(CAPTION, 'inline-flex shrink-0 items-center gap-2 border-2 border-border px-2 py-1', meta.pill)}>
      <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
        {BAR_HEIGHTS.map((height, i) => (
          <span key={height} className={clsx('w-1', height, i < meta.bars ? meta.bar : 'bg-current opacity-25')} />
        ))}
      </span>
      Impact: {meta.label}
    </span>
  );
}

const SUGGESTED_FIELD: Record<keyof Insight['suggestedFields'], string> = {
  context: 'Context',
  need: 'Need',
  data: 'Data & materials',
};

/** "automation/integration" may wrap after a slash instead of in the middle of a word. */
function breakAfterSlashes(text: string): ReactNode {
  const parts = text.split('/');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ));
}

/** Measured metrics first (the hardest evidence to fake), then quotes; otherwise the original order. */
function orderEvidence(list: readonly Evidence[]): Evidence[] {
  return [...list].sort((a, b) => Number(Boolean(b.metric?.trim())) - Number(Boolean(a.metric?.trim())));
}

function EvidenceList({ items, offset = 0 }: { items: Evidence[]; offset?: number }) {
  return (
    <ul className="grid gap-2">
      {items.map((item, i) => (
        <li key={`${offset + i}:${item.sourceType}:${item.sourceId}`} className="min-w-0">
          <EvidenceChip evidence={item} />
        </li>
      ))}
    </ul>
  );
}

/** A problem found in the sources, with the evidence behind it and the action that turns it into a draft. */
export function InsightCard({ insight, onUse, useLabel = 'Start a draft', evidenceLimit = 3, className }: {
  insight: Insight;
  onUse?: (insight: Insight) => void;
  /** Text of the action button. */
  useLabel?: string;
  /** Evidence shown before "Show N more". */
  evidenceLimit?: number;
  className?: string;
}) {
  const titleId = useId();
  const evidenceId = useId();
  const evidence = orderEvidence(insight.evidence ?? []);
  const limit = Number.isFinite(evidenceLimit) ? Math.max(1, Math.floor(evidenceLimit)) : evidence.length;
  const shown = evidence.slice(0, limit);
  const rest = evidence.slice(limit);
  const quotes = evidence.filter((e) => e.quote?.trim()).length;
  const metrics = evidence.filter((e) => e.metric?.trim()).length;
  const kinds = [
    quotes > 0 ? `${quotes} ${plural(quotes, 'quote', 'quotes')}` : null,
    metrics > 0 ? `${metrics} ${plural(metrics, 'metric', 'metrics')}` : null,
  ].filter(Boolean);
  const frequency = Math.max(0, Math.round(insight.frequency ?? 0));
  const suggested = (Object.keys(SUGGESTED_FIELD) as (keyof Insight['suggestedFields'])[])
    .filter((key) => insight.suggestedFields?.[key]?.trim());

  return (
    <article aria-labelledby={titleId} className={clsx(PANEL, 'flex min-w-0 flex-col', className)}>
      <header className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={clsx(CAPTION, 'inline-flex min-w-0 items-center gap-1.5 text-muted')}>
            <Users aria-hidden="true" className="size-3.5 shrink-0 text-foreground" strokeWidth={2.25} />
            <span className="sr-only">Team: </span>
            <span className="truncate">{insight.affectedTeam}</span>
          </p>
          <ImpactPill impact={insight.impact} />
        </div>
        <h3 id={titleId} className="text-lg font-extrabold leading-snug text-balance text-foreground">{insight.title}</h3>
        {insight.problem?.trim() && <p className="text-sm leading-relaxed text-foreground/80">{insight.problem}</p>}
      </header>

      <dl className="grid grid-cols-2 border-y border-hairline">
        <div className="min-w-0 px-4 py-3 sm:px-5">
          <dt className={clsx(CAPTION, 'text-muted')}>Frequency</dt>
          <dd className="mt-1 text-sm text-foreground">
            <span className="text-2xl font-extrabold leading-none tabular-nums">{num(frequency)}</span>{' '}
            {plural(frequency, 'occurrence', 'occurrences')}
          </dd>
        </div>
        <div className="min-w-0 border-l border-hairline px-4 py-3 sm:px-5">
          <dt className={clsx(CAPTION, 'text-muted')}>Solution type</dt>
          <dd className="mt-1 flex items-start gap-1.5 text-sm font-semibold leading-snug text-foreground">
            <Wrench aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="min-w-0 break-words">{breakAfterSlashes(insight.suggestedSolutionType ?? '')}</span>
          </dd>
        </div>
      </dl>

      <section aria-labelledby={evidenceId} className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h4 id={evidenceId} className={clsx(CAPTION, 'text-foreground')}>
            Evidence <span className="tabular-nums">({evidence.length})</span>
          </h4>
          {evidence.length > 0 && (
            <p
              className="inline-flex items-center gap-1 text-xs text-muted"
              title="Every quote is found word for word in the transcript, every number is in the weekly aggregates"
            >
              <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" strokeWidth={3} />
              {kinds.length > 0 ? `${kinds.join(' · ')}, verified by code` : 'Verified by code'}
            </p>
          )}
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">No verified evidence</p>
        ) : (
          <>
            <EvidenceList items={shown} />
            {rest.length > 0 && (
              <details className="group/more mt-2">
                <summary className={clsx(SUMMARY, 'inline-flex items-center gap-1 py-1 text-xs font-bold text-foreground')}>
                  <ChevronRight aria-hidden="true" className={clsx(CHEVRON, 'group-open/more:rotate-90')} strokeWidth={2.5} />
                  <span className="group-open/more:hidden">Show {rest.length} more</span>
                  <span className="hidden group-open/more:inline">Show less</span>
                </summary>
                <div className="mt-2">
                  <EvidenceList items={rest} offset={shown.length} />
                </div>
              </details>
            )}
          </>
        )}
      </section>

      {suggested.length > 0 && (
        <p className={clsx('mx-4 mb-4 flex items-start gap-2 bg-accent-soft px-3 py-2 text-xs leading-snug sm:mx-5 sm:mb-5', LIME_INK)}>
          <Sparkles aria-hidden="true" className="mt-px size-3.5 shrink-0" strokeWidth={2.25} />
          <span>
            <span className="font-bold">Field suggestions: </span>
            {suggested.map((key) => SUGGESTED_FIELD[key]).join(', ')}
          </span>
        </p>
      )}

      {onUse && (
        <footer className="mt-auto border-t border-hairline p-4 sm:p-5">
          <button type="button" onClick={() => onUse(insight)} className={BTN_PRIMARY}>
            <span className="led" aria-hidden="true" />
            {useLabel}
            <span className="sr-only">: {insight.title}</span>
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
          </button>
        </footer>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ PrivacyPanel */

function PrivacyStat({ label, value, hint, hero = false, className }: {
  label: string;
  value: ReactNode;
  hint?: string;
  hero?: boolean;
  className?: string;
}) {
  // DOM order label → value → hint for screen readers; the value is shown first.
  return (
    <div className={clsx('flex min-w-0 flex-col gap-1.5 p-4', hero ? `bg-accent-soft ${LIME_INK}` : 'bg-surface', className)}>
      <dt className={clsx(CAPTION, 'order-2', hero ? LIME_INK : 'text-muted')}>{label}</dt>
      <dd className={clsx('order-1 font-extrabold leading-none tabular-nums', hero ? 'text-5xl' : 'text-3xl text-foreground')}>
        {value}
      </dd>
      {hint && <dd className={clsx('order-3 text-xs leading-snug', hero ? LIME_INK : 'text-muted')}>{hint}</dd>}
    </div>
  );
}

function SourceRow({ Icon, name, active, status, details }: {
  Icon: LucideIcon;
  name: string;
  active: boolean;
  status?: string;
  details: ReactNode[];
}) {
  // Narrow panels put the details on their own line, so a wrapped line never starts with a separator.
  return (
    <li className="flex items-start gap-2.5 py-2.5 text-sm">
      {active ? (
        <span className="led mt-1.5" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 border-[1.5px] border-muted" />
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-2 font-semibold text-foreground">
          <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
          {name}
        </span>
        {status && (
          <span className={clsx(CAPTION, 'px-1.5 py-0.5', active ? `bg-accent-soft ${LIME_INK}` : 'bg-surface-2 text-foreground')}>
            {status}
          </span>
        )}
        {details.length > 0 && (
          <span className="basis-full text-muted @lg:basis-auto">
            <span aria-hidden="true" className="hidden @lg:inline">· </span>
            {details.map((detail, i) => (
              <Fragment key={i}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                {detail}
              </Fragment>
            ))}
          </span>
        )}
      </div>
    </li>
  );
}

/** Privacy numbers from the k-anonymous aggregator plus the live state of the Collector sources. */
export function PrivacyPanel({ privacy, live, className }: {
  privacy: PrivacyStats;
  live: SourcesSnapshot['live'];
  className?: string;
}) {
  const now = useClock();
  const titleId = useId();
  const sourcesId = useId();
  const k = privacy.k;

  // Activity tracker: live while Collector batches keep arriving.
  const devices = Math.max(0, live?.devices ?? 0);
  const eventAt = live?.lastEventAt;
  const eventTs = eventAt ? Date.parse(eventAt) : Number.NaN;
  const hasEvent = Number.isFinite(eventTs);
  const trackerLive = now !== null && hasEvent && now - eventTs <= LIVE_WINDOW_MS;
  const trackerConnected = devices > 0 || hasEvent;
  let trackerStatus = 'not connected';
  if (trackerLive) trackerStatus = 'online';
  else if (trackerConnected) trackerStatus = now === null ? 'connected' : 'no new events';
  const trackerDetails: ReactNode[] = [];
  if (devices > 0) trackerDetails.push(`${num(devices)} ${plural(devices, 'device', 'devices')}`);
  if (eventAt && hasEvent && now !== null) {
    trackerDetails.push(
      <>
        last event{' '}
        <time dateTime={eventAt} title={MOMENT.format(eventTs)}>{ago(eventTs, now) ?? MOMENT.format(eventTs)}</time>
      </>,
    );
  }

  // Meeting notes: the server keeps only the day of the last live recording.
  const meetingDay = isoDay(live?.lastMeetingAt);
  const today = now !== null ? isoDay(new Date(now).toISOString()) : null;
  const meetingToday = meetingDay !== null && meetingDay === today;
  const meetingDetails: ReactNode[] = [
    meetingDay ? (
      <>
        last recording {meetingToday ? '' : 'on '}
        <time dateTime={meetingDay}>{meetingToday ? 'today' : formatDay(meetingDay, true)}</time>
      </>
    ) : (
      'no live recordings yet'
    ),
  ];

  // Chats are a roadmap source: shown only once a message has arrived.
  const messageAt = live?.lastMessageAt;
  const messageTs = messageAt ? Date.parse(messageAt) : Number.NaN;
  const hasMessage = Number.isFinite(messageTs);
  const chatLive = now !== null && hasMessage && now - messageTs <= LIVE_WINDOW_MS;

  return (
    <section aria-labelledby={titleId} className={clsx('@container', PANEL, className)}>
      <header className="flex items-start gap-3 border-b-2 border-border p-4 sm:p-5">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h3 id={titleId} className="text-lg font-extrabold leading-tight text-foreground">Privacy</h3>
          <p className="mt-1 text-sm leading-snug text-foreground/80">We analyze how work flows, not who does it</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px bg-hairline @xl:grid-cols-4 @4xl:grid-cols-5">
        <PrivacyStat
          hero
          className="col-span-2 @xl:col-span-4 @4xl:col-span-1"
          label="People identified"
          value={num(privacy.individualsIdentified ?? 0)}
          hint="reports show teams only, by week"
        />
        <PrivacyStat
          label="Raw events"
          value={num(privacy.rawEvents)}
          hint="event type and app category, no window titles or text"
        />
        <PrivacyStat
          label="Anonymity threshold k"
          value={num(k)}
          hint={`a pattern is shown only if at least ${k} people are behind it`}
        />
        <PrivacyStat label="Patterns hidden" value={num(privacy.suppressedPatterns)} hint={`fewer than ${k} people behind them`} />
        <PrivacyStat
          label="Teams in report"
          value={num(privacy.teamsReported)}
          hint={`fully hidden: ${num(privacy.teamsSuppressed)}`}
        />
      </dl>

      <section aria-labelledby={sourcesId} className="border-t-2 border-border px-4 pt-3 pb-1.5 sm:px-5">
        <h4 id={sourcesId} className={clsx(CAPTION, 'text-muted')}>Source status</h4>
        <ul className="divide-y divide-hairline">
          <SourceRow
            Icon={Activity}
            name="Activity tracker"
            active={trackerLive}
            status={trackerStatus}
            details={trackerDetails}
          />
          <SourceRow Icon={Mic} name="Meeting notes" active={meetingToday} details={meetingDetails} />
          {messageAt && hasMessage && now !== null && (
            <SourceRow
              Icon={MessageSquare}
              name="Chats"
              active={chatLive}
              details={[
                <>
                  last message{' '}
                  <time dateTime={messageAt} title={MOMENT.format(messageTs)}>
                    {ago(messageTs, now) ?? MOMENT.format(messageTs)}
                  </time>
                </>,
              ]}
            />
          )}
        </ul>
      </section>
    </section>
  );
}

/* ------------------------------------------------------------------ AgentTrace */

type StepTone = 'plain' | 'model' | 'ok' | 'fail';

const STEP_KIND: Record<AgentStep['kind'], { label: string; Icon: LucideIcon }> = {
  thought: { label: 'Reasoning', Icon: Brain },
  tool_call: { label: 'Tool call', Icon: Wrench },
  tool_result: { label: 'Tool result', Icon: CornerDownRight },
  llm_call: { label: 'Model call', Icon: Sparkles },
  validation: { label: 'Validation', Icon: ShieldCheck },
  error: { label: 'Error', Icon: TriangleAlert },
};
const UNKNOWN_KIND = { label: 'Step', Icon: Brain };

const NODE_TONE: Record<StepTone, string> = {
  plain: 'border-border bg-surface text-foreground',
  model: 'border-border bg-primary text-primary-foreground',
  ok: 'border-border bg-surface text-success',
  fail: 'border-danger bg-danger text-white',
};

const PROVIDER: Record<NonNullable<AgentStep['provider']>, { label: string; title: string }> = {
  openai: { label: 'OpenAI', title: 'Live request to OpenAI' },
  nvidia: { label: 'NVIDIA', title: 'Live request to NVIDIA, the fallback provider' },
  replay: { label: 'Replay', title: 'Saved model response (replay mode): the model was not called again' },
};

function stepTone(step: AgentStep): StepTone {
  if (step.kind === 'error') return 'fail';
  if (step.validation) return step.validation.ok ? 'ok' : 'fail';
  return step.kind === 'llm_call' ? 'model' : 'plain';
}

interface TraceSection { key: string; title: string; body: string }

/** What the "How the AI works" view shows for a step: prompt, input, output and any extra detail. */
function traceSections(step: AgentStep): TraceSection[] {
  const sections: TraceSection[] = [];
  if (typeof step.prompt === 'string' && step.prompt.trim()) {
    sections.push({ key: 'prompt', title: 'Prompt', body: step.prompt.trim() });
  }
  if (step.input !== undefined) sections.push({ key: 'input', title: 'Input', body: pretty(step.input) });
  if (step.output !== undefined) sections.push({ key: 'output', title: 'Output', body: pretty(step.output) });
  if (step.detail !== undefined) sections.push({ key: 'detail', title: 'Details', body: pretty(step.detail) });
  return sections;
}

function ProviderBadge({ provider, model }: { provider?: AgentStep['provider']; model?: string }) {
  if (!provider && !model) return null;
  const meta = provider ? PROVIDER[provider] : undefined;
  return (
    <span
      title={meta?.title}
      className={clsx(
        'inline-flex min-w-0 max-w-full items-center gap-1.5 border border-border px-1.5 py-px text-[11px] leading-4 text-foreground',
        provider === 'replay' && 'border-dashed',
      )}
    >
      {provider && <span className="font-bold uppercase tracking-wider">{meta?.label ?? provider}</span>}
      {model && <span className="truncate font-mono">{model}</span>}
    </span>
  );
}

function TraceStep({ step, last }: { step: AgentStep; last: boolean }) {
  const id = useId();
  const kind = STEP_KIND[step.kind] ?? UNKNOWN_KIND;
  const tone = stepTone(step);
  const validation = step.validation;
  let Icon = kind.Icon;
  if (step.kind !== 'error' && validation) Icon = validation.ok ? Check : X;
  const sections = traceSections(step);
  const issues = (validation?.errors ?? []).filter((issue) => typeof issue === 'string' && issue.trim());
  const duration = typeof step.durationMs === 'number' && Number.isFinite(step.durationMs) && step.durationMs >= 0
    ? step.durationMs
    : null;
  const contents = sections.map((s) => s.title.toLowerCase());
  if (issues.length > 0) contents.push(validation?.ok ? 'warnings' : 'errors');

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-border" />}
      <span aria-hidden="true" className={clsx('relative grid size-7 shrink-0 place-items-center border-2', NODE_TONE[tone])}>
        <Icon className="size-4" strokeWidth={2.5} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={clsx(CAPTION, tone === 'fail' ? 'text-danger' : 'text-muted')}>{kind.label}</span>
          <ProviderBadge provider={step.provider} model={step.model} />
          {duration !== null && (
            <time
              dateTime={isoDuration(duration)}
              title={`${num(Math.round(duration))} ms`}
              className="ml-auto text-xs font-semibold tabular-nums text-muted"
            >
              {formatDuration(duration)}
            </time>
          )}
        </div>
        <p className={clsx('break-words text-sm font-medium leading-snug', step.kind === 'error' ? 'text-danger' : 'text-foreground')}>
          {step.label}
        </p>

        {validation && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {validation.ok ? (
              <CircleCheck aria-hidden="true" className="size-3.5 shrink-0 text-success" strokeWidth={2.5} />
            ) : (
              <CircleX aria-hidden="true" className="size-3.5 shrink-0 text-danger" strokeWidth={2.5} />
            )}
            <span className={clsx('font-semibold', validation.ok ? 'text-foreground' : 'text-danger')}>
              {validation.ok ? 'Validation passed' : 'Validation failed'}
            </span>
            {validation.repaired && (
              <span className={clsx(CAPTION, 'bg-accent-soft px-1.5', LIME_INK)}>repaired on retry</span>
            )}
            {issues.length > 0 && (
              <span className="text-muted">{validation.ok ? 'warnings' : 'errors'}: {issues.length}</span>
            )}
          </p>
        )}

        {contents.length > 0 && (
          <details className="group/ai mt-2">
            <summary
              className={clsx(
                SUMMARY,
                'inline-flex max-w-full items-center gap-1.5 border border-border bg-surface px-2 py-1 text-xs font-bold text-foreground hover:bg-surface-2',
              )}
            >
              <ChevronRight aria-hidden="true" className={clsx(CHEVRON, 'group-open/ai:rotate-90')} strokeWidth={2.5} />
              <span className="shrink-0">How the AI works</span>
              <span className="min-w-0 truncate font-normal text-foreground/70">{contents.join(', ')}</span>
            </summary>
            <div className="mt-2 space-y-3 border-l-2 border-border pl-3">
              {sections.map((section) => {
                const labelId = `${id}-${section.key}`;
                return (
                  <div key={section.key} className="min-w-0">
                    <p id={labelId} className={clsx(CAPTION, 'text-muted')}>{section.title}</p>
                    {/* Focusable so the scrollable block works from the keyboard. */}
                    <pre
                      role="region"
                      aria-labelledby={labelId}
                      tabIndex={0}
                      className={clsx(
                        FOCUS,
                        'mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-hairline bg-surface-2 p-3 font-mono text-xs leading-relaxed text-foreground',
                      )}
                    >
                      {section.body}
                    </pre>
                  </div>
                );
              })}
              {issues.length > 0 && (
                <div className="min-w-0">
                  <p className={clsx(CAPTION, validation?.ok ? 'text-muted' : 'text-danger')}>
                    {validation?.ok ? 'Validation warnings' : 'Validation errors'}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {issues.map((issue, i) => (
                      <li key={i} className="flex gap-1.5 font-mono text-xs leading-relaxed text-foreground">
                        <X aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-danger" strokeWidth={2.5} />
                        <span className="min-w-0 break-words">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

/**
 * Timeline of what the AI did: tool calls, model calls, validation and errors. Every step with a prompt,
 * input, output, detail or validation notes opens a "How the AI works" view with the raw data.
 */
export function AgentTrace({ steps, title = 'What the AI did', bare = false, className }: {
  steps: AgentStep[];
  /** Heading above the timeline; pass null when the caller already shows one. */
  title?: string | null;
  /** No border and shadow, e.g. inside the caller's own panel or <details>. */
  bare?: boolean;
  className?: string;
}) {
  const titleId = useId();
  const list = steps ?? [];
  if (list.length === 0) return null;

  const total = list.reduce((sum, s) => sum + (typeof s.durationMs === 'number' && s.durationMs > 0 ? s.durationMs : 0), 0);
  const checks = list.filter((s) => s.validation);
  const passed = checks.filter((s) => s.validation?.ok).length;
  const errors = list.filter((s) => s.kind === 'error').length;
  const replay = list.some((s) => s.provider === 'replay');
  const facts = [
    `${list.length} ${plural(list.length, 'step', 'steps')}`,
    total > 0 ? formatDuration(total) : null,
    checks.length > 0 ? `${passed} of ${checks.length} ${plural(checks.length, 'check', 'checks')} passed` : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'What the AI did'}
      className={clsx(!bare && PANEL, !bare && 'p-4 sm:p-5', 'min-w-0', className)}
    >
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline pb-3">
        {title && <h3 id={titleId} className="text-base font-extrabold leading-tight text-foreground">{title}</h3>}
        <p className="text-xs text-muted">{facts.join(' · ')}</p>
        {errors > 0 && (
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
            <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.5} />
            {errors} {plural(errors, 'error', 'errors')}
          </p>
        )}
        {replay && (
          <span
            title={PROVIDER.replay.title}
            className={clsx(CAPTION, 'ml-auto border border-dashed border-border px-1.5 py-0.5 text-foreground')}
          >
            Replay mode
          </span>
        )}
      </header>
      <ol aria-label="AI steps" className="min-w-0">
        {list.map((step, i) => (
          <TraceStep key={`${i}:${step.id}`} step={step} last={i === list.length - 1} />
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ SuggestionChip */

/**
 * Evidence-based text proposed for a card field. It earns no points until the business accepts it
 * (the text replaces the field) and then confirms the field.
 */
export function SuggestionChip({ text, source, onAccept, acceptLabel = 'Accept', className }: {
  text: string;
  source: string;
  onAccept?: () => void;
  acceptLabel?: string;
  className?: string;
}) {
  const textId = useId();
  return (
    <div className={clsx('@container min-w-0', className)}>
      <div className="flex flex-col gap-2.5 border-2 border-dashed border-border bg-surface p-3 @md:flex-row @md:items-start @md:gap-4">
        <div className="min-w-0 flex-1">
          <p className={clsx(CAPTION, 'flex min-w-0 items-center gap-1.5 text-muted')}>
            <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-foreground" strokeWidth={2.25} />
            <span className="shrink-0 text-foreground">Suggestion</span>
            {source && (
              <>
                <span aria-hidden="true">·</span>
                <span title={source} className="min-w-0 truncate font-medium normal-case tracking-normal">{source}</span>
              </>
            )}
          </p>
          <p id={textId} className="mt-1.5 text-sm leading-relaxed text-foreground">{text}</p>
          {onAccept && <p className="mt-1 text-xs text-muted">Replaces the field text. Points count once you confirm the field</p>}
        </div>
        {onAccept && (
          <button type="button" onClick={onAccept} aria-describedby={textId} className={clsx(BTN_SMALL, 'self-start')}>
            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
            {acceptLabel}
          </button>
        )}
      </div>
    </div>
  );
}
