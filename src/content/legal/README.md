# Legal content for Көпір

Legal texts for the platform, written during the hackathon (23 Sep 2026) by Islam Shagatayev (lawyer, role B). Texts are in Russian, Kazakh and English (see Languages). Content only, no code: render it with one `LegalPage` component in the app's design.

## Files

| File | Slug | Where it is used in the app |
|---|---|---|
| `terms.md` | `terms` | Footer link; required checkbox before publishing a task and before sending a proposal |
| `privacy.md` | `privacy` | Footer link; linked from the consent checkbox |
| `consent.md` | `consent` | Checkbox text (`checkboxLabel` in frontmatter) + full text on click |
| `rating-rules.md` | `rating-rules` | Page "How the rating works"; link next to the rating ring. Must stay in sync with `src/lib/rating/index.ts` |
| `ai-notice.md` | `ai-notice` | Banner next to every AI suggestion (`bannerText` in frontmatter) + full page |
| `collaboration-agreement.md` | `collaboration-agreement` | Generated when the business accepts a team, from the options chosen in `clauses.json` |
| `clauses.json` | | "Collaboration terms" block in the task card: one option per group |

Every `.md` file starts with YAML frontmatter: `slug`, `title`, `version`, `updated`, `status`, plus optional `checkboxLabel`, `bannerText`, `template`, `source`.

## Languages

| Folder | Language | Legal force |
|---|---|---|
| root (`*.md`, `clauses.json`) | Russian (`lang: ru`) | Binding |
| `kk/` | Kazakh (`lang: kk`) | Binding, equal to Russian |
| `en/` | English (`lang: en`) | Convenience translation only, no legal force |

Every language version has the same `slug`, file names and clause `id`s. Every file has a `legalNote` in its frontmatter (in `clauses.json` it is a top-level field). Show it as a notice above the document. `checkboxLabel` and `bannerText` exist in each language.

## Placeholders

Values in `{{...}}` are filled by the app at render time. Anything not filled must render as an empty highlighted field, never as invented data.

| Placeholder | Meaning |
|---|---|
| `{{operatorName}}`, `{{operatorBin}}`, `{{operatorAddress}}`, `{{operatorEmail}}` | Platform operator details. Unknown for the MVP: show "будет указано при запуске" |
| `{{siteUrl}}`, `{{effectiveDate}}` | Deployed URL and date the document takes effect |
| `{{aiProviders}}`, `{{hostingProvider}}` | For the MVP: "OpenAI, NVIDIA" and "Vercel" |
| `{{taskTitle}}`, `{{taskId}}`, `{{cardVersion}}`, `{{acceptedAt}}` | Task card data at the moment the business accepts a team |
| `{{businessName}}`, `{{businessRepresentative}}`, `{{businessContact}}` | From the task card |
| `{{teamName}}`, `{{teamMembers}}`, `{{teamContact}}` | From the team profile and proposal |
| `{{milestones}}` | Bullet list of confirmed milestones with points |
| `{{acceptanceDays}}` | Days the business has to accept a milestone (default 5) |
| `{{clause.<groupId>}}` | Text of the option chosen in `clauses.json` for that group |
| `{{rewardAmount}}` | Only for the `reward_paid` option |

## clauses.json

`groups[]` has `id`, `label`, `required`, `affectsField` and `options[]`. Every option has `id`, `label`, `summary` and `clause`; some have `hint` and `value`.

- `summary` is a short sentence the card can add to the field named in `affectsField` (`constraints` or `contact`) as a suggestion. The business confirms it, and then it counts toward the rating like any confirmed text.
- `clause` is the full legal wording inserted into `collaboration-agreement.md` as `{{clause.<groupId>}}`.
- The `response` group carries the promised response time (`value`, working days) for the "honest response time" feature.

## Legal basis

- Civil Code of the Republic of Kazakhstan (General Part), art. 389 (contract of adhesion) and the rules on offer and acceptance, art. 395-396.
- Law of the Republic of Kazakhstan of 21 May 2013 No. 94-V "On personal data and their protection": art. 7-9 (consent and processing without consent), 12 (storage in Kazakhstan), 16 (cross-border transfer), 17-18 (depersonalization, destruction), 22 (protection), 24 (rights of the subject).
- Law of the Republic of Kazakhstan of 17 November 2025 No. 230-VIII "On artificial intelligence": transparency of AI use and labeling of AI output.
- Law of the Republic of Kazakhstan "On copyright and related rights" and the intellectual property section of the Civil Code (Special Part): transfer of exclusive rights and licenses.
- Structure benchmarked against public documents of Kazakhstan services (Kolesa.kz AI agreement, hh.kz personal data policy, Kaspi Объявления rules). No text was copied from them.

## Open points for legal review

1. Check the article number on AI transparency in Law No. 230-VIII (believed to be art. 21) and the exact labeling requirements.
2. Personal data law, art. 12: databases with personal data of citizens of Kazakhstan must be stored in Kazakhstan. The MVP runs on Vercel outside Kazakhstan and uses synthetic data only; production needs local hosting.
3. Copyright law requirements for a contract transferring exclusive property rights (form, remuneration, list of rights) for the `ip_business` option.
4. Consent of legal representatives for participants under 18.
5. Kazakh-language versions of all documents.
6. Operator details before public launch.
