# Көпір demo script (5 minutes)

Owner: B (Islam). Source of truth for the order: `docs/PLAN.md`, §10. This file adds what to say, what to click and the prepared answers.

## Before the demo (checklist)

- [ ] Hosted demo open: https://taskforge-app-chi.vercel.app, browser zoom 110%, one tab only.
- [ ] Demo data reset (role switcher menu, "Reset demo data"). The first visit shows the consent window: accept it once before the demo.
- [ ] Microphone allowed in the browser for the voice interview (test one phrase).
- [ ] Windows laptop: Collector running, signed in to the same server, team "Sales", tracker on.
- [ ] Zoom or Meet open on the laptop for the meeting notes step (speakers on).
- [ ] This file open on a phone for the answers below.
- [ ] Fallback ready: if the AI API fails, the server runs in `DEMO_MODE=replay` (see README).

## Script

The spec's mandatory flow first (steps 1 to 7, about 3.5 minutes), then the Collector and Discover boost (steps 8 and 9, about 1 minute). The right column says which scoring criterion the step proves.

| # | Click | Say (one line) | Criterion |
|---|---|---|---|
| 0 | Landing `/` | "Көпір means bridge in Kazakh: between a business task and a student team." | Demo |
| 1 | Describe a task, paste the weak draft | "This is how businesses really write tasks: one vague sentence." | End-to-end |
| 2 | Start the AI interview, answer by voice or text | "The AI does not invent. It asks only about what is missing, sorted by points." | AI, card quality |
| 3 | Card editor: confirm fields, watch the rating | "Points only for fields the business confirmed. The rating is a formula, not the AI's mood." | Gamification |
| 4 | Next best action: add success criteria and contact | "Draft, Working, Ready: every level moves the task up the catalog." | Gamification |
| 5 | Tech docs, confirm, Publish | "Students get a technical spec, not a paragraph." | Card quality, catalog |
| 6 | Switch to Student "DataCraft", open the project, send a proposal | "Teams see why a project fits them and propose idea, plan, deadline and prototype link." | Catalog and proposals |
| 7 | Switch to Business, compare, Accept one, Reject one with a reason | "The business decides manually. The AI never picks the team." | Catalog and proposals |
| 8 | Milestone confirmed, points to the team, leaderboard | "Students earn points only after the business confirms a milestone." | Gamification |
| 9 | Windows Collector: Collect tab, Start recording, one sentence, Stop | "Businesses cannot describe their pain. The Collector sees it: app switching and meetings." | AI, tech quality |
| 10 | Discover: Analyze, insight with a quote, Start a draft | "Every insight has evidence. Nobody is identified: groups of 5 or more only." | AI |
| 11 | Suggestion chip accepted, +20 points | "The Collector earns the points businesses usually cannot." | Gamification |

The rating numbers on screen depend on the live formula. Do not promise exact values; say "watch it grow".

## Prepared answers (copy or say aloud)

Written to pass every quality check of the rating formula (`src/lib/rating/index.ts`).

**Weak draft (step 1):**
Our sales team wastes time moving orders from Excel to the CRM. We want to automate it.

**Context:**
Dealers send orders as Excel files by email, and 6 sales managers retype each order into the CRM by hand, about 40 orders a day at 10 minutes each.

**Need:**
We need to automate the import of dealer orders from Excel into the CRM and stop duplicate orders.

**Data and materials:**
An anonymized Excel export of 200 past orders (xlsx), the CRM API documentation and a sandbox CRM account for testing.

**Expected result:**
A working prototype: an import script or small service that reads the Excel order file, validates it and creates orders in the CRM through its API, with an error report.

**Success criteria:**
Manual entry time cut by 80% (under 2 minutes per order), zero duplicate orders in a test week, at least 95% of test orders imported without manual fixes.

**Constraints:**
Prototype within 6 weeks, Python or Node.js, sandbox CRM access only, no access to production customer data.

**Users:**
6 sales managers and the head of sales at QazCargo.

**Contact and format:**
Head of sales, a weekly 30-minute Zoom call and a Telegram chat for quick questions.

**Meeting sentence for the Collector (step 9):**
"Dealer orders arrive as Excel files and we retype them into the CRM by hand, about forty a day."

## The legal moment (15 seconds, Islam)

Show one thing, say one line: "Built for Kazakhstan law from day one."
- First visit consent window: terms and personal data consent, required checkboxes (Law of the Republic of Kazakhstan "On personal data and their protection").
- Documents in Kazakh, Russian and English: KK and RU are legally binding, EN is marked as a translation.
- "Prepared with AI" banner next to every AI result until a person confirms it (AI transparency).
- Collector: consent before the download and on first run, window titles and content never leave the computer.

## If something breaks

- AI API down: switch the server to `DEMO_MODE=replay`, the golden path is recorded.
- Voice interview fails (mic, network): press "Switch to text chat" and paste the answers above.
- Windows laptop or network fails: skip step 9, Discover still works on the 4-week seed data.
- Wrong state: role switcher menu, "Reset demo data", start again from step 1.

## Likely questions from the jury

- **How is the rating computed?** A deterministic formula with 7 components and transparent checks. Points count only for fields the business confirmed. The AI never sets the score.
- **What stops the AI from inventing facts?** Every card field is traced to the draft or an answer; anything not stated stays empty and is marked "not stated".
- **Does the AI choose the team?** No. It can recommend projects to students, but the business accepts or rejects manually.
- **What about privacy in the Collector?** Only app categories and anonymous events are sent, patterns need 5 or more people, consent is required and can be withdrawn in the app.
- **Why would a business care about points?** The rating is its position in the catalog: better cards get better teams faster.
- **How does it scale?** Pluggable sources (roadmap: Slack, email, CRM, macOS), any university or accelerator can run its own catalog, the rating formula is config.
