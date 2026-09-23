// CONTRACT (PLAN.md §5). Change only by team agreement; A edits.
export type ScoredField =
  | 'context' | 'need' | 'users' | 'data' | 'constraints'
  | 'expectedResult' | 'successCriteria' | 'contact';
export type CardField = 'title' | ScoredField;
export type CardFields = Record<CardField, string | null>;   // null = not provided

export type Level = 'draft' | 'working' | 'ready' | 'priority';

export interface TechSpec {            // "technical documentation for students"
  summary: string;
  scope: string[];
  dataInputs: string[];
  functionalRequirements: string[];
  nonFunctional: string[];
  acceptanceCriteria: string[];
  suggestedStack: string[];
  openQuestions: string[];             // what the business still hasn't told us
}

export interface TaskCard {
  id: string;
  businessName: string;
  industry: string;
  topic: string;                       // catalog filter
  skillsNeeded: string[];              // used for matching (from tech spec / manual)
  draftText: string;
  fields: CardFields;
  confirmed: Partial<Record<CardField, boolean>>;   // points only if true
  fieldSource: Partial<Record<CardField, 'draft' | 'answer' | 'manual' | 'insight'>>;
  techSpec: TechSpec | null;
  techSpecConfirmed: boolean;
  status: 'draft' | 'published';
  origin: { kind: 'manual' } | { kind: 'insight'; insightId: string };
  history: { ts: string; total: number; level: Level; note: string }[];   // snapshot on every confirm/publish
  suggestions: Partial<Record<CardField, { text: string; source: string }>>;  // from Discover evidence; unconfirmed, no points until accepted
  createdAt: string; updatedAt: string; publishedAt?: string;
}

export type RatingKey =
  | 'contextNeed' | 'data' | 'expectedResult' | 'successCriteria'
  | 'constraints' | 'users' | 'contact';
export interface RatingComponent {
  key: RatingKey; label: string; max: number; points: number;
  reasons: string[];                   // why points were given
  checks: { label: string; passed: boolean; points: number; rule: string }[];  // transparent quality checks
  hints: { text: string; gain: number }[];   // "add X → +N"
}
export interface NextAction { field: CardField; text: string; gain: number; }
export interface VaguenessFlag { field: CardField; phrase: string; ask: string; }
export interface Rating {
  total: number; level: Level; components: RatingComponent[];
  nextActions: NextAction[];           // all hints, sorted by gain desc
  vagueness: VaguenessFlag[];          // code rules: "ASAP", "etc.", "some data", "improve efficiency"…
}
export interface PositionPreview {
  position: number; of: number;        // current rank among published + this card
  ifNext?: { action: NextAction; position: number };  // rank if the top next action is done
}

export interface TeamProfile {         // student team; no personal/sensitive attributes
  id: string; name: string; about: string;
  interests: string[]; skills: string[]; tech: string[];
}
export interface Proposal {
  id: string; taskId: string; teamId: string;
  idea: string; plan: string; deadline: string; prototypeUrl: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectReason?: string;               // optional feedback shown to the team
  createdAt: string; decidedAt?: string;
}
export interface Milestone {
  id: string; taskId: string; teamId: string; title: string;
  points: number; confirmedByBusiness: boolean; confirmedAt?: string;
}
export interface Match { taskId: string; score: number; reasons: string[]; }   // student matches

// --- Sources (Discover + Collector) ---
export interface MeetingNote {          // speakers by role, never by name
  id: string; date: string; title: string; team: string; transcript: string;
  origin: 'seed' | 'live';
}
export type AppCategory = 'CRM' | 'Spreadsheet' | 'Email' | 'Messenger' | 'ERP' | 'Docs' | 'Browser' | 'Meeting' | 'Other';
export interface ActivityEventInput {   // what the Collector sends
  ts: string;
  event: 'focus' | 'switch' | 'copy' | 'transfer';
  app?: AppCategory; from?: AppCategory; to?: AppCategory; durationSec?: number;
}
export interface RawActivityEvent extends ActivityEventInput {
  user: string;                          // server-side hash of deviceId; dropped by aggregator
  team: string;
}
export interface TeamWeekAggregate {
  team: string; week: string;            // ISO week, e.g. "2026-W38"
  contributors: number;                  // >= k, never ids
  hoursByCategory: Partial<Record<AppCategory, number>>;
  transfers: { from: AppCategory; to: AppCategory; count: number; contributors: number }[];
  topSwitches: { a: AppCategory; b: AppCategory; count: number; contributors: number }[];
}
export interface PrivacyStats {
  rawEvents: number; individualsIdentified: 0; k: number;
  suppressedPatterns: number; teamsReported: number; teamsSuppressed: number;
}
export interface ChatMessage {          // roadmap source; seed empty, kept so SourcesSnapshot is stable
  id: string; date: string; channel: string; role: string; text: string;
  origin: 'seed' | 'live';
}
export interface Evidence {
  sourceType: 'meeting' | 'activity' | 'chat';
  sourceId: string;                      // meeting id | "team:week" | chat id
  date: string;
  quote?: string;                        // verbatim substring of the source
  metric?: string;                       // references a real aggregate value
}
export interface Insight {
  id: string; title: string; problem: string; affectedTeam: string;
  frequency: number; impact: 'low' | 'medium' | 'high';
  suggestedSolutionType: string;
  evidence: Evidence[];                  // >= 1 after verification
  draftText: string;                     // short, deliberately incomplete draft
  suggestedFields: Partial<Record<'context' | 'need' | 'data', string>>;  // built only from evidence; become TaskCard.suggestions
}
export interface SourcesSnapshot {
  meetings: MeetingNote[];
  aggregates: TeamWeekAggregate[];
  privacy: PrivacyStats;
  chats: ChatMessage[];
  live: { devices: number; lastEventAt?: string; lastMeetingAt?: string; lastMessageAt?: string };
}

// --- Agent trace ---
export interface AgentStep {
  id: string; ts: string;
  kind: 'thought' | 'tool_call' | 'tool_result' | 'llm_call' | 'validation' | 'error';
  label: string; detail?: unknown; durationMs?: number;
  prompt?: string; input?: unknown; output?: unknown;   // for the "How the AI works" panel (llm_call / validation steps)
  validation?: { ok: boolean; errors?: string[]; repaired?: boolean };
  provider?: 'openai' | 'nvidia' | 'replay'; model?: string;
}

// --- API envelope (all endpoints) ---
export type ApiResult<T> =
  | { ok: true; data: T; trace: AgentStep[] }
  | { ok: false; error: { code: 'BAD_INPUT' | 'UNAUTHORIZED' | 'LLM_INVALID' | 'LLM_UNAVAILABLE' | 'INTERNAL'; message: string }; trace: AgentStep[] };
