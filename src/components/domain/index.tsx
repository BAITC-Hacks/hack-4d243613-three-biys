// Presentational domain components — owner: B. Props are the CONTRACT (PLAN.md §5); no store/API access.
// Placeholders so C can wire pages today; B replaces the internals (may split into files, keep the exports).
import type {
  AgentStep, CardField, Evidence, Insight, Level, PositionPreview as PositionPreviewData, PrivacyStats, Proposal, Rating,
  SourcesSnapshot, TaskCard, TeamProfile, TechSpec,
} from '@/lib/types';
import { Badge, Card } from '@/components/ui';

import { LevelBadge } from './rating';

// Real implementations (owner: B).
export { RatingPanel, PositionPreview, LevelBadge, LevelUpToast, ScoreBar, ScoreHistory, levelLabel } from './rating';
export type { RatingLocale } from './rating';
export { CollectorDownload } from './collector';
export { LegalDocument, ConsentCheckbox, ConsentGate, LegalLinks, AiNoticeBanner } from './legal';
export { ProjectCard, TechSpecView, ProposalCard, ProposalCompare, TeamCard, Leaderboard } from './cards';
export type { Consents } from './legal';

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

export function SuggestionChip({ text, source, onAccept }: { text: string; source: string; onAccept?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1 text-xs">
      <span>{text}</span><span className="text-muted">({source})</span>
      {onAccept && <button className="text-primary" onClick={onAccept}>Accept</button>}
    </span>
  );
}

