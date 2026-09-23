---
slug: rating-rules
lang: en
title: Catalog and Rating Rules
version: "0.1"
updated: "2026-09-23"
status: draft
source: src/lib/rating/index.ts
legalNote: "This English version is provided for convenience only. The Kazakh and Russian versions are legally binding and have equal force. In case of any discrepancy, the Kazakh and Russian versions prevail."
---

# Catalog and Rating Rules

The readiness rating shows how ready a task is for work with students. It is calculated by software under an open formula, without AI. The formula matches the code in `src/lib/rating/index.ts`.

## 1. Key principles

- The rating assesses the readiness of a specific task. The fame, size and status of a company do not affect it.
- Points are awarded only for fields that are filled in and confirmed by the business representative. A field counts as filled if it has at least 8 characters.
- The rating is recalculated right after every confirmed change to the card.
- A low rating does not hide a task and does not block proposals.
- The rating affects the task's position in the catalog. Only the business chooses the team for a task.

## 2. How the 100 points add up

| Component | Max | Base points for a filled and confirmed field | Extra points for quality |
|---|---|---|---|
| Context and need | 20 | Context +8, need +8 | Context describes the current situation in at least 12 words +2. Need says what must change, for example automate, reduce, replace +2 |
| Data and materials | 20 | +14 | Names concrete sources or examples: Excel or CSV export, API, database, sample, report +6 |
| Expected result | 15 | +10 | Names a concrete deliverable: service, script, bot, report, dashboard, prototype +5 |
| Success criteria | 15 | +7 | The criterion is measurable: it has a number, percentage, deadline or threshold +8 |
| Constraints | 10 | +6 | States a deadline, technology or access limits +4 |
| Users | 10 | +7 | Users are specific: a role or their number is named +3 |
| Business contact | 10 | +6 | Names a contact person and the format of consultations, for example a weekly call or a chat +4 |

Extra points are also awarded only after the field is confirmed.

## 3. Readiness levels

| Points | Level | Meaning |
|---|---|---|
| 0-39 | Draft | The task is visible in the catalog with a "needs clarification" mark |
| 40-69 | Working | Teams may send proposals, the system may recommend the task |
| 70-89 | Ready | The task gets a boosted position in the catalog |
| 90-100 | Priority | The task is fully ready for work and highlighted in the catalog |

## 4. Order in the catalog

4.1. By default, tasks are sorted by rating from highest to lowest. The user can switch the sorting to "newest first".

4.2. For sorting, tasks at the Ready level get a boost of 10 and tasks at the Priority level a boost of 20. The task's rating itself does not change.

4.3. If the values are equal, the task published later comes first.

4.4. All published tasks are available in the catalog. Filters by topic and readiness level only help to search.

## 5. Hints and rating growth

5.1. Under the rating, the platform shows which information would raise it and how many points each action gives. Hints are ordered by the size of the gain.

5.2. The platform shows the task's current position in the catalog and the position it will take after the next action.

5.3. Vague wording such as "as soon as possible", "etc.", "improve efficiency", "better" or "faster" is highlighted with a question asking to be specific. No points are deducted for it. Extra points for quality require specifics: a number, a source, a deadline.

## 6. Recommendations to teams

6.1. The system may recommend tasks at the Working level and above to teams. Recommendations are based on the team's interests, skills and technologies.

6.2. Recommendations do not restrict the catalog. A team sees all tasks and may send a proposal on any of them.

## 7. Proposals and choice

7.1. The number of proposals on a task is not limited.

7.2. The business compares the proposals and chooses one team, several teams or none. Automatic assignment of a team is prohibited.

## 8. Team points

A team earns points only for milestones whose completion the business has confirmed. Points reflect actual progress and are not money.
