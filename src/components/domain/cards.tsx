'use client';

// Presentational domain components: catalog tile, technical documentation, proposals, teams, leaderboard.
// Owner: B (design). Props only, no store or API access. Export names and base props match the
// placeholders in ./index.tsx and PLAN.md §5; every prop added here is optional.
// `className` is appended to the root element (no class merging).

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import {
  ArrowRight, CalendarDays, Check, CircleAlert, CircleCheck, CircleQuestionMark, Clock, ExternalLink,
  FileText, Lightbulb, ListChecks, MessageSquare, Trophy, Users, Wrench, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Level, Proposal, Rating, TaskCard, TeamProfile, TechSpec } from '@/lib/types';

/* ------------------------------------------------------------------ shared styles */

// Same recipes as the UI kit (src/components/ui) and rating.tsx, kept local so this file compiles on its own.
// Direction "Brutal tech": square corners, graphite frame, hard shadow; `hairline` for dividers inside a surface.
const LIME_INK = 'text-[#365314]'; // lime is never text on a light background; this is its readable partner
const FOCUS_RING = 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
const SURFACE = 'rounded-card border-2 border-border bg-surface';
// Hard lift (DESIGN.md): the tile moves 2px up-left while its hard shadow grows from 4px to 6px.
const LIFT = 'transition-[box-shadow,translate] duration-200 ease-out motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:in-focus-visible:-translate-x-0.5 motion-safe:in-focus-visible:-translate-y-0.5 motion-reduce:transition-none';
// Each variant sets its own border color and the padding is separate: two utilities for the same property
// resolve by stylesheet order, not class order, so a base `border-transparent` would hide the secondary border.
const BTN = 'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control border text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0';
const BTN_PAD = 'px-3';
const BTN_PRIMARY = 'border-transparent bg-primary text-primary-foreground hover:bg-primary/85';
const BTN_SECONDARY = 'border-border bg-surface text-foreground hover:bg-surface-2';
const BTN_GHOST = 'border-transparent text-foreground hover:bg-foreground/5';
const BTN_DANGER = 'border-transparent bg-danger text-white hover:bg-danger/90';
const CONTROL = 'block w-full min-w-0 rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-hidden focus-visible:border-accent-strong focus-visible:ring-3 focus-visible:ring-accent/35';

const LEVEL_META: Record<Level, { label: string; pill: string; dot: string; stroke: string }> = {
  draft: { label: 'Draft', pill: 'bg-surface-2 text-zinc-600', dot: 'bg-level-draft', stroke: 'stroke-level-draft' },
  working: { label: 'Working', pill: 'bg-amber-100 text-amber-800', dot: 'bg-level-working', stroke: 'stroke-level-working' },
  ready: { label: 'Ready', pill: `bg-accent-soft ${LIME_INK}`, dot: 'bg-accent-strong', stroke: 'stroke-level-ready' },
  priority: { label: 'Priority', pill: 'bg-primary text-primary-foreground', dot: 'bg-accent', stroke: 'stroke-level-priority' },
};

const STATUS_META: Record<Proposal['status'], { label: string; pill: string; Icon: LucideIcon }> = {
  pending: { label: 'Under review', pill: 'bg-surface-2 text-zinc-600', Icon: Clock },
  accepted: { label: 'Accepted', pill: `bg-accent-soft ${LIME_INK}`, Icon: Check },
  rejected: { label: 'Rejected', pill: 'bg-red-50 text-red-700', Icon: X },
};

/* ------------------------------------------------------------------ helpers */

/** English plural: plural(1, 'point', 'points') → 'point', plural(5, 'point', 'points') → 'points'. */
function plural(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many;
}

/** Trimmed, non-empty, case-insensitively unique; keeps the first spelling. */
function uniq(items: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items ?? []) {
    const s = raw.trim();
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Trimmed, non-empty lines (the tech docs editor splits textareas on "\n", so blanks happen). */
function clean(items: readonly string[] | null | undefined): string[] {
  return (items ?? []).map((s) => s.trim()).filter(Boolean);
}

function firstText(...values: (string | null | undefined)[]): string | null {
  for (const v of values) {
    const s = v?.trim();
    if (s) return s;
  }
  return null;
}

// Date-only values ("2026-11-20" → "20 November 2026") are formatted in UTC so the day never shifts with the
// viewer's time zone.
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function formatDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? value : DATE_FMT.format(d);
}

/** Only http(s) links become clickable; anything else (javascript:, typos) is shown as plain text. */
function httpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const shortUrl = (url: URL) => `${url.host.replace(/^www\./, '')}${url.pathname}`.replace(/\/$/, '');

/** "Week 1: …; week 2–3: …" → ["Week 1: …", "Week 2–3: …"]. */
function planSteps(plan: string): string[] {
  return plan
    .split(/\n+|;\s*/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length > 1) return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  const caps = words[0].match(/[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]/g);
  if (caps && caps.length >= 2) return caps[0] + caps[1];
  return words[0].slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ small private pieces */

// Local on purpose: rating.tsx owns the public LevelBadge. Same look, so both read as one badge.
function LevelPill({ level }: { level: Level }) {
  const meta = LEVEL_META[level] ?? LEVEL_META.draft;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', meta.pill)}>
      <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', meta.dot)} />
      <span className="sr-only">Level: </span>
      {meta.label}
    </span>
  );
}

function ScoreRing({ total, level, size = 44 }: { total: number; level: Level; size?: number }) {
  const value = Math.min(100, Math.max(0, Math.round(total)));
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  return (
    <span
      role="img"
      aria-label={`Rating ${value} of 100`}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        {value > 0 && (
          <circle
            cx={center} cy={center} r={r} fill="none" strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
            className={clsx(
              (LEVEL_META[level] ?? LEVEL_META.draft).stroke,
              'transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none',
            )}
          />
        )}
      </svg>
      <span aria-hidden="true" className="absolute font-display text-sm font-bold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

/** Thin score bar under the tile's score block; fills from 0 on mount (CSS @starting-style), static under reduced motion. */
function ScoreFill({ total, level }: { total: number; level: Level }) {
  const value = Math.min(100, Math.max(0, Math.round(total)));
  const fill = level === 'draft' ? 'bg-level-draft' : level === 'working' ? 'bg-level-working' : 'bg-accent';
  return (
    <span aria-hidden="true" className="block h-1.5 w-full bg-surface-2">
      <span
        className={clsx('block h-full w-(--fill) transition-[width] duration-700 ease-out starting:w-0 motion-reduce:transition-none', fill)}
        style={{ '--fill': `${value}%` } as CSSProperties}
      />
    </span>
  );
}

/** True once the element has scrolled into view (IntersectionObserver); stays true. `active` re-arms after a remount. */
function useSeen<T extends Element>(active: boolean) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!active || seen || !el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [active, seen]);
  return { ref, seen };
}

function ChipList({ items, label, max, matches }: {
  items: string[]; label: string; max?: number; matches?: Set<string> | null;
}) {
  const shown = max !== undefined ? items.slice(0, max) : items;
  const hidden = items.slice(shown.length);
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {shown.map((item) => {
        const hit = matches?.has(item.toLowerCase()) ?? false;
        return (
          <li
            key={item}
            className={clsx(
              'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-5',
              hit ? `bg-accent-soft font-medium ${LIME_INK}` : 'bg-surface-2 text-foreground',
            )}
          >
            {hit && <Check aria-hidden="true" className="size-3 shrink-0" strokeWidth={2.5} />}
            <span className="truncate">{item}</span>
            {hit && <span className="sr-only"> (needed for the task)</span>}
          </li>
        );
      })}
      {hidden.length > 0 && (
        <li title={hidden.join(', ')} className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs leading-5 text-foreground">
          <span aria-hidden="true">+{hidden.length}</span>
          <span className="sr-only">and {hidden.length} more: {hidden.join(', ')}</span>
        </li>
      )}
    </ul>
  );
}

function StatusPill({ status }: { status: Proposal['status'] }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const { Icon } = meta;
  return (
    <span className={clsx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', meta.pill)}>
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

function PlanSteps({ plan }: { plan: string }) {
  const steps = planSteps(plan);
  if (steps.length === 0) return <span className="text-muted">Not specified</span>;
  if (steps.length === 1) return <p className="whitespace-pre-line">{plan.trim()}</p>;
  return (
    <ol className="space-y-1.5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-[3px] grid size-4 shrink-0 place-items-center bg-surface-2 font-display text-[10px] font-bold tabular-nums text-foreground/70"
          >
            {i + 1}
          </span>
          <span className="min-w-0">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Deadline({ value }: { value: string }) {
  if (!value?.trim()) return <span className="text-muted">Not specified</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted" />
      <time dateTime={value.trim()}>{formatDate(value)}</time>
    </span>
  );
}

function PrototypeLink({ url }: { url: string }) {
  const parsed = httpUrl(url ?? '');
  if (!parsed) {
    return url?.trim()
      ? <span className="break-all text-muted">{url}</span>
      : <span className="text-muted">No link</span>;
  }
  return (
    <a
      href={parsed.href}
      target="_blank"
      rel="noopener noreferrer"
      title={parsed.href}
      className={clsx(
        'inline-flex max-w-full items-center gap-1.5 font-medium text-foreground underline decoration-foreground/30 decoration-2 underline-offset-4 hover:decoration-foreground',
        FOCUS_RING,
      )}
    >
      <span className="truncate">{shortUrl(parsed)}</span>
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Monogram({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-12 shrink-0 place-items-center rounded-control bg-primary font-display text-base font-bold tracking-wide text-primary-foreground"
    >
      {initials(name)}
    </span>
  );
}

function PointsBadge({ points }: { points: number }) {
  const earned = points > 0;
  return (
    <span
      title="Points are awarded only for milestones confirmed by the business"
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium',
        earned ? `bg-accent-soft ${LIME_INK}` : 'bg-surface-2 text-zinc-600',
      )}
    >
      <Trophy aria-hidden="true" className="size-4 shrink-0" />
      <span className="font-display font-bold tabular-nums">{points}</span>
      {plural(points, 'point', 'points')}
    </span>
  );
}

/* ------------------------------------------------------------------ ProjectCard */

/**
 * Catalog tile. When the page wraps the whole tile in a link (as the catalog does), pass neither
 * `onOpen` nor interactive `children`: a button inside a link is invalid HTML.
 */
export function ProjectCard({ card, rating, proposalsCount, onOpen, openLabel = 'Details', children, className }: {
  card: TaskCard;
  rating: Rating;
  /** Shown in the footer when provided. */
  proposalsCount?: number;
  /** Renders an "open" button in the footer. */
  onOpen?: () => void;
  openLabel?: string;
  /** Footer action slot (a link or button); takes the place of the `onOpen` button. */
  children?: ReactNode;
  className?: string;
}) {
  const title = firstText(card.fields.title) ?? 'Untitled';
  const excerpt = firstText(card.fields.need, card.fields.context, card.techSpec?.summary);
  const meta = uniq([card.industry, card.topic]);
  const skills = uniq(card.skillsNeeded?.length ? card.skillsNeeded : card.techSpec?.suggestedStack);
  const isDraft = rating.level === 'draft';
  const isPriority = rating.level === 'priority';
  const action = children ?? (onOpen ? (
    <button type="button" onClick={onOpen} className={clsx(BTN, BTN_GHOST, FOCUS_RING, '-mr-2 px-2')}>
      {openLabel}
      <ArrowRight aria-hidden="true" />
    </button>
  ) : null);
  const hasFooter = proposalsCount !== undefined || !!card.techSpec || action !== null;

  return (
    <article
      className={clsx(
        SURFACE, LIFT, 'flex flex-col gap-3 p-4',
        // Priority tiles cast the lime shadow: the highlight the spec asks for at 90-100.
        isPriority
          ? 'shadow-accent hover:shadow-[6px_6px_0_var(--accent)] in-focus-visible:shadow-[6px_6px_0_var(--accent)]'
          : 'shadow-card hover:shadow-pop in-focus-visible:shadow-pop',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* line-clamp, not truncate: a nowrap line would set the tile's min-content width and overflow narrow grids. */}
          <p className="line-clamp-1 text-xs text-muted">
            <span className="font-medium text-foreground/80">{card.businessName}</span>
            {meta.map((m) => <span key={m}> · {m}</span>)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-foreground">{title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ScoreRing total={rating.total} level={rating.level} />
          <LevelPill level={rating.level} />
          <ScoreFill total={rating.total} level={rating.level} />
        </div>
      </header>

      {excerpt && <p className="line-clamp-2 text-sm leading-relaxed text-muted">{excerpt}</p>}

      {isDraft && (
        <p className="flex items-start gap-1.5 bg-surface-2 px-2.5 py-1.5 text-xs text-zinc-600">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>Needs clarification: the description is incomplete, but proposals are open</span>
        </p>
      )}

      {skills.length > 0 && <ChipList items={skills} label="Skills needed" max={5} />}

      {hasFooter && (
        <footer className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {proposalsCount !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare aria-hidden="true" className="size-3.5" />
                {proposalsCount > 0
                  ? `${proposalsCount} ${plural(proposalsCount, 'proposal', 'proposals')}`
                  : 'No proposals yet'}
              </span>
            )}
            {card.techSpec && (
              <span className="inline-flex items-center gap-1.5">
                <FileText aria-hidden="true" className="size-3.5" />
                Tech docs available
              </span>
            )}
          </div>
          {action}
        </footer>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ TechSpecView */

type SpecListKey = Exclude<keyof TechSpec, 'summary' | 'openQuestions'>;
type SpecListStyle = 'bullets' | 'numbered' | 'checks' | 'chips';

const SPEC_SECTIONS: { key: SpecListKey; title: string; style: SpecListStyle }[] = [
  { key: 'scope', title: 'Scope', style: 'bullets' },
  { key: 'dataInputs', title: 'Data inputs', style: 'bullets' },
  { key: 'functionalRequirements', title: 'Functional requirements', style: 'numbered' },
  { key: 'nonFunctional', title: 'Non-functional requirements', style: 'bullets' },
  { key: 'acceptanceCriteria', title: 'Acceptance criteria', style: 'checks' },
  { key: 'suggestedStack', title: 'Suggested stack', style: 'chips' },
];

function NotStated() {
  return <p className="text-sm text-muted">Not specified</p>;
}

function SpecSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 border-t border-hairline py-4 first:border-t-0 @xl:grid-cols-[11rem_minmax(0,1fr)] @xl:gap-6">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function SpecList({ items, style }: { items: string[]; style: SpecListStyle }) {
  if (items.length === 0) return <NotStated />;
  if (style === 'chips') {
    return (
      <>
        <ChipList items={uniq(items)} label="Suggested stack" />
        <p className="mt-2 text-xs text-muted">This is a suggestion: the team can propose its own stack.</p>
      </>
    );
  }
  const List = style === 'numbered' ? 'ol' : 'ul';
  return (
    <List className="space-y-1.5 text-sm leading-relaxed text-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          {style === 'numbered' && (
            <span aria-hidden="true" className="w-5 shrink-0 text-right font-semibold tabular-nums text-muted">{i + 1}.</span>
          )}
          {style === 'bullets' && (
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-foreground/40" />
          )}
          {style === 'checks' && (
            <Check aria-hidden="true" className="mt-[3px] size-4 shrink-0 text-foreground/50" strokeWidth={2.5} />
          )}
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </List>
  );
}

/** Technical documentation for students, laid out as a document. */
export function TechSpecView({ spec, className }: { spec: TechSpec; className?: string }) {
  const questionsId = useId();
  const summary = firstText(spec.summary);
  const questions = clean(spec.openQuestions);

  return (
    <article className={clsx(SURFACE, '@container w-full px-5 py-2 shadow-card sm:px-6', className)}>
      <SpecSection title="Summary">
        {summary ? <p className="text-[15px] leading-relaxed text-foreground">{summary}</p> : <NotStated />}
      </SpecSection>

      {SPEC_SECTIONS.map(({ key, title, style }) => (
        <SpecSection key={key} title={title}>
          <SpecList items={clean(spec[key])} style={style} />
        </SpecSection>
      ))}

      {questions.length > 0 && (
        <section aria-labelledby={questionsId} className="mb-4 mt-2 rounded-control border border-amber-300 bg-amber-50 p-4">
          <h3 id={questionsId} className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <CircleQuestionMark aria-hidden="true" className="size-4 shrink-0 text-amber-700" />
            Open questions
            <span className="rounded-full bg-amber-100 px-1.5 text-xs font-medium tabular-nums text-amber-800">{questions.length}</span>
          </h3>
          <p className="mt-1 text-xs text-amber-800">The business has not answered these yet. Clarify them before work starts.</p>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-amber-950">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-amber-500" />
                <span className="min-w-0">{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ ProposalCard */

function Field({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">{children}</dd>
    </div>
  );
}

/** One proposal as a card. Default Accept / Reject buttons appear only while the proposal is pending. */
export function ProposalCard({ proposal, team, onAccept, onReject, children, className }: {
  proposal: Proposal;
  team?: TeamProfile;
  onAccept?: () => void;
  onReject?: () => void;
  /** Action slot; takes the place of the default Accept / Reject buttons. */
  children?: ReactNode;
  className?: string;
}) {
  const name = team?.name ?? proposal.teamId;
  const defaultActions = proposal.status === 'pending' && (onAccept || onReject) ? (
    <>
      {onAccept && (
        <button type="button" onClick={onAccept} aria-label={`Accept proposal from ${name}`} className={clsx(BTN, BTN_PAD, BTN_PRIMARY, FOCUS_RING)}>
          <Check aria-hidden="true" />
          Accept
        </button>
      )}
      {onReject && (
        <button type="button" onClick={onReject} aria-label={`Reject proposal from ${name}`} className={clsx(BTN, BTN_PAD, BTN_SECONDARY, FOCUS_RING)}>
          <X aria-hidden="true" />
          Reject
        </button>
      )}
    </>
  ) : null;
  const actions = children ?? defaultActions;

  return (
    <article
      className={clsx(
        SURFACE, 'flex flex-col gap-4 p-5',
        proposal.status === 'accepted' ? 'shadow-accent ring-2 ring-accent' : 'shadow-card',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
          {team?.about?.trim() ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{team.about}</p> : null}
        </div>
        <StatusPill status={proposal.status} />
      </header>

      {/* Deadline and prototype share a row when there is room and stack in narrow cards, so the link stays readable. */}
      <dl className="flex flex-wrap gap-x-4 gap-y-3">
        <Field label="Idea" className="min-w-0 basis-full">
          <p className="whitespace-pre-line break-words">{proposal.idea}</p>
        </Field>
        <Field label="Plan" className="min-w-0 basis-full">
          <PlanSteps plan={proposal.plan} />
        </Field>
        <Field label="Deadline" className="min-w-[min(9rem,100%)] flex-1">
          <Deadline value={proposal.deadline} />
        </Field>
        <Field label="Prototype" className="min-w-[min(12rem,100%)] flex-[2]">
          <PrototypeLink url={proposal.prototypeUrl} />
        </Field>
      </dl>

      {proposal.status === 'rejected' && proposal.rejectReason?.trim() ? (
        <p className="bg-surface-2 px-3 py-2 text-sm text-foreground/80">
          <span className="font-medium text-foreground">Rejection reason: </span>
          {proposal.rejectReason}
        </p>
      ) : null}

      {actions != null && actions !== false && (
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">{actions}</div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ ProposalCompare */

const COMPARE_ROWS: { label: string; Icon: LucideIcon }[] = [
  { label: 'Team', Icon: Users },
  { label: 'Idea', Icon: Lightbulb },
  { label: 'Plan', Icon: ListChecks },
  { label: 'Deadline', Icon: CalendarDays },
  { label: 'Prototype', Icon: ExternalLink },
  { label: 'Team skills', Icon: Wrench },
  { label: 'Decision', Icon: CircleCheck },
];

const DIMMED = 'opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none';

function CompareTerm({ children }: { children: ReactNode }) {
  // Visible on narrow screens; on wider screens the shared label column shows it and this stays for screen readers.
  return <dt className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted sm:sr-only">{children}</dt>;
}

type AcceptHandler = (proposalId: string) => void;
type RejectHandler = (proposalId: string, reason?: string) => void;

function DecisionCell({ proposal, teamName, onAccept, onReject }: {
  proposal: Proposal; teamName: string; onAccept?: AcceptHandler; onReject?: RejectHandler;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const fieldId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const focusResult = useRef(false);

  useEffect(() => {
    if (rejecting) {
      fieldRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      rejectRef.current?.focus();
    }
  }, [rejecting]);

  // After Accept / Reject the buttons disappear; move focus to the outcome so keyboard users are not dropped to <body>.
  useEffect(() => {
    if (focusResult.current && proposal.status !== 'pending') {
      focusResult.current = false;
      resultRef.current?.focus();
    }
  }, [proposal.status]);

  if (proposal.status === 'accepted') {
    return (
      <p ref={resultRef} tabIndex={-1} className={clsx('flex items-center gap-1.5 text-sm font-semibold focus:outline-hidden', LIME_INK)}>
        <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
        Team selected
      </p>
    );
  }
  if (proposal.status === 'rejected') {
    const text = proposal.rejectReason?.trim();
    return (
      <p ref={resultRef} tabIndex={-1} className="text-sm leading-relaxed text-muted focus:outline-hidden">
        {text ? (
          <>
            <span className="font-medium text-foreground">Reason: </span>
            {text}
          </>
        ) : 'Rejected without a comment'}
      </p>
    );
  }
  if (!onAccept && !onReject) return <p className="text-sm text-muted">Awaiting the business decision</p>;

  const cancel = () => {
    restoreFocus.current = true;
    setRejecting(false);
    setReason('');
  };

  if (rejecting && onReject) {
    return (
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          focusResult.current = true;
          // Always a string (empty when left blank), so callers never need to ask for the reason again.
          onReject(proposal.id, reason.trim());
          setRejecting(false);
          setReason('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            cancel();
          }
        }}
      >
        <label htmlFor={fieldId} className="block text-xs font-medium text-foreground">
          Reason for the team <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What could the team improve?"
          className={clsx(CONTROL, 'resize-y')}
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={clsx(BTN, BTN_PAD, BTN_DANGER, FOCUS_RING)}>
            <X aria-hidden="true" />
            Reject proposal
          </button>
          <button type="button" onClick={cancel} className={clsx(BTN, BTN_PAD, BTN_GHOST, FOCUS_RING)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {onAccept && (
        <button
          type="button"
          onClick={() => {
            focusResult.current = true;
            onAccept(proposal.id);
          }}
          aria-label={`Accept proposal from ${teamName}`}
          className={clsx(BTN, BTN_PAD, BTN_PRIMARY, FOCUS_RING)}
        >
          <Check aria-hidden="true" />
          Accept
        </button>
      )}
      {onReject && (
        <button
          ref={rejectRef}
          type="button"
          onClick={() => setRejecting(true)}
          aria-label={`Reject proposal from ${teamName}`}
          className={clsx(BTN, BTN_PAD, BTN_SECONDARY, FOCUS_RING)}
        >
          <X aria-hidden="true" />
          Reject
        </button>
      )}
    </div>
  );
}

function CompareColumn({ proposal, team, need, onAccept, onReject }: {
  proposal: Proposal; team?: TeamProfile; need: Set<string> | null;
  onAccept?: AcceptHandler; onReject?: RejectHandler;
}) {
  const rejected = proposal.status === 'rejected';
  const name = team?.name ?? proposal.teamId;
  const skills = team ? uniq([...(team.skills ?? []), ...(team.tech ?? [])]) : [];
  const matched = need ? skills.filter((s) => need.has(s.toLowerCase())).length : 0;
  const cell = clsx('min-w-0 border-t border-hairline p-4', rejected && DIMMED);

  return (
    <section
      aria-label={`Proposal from ${name}`}
      className={clsx(
        SURFACE, 'group row-span-7 grid min-w-0 snap-start grid-rows-subgrid',
        proposal.status === 'accepted' ? 'shadow-accent ring-2 ring-accent' : 'shadow-card',
      )}
    >
      <header className={clsx('flex flex-wrap items-start justify-between gap-2 p-4', rejected && DIMMED)}>
        <h3 className="min-w-0 break-words text-base font-semibold text-foreground">{name}</h3>
        <StatusPill status={proposal.status} />
      </header>
      <dl className={cell}>
        <CompareTerm>Idea</CompareTerm>
        <dd className="whitespace-pre-line text-sm leading-relaxed text-foreground">{proposal.idea}</dd>
      </dl>
      <dl className={cell}>
        <CompareTerm>Plan</CompareTerm>
        <dd className="text-sm leading-relaxed text-foreground"><PlanSteps plan={proposal.plan} /></dd>
      </dl>
      <dl className={cell}>
        <CompareTerm>Deadline</CompareTerm>
        <dd className="text-sm text-foreground"><Deadline value={proposal.deadline} /></dd>
      </dl>
      <dl className={cell}>
        <CompareTerm>Prototype</CompareTerm>
        <dd className="min-w-0 text-sm"><PrototypeLink url={proposal.prototypeUrl} /></dd>
      </dl>
      <dl className={cell}>
        <CompareTerm>Team skills</CompareTerm>
        <dd>
          {skills.length > 0
            ? <ChipList items={skills} label={`Skills of ${name}`} matches={need} />
            : <span className="text-sm text-muted">Not specified</span>}
          {need && (
            <p className="mt-2 text-xs text-muted">
              Matches the task: <span className="font-semibold tabular-nums text-foreground">{matched} of {need.size}</span>
            </p>
          )}
        </dd>
      </dl>
      <div className="border-t border-hairline p-4">
        <DecisionCell proposal={proposal} teamName={name} onAccept={onAccept} onReject={onReject} />
      </div>
    </section>
  );
}

/**
 * Side-by-side comparison. Columns keep the given order: nothing is ranked or picked automatically,
 * the business accepts one, several or none. "Reject" opens an inline optional reason field and
 * calls `onReject(id, reason)` with a string (empty when left blank).
 */
export function ProposalCompare({ proposals, teams, onAccept, onReject, skillsNeeded, className }: {
  proposals: Proposal[];
  teams: TeamProfile[];
  onAccept?: AcceptHandler;
  onReject?: RejectHandler;
  /** The task's skills; matching team skills are highlighted with a "N of M" count. */
  skillsNeeded?: string[];
  className?: string;
}) {
  if (proposals.length === 0) return null;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const needed = uniq(skillsNeeded);
  const need = needed.length > 0 ? new Set(needed.map((s) => s.toLowerCase())) : null;

  return (
    <div
      role="region"
      aria-label="Proposal comparison"
      tabIndex={0}
      // Padding leaves room for the hard shadows and rings inside the scroll box; the negative margin keeps alignment.
      // `relative` makes this the containing block of the sr-only spans, so they are clipped here and never widen the page.
      className={clsx('relative -mx-2 snap-x snap-mandatory overflow-x-auto px-2 pb-3 pt-2 sm:snap-none', FOCUS_RING, className)}
    >
      <div
        className={clsx(
          'grid gap-x-4',
          // Explicit min width keeps the grid box as wide as its tracks, so the sticky label column never runs out of room.
          'min-w-[calc(var(--cols)*16.5rem_-_1rem)] grid-cols-[repeat(var(--cols),minmax(15.5rem,1fr))]',
          'sm:min-w-[calc(8.5rem_+_var(--cols)*16.5rem)] sm:grid-cols-[8.5rem_repeat(var(--cols),minmax(15.5rem,1fr))]',
        )}
        style={{ '--cols': proposals.length } as CSSProperties}
      >
        {/* The left shadow paints the page color over the scroller padding, so columns never peek out beside the pinned labels. */}
        <div aria-hidden="true" className="sticky left-0 z-10 row-span-7 hidden grid-rows-subgrid bg-background shadow-[-0.5rem_0_0_var(--background)] sm:grid">
          {COMPARE_ROWS.map(({ label, Icon }, i) => (
            <div
              key={label}
              className={clsx(
                'flex items-start gap-1.5 py-4 pr-2 text-xs font-semibold uppercase tracking-wide text-foreground/70',
                // Same 1px top edge as the cells, so labels line up with the first line of each row.
                i > 0 && 'border-t border-transparent',
              )}
            >
              <Icon className="mt-px size-3.5 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
        {proposals.map((p) => (
          <CompareColumn
            key={p.id}
            proposal={p}
            team={teamById.get(p.teamId)}
            need={need}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ TeamCard */

/** Student team profile with the points it has earned from business-confirmed milestones. */
export function TeamCard({ team, points, className, children }: {
  team: TeamProfile;
  points: number;
  className?: string;
  /** Optional footer slot, e.g. an edit link. */
  children?: ReactNode;
}) {
  const groups: [string, string[]][] = [
    ['Interests', uniq(team.interests)],
    ['Skills', uniq(team.skills)],
    ['Tech', uniq(team.tech)],
  ];
  const about = firstText(team.about);

  return (
    <article className={clsx(SURFACE, 'p-5 shadow-card', className)}>
      <header className="flex items-start gap-4">
        <Monogram name={team.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h3 className="min-w-0 break-words text-lg font-semibold leading-tight text-foreground">{team.name}</h3>
            <PointsBadge points={points} />
          </div>
          {about && <p className="mt-1.5 text-sm leading-relaxed text-muted">{about}</p>}
        </div>
      </header>

      <dl className="mt-4 space-y-3 border-t border-hairline pt-4">
        {groups.map(([label, items]) => (
          <div key={label} className="grid gap-1.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-xs font-medium text-muted sm:pt-1">{label}</dt>
            <dd>
              {items.length > 0
                ? <ChipList items={items} label={label} />
                : <span className="text-xs text-muted">Not specified</span>}
            </dd>
          </div>
        ))}
      </dl>

      {children != null && children !== false && <div className="mt-4 border-t border-hairline pt-4">{children}</div>}
    </article>
  );
}

/* ------------------------------------------------------------------ Leaderboard */

interface RankedTeam { team: TeamProfile; points: number; rank: number | null }

/** Points desc, then name. Competition ranking (1, 1, 3); teams without points get no rank. */
function rankTeams(teams: TeamProfile[], points: Record<string, number>): RankedTeam[] {
  const sorted = teams
    .map((team) => ({ team, points: Math.max(0, points[team.id] ?? 0) }))
    .sort((a, b) => b.points - a.points || a.team.name.localeCompare(b.team.name, 'ru'));
  let rank = 0;
  return sorted.map((row, i) => {
    if (row.points <= 0) return { ...row, rank: null };
    if (i === 0 || row.points !== sorted[i - 1].points) rank = i + 1;
    return { ...row, rank };
  });
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <span className="relative grid size-7 place-items-center">
        <span aria-hidden="true" className="size-7 border border-dashed border-foreground/30" />
        <span className="sr-only">No points yet</span>
      </span>
    );
  }
  // Square medals for the podium: 1 lime, 2 graphite with a lime number, 3 white with a graphite frame.
  const medal = 'border-2 border-border';
  return (
    <span
      className={clsx(
        'relative grid size-7 place-items-center font-display text-sm font-bold tabular-nums',
        rank === 1 && [medal, 'bg-accent text-accent-foreground shadow-[2px_2px_0_var(--border)]'],
        rank === 2 && [medal, 'bg-primary text-accent shadow-[2px_2px_0_var(--accent)]'],
        rank === 3 && [medal, 'bg-surface text-foreground shadow-[2px_2px_0_var(--border)]'],
        rank > 3 && 'text-muted',
      )}
    >
      <span className="sr-only">Rank </span>
      {rank}
    </span>
  );
}

/** Team ranking by points. Points come only from milestones the business confirmed. */
export function Leaderboard({ teams, points, currentTeamId, className }: {
  teams: TeamProfile[];
  points: Record<string, number>;
  /** Highlights the viewer's own team. */
  currentTeamId?: string;
  className?: string;
}) {
  // Bars grow from 0 the first time the board scrolls into view (motion-safe only; reduced motion shows final widths).
  const { ref: listRef, seen } = useSeen<HTMLOListElement>(teams.length > 0);
  if (teams.length === 0) {
    return (
      <p className={clsx('border border-dashed border-border px-4 py-6 text-center text-sm text-muted', className)}>
        No teams yet
      </p>
    );
  }
  const rows = rankTeams(teams, points);
  const top = rows[0]?.points ?? 0;

  return (
    <ol
      ref={listRef}
      aria-label="Team leaderboard"
      className={clsx(SURFACE, 'divide-y divide-hairline overflow-hidden shadow-card', className)}
    >
      {rows.map(({ team, points: pts, rank }, i) => {
        const leader = rank === 1;
        const podium = rank !== null && rank <= 3;
        const mine = team.id === currentTeamId;
        const pct = top > 0 ? Math.round((pts / top) * 100) : 0;
        return (
          <li
            key={team.id}
            aria-current={mine ? 'true' : undefined}
            className={clsx(
              'grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4',
              podium ? 'py-3.5' : 'py-3',
              mine && 'bg-surface-2/70 shadow-[inset_4px_0_0_var(--accent)]',
            )}
          >
            <RankBadge rank={rank} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className={clsx('truncate text-foreground', podium ? 'font-semibold' : 'text-sm')}>{team.name}</span>
                {leader && (
                  <span className={clsx('shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold leading-none', LIME_INK)}>
                    Leader
                  </span>
                )}
                {mine && (
                  <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium leading-none text-foreground">
                    Your team
                  </span>
                )}
              </div>
              <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden bg-surface-2">
                <div
                  className={clsx(
                    'h-full w-(--w) transition-[width] duration-700 ease-out motion-reduce:transition-none',
                    !seen && 'motion-safe:w-0',
                    leader ? 'bg-accent' : mine ? 'bg-foreground/60' : 'bg-foreground/25',
                  )}
                  style={{ '--w': `${pct}%`, transitionDelay: `${Math.min(i, 8) * 70}ms` } as CSSProperties}
                />
              </div>
            </div>
            <p className="whitespace-nowrap text-right">
              <span className={clsx('font-display font-bold tabular-nums text-foreground', podium ? 'text-lg' : 'text-sm')}>{pts}</span>
              <span className="ml-1 text-xs text-muted">{plural(pts, 'point', 'points')}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
