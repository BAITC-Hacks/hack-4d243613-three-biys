# Hackathon compliance (HackAlem AI — breaking these can disqualify us)

Competition window: **13:00–18:00 Astana time (UTC+5), 23 Sep 2026.** Whatever is in the repo at 18:00 is the final submission; nothing pushed later counts.

- **Hourly progress is mandatory.** Any hour without visible progress can disqualify the team. Commit and push a working increment at least every 30–40 minutes. If it has been longer, say so.
- **This repo only.** All development happens here. Never build in another repo and copy the code in.
- **Git history is evidence.** Experts inspect history and each person's contribution. Never force-push, rebase/squash/amend already-pushed commits, or rewrite history. Commit messages say what changed.
- **Core is built during the event.** Never paste a large pre-existing solution as the core of the project. Libraries and generic boilerplate are fine.
- **Disclose third-party components.** When adding a library, model, API, dataset, template or copied snippet, add a row (name, purpose, license) to the README "Third-party components" table in the same commit.
- **README is pass/fail.** If experts can't run the project by following the README, we are eliminated with no chance to fix it. Keep it accurate as features land. It must cover: purpose, architecture, tech stack, install, run, dependencies, env vars, and how to verify the main scenario.
- **Runnable without our accounts.** The main scenario must work (a) on the hosted demo URL, (b) with the reviewer's own `OPENAI_API_KEY` (or `NVIDIA_API_KEY`), and (c) with `DEMO_MODE=replay` and no key at all. Never break replay mode.
- **Secrets.** Never commit API keys, `.env`, credit/activation codes, or anyone's registration code. Every env var is listed with a comment in `.env.example`. No real personal data in fixtures or seed files.
- **No attacks.** Nothing that scans, probes or interferes with other teams, the venue network or organizer platforms.

Endgame: **17:00** feature freeze → README + fresh-clone test (`/submit-check`) → **17:45** final push → nothing risky after that.
