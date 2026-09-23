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
export { EvidenceChip, InsightCard, PrivacyPanel, AgentTrace, SuggestionChip } from './discover';
export type { Consents } from './legal';

