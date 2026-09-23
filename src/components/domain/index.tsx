// Presentational domain components — owner: B. Props are the CONTRACT (PLAN.md §5); no store/API access.
// Placeholders so C can wire pages today; B replaces the internals (may split into files, keep the exports).
import type {
  AgentStep, CardField, Evidence, Insight, Level, PositionPreview as PositionPreviewData, PrivacyStats, Proposal, Rating,
  SourcesSnapshot, TaskCard, TeamProfile, TechSpec,
} from '@/lib/types';
import { Badge, Card } from '@/components/ui';

export function LevelBadge({ level }: { level: Level }) {
  return <Badge>{level}</Badge>;
}

export function ScoreBar({ points, max }: { points: number; max: number }) {
  const pct = max > 0 ? Math.round((points / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded bg-border">
      <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RatingPanel({ rating, onAction }: { rating: Rating; onAction?: (field: CardField) => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{rating.total} / 100</span>
        <LevelBadge level={rating.level} />
      </div>
      <ul className="mt-3 space-y-2">
        {rating.components.map((c) => (
          <li key={c.key}>
            <div className="flex justify-between text-sm"><span>{c.label}</span><span>{c.points}/{c.max}</span></div>
            <ScoreBar points={c.points} max={c.max} />
            {c.checks.map((k) => <p key={k.label} className="text-xs text-muted">{k.passed ? '✓' : '✗'} {k.label} — {k.rule}</p>)}
          </li>
        ))}
      </ul>
      {rating.nextActions.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium">Next best actions</p>
          {rating.nextActions.map((a) => (
            <button key={a.field + a.text} className="block text-left text-xs text-primary" onClick={() => onAction?.(a.field)}>+{a.gain}: {a.text}</button>
          ))}
        </div>
      )}
      {rating.vagueness.map((v) => <p key={v.field + v.phrase} className="mt-1 text-xs text-red-700">“{v.phrase}” in {v.field}: {v.ask}</p>)}
    </Card>
  );
}

export function ProjectCard({ card, rating }: { card: TaskCard; rating: Rating }) {
  return (
    <Card>
      <div className="flex justify-between">
        <span className="font-medium">{card.fields.title ?? 'Untitled'}</span>
        <LevelBadge level={rating.level} />
      </div>
      <p className="text-sm text-muted">{card.businessName} · {card.industry} · {card.topic}</p>
      <p className="text-sm">{rating.total} / 100</p>
    </Card>
  );
}

export function TechSpecView({ spec }: { spec: TechSpec }) {
  const lists: [string, string[]][] = [
    ['Scope', spec.scope], ['Data inputs', spec.dataInputs], ['Functional requirements', spec.functionalRequirements],
    ['Non-functional', spec.nonFunctional], ['Acceptance criteria', spec.acceptanceCriteria],
    ['Suggested stack', spec.suggestedStack], ['Open questions', spec.openQuestions],
  ];
  return (
    <Card>
      <p>{spec.summary}</p>
      {lists.map(([title, items]) => (
        <div key={title} className="mt-2">
          <p className="text-sm font-medium">{title}</p>
          <ul className="list-disc pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ))}
    </Card>
  );
}

export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  return <Badge>{evidence.sourceType} · {evidence.date} · {evidence.quote ?? evidence.metric}</Badge>;
}

export function InsightCard({ insight, onUse }: { insight: Insight; onUse?: (insight: Insight) => void }) {
  return (
    <Card>
      <p className="font-medium">{insight.title}</p>
      <p className="text-sm">{insight.problem}</p>
      <div className="mt-2 flex flex-wrap gap-1">{insight.evidence.map((e, i) => <EvidenceChip key={i} evidence={e} />)}</div>
      {onUse && <button className="mt-2 text-sm text-primary" onClick={() => onUse(insight)}>Use as draft</button>}
    </Card>
  );
}

export function PrivacyPanel({ privacy, live }: { privacy: PrivacyStats; live: SourcesSnapshot['live'] }) {
  return (
    <Card>
      <p className="text-sm">Raw events: {privacy.rawEvents} · Individuals identified: {privacy.individualsIdentified} · k = {privacy.k}</p>
      <p className="text-sm">Suppressed patterns: {privacy.suppressedPatterns} · Devices live: {live.devices}</p>
    </Card>
  );
}

export function AgentTrace({ steps }: { steps: AgentStep[] }) {
  return (
    <ol className="space-y-1 text-xs font-mono">
      {steps.map((s) => <li key={s.id}>[{s.kind}] {s.label}{s.model ? ` (${s.provider}/${s.model})` : ''}</li>)}
    </ol>
  );
}

export function ProposalCard({ proposal, team, onAccept, onReject }: {
  proposal: Proposal; team?: TeamProfile; onAccept?: () => void; onReject?: () => void;
}) {
  return (
    <Card>
      <p className="font-medium">{team?.name ?? proposal.teamId} · {proposal.status}</p>
      <p className="text-sm">{proposal.idea}</p>
      <p className="text-sm text-muted">{proposal.plan} · due {proposal.deadline}</p>
      {proposal.rejectReason && <p className="text-xs text-red-700">Reason: {proposal.rejectReason}</p>}
      <a className="text-sm text-primary" href={proposal.prototypeUrl}>Prototype</a>
      {proposal.status === 'pending' && (onAccept || onReject) && (
        <div className="mt-2 flex gap-2">
          {onAccept && <button className="text-sm text-green-700" onClick={onAccept}>Accept</button>}
          {onReject && <button className="text-sm text-red-700" onClick={onReject}>Reject</button>}
        </div>
      )}
    </Card>
  );
}

export function TeamCard({ team, points }: { team: TeamProfile; points: number }) {
  return (
    <Card>
      <p className="font-medium">{team.name} · {points} pts</p>
      <p className="text-sm text-muted">{team.about}</p>
      <p className="text-xs">{[...team.interests, ...team.skills, ...team.tech].join(' · ')}</p>
    </Card>
  );
}

export function PositionPreview({ preview }: { preview: PositionPreviewData }) {
  return (
    <p className="text-sm">
      Catalog position: #{preview.position} of {preview.of}
      {preview.ifNext && <> → #{preview.ifNext.position} if you {preview.ifNext.action.text.toLowerCase()} (+{preview.ifNext.action.gain})</>}
    </p>
  );
}

export function LevelUpToast({ from, to }: { from: Level; to: Level }) {
  return <div className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Level up: {from} → {to}</div>;
}

export function ScoreHistory({ history }: { history: TaskCard['history'] }) {
  return <p className="text-sm text-muted">{history.map((h) => h.total).join(' → ') || 'No history yet'}</p>;
}

export function SuggestionChip({ text, source, onAccept }: { text: string; source: string; onAccept?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1 text-xs">
      <span>{text}</span><span className="text-muted">({source})</span>
      {onAccept && <button className="text-primary" onClick={onAccept}>Accept</button>}
    </span>
  );
}

export function ProposalCompare({ proposals, teams, onAccept, onReject }: {
  proposals: Proposal[]; teams: TeamProfile[];
  onAccept?: (proposalId: string) => void; onReject?: (proposalId: string, reason?: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {proposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} team={teams.find((t) => t.id === p.teamId)}
          onAccept={onAccept ? () => onAccept(p.id) : undefined} onReject={onReject ? () => onReject(p.id) : undefined} />
      ))}
    </div>
  );
}

export function Leaderboard({ teams, points }: { teams: TeamProfile[]; points: Record<string, number> }) {
  const rows = [...teams].sort((a, b) => (points[b.id] ?? 0) - (points[a.id] ?? 0));
  return (
    <ol className="space-y-1 text-sm">
      {rows.map((t, i) => <li key={t.id}>{i + 1}. {t.name} — {points[t.id] ?? 0} pts</li>)}
    </ol>
  );
}
