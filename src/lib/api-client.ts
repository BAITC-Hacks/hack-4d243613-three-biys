// Typed browser client for A's API. The ONLY way the browser talks to /api/*.
// NEXT_PUBLIC_MOCK_AI=1 → returns deterministic mock data without hitting the server (for C before endpoints land).
import type {
  ApiResult, CardFields, Insight, SourcesSnapshot, TechSpec, TeamProfile, Level,
} from '@/lib/types';
import type {
  ClarifyRequest, ClarifyResponse, CardRequest, CardResponse,
  TechSpecRequest, TechSpecResponse, DiscoverRequest, DiscoverResponse,
  RecommendRequest, RecommendResponse,
} from '@/lib/schemas';

export const MOCK_AI = process.env.NEXT_PUBLIC_MOCK_AI === '1';

async function post<TReq, TRes>(url: string, body: TReq): Promise<ApiResult<TRes>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ApiResult<TRes>;
  } catch (e) {
    return { ok: false, error: { code: 'INTERNAL', message: String(e) }, trace: [] };
  }
}

function okMock<T>(data: T, label: string): ApiResult<T> {
  return { ok: true, data, trace: [{ id: 's1', ts: new Date().toISOString(), kind: 'thought', label: `mock: ${label}`, provider: 'replay' }] };
}

const emptyFields: CardFields = {
  title: null, context: null, need: null, users: null, data: null,
  constraints: null, expectedResult: null, successCriteria: null, contact: null,
};

export async function clarify(req: ClarifyRequest): Promise<ApiResult<ClarifyResponse>> {
  if (MOCK_AI) {
    return okMock({
      extracted: { ...emptyFields, title: 'Automate order entry', need: req.draftText },
      questions: [
        { id: 'q1', field: 'data', question: 'What data or sample files can you share (e.g. the Excel export)?', why: 'No data sources are described.', gain: 20 },
        { id: 'q2', field: 'successCriteria', question: 'How will you measure that the problem is solved?', why: 'No measurable criteria given.', gain: 15 },
        { id: 'q3', field: 'users', question: 'Who will use the solution day to day?', why: 'Users are not mentioned in the draft.', gain: 10 },
      ],
    }, 'clarify');
  }
  return post('/api/ai/clarify', req);
}

export async function buildCard(req: CardRequest): Promise<ApiResult<CardResponse>> {
  if (MOCK_AI) {
    const fields: CardFields = { ...emptyFields, title: 'Automate order entry', need: req.draftText };
    const fieldSource: CardResponse['fieldSource'] = { title: 'draft', need: 'draft' };
    for (const a of req.answers) { fields[a.field] = a.answer; fieldSource[a.field] = 'answer'; }
    return okMock({ fields, fieldSource }, 'card');
  }
  return post('/api/ai/card', req);
}

export async function techSpec(req: TechSpecRequest): Promise<ApiResult<TechSpecResponse>> {
  if (MOCK_AI) {
    const spec: TechSpec = {
      summary: req.fields.need ?? 'Mock technical documentation',
      scope: ['Import script'], dataInputs: ['Excel export'], functionalRequirements: ['Parse rows', 'Create CRM records'],
      nonFunctional: ['Runs in under 5 minutes'], acceptanceCriteria: ['Zero duplicate orders'],
      suggestedStack: ['Python', 'pandas'], openQuestions: ['Which CRM API version?'],
    };
    return okMock({ techSpec: spec, skillsNeeded: ['Python', 'integrations'] }, 'techspec');
  }
  return post('/api/ai/techspec', req);
}

export async function discover(req: DiscoverRequest): Promise<ApiResult<DiscoverResponse>> {
  if (MOCK_AI) {
    const insight: Insight = {
      id: 'ins-mock-1', title: 'Orders are re-typed from spreadsheets into the CRM',
      problem: 'Sales re-enters orders manually.', affectedTeam: 'Sales', frequency: 142, impact: 'high',
      suggestedSolutionType: 'Integration script',
      evidence: [{ sourceType: 'activity', sourceId: 'Sales:2026-W38', date: '2026-09-20', metric: '142 Spreadsheet→CRM transfers, 6 contributors' }],
      draftText: 'Our sales team wastes time moving orders from Excel to the CRM. We want to automate it.',
      suggestedFields: { data: 'Weekly activity aggregate: 142 Spreadsheet→CRM transfers by 6 contributors (Sales, 2026-W38).' },
    };
    return okMock({ insights: [insight], dropped: 0 }, 'discover');
  }
  return post('/api/ai/discover', req);
}

export async function recommend(req: RecommendRequest): Promise<ApiResult<RecommendResponse>> {
  if (MOCK_AI) return okMock({ reasons: {} }, 'recommend');
  return post('/api/ai/recommend', req);
}

export async function getSources(): Promise<ApiResult<SourcesSnapshot>> {
  try {
    const res = await fetch('/api/sources');
    return (await res.json()) as ApiResult<SourcesSnapshot>;
  } catch (e) {
    return { ok: false, error: { code: 'INTERNAL', message: String(e) }, trace: [] };
  }
}

// Convenience re-exports so C only imports from here.
export type { TeamProfile, Level };
