# PLAN — Three Biys · AI Sana gamification track

> Source of truth for all three Claude sessions. Contracts (§5) change only by team agreement.
> Roles: **A** = lead / AI layer · **B** = domain logic + data · **C** = UI + README + demo.

## 1. Task

**Track:** AI Sana — "Единый кейс по геймификации практических заданий" (spec file is local-only, gitignored; key requirements restated here).

Build a working web MVP where a **business** turns a rough description of a need into a complete **task card**, gets a transparent **readiness rating 0–100**, and publishes it to an **open catalog ranked by rating**. **Student teams** browse / get recommendations and submit proposals; the **business manually** accepts/rejects (one, several or none). **No automatic team assignment.**

**End-to-end flow (must work live, not on slides):**
1 Draft → 2 Clarify (AI finds gaps, **≥3 questions**) → 3 Editable card, manual confirm → 4 Rating + breakdown + "what raises it" → 5 Publish into catalog at rating position → 6 Student team submits proposal (idea, plan, deadline, prototype link) → 7 Business compares & manually accepts/rejects → 8 Chosen team gets points after a business-confirmed milestone.

**Card fields:** title, context, need, users, data, constraints, expected result, success criteria, contact & interaction format.

**Rating (points only for filled AND confirmed fields; recalculated after every confirmed edit):**

| Component | Max |
|---|---|
| Context & need | 20 |
| Data & materials | 20 |
| Expected result | 15 |
| Success criteria (measurable) | 15 |
| Constraints | 10 |
| Users | 10 |
| Business contact & format | 10 |

Levels: 0–39 **draft** (visible, flagged) · 40–69 **working** (proposals + recommendations allowed) · 70–89 **ready** (boosted position) · 90–100 **priority** (highlighted). Low rating never hides a task or blocks proposals.

**AI rules:** ≥1 meaningful AI feature; must not add facts the user didn't state; human edits/confirms before publish; may recommend tasks to students but never restricts catalog or picks teams; no personal/sensitive attributes. If API is unavailable, a local stub is OK but we must show **prompt, input/output format, invalid-response handling**.

**Seed data minimum:** 5 drafts (varying completeness, with industry), 5 full cards (all rating fields + score), 5 team profiles (name, interests, skills, tech), 5 proposals (team, idea, plan, deadline, link).

**Out of scope:** auth/registration, realtime chat, notifications, file storage, ML training, vector DB, mobile, prod infra.

**Technical scoring (100):** end-to-end flow 20 · card quality 15 · **business gamification 25** · catalog & proposals 15 · AI feature 10 · technical quality 10 · demo 5.
**Demo Day (jury, 100):** value 25 · result quality 20 · innovation 15 · scalability 20 · presentation 20.

**Deliverables:** runnable MVP from README; README with architecture, **rating formula, catalog rules, test scenarios**; ≤5-min demo on one prepared example.
**Deadline:** final push by **17:45**, repo frozen at **18:00** (Astana, UTC+5). Feature freeze **17:00**.

## 2. Solution

**Problem.** Businesses don't struggle only with *describing* a task — they struggle to *know which problem is worth solving*. The evidence is scattered across meetings, chats and daily work, so tasks given to students are vague and students can't start.

**Product: "TaskForge"** (working name) — two entry points into one gamified pipeline:
- **Discover (our addition):** the business connects sources — ~4 weeks of **meeting transcripts** (+ paste a new one), **anonymized team-level process analytics**, (stretch) a chat export. An **agent** analyzes the period and returns **ranked problem insights, each with cited evidence** (quote/metric + source + date; insights without verifiable evidence are dropped) and a suggested type of IT solution. The business picks one → it becomes a pre-filled draft.
- **Constructor (spec core):** draft → AI clarifying questions → card (every field traced to draft/answer, missing = null, never invented) → deterministic rating with breakdown and "+N points if you add X" → AI-generated **Tech spec for students** tab (editable, business confirms) → publish → catalog → proposals → manual decision → milestone points.

**Privacy by design (activity analytics):** events, not content; user IDs dropped before aggregation; only weekly team aggregates; a pattern is reported only if **≥5 people** contribute (k-anonymity); Privacy panel shows raw events / individuals identified = 0 / suppressed patterns. Pitch: *"We analyze how work flows, not who works."*

**What's new:** problem discovery from real operational signals + evidence-cited insights + a transparent, code-computed readiness score that gamifies the business, not the students.
**How it scales:** connectors are pluggable (roadmap: screen/process agent, Slack/Telegram/email, CRM); any university / accelerator can run its own catalog; rating formula is config.

## 3. Stack

**TypeScript + Next.js (App Router) + Tailwind**, **OpenAI SDK** for both providers, **zod** for all AI I/O, **zustand + localStorage** for app data (seeded from JSON), server only for AI routes. Deploy: **Vercel CLI** (`npx vercel deploy --prod`). Why: one language/one app for 3 people, file-based routes = few shared files, no DB to set up, trivial deploy.

**Models** (single constant `src/lib/llm/models.ts`; verify IDs against each provider's model list at scaffold):
- OpenAI (primary): `gpt-4.1-mini` for all JSON tasks; `gpt-4.1` for `discover` if quality needs it.
- NVIDIA (fallback, `https://integrate.api.nvidia.com/v1`): `meta/llama-3.3-70b-instruct`.
- `DEMO_MODE=live|record|replay`; no key → replay.

**Storage caveat:** localStorage = per browser. Demo runs in one browser with the Business/Student **role switcher**; "Reset demo data" button reseeds.

## 4. Architecture

```
┌──────────────────────── Browser (Next.js client) ────────────────────────┐
│ Role switcher: Business | Student(team)                                   │
│ Pages (C) ──uses──> store (B, zustand+localStorage, seeded)               │
│      │                 ├─ rateCard() (B, pure, deterministic)             │
│      │                 ├─ catalog selectors: sort/filter (B)              │
│      │                 └─ proposals / decisions / milestones (B)          │
│      └──calls──> api-client.ts (A, typed fetch) ───────────┐              │
└────────────────────────────────────────────────────────────┼──────────────┘
                                                             ▼
┌──────────────────── Next.js API routes (A, server only) ───────────────────┐
│ /api/ai/clarify  /api/ai/card  /api/ai/techspec  /api/ai/recommend          │
│ /api/ai/discover (agent loop + tools over sources, evidence verification)   │
│        │                                                                    │
│        ▼  llm wrapper: provider openai→nvidia fallback → zod validate →     │
│           1 repair retry → structured error; DEMO_MODE live/record/replay   │
│           prompts in src/prompts/*.md; fixtures in fixtures/replay/*.json   │
└─────────────────────────────────────────────────────────────────────────────┘
Discover inputs (B): seed meetings, raw activity events → aggregateActivity(k=5) → aggregates + privacy stats (client-side, pure)
```

Components: role switcher · Discover page (sources, privacy panel, insights, agent trace) · Constructor wizard · Card editor + RatingPanel + TechSpec tab · Catalog · Task detail + proposal form · Business proposals review + milestone · Student recommendations · AgentTrace.

## 5. Contracts

**`src/lib/types.ts` — contract (change by agreement).**

```ts
export type ScoredField =
  | 'context' | 'need' | 'users' | 'data' | 'constraints'
  | 'expectedResult' | 'successCriteria' | 'contact';
export type CardField = 'title' | ScoredField;
export type CardFields = Record<CardField, string | null>;   // null = not provided

export type Level = 'draft' | 'working' | 'ready' | 'priority';

export interface TechSpec {
  summary: string;
  scope: string[];
  dataInputs: string[];
  functionalRequirements: string[];
  nonFunctional: string[];
  acceptanceCriteria: string[];
  openQuestions: string[];          // things the business still hasn't told us
}

export interface TaskCard {
  id: string;
  businessName: string;
  industry: string;
  topic: string;                     // catalog filter
  draftText: string;
  fields: CardFields;
  confirmed: Partial<Record<CardField, boolean>>;   // points only if true
  fieldSource: Partial<Record<CardField, 'draft' | 'answer' | 'manual' | 'insight'>>;
  techSpec: TechSpec | null;
  techSpecConfirmed: boolean;
  status: 'draft' | 'published';
  origin: { kind: 'manual' } | { kind: 'insight'; insightId: string };
  createdAt: string; updatedAt: string; publishedAt?: string;
}

export type RatingKey =
  | 'contextNeed' | 'data' | 'expectedResult' | 'successCriteria'
  | 'constraints' | 'users' | 'contact';
export interface RatingComponent {
  key: RatingKey; label: string; max: number; points: number;
  reasons: string[];                 // why points were given
  hints: { text: string; gain: number }[];   // "add X → +N"
}
export interface Rating { total: number; level: Level; components: RatingComponent[]; }

export interface TeamProfile {       // no personal/sensitive attributes
  id: string; name: string; interests: string[]; skills: string[]; tech: string[];
}
export interface Proposal {
  id: string; taskId: string; teamId: string;
  idea: string; plan: string; deadline: string; prototypeUrl: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string; decidedAt?: string;
}
export interface Milestone {
  id: string; taskId: string; teamId: string; title: string;
  points: number; confirmedByBusiness: boolean; confirmedAt?: string;
}

// --- Discover ---
export interface MeetingNote {        // speakers by role, never by name
  id: string; date: string; title: string; team: string; transcript: string;
}
export type AppCategory = 'CRM' | 'Spreadsheet' | 'Email' | 'Messenger' | 'ERP' | 'Docs' | 'Browser' | 'Other';
export interface RawActivityEvent {
  user: string;                        // pseudonymous, dropped by aggregator
  team: string; ts: string;
  event: 'focus' | 'switch' | 'copy' | 'paste' | 'submit';
  app?: AppCategory; from?: AppCategory; to?: AppCategory; durationSec?: number;
}
export interface TeamWeekAggregate {
  team: string; week: string;          // ISO week, e.g. "2026-W38"
  contributors: number;                // >= k, never ids
  hoursByCategory: Partial<Record<AppCategory, number>>;
  transfers: { from: AppCategory; to: AppCategory; count: number; contributors: number }[];
  topSwitches: { a: AppCategory; b: AppCategory; count: number; contributors: number }[];
}
export interface PrivacyStats {
  rawEvents: number; individualsIdentified: 0; k: number;
  suppressedPatterns: number; teamsReported: number; teamsSuppressed: number;
}
export interface ChatMessage { id: string; date: string; channel: string; role: string; text: string; }

export interface Evidence {
  sourceType: 'meeting' | 'activity' | 'chat';
  sourceId: string;                    // meeting id | "team:week" | chat id
  date: string;
  quote?: string;                      // must be a verbatim substring of the source
  metric?: string;                     // must reference a real aggregate value
}
export interface Insight {
  id: string; title: string; problem: string; affectedTeam: string;
  frequency: number;                   // # of supporting evidence items
  impact: 'low' | 'medium' | 'high';
  suggestedSolutionType: string;       // e.g. "CRM integration", "Automation bot"
  evidence: Evidence[];                // >= 1 after verification
  draftText: string;                   // short, deliberately incomplete draft
}

// --- Agent trace ---
export interface AgentStep {
  id: string; ts: string;
  kind: 'thought' | 'tool_call' | 'tool_result' | 'llm_call' | 'validation' | 'error';
  label: string; detail?: unknown; durationMs?: number;
  provider?: 'openai' | 'nvidia' | 'replay'; model?: string;
}

// --- API envelope ---
export type ApiResult<T> =
  | { ok: true; data: T; trace: AgentStep[] }
  | { ok: false; error: { code: 'BAD_INPUT' | 'LLM_INVALID' | 'LLM_UNAVAILABLE' | 'INTERNAL'; message: string }; trace: AgentStep[] };
```

**`src/lib/schemas.ts` — contract.** zod schemas mirroring the request/response types below (A writes, all import).

**API (A) — all `POST`, JSON, return `ApiResult<T>`; client uses `src/lib/api-client.ts` functions of the same name.**

| Endpoint | Request | Response `data` |
|---|---|---|
| `/api/ai/clarify` | `{ draftText: string; industry?: string; fields?: Partial<CardFields> }` | `{ extracted: CardFields; questions: { id: string; field: CardField; question: string; why: string }[] }` (≥3 questions, only for null/weak fields) |
| `/api/ai/card` | `{ draftText: string; answers: { questionId: string; field: CardField; question: string; answer: string }[] }` | `{ fields: CardFields; fieldSource: Partial<Record<CardField,'draft'\|'answer'>>; }` (null when not stated) |
| `/api/ai/techspec` | `{ fields: CardFields }` | `TechSpec` |
| `/api/ai/recommend` | `{ team: TeamProfile; tasks: { id: string; title: string; topic: string; summary: string; level: Level }[] }` | `{ recommendations: { taskId: string; matchScore: number; reason: string }[] }` (only level ≥ working) |
| `/api/ai/discover` | `{ meetings: MeetingNote[]; aggregates: TeamWeekAggregate[]; chats?: ChatMessage[]; period: { from: string; to: string } }` | `{ insights: Insight[]; dropped: number }` (server verifies every quote/metric against inputs) |

**Store (B) — `src/lib/store/index.ts`, zustand, persisted to localStorage key `taskforge:v1`:**
state `{ role: 'business' | 'student'; currentTeamId: string; cards: TaskCard[]; teams: TeamProfile[]; proposals: Proposal[]; milestones: Milestone[]; teamPoints: Record<string, number>; insights: Insight[] }`
actions `setRole, setTeam, createCard(partial) → id, updateFields(id, patch), confirmField(id, field, bool), setTechSpec(id, spec), confirmTechSpec(id), publish(id), submitProposal(p) → id, decideProposal(id, 'accepted'|'rejected'), addMilestone(m), confirmMilestone(id), setInsights(list), resetDemo()`.
Selectors (`src/lib/catalog.ts`): `getCatalog(cards, { topic?, level?, sort: 'rating' | 'new' })` — published only, sorted by rating desc, level ≥ ready boosted.

**Pure functions (B):**
- `src/lib/rating/index.ts`: `rateCard(card: TaskCard): Rating`, `levelFor(total: number): Level`.
- `src/lib/discover/aggregate.ts`: `aggregateActivity(events: RawActivityEvent[], k = 5): { aggregates: TeamWeekAggregate[]; privacy: PrivacyStats }`.

**Agent tools inside `/api/ai/discover` (A):** `list_sources()`, `read_meeting(id)`, `search_meetings(query)`, `get_activity(team?, week?)`, `search_chats(query)` — each returns JSON; errors returned as `{ error }`, never thrown. Max 8 iterations, 30 s per call, 20k token budget.

## 6. File ownership map

| Path | Owner |
|---|---|
| `package.json`, lockfile, `next.config.*`, `tsconfig.json`, `eslint`/`postcss` config, `.env.example`, `vercel.json` | **A** |
| `src/lib/types.ts`, `src/lib/schemas.ts` | **contract — change by agreement** (A edits) |
| `src/app/api/**` | A |
| `src/lib/llm/**` (wrapper, models, replay, trace) | A |
| `src/lib/ai/**` (agent loop, tools, evidence verification) | A |
| `src/lib/api-client.ts` | A |
| `src/prompts/**` | A |
| `fixtures/replay/**` | A |
| `src/lib/rating/**` | B |
| `src/lib/store/**` | B |
| `src/lib/catalog.ts` | B |
| `src/lib/discover/**` | B |
| `src/data/seed/**`, `scripts/**` | B |
| `tests/**` | B |
| `src/app/**/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` (everything in `src/app` except `api/`) | C |
| `src/components/**` | C |
| `README.md` (except Third-party table: anyone appends), `docs/DEMO.md` | C |
| `docs/PLAN.md` | A writes; each role ticks only its own section |

## 7. Dependencies (all installed in scaffold)

Runtime: `next`, `react`, `react-dom`, `openai`, `zod`, `zustand`, `nanoid`, `clsx`, `lucide-react`.
Dev: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `vitest`, `tsx`.
Deploy: `npx vercel` (not a dependency).

## 8. Tasks by role

### A — lead / AI layer
**H1 13–14**
- [ ] PLAN.md → push
- [ ] Scaffold: Next.js app, all deps, `types.ts`, `schemas.ts`, stubs for every owned area, `.env.example`, README skeleton → push
**H2 14–15**
- [ ] `src/lib/llm/*`: provider switch openai/nvidia, fallback, zod validate + 1 repair retry, `DEMO_MODE` record/replay (`fixtures/replay/<endpoint>-<hash>.json`, replay falls back to latest fixture for the endpoint), trace steps
- [ ] `/api/ai/clarify` + `src/prompts/clarify.md` (never invent; null for missing; ≥3 questions)
- [ ] `/api/ai/card` + `src/prompts/card.md` (fieldSource per field)
- [ ] `src/lib/api-client.ts` typed functions
**H3 15–16**
- [ ] `/api/ai/techspec` + prompt; `/api/ai/recommend` + prompt (filters level ≥ working)
- [ ] Record golden-path fixtures for clarify/card/techspec/recommend
- [ ] First Vercel deploy (`OPENAI_API_KEY` set in Vercel env, budget cap set in OpenAI project)
**H4 16–17**
- [ ] `/api/ai/discover`: agent loop with tools (`src/lib/ai/discover.ts`, `tools.ts`), `src/lib/ai/evidence.ts` (quote must be verbatim substring; metric must match aggregate), drop unsupported insights
- [ ] Record discover fixture; redeploy
**H5 17–18**
- [ ] Replay-only run of full golden path; final deploy; give C the AI section text (prompts, I/O formats, invalid-response handling) for README

### B — domain logic + data
**H1 13–14**
- [ ] Review contracts in §5 with A (10 min)
- [ ] `src/data/seed/`: `drafts.json` (5, varying completeness, industry), `cards.json` (5 published, all fields, different levels), `teams.json` (5), `proposals.json` (5) → push
**H2 14–15**
- [ ] `src/lib/rating/index.ts`: `rateCard`, `levelFor`; per component: filled+confirmed → base points, quality checks → rest (e.g. success criteria has a number/%, constraints mention time/tech/access, data names a source or example, contact has email/phone/@handle + format, min lengths); reasons + hints with gain
- [ ] `tests/rating.test.ts` smoke (empty card = 0, full card ≥ 90, unconfirmed = 0 points)
- [ ] `src/lib/store/index.ts` zustand + persist + seed loader + `resetDemo`
**H3 15–16**
- [ ] `src/lib/catalog.ts` sort/filter; proposal/decision/milestone actions; `teamPoints` on milestone confirm
- [ ] Rating/catalog rules text for README (give to C)
**H4 16–17**
- [ ] `src/data/seed/meetings.json`: demo company, 8 transcripts over 4 weeks, speakers by role, recurring pain (manual order transfer spreadsheet→CRM) + 2 minor pains
- [ ] `scripts/gen-activity.ts` → `src/data/seed/activity-events.json` (~2,000 events, ≥1 team below k to show suppression)
- [ ] `src/lib/discover/aggregate.ts` with k=5 + `PrivacyStats`
- [ ] (cut-able) `src/data/seed/chats.json`
**H5 17–18**
- [ ] Tune demo seed so golden path shows clear rating growth; test scenarios list for README; bugfix

### C — UI + README + demo
**H1 13–14**
- [ ] `src/app/layout.tsx` with header + role switcher (Business / Student + team select) + nav; route stubs for all pages below → push
- [ ] `/business/new` step 1: draft textarea + industry, calls `clarify` (mock data until A's API lands)
**H2 14–15**
- [ ] Step 2 questions (≥3, answer inputs) → step 3 card editor (every field editable, per-field ✓ confirm, source badge) with live `RatingPanel` (total, level badge, component bars, reasons, "+N if you add X") → publish button
**H3 15–16**
- [ ] `/catalog` (sorted by rating, filters topic + level, level badges, draft flag) + `/catalog/[id]` detail + proposal form
- [ ] `/business/tasks` + `/business/tasks/[id]`: proposals list, accept/reject buttons, milestone add/confirm, team points
- [ ] Tech spec tab on the card editor (generate → edit → confirm)
**H4 16–17**
- [ ] `/business/discover`: sources summary, `PrivacyPanel`, "Analyze" → `AgentTrace` + insight cards with evidence → "Use as draft" → `/business/new?insight=<id>`
- [ ] `/student`: recommendations for current team + team points
**H5 17–18**
- [ ] README complete (all required sections + rating formula + catalog rules + test scenarios + AI section + third-party table); `docs/DEMO.md` script; polish

## 9. Integration points

- **13:50** scaffold pushed → B and C pull; everyone codes against `types.ts`.
- **Until 15:00** C uses `src/lib/api-client.ts` mock mode (returns fixture-like data when `NEXT_PUBLIC_MOCK_AI=1`); A switches it to real endpoints.
- **Until 15:00** C renders `RatingPanel` from B's `rateCard` stub (returns 0 with empty components) — B's real version drops in without UI changes.
- **15:00 sync:** full Constructor → publish → catalog path runs in one browser.
- **16:00 sync:** proposals + decision + milestone path complete; deploy.
- **17:00 freeze:** Discover wired; only fixes after this.
- Every hour: `/checkpoint`.

## 10. Golden-path demo script (≤5 min, one browser, DEMO_MODE=replay safe)

Demo company: **"QazCargo"** (synthetic logistics SME).
1. Role **Business** → **Discover**: show sources (8 meetings / 4 weeks, ~2,000 activity events) and **Privacy panel** (individuals identified: 0, suppressed patterns: N). Click **Analyze** → agent trace streams → 3 insights. Top: *"Orders are re-typed from spreadsheets into the CRM"* with evidence: meeting quote (date) + metric "Sales, 2026-W38: 142 spreadsheet→CRM transfers, 6 contributors".
2. **Use as draft** → Constructor opens with the weak draft: *"Our sales team wastes time moving orders from Excel to the CRM. We want to automate it."*
3. **Clarify** → ≥3 questions (users? data available? success metric? contact?). Answer with prepared text (in `docs/DEMO.md`).
4. **Card** generated; source badges; confirm fields → rating ~**45 (working)**; hints show "+15 add measurable success criteria", "+10 add contact & format".
5. Edit: add *"Cut manual entry time by 80%, zero duplicate orders"* + contact → confirm → rating ~**88 (ready)** — show the jump live.
6. **Tech spec** tab → generate → edit one line → confirm → **Publish**.
7. **Catalog**: task appears near the top (ready boost); show filters and a draft-level task still visible.
8. Switch to **Student**, team **"DataCraft"** → recommendation shows QazCargo with reason → submit proposal (idea, plan, deadline, prototype link).
9. Switch to **Business** → task proposals (ours + 1 seeded) → **Accept** DataCraft, **Reject** the other.
10. Add milestone "Prototype import script" → **Confirm** → DataCraft **+points**. End.

## 11. Cut list (drop in this order)

1. Audio upload (not planned)
2. Chat export source
3. Live AI `recommend` → rule-based match on interests/tech
4. Activity analytics source (keep Privacy panel with static numbers only if trivial)
5. Tech spec tab
6. NVIDIA fallback (keep replay)
7. Vercel deploy (local run + replay still satisfies the README requirement)
**Never cut:** the full core flow, rating breakdown + recalculation, manual accept/reject, README.

## 12. Risks

- **Behind schedule** (plan at 14:00, not 13:30) → start everyone on H1 tasks immediately after scaffold; Discover is the first thing to shrink.
- **LLM JSON reliability / hallucination** → zod + 1 repair retry + null-for-missing + evidence substring verification; replay for the demo.
- **localStorage is per browser** → single-browser demo with role switcher; "Reset demo data".
- **Merge conflicts** → strict ownership; `types.ts` edits only by A after agreement; one person adds deps.
- **OpenAI credit / rate limit** → budget cap, NVIDIA fallback, replay.
- **Vercel Hobby + org repo** → deploy via CLI, not Git import.
- **Surveillance perception** → privacy-by-design messaging + Privacy panel; connectors beyond meetings/analytics are roadmap only.
