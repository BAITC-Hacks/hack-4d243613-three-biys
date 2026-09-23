// CONTRACT (PLAN.md §5). zod schemas for every API request/response. A writes, everyone imports.
import { z } from 'zod';

export const scoredFields = [
  'context', 'need', 'users', 'data', 'constraints',
  'expectedResult', 'successCriteria', 'contact',
] as const;
export const cardFields = ['title', ...scoredFields] as const;

export const CardFieldSchema = z.enum(cardFields);
export const LevelSchema = z.enum(['draft', 'working', 'ready', 'priority']);

const nullableText = z.string().nullable();
export const CardFieldsSchema = z.object({
  title: nullableText, context: nullableText, need: nullableText, users: nullableText,
  data: nullableText, constraints: nullableText, expectedResult: nullableText,
  successCriteria: nullableText, contact: nullableText,
});
export const PartialCardFieldsSchema = CardFieldsSchema.partial();

export const TechSpecSchema = z.object({
  summary: z.string(),
  scope: z.array(z.string()),
  dataInputs: z.array(z.string()),
  functionalRequirements: z.array(z.string()),
  nonFunctional: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  suggestedStack: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export const FieldSourceSchema = z.enum(['draft', 'answer', 'manual', 'insight']);

export const TaskCardSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  industry: z.string(),
  topic: z.string(),
  skillsNeeded: z.array(z.string()),
  draftText: z.string(),
  fields: CardFieldsSchema,
  confirmed: z.partialRecord(CardFieldSchema, z.boolean()),
  fieldSource: z.partialRecord(CardFieldSchema, FieldSourceSchema),
  techSpec: TechSpecSchema.nullable(),
  techSpecConfirmed: z.boolean(),
  status: z.enum(['draft', 'published']),
  origin: z.union([
    z.object({ kind: z.literal('manual') }),
    z.object({ kind: z.literal('insight'), insightId: z.string() }),
  ]),
  history: z.array(z.object({ ts: z.string(), total: z.number(), level: LevelSchema, note: z.string() })),
  suggestions: z.partialRecord(CardFieldSchema, z.object({ text: z.string(), source: z.string() })),
  createdAt: z.string(), updatedAt: z.string(), publishedAt: z.string().optional(),
});

export const TeamProfileSchema = z.object({
  id: z.string(), name: z.string(), about: z.string(),
  interests: z.array(z.string()), skills: z.array(z.string()), tech: z.array(z.string()),
});
export const ProposalSchema = z.object({
  id: z.string(), taskId: z.string(), teamId: z.string(),
  idea: z.string(), plan: z.string(), deadline: z.string(), prototypeUrl: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  rejectReason: z.string().optional(),
  createdAt: z.string(), decidedAt: z.string().optional(),
});

// --- Sources ---
export const AppCategorySchema = z.enum(['CRM', 'Spreadsheet', 'Email', 'Messenger', 'ERP', 'Docs', 'Browser', 'Meeting', 'Other']);
export const ActivityEventInputSchema = z.object({
  ts: z.string(),
  event: z.enum(['focus', 'switch', 'copy', 'transfer']),
  app: AppCategorySchema.optional(),
  from: AppCategorySchema.optional(),
  to: AppCategorySchema.optional(),
  durationSec: z.number().nonnegative().optional(),
});
export const MeetingNoteSchema = z.object({
  id: z.string(), date: z.string(), title: z.string(), team: z.string(), transcript: z.string(),
  origin: z.enum(['seed', 'live']),
});
export const ChatMessageSchema = z.object({
  id: z.string(), date: z.string(), channel: z.string(), role: z.string(), text: z.string(),
  origin: z.enum(['seed', 'live']),
});
export const EvidenceSchema = z.object({
  sourceType: z.enum(['meeting', 'activity', 'chat']),
  sourceId: z.string(),
  date: z.string(),
  quote: z.string().optional(),
  metric: z.string().optional(),
});
export const InsightSchema = z.object({
  id: z.string(), title: z.string(), problem: z.string(), affectedTeam: z.string(),
  frequency: z.number(), impact: z.enum(['low', 'medium', 'high']),
  suggestedSolutionType: z.string(),
  evidence: z.array(EvidenceSchema).min(1),
  draftText: z.string(),
  suggestedFields: z.object({ context: z.string().optional(), need: z.string().optional(), data: z.string().optional() }),
});

// --- AI endpoints: requests ---
export const ClarifyRequestSchema = z.object({
  draftText: z.string().min(1),
  industry: z.string().optional(),
  fields: PartialCardFieldsSchema.optional(),
});
export const CardRequestSchema = z.object({
  draftText: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string(), field: CardFieldSchema, question: z.string(), answer: z.string(),
  })),
});
export const TechSpecRequestSchema = z.object({ fields: CardFieldsSchema });
export const DiscoverRequestSchema = z.object({ period: z.object({ from: z.string(), to: z.string() }) });
export const RecommendRequestSchema = z.object({
  team: TeamProfileSchema,
  tasks: z.array(z.object({ id: z.string(), title: z.string(), topic: z.string(), summary: z.string(), level: LevelSchema })),
});

// --- AI endpoints: responses (what the LLM must produce; validated with zod) ---
export const ClarifyResponseSchema = z.object({
  extracted: CardFieldsSchema,
  questions: z.array(z.object({
    id: z.string(), field: CardFieldSchema, question: z.string(), why: z.string(), gain: z.number(),
  })).min(3),
});
export const CardResponseSchema = z.object({
  fields: CardFieldsSchema,
  fieldSource: z.partialRecord(CardFieldSchema, z.enum(["draft", "answer"])),
});
export const TechSpecResponseSchema = z.object({ techSpec: TechSpecSchema, skillsNeeded: z.array(z.string()) });
export const DiscoverResponseSchema = z.object({ insights: z.array(InsightSchema), dropped: z.number() });
export const RecommendResponseSchema = z.object({ reasons: z.record(z.string(), z.string()) });

// --- Ingest endpoints ---
export const IngestEventsRequestSchema = z.object({
  deviceId: z.string().min(1),
  team: z.string().min(1),
  events: z.array(ActivityEventInputSchema).max(500),
});
export const IngestMeetingEndRequestSchema = z.object({ meetingId: z.string().min(1) });
export const IngestMessagesRequestSchema = z.object({
  source: z.literal('telegram'),
  channel: z.string(),
  messages: z.array(z.object({ id: z.string(), date: z.string(), role: z.string(), text: z.string() })),
});

export type ClarifyRequest = z.infer<typeof ClarifyRequestSchema>;
export type ClarifyResponse = z.infer<typeof ClarifyResponseSchema>;
export type CardRequest = z.infer<typeof CardRequestSchema>;
export type CardResponse = z.infer<typeof CardResponseSchema>;
export type TechSpecRequest = z.infer<typeof TechSpecRequestSchema>;
export type TechSpecResponse = z.infer<typeof TechSpecResponseSchema>;
export type DiscoverRequest = z.infer<typeof DiscoverRequestSchema>;
export type DiscoverResponse = z.infer<typeof DiscoverResponseSchema>;
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;
export type IngestEventsRequest = z.infer<typeof IngestEventsRequestSchema>;
export type IngestMessagesRequest = z.infer<typeof IngestMessagesRequestSchema>;
