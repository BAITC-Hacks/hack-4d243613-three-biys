---
description: Pre-submission check (from 17:00) — fresh clone, follow README literally, compliance audit
---
Report problems first; fix only after the user agrees. Final push must happen by 17:45 Astana time.

1. Is the working tree clean and fully pushed to `origin/main`?
2. Clone `origin` fresh into a temp directory. Follow the README **literally**, using no knowledge that isn't in it: install, copy `.env.example` with no API key, run with `DEMO_MODE=replay`, walk through the golden path. Record every step where the README was wrong, vague or missing something.
3. If `OPENAI_API_KEY` (or `NVIDIA_API_KEY`) is available in the environment, also test live mode. Check that the hosted demo URL in the README loads.
4. The README must contain: purpose, architecture, tech stack, install, run, dependencies, env vars, how to verify the main scenario, the demo URL, and the third-party table.
5. Secrets scan across all history: `git log -p --all` for `sk-`, `sk-proj-`, `nvapi-` and similar key patterns, and check that no `.env` file is tracked.
6. Compare the dependency manifest with the "Third-party components" table and list anything missing.
7. Output a PASS/FAIL checklist with a concrete fix for each FAIL.
