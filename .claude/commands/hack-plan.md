---
description: Lead only — turn the task spec into docs/PLAN.md, then scaffold the project
argument-hint: <paste the task spec, or a path/URL to it>
---
You are the lead (role A). Task spec: $ARGUMENTS

Target: PLAN.md pushed by ~13:30, scaffold pushed by ~13:50 (Astana time, UTC+5).

## Phase 1 — Plan (no code yet)

1. Read the spec. Pull out: required functionality, mandatory technologies, deliverables, and **the technical evaluation criteria and point breakdown**.
2. Propose 1–2 solution ideas in a few lines each, with a recommendation. Weigh them against the spec's technical criteria and the Demo Day criteria (value 25, result quality 20, innovation 15, scalability 20, presentation 20). Wait for the team to pick one.
3. Write `docs/PLAN.md` with exactly these sections:
   1. **Task** — summary, must-haves, scoring criteria, deadline.
   2. **Solution** — the problem, who it's for, the value; what is new about it; how it scales.
   3. **Stack** — default: TypeScript + Next.js (App Router) + OpenAI SDK (OpenAI primary, NVIDIA fallback via `baseURL`), deployed on Vercel via the CLI (`vercel deploy --prod`). Pick concrete model IDs for each provider here. Use Python/FastAPI + React only if the task is data/ML-heavy. One line on why.
   4. **Architecture** — ASCII diagram plus a list of components.
   5. **Contracts** — exact types / JSON shapes for every boundary between roles: API endpoints (method, path, request, response), tool interfaces, the agent step/event log format. These are what everyone codes against.
   6. **File ownership map** — every directory/file → A, B or C. Mark shared files as "contract — change by agreement".
   7. **Dependencies** — the full list; all of them get installed during the scaffold.
   8. **Tasks by role** — checkboxes per role, grouped by hour: H1 13–14, H2 14–15, H3 15–16, H4 16–17, H5 17–18 (freeze, README, final push). Every task names the files it touches. Every hour has a pushable result for every role.
   9. **Integration points** — when and how the pieces connect, and what each role mocks until then.
   10. **Golden-path demo script** — the exact steps and inputs of the demo. This is what replay mode records.
   11. **Cut list** — what to drop first if we fall behind.
   12. **Risks.**

   Default role split (adjust to the task):
   - **A (lead):** agent core, LLM wrapper with record/replay, backend/API, dependencies, deployment.
   - **B:** tools/integrations, data, replay fixtures for the golden path.
   - **C:** frontend UI, agent-trace visualization, README and pitch materials.
4. Commit and push PLAN.md right away (it counts as hour-1 progress). Show the team the ownership map and contracts and ask them to confirm.

## Phase 2 — Scaffold (after the team confirms)

1. Create the project skeleton from the plan and install **all** dependencies from PLAN.md in one go.
2. Write the contract files (shared types, API shapes) and mock data.
3. Create the LLM wrapper: OpenAI SDK with `LLM_PROVIDER=openai|nvidia` switching `baseURL` and key, `DEMO_MODE=live|record|replay` (falls back to replay when no key is set), provider fallback on rate-limit/credit errors, model IDs in one constant, and structured step logging.
4. Create a stub file for every owned area so each role only edits its own files from here on.
5. Add `.env.example` (every var, with a comment): at least `LLM_PROVIDER`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `DEMO_MODE`.
6. Write a README skeleton with all the sections the regulations require plus an empty "Third-party components" table.
7. Verify that install, dev server and typecheck all work. Commit and push.
8. Finish by printing the kickoff lines for teammates: `git pull`, start `claude`, run `/role B` or `/role C`.
