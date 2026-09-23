# PLAN — Three Biys · AI Sana gamification track

> Source of truth for all three Claude sessions. Contracts (§5) change only by team agreement.
> Roles: **A** = lead (Mac) — everything except design & frontend: AI layer, server/ingest, rating, seed data, Windows Collector logic, deploy · **B** (Windows) — **Design**: design system, UI component kit, presentational domain components, Collector window UI + testing the Collector on Windows, pitch/demo materials, README editing · **C** (Windows) — **Frontend**: all pages, browser store, catalog/matching logic, wiring to the API.

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

**Out of scope (spec):** auth/registration, realtime chat, notifications, file storage, ML training, vector DB, mobile, prod infra.

**Technical scoring (100):** end-to-end flow 20 · card quality 15 · **business gamification 25** · catalog & proposals 15 · AI feature 10 · technical quality 10 · demo 5.
**Demo Day (jury, 100):** value 25 · result quality 20 · innovation 15 · scalability 20 · presentation 20.

**Deliverables:** runnable MVP from README; README with architecture, **rating formula, catalog rules, test scenarios**; ≤5-min demo on one prepared example.
**Deadline:** final push by **17:45**, repo frozen at **18:00** (Astana, UTC+5). Feature freeze **17:00**.

## 2. Solution

**Problem.** Businesses don't only struggle to *describe* a task — they struggle to *know which problem is worth solving*. The evidence is scattered across meetings, chats and daily work on employees' computers, so tasks given to students are vague and students can't start.

**Product: "TaskForge"** (working name). **Split of responsibilities: the Windows app does collection only. Everything else — business side and student side (profiles, catalog, projects, proposals) — is the web app.**

1. **TaskForge Collector (Windows app)** — tray app the business installs (opt-in). Two toggles:
   - **Activity tracker** (starts with Windows): foreground-app category + clipboard transfers between apps → anonymized events. Window titles/content never leave the machine.
   - **Meeting notes**: captures system audio (Zoom/Teams/Meet/any) + mic → server transcribes → meeting transcript.
   - ~~Communication channels (Telegram)~~ — **cut from the start; pitch roadmap only.**
2. **Business web platform**
   - **Discover**: all sources (seeded 4-week history + live Collector data) → anonymizer (k≥5) + Privacy panel → AI **insights, each with cited evidence** (verbatim quote / real metric + source + date; unsupported insights dropped) + suggested IT solution type → "Use as draft".
   - **Constructor** (spec core): draft → AI questions → card (every field traced to draft/answer, missing = null, never invented) → **deterministic rating** with breakdown and "+N if you add X" → AI **technical documentation for students** (editable, business confirms) → publish.
   - **My tasks**: proposals per task → manual accept/reject → milestone confirm → team points.
3. **Student side**
   - **Team profile**: name, interests, skills, tech (no personal/sensitive attributes), points earned.
   - **Project catalog**: all published projects, sorted by rating, filters by topic and level, level badges.
   - **Project page**: full card + **technical documentation** + rating breakdown → submit proposal.
   - **"Projects you can take"**: matches the team profile against projects (level ≥ working) with a reason; never hides the catalog.

**Staying on-track (read this first).** The track's core principle: *the more complete and useful the business describes its task, the higher its rating and catalog position.* Everything we build serves that:
- **The Collector/Discover is a rating booster, not a separate product.** "Data & materials" (20 pts) and "Context & need" (20 pts) are the hardest fields for a business to fill; evidence from meetings/activity becomes **suggested** text for those fields, marked with its source, and earns points **only after the business confirms it**.
- **Demo order:** the spec's mandatory flow first (weak draft → questions → rating growth → publish → proposal → manual decision, ~3.5 min), Collector/Discover as the ~1-min "boost" story.

**Track-scoring features (priority order; owners in §8):**
1. **Catalog position preview** — "Your task is #7 of 12 → add measurable success criteria → #3" (rating directly drives position). *(25 pts: gamification)*
2. **Next best actions** — missing items sorted by point gain, click jumps to the field. *(25)*
3. **Transparent quality checks** — per component: ✓ filled ✓ confirmed ✗ measurable, with the rule text. *(25)*
4. **Side-by-side proposal comparison** for the business (idea, plan, deadline, skill match, link). *(15: catalog & proposals)*
5. **"How the AI works" panel** — prompt, input JSON, output JSON, validation/repair result for every AI step. *(10: AI — spec explicitly asks to show prompt, I/O format, invalid-response handling)*
6. **Level-up moments** — toast/animation when crossing 40 / 70 / 90, level badges everywhere. *(25)*
7. **Questions ranked by points** — each question shows "why: +20 data & materials". *(15: card quality)*
8. **Team leaderboard** — points only from business-confirmed milestones, never for applying. *(20: step 8 of the flow)*
9. **Score history** per task — timeline 25 → 45 → 88 (recalculated after each confirmed addition). *(25)*
10. **Vagueness detector** — flags "ASAP", "etc.", "some data", "improve efficiency" and asks for specifics. *(15)*
11. **Reject with reason + accept several.** *(15)*
12. **Proposal completeness check** for students (valid link, required fields, future deadline). *(10: technical quality)*

**Privacy by design:** events not content; device ID pseudonymized, dropped before aggregation; only weekly team aggregates; a pattern is shown only if **≥5 people** contribute; Privacy panel shows raw events / individuals identified = 0 / suppressed patterns. Pitch: *"We analyze how work flows, not who works."*

**What's new:** problem discovery from real operational signals + evidence-cited insights + a transparent, code-computed readiness score that gamifies the business.
**How it scales:** pluggable connectors (roadmap: Slack, email, WhatsApp, CRM, macOS collector); any university/accelerator runs its own catalog; rating formula is config.

## 3. Stack

- **Web:** TypeScript + Next.js (App Router) + Tailwind; **OpenAI SDK** for both LLM providers; **zod** for all AI and ingest I/O; **zustand + localStorage** for business-flow data (cards, proposals, teams), seeded from JSON.
- **Server store for Collector data** (`src/lib/server/storage.ts`): **Upstash Redis** when `UPSTASH_REDIS_REST_URL` is set (Vercel deploy), else **JSON files in `.data/`** (local / experts, zero setup). Seed history is always merged in.
- **Collector:** **Electron + TypeScript** in `collector/` (own `package.json`), `get-windows` for the foreground app (fallback: PowerShell script calling user32 `GetForegroundWindow`), Electron clipboard polling, `desktopCapturer` + `audio: 'loopback'` for system audio (Windows). (Telegram: roadmap only.)
- **Deploy:** Vercel CLI (`npm run deploy`, run by A after each checkpoint). Production URL: https://taskforge-roan.vercel.app
- **Models** (one constant `src/lib/llm/models.ts`; verify IDs at scaffold): OpenAI `gpt-4.1-mini` (JSON tasks), `gpt-4.1` for discover if needed, `gpt-4o-transcribe` (fallback `whisper-1`) for audio; NVIDIA `meta/llama-3.3-70b-instruct` at `https://integrate.api.nvidia.com/v1` as text fallback. `DEMO_MODE=live|record|replay`; no key → replay.

Why: one language across web + desktop; file-based routes = few shared files; no DB needed for the core; Collector is a separate package so it never conflicts with the web app.

## 4. Architecture

```
┌──────── Windows: TaskForge Collector (Electron) ─────────────┐
│ Tray + window: [Activity tracker] [Meeting notes]           │
│ settings: serverUrl, ingestToken, team                      │
│ tracker: foreground app → category; clipboard X→Y transfer  │
│ meeting: loopback+mic → 30s webm chunks                     │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS, Authorization: Bearer INGEST_TOKEN
               ▼
┌──────────── Next.js server (A) ─────────────────────────────────────────┐
│ /api/ingest/events | meeting-audio | meeting-end | messages              │
│      → storage.ts (Upstash Redis | .data/*.json)                         │
│ /api/sources  → seed + live, aggregateActivity(k=5) → aggregates+privacy │
│ /api/ai/clarify | card | techspec | discover | recommend(optional)       │
│      → llm wrapper: openai→nvidia fallback → zod → 1 repair retry        │
│        → structured error; DEMO_MODE live/record/replay; trace steps     │
│        prompts in src/prompts/*.md; fixtures in fixtures/replay/         │
└──────────────▲──────────────────────────────────────────────────────────┘
               │ api-client.ts (A, typed fetch)
┌──────────────┴──── Browser (C) ─────────────────────────────────────────┐
│ Role switcher: Business | Student (team)                                 │
│ Business: Discover · Constructor · My tasks (proposals, milestones)      │
│ Student:  Team profile · Catalog · Project page (+tech docs) · Matches   │
│ store (zustand+localStorage, seeded) · catalog.ts (sort/filter/match)    │
│ rateCard() (A, pure) used live in the card editor and catalog            │
└──────────────────────────────────────────────────────────────────────────┘
```

## 5. Contracts

**`src/lib/types.ts` — contract (change by agreement; A edits).**

```ts
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
```

**`src/lib/schemas.ts` — contract.** zod schemas for every request/response below (A writes, everyone imports).

**AI API (A) — `POST`, JSON, `ApiResult<T>`; the browser calls them only via `src/lib/api-client.ts`:**

| Endpoint | Request | Response `data` |
|---|---|---|
| `/api/ai/clarify` | `{ draftText: string; industry?: string; fields?: Partial<CardFields> }` | `{ extracted: CardFields; questions: { id: string; field: CardField; question: string; why: string; gain: number }[] }` (≥3, only for null/weak fields, sorted by `gain` — server fills `gain` from `rateCard`, not the LLM) |
| `/api/ai/card` | `{ draftText: string; answers: { questionId: string; field: CardField; question: string; answer: string }[] }` | `{ fields: CardFields; fieldSource: Partial<Record<CardField,'draft'\|'answer'>> }` (null when not stated) |
| `/api/ai/techspec` | `{ fields: CardFields }` | `{ techSpec: TechSpec; skillsNeeded: string[] }` |
| `/api/ai/discover` | `{ period: { from: string; to: string } }` (server reads `/api/sources` data itself) | `{ insights: Insight[]; dropped: number }` (every quote/metric verified against sources) |
| `/api/ai/recommend` *(optional)* | `{ team: TeamProfile; tasks: { id; title; topic; summary; level: Level }[] }` | `{ reasons: Record<string, string> }` — only adds nicer reasons to rule-based matches |

**Collector / sources API (A) — header `Authorization: Bearer ${INGEST_TOKEN}` on all `/api/ingest/*`:**

| Endpoint | Request | Response `data` |
|---|---|---|
| `POST /api/ingest/events` | `{ deviceId: string; team: string; events: ActivityEventInput[] }` (≤500 per batch) | `{ accepted: number }` |
| `POST /api/ingest/meeting-audio` | `multipart/form-data`: `audio` (webm/opus ≤ 25 MB), `meetingId`, `title`, `team`, `seq` (0,1,2…), `startedAt` | `{ meetingId: string; seq: number; text: string; transcriptLength: number }` |
| `POST /api/ingest/meeting-end` | `{ meetingId: string }` | `{ meeting: MeetingNote }` |
| `POST /api/ingest/messages` *(roadmap — not built)* | `{ source: 'telegram'; channel: string; messages: { id: string; date: string; role: string; text: string }[] }` | `{ accepted: number }` |
| `GET /api/sources` | — (no token) | `SourcesSnapshot` (seed + live, aggregated with k=5) |
| `GET /api/health` | — | `{ ok: true; mode: 'live'\|'replay'; storage: 'redis'|'file'|'memory' }` (Collector "Test connection") |

**Collector settings (A, stored in Electron `userData/settings.json`, never committed):** `{ serverUrl: string; ingestToken: string; team: string; trackerEnabled: boolean; meetingEnabled: boolean }` — no names or window titles are ever sent.

**Browser store (C) — `src/lib/store/index.ts`, zustand, persisted to localStorage key `taskforge:v1`:**
state `{ role: 'business' | 'student'; currentTeamId: string; cards: TaskCard[]; teams: TeamProfile[]; proposals: Proposal[]; milestones: Milestone[]; teamPoints: Record<string, number>; insights: Insight[] }`
actions `setRole, setTeam, updateTeam(id, patch), createCard(partial) → id, updateFields(id, patch), confirmField(id, field, bool) (pushes a `history` snapshot), acceptSuggestion(id, field), decideProposal(id, status, rejectReason?), setTechSpec(id, spec, skills), confirmTechSpec(id), publish(id), submitProposal(p) → id, decideProposal(id, 'accepted'|'rejected'), addMilestone(m), confirmMilestone(id), setInsights(list), resetDemo()`.
`src/lib/catalog.ts` (C): `getCatalog(cards, { topic?, level?, sort: 'rating' | 'new' })` — published only, ordered by `catalogSortKey` from `src/lib/rating`; `matchTasks(team, cards): Match[]` — overlap of team interests/skills/tech with task topic/`skillsNeeded`, only level ≥ working, reasons like "Your team knows Python · task needs Python".

**Presentational components (B) — `src/components/ui/**` (generic kit) and `src/components/domain/**`:** props only, no store/API access, typed from `types.ts`: `RatingPanel({ rating })`, `LevelBadge({ level })`, `ScoreBar({ points, max })`, `ProjectCard({ card, rating })`, `TechSpecView({ spec })`, `InsightCard({ insight, onUse })`, `EvidenceChip({ evidence })`, `PrivacyPanel({ privacy, live })`, `AgentTrace({ steps })`, `ProposalCard({ proposal, team, onAccept?, onReject? })`, `TeamCard({ team, points })`. C imports these; until B ships one, C uses a minimal placeholder with the same props.

**Pure functions (A):** `src/lib/rating/index.ts` → `rateCard(card): Rating`, `levelFor(total): Level`, `catalogSortKey(card, rating): number` (the ONE ordering rule: rating desc, ready/priority boosted, newer first on ties — `getCatalog` must use it), `positionPreview(card, publishedCards): PositionPreview`. `src/lib/discover/aggregate.ts` → `aggregateActivity(events: RawActivityEvent[], k = 5): { aggregates; privacy }`.

## 6. File ownership map

| Path | Owner |
|---|---|
| root `package.json`, lockfile, `next.config.*`, `tsconfig.json`, eslint/postcss config, `.env.example`, `vercel.json` | **A** |
| `src/lib/types.ts`, `src/lib/schemas.ts` | **contract — change by agreement** (A edits) |
| `src/app/api/**` | A |
| `src/lib/llm/**`, `src/lib/ai/**`, `src/lib/server/**`, `src/lib/api-client.ts`, `src/prompts/**`, `fixtures/replay/**` | A |
| `src/lib/rating/**`, `src/lib/discover/**`, `tests/**` | A |
| `src/data/seed/**`, `scripts/**` | A |
| `collector/**` except `collector/renderer/**` (own `package.json` + lockfile) | A |
| `collector/renderer/**` (Collector window HTML/CSS/UI script) | **B** |
| `src/app/globals.css` (theme tokens), `src/components/ui/**`, `src/components/domain/**` | **B** |
| `docs/DEMO.md`, pitch deck, `README.md` editing (A supplies technical sections; Third-party table: anyone appends) | **B** |
| `src/app/**` except `api/` and `globals.css` (pages, `layout.tsx`) | **C** |
| `src/components/features/**` (page-level composites wired to store/API), `src/lib/store/**`, `src/lib/catalog.ts` | **C** |
| `docs/DISCLOSURE.md` | anyone appends |
| `docs/PLAN.md` | A writes; each role ticks only its own section |

## 7. Dependencies (installed in scaffold)

- **Web runtime:** `next`, `react`, `react-dom`, `openai`, `zod`, `zustand`, `nanoid`, `clsx`, `lucide-react`, `@upstash/redis`.
- **Web dev:** `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `vitest`, `tsx`.
- **Collector (`collector/package.json`):** `electron`, `get-windows`, `typescript`, `@types/node`. (Stretch: `electron-builder` for a `.exe`.)
- Design tooling: none required (Tailwind + `lucide-react` icons); mockups/pitch in Figma/Canva outside the repo.
- Deploy: `npx vercel` (not a dependency).

## 8. Tasks by role

Hours are Astana time. Realistic start: scaffold lands ~14:35.

### A — lead: AI, server, rating, seed, Collector logic, deploy (Mac)
**H1 → 14:40**
- [x] PLAN.md → push
- [x] Scaffold: Next.js app, all web deps, `types.ts`, `schemas.ts`, stubs for every area, `collector/` skeleton (Electron main + empty `renderer/` for B) with its deps, `.env.example`, README skeleton → push
**H2 14:40–15:40**
- [x] `src/lib/llm/*`: provider switch + fallback, zod + 1 repair retry, `DEMO_MODE` record/replay (`fixtures/replay/<endpoint>-<hash>.json`, replay falls back to latest fixture per endpoint), trace
- [x] `/api/ai/clarify`, `/api/ai/card` + prompts; `src/lib/api-client.ts` real calls
- [x] `src/lib/rating/index.ts`: `rateCard` with per-component `checks` (rule text), `hints`, `nextActions` sorted by gain, `vagueness` flags (code rules), `catalogSortKey`, `positionPreview` + `tests/rating.test.ts` (empty = 0, unconfirmed = 0, full ≥ 90, vague phrase flagged, position improves after next action) — **features 1, 2, 3, 10**
- [x] Trace steps carry `prompt`, `input`, `output`, `validation` (feature 5); clarify fills question `gain` from `rateCard` and sorts by it (feature 7)
- [x] `src/data/seed/*.json`: 5 drafts, 5 published cards (with techSpec, mixed levels), 5 teams, 5 proposals
**H3 15:40–16:40**
- [x] `src/lib/server/storage.ts` (redis | file), `/api/ingest/*`, `/api/sources`, `/api/health`, transcription via OpenAI
- [x] `src/lib/discover/aggregate.ts` (k=5) + seed `meetings.json` (8 over 4 weeks), `activity-events.json` (~2,000, one team below k) — no chats
- [x] `/api/ai/techspec`; first Vercel deploy (env: `OPENAI_API_KEY`, `INGEST_TOKEN`, Upstash keys)
- [x] Collector tracker (`collector/src/tracker.ts`, `categories.ts`): foreground app every 2 s (`get-windows`; PowerShell fallback), category mapping, clipboard `copy` → `transfer` within 60 s, 30 s batches → `/api/ingest/events`, autostart, pause; IPC status to renderer → B tests on Windows
**H4 16:40–17:00**
- [x] `/api/ai/discover` (single validated call + `src/lib/ai/evidence.ts`, drop unsupported; each insight also returns `suggestedFields` for context/need/data built only from evidence); record golden-path fixtures
- [x] Collector meeting notes (`collector/src/meeting.ts`): loopback + mic, 30 s chunks → `/api/ingest/meeting-audio`, Stop → `meeting-end`. (Telegram: cut.)
**H5 17:00–17:45**
- [x] Replay-only run of the golden path; final deploy; technical README sections (install, run, env, architecture, rating formula, catalog rules, AI prompts/I-O/error handling, Collector) → B for editing

### B — Design (Windows)
**H1 → 15:00**
- [ ] Quick look & feel: palette, type scale, spacing → Tailwind tokens in `src/app/globals.css`
- [ ] `src/components/ui/*`: Button, Card, Badge, Input, Textarea, Select, Tabs, ProgressBar, Stat, EmptyState → push (C builds with these from 15:00)
**H2 15:00–16:00**
- [ ] `src/components/domain/*` (props-only, §5): `RatingPanel` (total, level, component bars, **checks ✓/✗ with rule text**, **Next best actions** list with `onAction(field)`), `PositionPreview({ preview })` ("#7 of 12 → #3 if you …"), `LevelBadge`, `LevelUpToast({ from, to })`, `ScoreBar`, `ScoreHistory({ history })`, `ProjectCard`, `TechSpecView`, `ProposalCard`, `ProposalCompare({ proposals, teams, onAccept, onReject })`, `TeamCard`, `Leaderboard({ teams, points })`
- [ ] Collector window UI `collector/renderer/*` (3 toggles, settings form, status/counters, live transcript area) against A's IPC stub
**H3 16:00–16:40**
- [ ] `AgentTrace` with **"How the AI works"** expandable view per step (prompt, input JSON, output JSON, validation result/repair) — feature 5; `InsightCard`, `EvidenceChip`, `SuggestionChip({ text, source, onAccept })`, `PrivacyPanel`; landing `/` visuals with C; loading/empty/error states
- [ ] Test Collector on Windows whenever A pushes (tracker events reaching `/api/sources`)
**H4 16:40–17:00**
- [ ] Visual polish pass on all pages with C; `docs/DEMO.md` (exact demo inputs); pitch deck (problem → product → privacy → roadmap)
**H5 17:00–17:45**
- [ ] Edit README into final form (A's technical text + product description + screenshots); rehearse demo on Windows (Collector + browser)

### C — Frontend (Windows)
**H1 → 15:00**
- [x] `layout.tsx` header: role switcher (Business / Student + team picker) + nav; route stubs for all pages → push
- [x] `src/lib/store/index.ts` (zustand + persist + seed loader + `resetDemo`), `src/lib/catalog.ts` (`getCatalog`, `matchTasks`)
**H2 15:00–16:00**
- [x] `/business/new` wizard: draft (+industry) → questions (≥3, sorted by gain, show "why: +N") → card editor (all fields editable, per-field ✓ confirm, source badges, **"not stated" markers**, vagueness flags inline, Discover suggestions as accept-able chips) + live `RatingPanel` with **Next best actions** (click scrolls/focuses the field) + **PositionPreview** + **LevelUpToast** on crossing 40/70/90 + **ScoreHistory** → **Tech docs tab** (generate → edit → confirm) → publish (mock `api-client` until A's endpoints land)
**H3 16:00–16:40**
- [x] `/catalog` (rating sort, topic + level filters, badges, draft flag) + `/catalog/[id]` project page (card + technical documentation + rating breakdown + proposal form)
- [x] `/student` (team profile summary, points, "Projects you can take" from `matchTasks`, **team Leaderboard** — points only from confirmed milestones) + `/student/profile` (edit name, about, interests, skills, tech); proposal form **completeness check** (valid URL, required fields, future deadline)
- [x] `/business/tasks` + `/business/tasks/[id]`: **ProposalCompare** side-by-side, accept (several allowed) / reject **with optional reason**, add/confirm milestone, points
**H4 16:40–17:00**
- [x] `/business/discover`: sources (seed + live from `/api/sources`), `PrivacyPanel`, meetings list, "Analyze" → `AgentTrace` + `InsightCard`s → "Use as draft" (`/business/new?insight=<id>`: draft prefilled, `suggestedFields` shown as **unconfirmed suggestions** on context/need/data — points only after accept + confirm)
**H5 17:00–17:45**
- [ ] Run the golden path end-to-end in replay mode; fix bugs; screenshots for B

## 9. Integration points

- **~14:35** scaffold pushed → B and C pull; everyone codes against `types.ts`.
- **15:00** B's UI kit pushed → C switches from raw elements to the kit. Domain components land during H2; C uses same-props placeholders until then.
- **Until A's endpoints land (~15:30):** `api-client.ts` returns mock data when `NEXT_PUBLIC_MOCK_AI=1`; `rateCard` stub returns 0 — real versions drop in with no UI change.
- **Collector:** A writes main-process logic on the Mac and exposes IPC (`collector/src/preload.ts`: `window.collector.getStatus()`, `setToggle(name, on)`, `saveSettings(s)`, `onStatus(cb)`, `onTranscript(cb)`); B builds `renderer/` against it and tests every push on Windows.
- **15:40 sync:** constructor → publish → catalog works in one browser.
- **16:40 sync:** proposals + decision + milestone + student profile/matches done; Collector tracker events visible in `/api/sources`; deploy.
- **17:00 freeze:** only fixes after this.
- Every hour: `/checkpoint`.

## 10. Golden-path demo script (≤5 min)

Setup: web app on the Vercel URL in a browser; Collector running on a Windows laptop pointed at the same URL. Demo company **"QazCargo"** (synthetic logistics SME). **Order = the spec's mandatory demo first (steps 1–7, ~3.5 min), then the Collector/Discover boost (steps 8–9, ~1 min).**
1. **Business → New task:** type the weak draft: *"Our sales team wastes time moving orders from Excel to the CRM. We want to automate it."* Vagueness flag appears on "automate it".
2. **Clarify** → ≥3 questions, sorted by points ("why: +20 data & materials") → answer with prepared text (`docs/DEMO.md`) → card with source badges and "not stated" markers → confirm fields → rating ~**45 (working)** + **LevelUpToast**; **PositionPreview** "#7 of 10 → add measurable success criteria → #3"; **Next best actions**: "+15 success criteria", "+10 contact & format".
3. Click the top action → add *"Cut manual entry time by 80%, zero duplicate orders"* + contact → confirm → ~**88 (ready)** live, toast "Ready — higher catalog position", **ScoreHistory** 25 → 45 → 88. Open **"How the AI works"** on the clarify step for 5 seconds (prompt, input, output, validation).
4. **Tech docs** tab → generate → edit one line → confirm → **Publish** → **Catalog:** QazCargo at #3; a draft-level task still visible with its flag.
5. Switch to **Student**, team **"DataCraft"** → profile (Python, integrations) → **Projects you can take** shows QazCargo with reason → project page with tech docs → submit proposal (completeness check).
6. Switch to **Business** → **ProposalCompare** (ours + 1 seeded) → **Accept** DataCraft, **Reject** the other with a reason.
7. Milestone "Import script prototype" → **Confirm** → DataCraft **+points** → **Leaderboard** on the student side.
8. **Boost story — Windows Collector:** tray app, tracker on (live counter) → **Start meeting notes**, one sentence on Zoom → **Stop** → transcript appears.
9. **Discover:** sources (4 weeks seed + today's live meeting/events), **Privacy panel** (individuals identified: 0). **Analyze** → insight *"Orders are re-typed from spreadsheets into the CRM"* with evidence (meeting quote + "Sales, 2026-W38: 142 Spreadsheet→CRM transfers, 6 contributors") → **Use as draft** → "Data & materials" suggestion chip → accept + confirm → **+20 points**: *"the Collector earns the points businesses usually can't."*

Backup: if Windows/network fails, skip step 8 — seed data carries Discover; if the API fails, `DEMO_MODE=replay`.

## 11. Cut list (drop in this order)

0. Collector: Telegram / chat source — **already cut** (roadmap only)
1. AI `recommend` reasons (rule-based matches stay)
2. ScoreHistory chart (keep the numbers in text), vagueness detector
3. Collector: live meeting audio (paste a transcript in Discover instead)
4. Discover AI (keep sources + Privacy panel; insights from a replay fixture)
5. NVIDIA fallback (replay stays)
6. Vercel deploy (local run + replay satisfies the README; Collector points at LAN IP)
7. Collector: activity tracker (only after the 16:00 checkpoint fails)

**Never cut:** full core flow, rating breakdown + checks + recalculation, **PositionPreview + Next best actions**, manual accept/reject + ProposalCompare, "How the AI works" panel, technical docs on project pages, student profile + "projects you can take", README.

## 12. Risks

- **Behind schedule + wider scope** → Collector is isolated in `collector/`; A carries the most scope — cut list applies to A first (meeting audio → Discover AI); 16:00 checkpoint: if the tracker isn't sending events, A stops Collector work and finishes the web core; B joins C on pages once the kit is done.
- **Windows-native pieces** (`get-windows` build, loopback audio permissions) → PowerShell fallback for the foreground app; paste-transcript fallback for meetings.
- **LLM JSON / hallucination** → zod + repair retry + null-for-missing + verbatim evidence check; replay for the demo.
- **localStorage is per browser** → single-browser demo with role switcher + "Reset demo data"; Collector data lives server-side.
- **Serverless has no disk** → Upstash on Vercel, file store locally.
- **Merge conflicts** → strict ownership; only A edits `types.ts`/root deps; Collector has its own lockfile.
- **OpenAI credit / rate limit** → budget cap in OpenAI project, NVIDIA fallback, replay.
- **Surveillance perception / personal data** → opt-in toggles, no titles/content/names sent, k≥5, Privacy panel, clear "what we don't collect" in README and pitch.
