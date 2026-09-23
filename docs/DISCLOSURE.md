# Disclosure of tools and prepared materials

HackAlem AI regulations require teams to disclose third-party materials, models and tools (clause 5.4.4) and allow prepared development tools and templates as long as the core functionality is built during the competition (clause 5.4.4.2). This file keeps that disclosure in one place. Libraries added to the product are listed in the README "Third-party components" table.

## Product code

All product code in this repository is written during the competition window, 23 September 2026, 13:00-18:00 Astana time. No code from earlier projects of team members is copied into the product.

## AI development tools

| Tool | Used by | Purpose |
|---|---|---|
| Claude Code (Anthropic) | Team members | Writing and reviewing code, tests, documentation |
| OpenAI Codex | Team members | Writing and reviewing code; drawing the SVG illustrations in `src/components/illustrations` from our brief |

## AI models used by the product

| Model / API | Provider | Purpose |
|---|---|---|
| gpt-4.1-mini | OpenAI | Clarifying questions, card assembly, technical documentation, recommendation reasons (JSON, zod-validated) |
| gpt-4.1 | OpenAI | Discover: insights with cited evidence from meetings and activity aggregates |
| gpt-4o-transcribe (fallback whisper-1) | OpenAI | Transcription of Collector meeting audio chunks |
| meta/llama-3.3-70b-instruct | NVIDIA (build.nvidia.com, OpenAI-compatible API) | Text fallback when OpenAI is unavailable |
| gpt-realtime, gpt-4o-mini-transcribe | OpenAI (Realtime API over WebRTC) | Voice interview on the clarify step and its live captions |

## Materials prepared before the competition (not product code)

| Material | What it is |
|---|---|
| Agent instructions and team rules in `.claude/` | Rules for AI coding agents: hackathon compliance, collaboration, commit cadence |
| Legal research notes | Summaries of Kazakhstan public law (Administrative Procedural and Process Code, law on public services) used as domain knowledge |
| Design notes | Stack, font and UI guidelines (fonts with full Kazakh alphabet support) |
| Prompt drafts | Draft prompts for case analysis and README review |

Official texts of laws are public documents and are cited from their official sources.

## Fonts, icons and images

| Asset | Source | License |
|---|---|---|
| Rubik (interface), Tektur (logo) | Google Fonts, loaded at runtime | SIL Open Font License 1.1 |
| lucide-react icons | npm package | ISC |
| Logo, favicon, Collector tray and app icons | Drawn by the team during the event (icons rendered with Pillow) | Ours |

## Legal texts

The legal documents in `src/content/legal` (terms, privacy policy, personal data consent, rating rules, AI notice, collaboration agreement, in Kazakh, Russian and English) were written during the event by Islam Shagatayev with AI assistance, based on public laws of the Republic of Kazakhstan.

## Data

Demo data is synthetic. No real personal data (ИИН, names, addresses of real people) is stored in this repository.
