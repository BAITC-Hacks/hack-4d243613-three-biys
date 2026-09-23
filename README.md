# TaskForge — Three Biys · HackAlem AI, track "AI Sana: gamification of practical tasks"

TaskForge helps a business turn a rough description of a need into a complete, rated task card, publishes it to an open catalog ranked by readiness, lets student teams submit proposals, and lets the business choose manually. A Windows companion app (the Collector) gathers anonymized work signals so the business can discover *which* problems are worth giving to students.

> Status: scaffold. Sections marked _TODO_ are filled in as features land.

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
npm test           # vitest smoke tests
```

### Modes

| Situation | What to set |
|---|---|
| Hosted demo | _TODO: Vercel URL_ |
| Your own key | `OPENAI_API_KEY=...` (or `NVIDIA_API_KEY=...` with `LLM_PROVIDER=nvidia`) |
| No key at all | leave keys empty → `DEMO_MODE=replay` is used automatically; the main scenario runs from `fixtures/replay/` |

## Environment variables

All variables are listed with comments in [`.env.example`](.env.example). Keys are used server-side only and never sent to the browser.

## How to verify the main scenario

_TODO (A/C): step-by-step golden path (see `docs/PLAN.md` §10)._

## Rating formula

_TODO (A): copied from `src/lib/rating/index.ts` once implemented._ Points are given only for fields that are filled **and confirmed** by the business; the rating is recalculated after every confirmed edit.

| Component | Max |
|---|---|
| Context & need | 20 |
| Data & materials | 20 |
| Expected result | 15 |
| Success criteria (measurable) | 15 |
| Constraints | 10 |
| Users | 10 |
| Business contact & format | 10 |

Levels: 0–39 draft · 40–69 working · 70–89 ready · 90–100 priority. A low rating never hides a task or blocks proposals.

## Catalog rules

_TODO (A/C)._

## AI feature: prompts, input/output format, invalid-response handling

_TODO (A): prompts live in `src/prompts/*.md`; every response is validated with zod (`src/lib/schemas.ts`); one repair retry, then a structured error. The AI never adds facts the user did not state (missing → `null`)._

## Test scenarios

_TODO (A/C)._

## Windows Collector

_TODO (A/B): what it collects, what it never collects, how to run (`cd collector && npm install && npm start`)._

## Dependencies

See `package.json` (web) and `collector/package.json` (Collector). Install with `npm install` in each directory.

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
