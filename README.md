# TaskForge — Three Biys · HackAlem AI, track "AI Sana: gamification of practical tasks"

TaskForge helps a business turn a rough description of a need into a complete, rated task card, publishes it to an open catalog ranked by readiness, lets student teams submit proposals, and lets the business choose manually. A Windows companion app (the Collector) gathers anonymized work signals so the business can discover *which* problems are worth giving to students.

> Status: working demo. Sections marked _TODO_ are still being filled in.

## For judges — how to check TaskForge

### 1. Web app (no install)
Open **https://taskforge-app-chi.vercel.app** and use the role switcher in the header (Business / Student).
Golden path: Business → New task → type a short draft → AI questions → card + live rating → Tech docs → Publish → switch to Student → project page → send a proposal → switch to Business → My tasks → accept / reject → confirm milestone. Full steps: [How to verify the main scenario](#how-to-verify-the-main-scenario).

### 2. Web app locally (optional)
Requires Node.js 20+.
```bash
npm install
npm run dev            # http://localhost:3000
```
- **No API key needed:** without `OPENAI_API_KEY` the app runs in replay mode (recorded AI responses), so the whole scenario works offline.
- **Live AI:** copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.
- **Production build check:** `npm run build && npm start`.

### 3. Windows Collector (data collection app)
Requires Windows 10/11 and Node.js 20+. **Double-click `run-collector.bat`** in the repo root, or:
```bash
cd collector
npm install
npm start
```
The app opens with a consent screen, then starts collecting. It is **preconfigured** to send to the hosted demo (`https://taskforge-app-chi.vercel.app`) with the public demo token `12345` — nothing to set up.
- **Activity tracker:** on the Collect tab, turn it on. It sends app categories and copy-paste transfers only — no window titles, no content, no names.
- **Meeting notes:** press **Start meeting notes**, speak for 20–30 seconds (or play a Zoom call), then **Stop** — the transcript appears in the app.
- **See it in the web app:** open **Business → Discover** and press **Analyze** — insights from your live meeting appear first, with the exact quote as evidence.
- **Privacy:** activity from a single computer is intentionally hidden (patterns need at least 5 people); the Privacy panel shows this.
- **Local server instead:** Collector → Settings → Server address `http://localhost:3000` (a local server accepts any token when `INGEST_TOKEN` is not set).

> The demo token is public on purpose so the Collector works with zero setup; it only allows sending anonymized demo data. For a real deployment set your own `INGEST_TOKEN` on the server and in Collector Settings.

## Team

- Alibek (omertaevalibekai)

## Status

Work in progress.

## Purpose

_TODO (B): product description._

## Architecture

```
Windows Collector (Electron, collector/) ──HTTPS + Bearer INGEST_TOKEN──▶ Next.js API (src/app/api/**)
                                                                        │  storage: Upstash Redis | .data/*.json
Browser (Next.js App Router, src/app/**) ──api-client.ts──▶ /api/ai/*  → LLM wrapper (OpenAI → NVIDIA → replay) → zod
   store: zustand + localStorage (cards, teams, proposals, milestones)     rating: deterministic code (src/lib/rating)
```

Details: `docs/PLAN.md` (§4 architecture, §5 contracts).

## Tech stack

TypeScript · Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · zod · zustand · OpenAI SDK (OpenAI + NVIDIA via OpenAI-compatible API) · Electron (Collector) · vitest.

## Install

```bash
git clone <this repo>
cd hack-4d243613-three-biys
npm install
cp .env.example .env.local   # fill in keys, or leave empty for replay mode
```

## Run

```bash
npm run dev        # http://localhost:3000
npm run build && npm start   # production build
npm run typecheck  # tsc --noEmit
npm test           # vitest: rating engine + evidence verification
npx tsx scripts/check-seed.ts   # validates seed JSON against the contracts and prints each card's rating
```

### Modes

| Situation | What to set |
|---|---|
| Hosted demo | **https://taskforge-app-chi.vercel.app** (live OpenAI; Collector data stored in Upstash Redis) |
| Your own key | `OPENAI_API_KEY=...` in `.env.local` (or `NVIDIA_API_KEY=...` with `LLM_PROVIDER=nvidia`) |
| No key at all | leave keys empty → `DEMO_MODE=replay` is used automatically; the main scenario runs from `fixtures/replay/` |

`DEMO_MODE=record` calls the provider and saves every validated response as a fixture; `replay` never calls a provider and falls back to the latest fixture of an endpoint when the exact input differs (so a different draft still gets a coherent, clearly labelled replay answer).

## Environment variables

All variables are listed with comments in [`.env.example`](.env.example). Keys are used server-side only and never sent to the browser.

## How to verify the main scenario

Works identically on the hosted URL, with your own key, or with no key (replay). Company in the demo: **QazCargo** (synthetic logistics SME).

1. **Business → New task.** Paste the weak draft: *"Our sales team wastes time moving orders from Excel to the CRM. We want to automate it."* Vagueness flag appears on "automate it". Click **Clarify**.
2. At least 3 questions appear, sorted by rating gain ("+20 data & materials", …). Answer them (any text; suggested answers in `docs/DEMO.md`). Click **Build card**.
3. The card shows every field with its source badge (draft / answer) and **"not stated"** for fields you did not cover. Confirm fields one by one — the rating panel recalculates after each confirm, shows the breakdown, the checks (✓/✗ with rule text), **Next best actions** and the **catalog position preview** ("#N of M → #K if you add measurable success criteria").
4. Add *"Cut manual entry time by 80%, zero duplicate orders"* as success criteria and a contact ("Head of sales, weekly 30-min call") → confirm → rating rises into **ready** (≈ 88) with a level-up toast.
5. **Tech docs** tab → **Generate** → edit a line → **Confirm** → **Publish**. **Catalog** now lists the task at the position given by its rating; a draft-level seed task is still visible with its flag.
6. Switch role to **Student** (team *DataCraft*) → **Projects you can take** shows the task with a reason → open it → read the technical documentation → **Submit proposal** (idea, plan, deadline, prototype link; the form checks completeness).
7. Switch to **Business → My tasks** → compare proposals side by side → **Accept** DataCraft, **Reject** the seeded one with a reason → add milestone "Import script prototype" → **Confirm** → DataCraft gets points → **Leaderboard** on the student side.
8. *(Boost story)* **Business → Discover** → **Analyze** → insights with verbatim evidence (meeting quotes + "142 Spreadsheet→CRM transfers, 6 contributors") → **Use as draft** → accept the suggested "Data & materials" text → confirm → +20 points.

API-level check (no browser):

```bash
curl -s localhost:3000/api/health
curl -s -X POST localhost:3000/api/ai/clarify -H 'content-type: application/json' \
  -d '{"draftText":"Our sales team wastes time moving orders from Excel to the CRM. We want to automate it."}'
```

## Rating formula

Implemented in `src/lib/rating/index.ts` (pure, deterministic code — no AI; tests in `tests/rating.test.ts`). Points are given **only for fields that are filled AND confirmed** by the business; the rating is recalculated after every confirmed edit.

| Component | Max | Base (filled + confirmed) | Quality check (also needs confirm) |
|---|---|---|---|
| Context & need | 20 | context 8 + need 8 | context ≥ 12 words (+2); need contains a change verb such as automate/reduce/replace (+2) |
| Data & materials | 20 | 14 | names concrete sources: files, systems, samples, API, access (+6) |
| Expected result | 15 | 10 | names a deliverable: script, service, dashboard, bot, report… (+5) |
| Success criteria | 15 | 7 | measurable: a number, %, time or threshold (+8) |
| Constraints | 10 | 6 | deadline, technology or access limits (+4) |
| Users | 10 | 7 | role and/or count (+3) |
| Business contact & format | 10 | 6 | contact role and consultation format (+4) |

`total = Σ points (max 100)`. Levels: **0–39 draft** (visible, flagged) · **40–69 working** (proposals + recommendations allowed) · **70–89 ready** (boosted position) · **90–100 priority** (highlighted). A low rating never hides a task or blocks proposals.

The engine also returns, for the UI: `checks` per component (label, passed, points, rule text), `nextActions` (missing items sorted by gain, e.g. "+15 Include a number, %, time or threshold"), `vagueness` flags (code rules for "ASAP", "etc.", "some data", "improve efficiency", "automate it", "better/faster"), `positionPreview` (current catalog rank and the rank after the top next action) and a `history` of totals on the card.

## Catalog rules

`getCatalog` (`src/lib/catalog.ts`) shows **only published** cards; **every** published task is visible to every team. One ordering rule, `catalogSortKey` in `src/lib/rating`: `rating + boost` descending, where boost = +20 for priority, +10 for ready, 0 otherwise; ties → newer first. Filters: topic and level. Draft-level tasks stay in the catalog with a "needs clarification" flag.

**Recommendations** (`matchTasks`): rule-based overlap of the team's interests/skills/tech with the task's topic and `skillsNeeded`, only for tasks at level ≥ working, with a reason per match ("Your team knows Python · task needs Python"). Recommendations never restrict the catalog. **Proposals** are unlimited; the business accepts one, several or none — manually. Nothing assigns a team automatically. **Points** for teams come only from milestones the business confirms.

## AI feature: prompts, input/output format, invalid-response handling

All model calls go through one wrapper, `src/lib/llm/index.ts`. Prompts are files in `src/prompts/*.md`. Model IDs live only in `src/lib/llm/models.ts` (verified against the provider list on 23 Sep 2026: `gpt-4.1-mini` for clarify/card/techspec, `gpt-4.1` for discover, `gpt-4o-transcribe` → `whisper-1` for audio; NVIDIA fallback `meta/llama-3.3-70b-instruct`).

| Endpoint | Input (JSON) | Output `data` (JSON, zod-validated) |
|---|---|---|
| `POST /api/ai/clarify` | `{ draftText, industry?, fields? }` | `{ extracted: CardFields (null = not stated), questions[≥3]: { id, field, question, why, gain } }` — `gain` is filled by the rating engine, not the model, and questions are sorted by it |
| `POST /api/ai/card` | `{ draftText, answers: [{ questionId, field, question, answer }] }` | `{ fields: CardFields, fieldSource: { field: 'draft' \| 'answer' } }` |
| `POST /api/ai/techspec` | `{ fields: CardFields }` | `{ techSpec: { summary, scope[], dataInputs[], functionalRequirements[], nonFunctional[], acceptanceCriteria[], suggestedStack[], openQuestions[] }, skillsNeeded[] }` |
| `POST /api/ai/discover` | `{ period: { from, to } }` | `{ insights: [{ title, problem, affectedTeam, frequency, impact, suggestedSolutionType, evidence[], draftText, suggestedFields }], dropped }` |

Every response is the envelope `{ ok: true, data, trace } | { ok: false, error: { code, message }, trace }` where `trace` lists every step (`llm_call` with prompt, input, output; `validation` with errors; `error`) — the UI shows it in the "How the AI works" panel.

**No invented facts.** The prompts require `null` for anything the user did not state; the server additionally drops any clarify extraction whose words are not found in the draft, empties card fields whose answer was "-" / "no" / "don't know", and in Discover keeps a quote only if it is a **verbatim substring** of the cited meeting transcript and a metric only if its numbers exist in the cited weekly aggregate (`src/lib/ai/evidence.ts`, tests in `tests/evidence.test.ts`). Insights without verifiable evidence are dropped and counted in `dropped`; suggested field texts are kept only when grounded in the cited evidence.

**Invalid responses.** Non-JSON or schema-invalid output → one repair retry with the zod errors sent back → if still invalid, `error.code = 'LLM_INVALID'`. Rate limit / auth / network → the other provider → the replay fixture → `error.code = 'LLM_UNAVAILABLE'`. Bad request bodies → `'BAD_INPUT'` with the field errors. The browser talks to the API only through `src/lib/api-client.ts`; API keys never reach the browser.

## Test scenarios

Automated: `npm test` (unit) and `scripts/smoke-replay.sh [baseUrl]` (golden path over the API; passes with no key in replay mode and against the hosted URL).

| # | Scenario | Expected |
|---|---|---|
| 1 | Empty card | rating 0, level draft, 7 next actions, top gain +20 (`npm test`) |
| 2 | All fields filled, none confirmed | rating 0; every next action starts with "Confirm" |
| 3 | Full card confirmed | ≥ 90, priority |
| 4 | Success criteria without a number | component loses 8 points, hint "Include a number, %, time or threshold" |
| 5 | Draft with "ASAP" / "automate it" | vagueness flags with a concrete ask |
| 6 | Confirm a field | rating recalculated, history entry added, position preview updates |
| 7 | Clarify on the weak QazCargo draft | ≥ 3 questions, first is data (+20); nothing extracted that the draft does not say |
| 8 | Card with an answer "-" | that field is `null`, no source badge |
| 9 | Discover on the seed period | insight "orders re-typed from Excel into the CRM" with meeting quotes that are verbatim + metric "142 Spreadsheet→CRM transfers, 6 contributors"; fabricated quotes are dropped (`tests/evidence.test.ts`) |
| 10 | No API key, `DEMO_MODE=replay` | all four AI endpoints answer from fixtures; `/api/health` reports `mode: replay` |
| 11 | Ingest with a wrong token | `401 UNAUTHORIZED`; with the right token `{ accepted: n }` and `/api/sources.live.devices` increases |
| 12 | Catalog | published only, sorted by rating with ready/priority boost; draft-level task visible with flag; filters by topic and level |
| 13 | Proposals | unlimited per task; accept several / reject with reason; team points appear only after a confirmed milestone |

## Windows Collector

`collector/` is a separate Electron app (own `package.json`) that a business installs **opt-in**. It sends anonymized work signals to `/api/ingest/*` with `Authorization: Bearer INGEST_TOKEN`.

```bash
cd collector && npm install && npm start     # builds TypeScript and launches the tray app (Windows)
# or double-click run-collector.bat in the repo root
```
Defaults: server `https://taskforge-app-chi.vercel.app`, demo token `12345`, team `Sales` — change them in the Settings tab (server URL, access token, team). Toggles **Activity tracker** and **Meeting notes**; "Test connection" calls `/api/health`. A portable `.exe` can be built on Windows with `npm run dist` (output `collector/release/`).

**What it collects:** the *category* of the foreground app every 2 s (CRM / Spreadsheet / Email / Messenger / ERP / Docs / Browser / Meeting / Other), app switches, and copy→switch pairs counted as a *transfer* between categories; meeting audio (system loopback + mic) in 30 s chunks that are transcribed on the server and discarded.

**What never leaves the machine:** window titles, document/clipboard content, URLs, names. The device id is a hash; the server hashes it again and the aggregator (`src/lib/discover/aggregate.ts`) drops it, reporting only team-week aggregates with **≥ 5 contributors** (`k = 5`). `/api/sources.privacy` shows raw events, individuals identified (always 0), suppressed patterns and suppressed teams.

Serverless note: on Vercel, Collector data persists in Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN`, or the `KV_REST_API_URL/TOKEN` names added by Vercel's Upstash integration); without them it lives in memory per instance. Locally it is stored in `./.data/*.json`.

## Dependencies

Web: `package.json` (`npm install`). Collector: `collector/package.json` (`cd collector && npm install`). Node 22 is used; Node ≥ 20 works.

## Third-party components

| Name | Purpose | License |
|---|---|---|
| Next.js | Web framework | MIT |
| React | UI library | MIT |
| Tailwind CSS | Styling | MIT |
| zod | Schema validation | MIT |
| zustand | Browser state store | MIT |
| openai (Node SDK) | Calls OpenAI and NVIDIA (OpenAI-compatible) APIs | Apache-2.0 |
| @upstash/redis | Server store on Vercel | MIT |
| nanoid | IDs | MIT |
| clsx | Class names | MIT |
| lucide-react | Icons | ISC |
| vitest | Tests | MIT |
| tsx | Run TS scripts | MIT |
| Electron | Windows Collector app | MIT |
| get-windows | Foreground window detection in the Collector | MIT |
| OpenAI models (gpt-4.1-mini, gpt-4.1, gpt-4o-transcribe) | AI clarify/card/techspec/discover/transcription | OpenAI terms |
| NVIDIA build.nvidia.com (meta/llama-3.3-70b-instruct) | Fallback text model | NVIDIA / Llama 3.3 license |

See also `docs/DISCLOSURE.md`.
