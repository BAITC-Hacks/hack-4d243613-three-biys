# Design: Көпір (owner: B)

Short brand and UI guide for the team. Approved by Islam on 23 September, 14:30-14:50.

## Name

**Көпір** (Kazakh for "bridge"): a bridge between business and student teams. The logo and UI use the Kazakh spelling. Latin fallback where Cyrillic is impossible: **Kopir**.

For C: replace the working name "TaskForge" in `layout.tsx` (metadata title and header) with `<Logo />`.

## Logo

Concept "Tech": `КӨПІР` in **Tektur 800**, uppercase, letter spacing 0.03em, plus a lime indicator square with a soft glow at the top right.

```tsx
import { Logo } from '@/components/ui/logo';

<Logo />                 // header, md
<Logo size="lg" />       // landing
<Logo onDark />          // on graphite backgrounds
```

Do not recolor the letters in lime, stretch the logo or remove the indicator.

## Colors

Palette "Graphite and lime". All colors are tokens in `src/app/globals.css`; use the Tailwind classes, never hex values in components.

| Role | Token / class | Value |
|---|---|---|
| Page background | `bg-background` | `#F7F7F5` |
| Cards | `bg-surface` | `#FFFFFF` |
| Secondary fill | `bg-surface-2` | `#EFEFEC` |
| Text | `text-foreground` | `#18181B` |
| Secondary text | `text-muted` | `#71717A` |
| Borders | `border-border` | `#E4E4E0` |
| Primary button | `bg-primary text-primary-foreground` | graphite `#18181B` on white |
| Accent (progress, rating, focus) | `bg-accent` | lime `#84CC16` |
| Accent soft fill | `bg-accent-soft` | `#ECFCCB` |
| Text on accent-soft | `text-[#365314]` | dark lime |
| Level draft 0-39 | `bg-level-draft` | `#A1A1AA` |
| Level working 40-69 | `bg-level-working` | `#EAB308` |
| Level ready 70-89 | `bg-level-ready` | `#84CC16` |
| Level priority 90-100 | `bg-level-priority` | `#18181B` |

Rules:
- Lime is never used as a text color on light backgrounds: contrast is too low. On light backgrounds, lime is only a fill, bar, ring or indicator.
- Graphite carries text and primary actions. One primary button per screen.

## Type

- **Display: Tektur** (`font-display`): the logo, the rating number, big numbers and short section labels. Not for paragraphs.
- **UI: Rubik** (`font-sans`, the default body font): headings 800, numbers 700-800, text 400-500.
- Every font here is checked for the full Kazakh alphabet: Ә Ғ Қ Ң Ө Ұ Ү Һ І. Manrope, Space Grotesk, Unbounded, JetBrains Mono and Playfair Display lack these letters: do not use them.

## Shape

**Direction approved: D "Brutal tech"** (15:05): square corners (radius 0), 2px graphite borders (`border-2 border-border`), hard shadows without blur (`shadow-card` 4px, `shadow-lift` 6px on hover with `-translate-x-0.5 -translate-y-0.5`), lime top bar. Headings and numbers: **Rubik 800**; body text: **Rubik 400-500** (`font-sans`, default). Logo stays **Tektur**. Primary button: graphite with a pulsing lime LED (`<span className="led" />`). Tabs: separate bordered boxes, active tab lime with hard shadow. Card hover: hard lift. Thin separators inside cards: `border-hairline`.


- Radius: 0 everywhere (`rounded-card`, `rounded-control` resolve to 0).
- Shadows: `shadow-card` for cards, `shadow-pop` for popovers and toasts.
- No gradients and no emoji in the UI.

## Components

- Generic: `src/components/ui/*` (Button, Card, Badge, Input, Select, Tabs, ProgressBar, Stat, EmptyState and more).
- Domain: `src/components/domain/*` (RatingPanel, LevelBadge, PositionPreview, LevelUpToast, ProjectCard, ProposalCompare and more). Props follow the contract in `docs/PLAN.md`, §5.

## Pages (approved 15:20, all variant A)

Real screens get more air than the mockups: content width up to `max-w-6xl` (1152px), sections separated by `gap-12` to `gap-16`, cards `p-5` to `p-6`, one primary (LED) button per screen. Mockups: https://claude.ai/artifact/G2BwtAXQxsLo5ETguctgdi

- **Landing `/` is ready (16:05):** `src/app/page.tsx` → `import { Landing } from '@/components/domain'; export default function Home() { return <Landing collectorHref={...} serverUrl={...} />; }`. Seven animated sections: hero, pains, how it works, cost calculator in ₸, rating showcase, Collector, final CTA. Each section is also exported separately.
- **Landing `/`: "Pulse".** Full-width hero, height about 60vh: faint 22px grid background, three lime square waves pulsing out from the center (illustration `HeroPulse`, coming from `src/components/illustrations`), the big logo `<Logo size="xl" />`, one line "Мост между задачей бизнеса и студенческой командой", two buttons: primary "Описать задачу" → `/business/new`, secondary "Найти проект" → `/catalog`. Below: a row of 5 step cards with icons (Черновик, Вопросы ИИ, Карточка, Рейтинг 0-100, Каталог). Then `<CollectorDownload />`.
- **New task `/business/new`: "Wizard + rating panel".** Three columns on desktop: left a vertical step rail (5 steps with icons, the current step is a white box with a lime hard shadow), center the form or card editor, right a sticky `RatingPanel` (ring, level badge, catalog position "#5 из 12 → #2", hints "+10 Контакт и формат"). On narrow screens the rail becomes a horizontal step bar and the panel moves below the form.
- **Catalog `/catalog`: "Tiles".** Filter chips on top (active chip lime with a hard shadow), sort "по рейтингу", a 2-3 column grid of `ProjectCard`s with the score in a colored block, draft tasks visible with "нужно уточнение". Right column: `Leaderboard`.
- **Discover `/business/discover`: "Radar".** Left a dark panel: animated radar (`RadarScan`), source counters, privacy numbers (0 людей идентифицировано, k = 5), lime "Анализировать" button. Right: `InsightCard`s with a quoted piece of evidence and "В черновик". Below or above: `<CollectorDownload href=... serverUrl=... />`.

## Collector download

`src/components/domain/collector.tsx` exports `CollectorDownload({ href?, version?, sizeLabel?, serverUrl? })`. Without `href` the button reads "Скоро для Windows". For A: publish the Windows build (for example a zip in `public/downloads/` or an external link) and pass its URL. For C: place it on `/business/discover` and the landing.

## Collector app (Windows window, B)

Files: `collector/renderer/index.html`, `styles.css`, `renderer.js`. Plain HTML, CSS and JS without a build step: `collector/src/main.ts` loads the page with `loadFile`. The window is 520x640 and stays in the tray. It talks only to `window.collector` from `collector/src/preload.ts` (A).

- Preview without Electron: open `collector/renderer/index.html` in a browser. Without `window.collector` it runs in sample mode (banner on top, nothing is sent).
- Real app on Windows: `cd collector && npm install && npm start`.

Screens. Keep it simple: one main action per screen, 44px hit targets, one short helper line per control.
1. **Sign in:** server address, access token, team. Buttons: Test connection, Sign in. Errors: bad address, server unreachable, token rejected.
2. **Consent** (first sign in on this computer): "Sent to the server" and "Never leaves this computer" side by side, the 5+ people rule, a required checkbox, Continue.
3. **Collect** (home): big status block (LED, Collecting or Paused, today's counter), Activity tracker card, Meeting notes card (Start or Stop recording, REC timer, audio meters), Telegram card marked "soon".
4. **Transcript:** live meeting text, Copy, Clear.
5. **Privacy:** what left this computer (counts by category, never window titles), consent date, Withdraw consent, Request deletion.
6. **Settings:** connection form, autostart note, About, Sign out.
7. **Sign out:** confirm dialog. Collection stops, the token is removed from this computer, back to Sign in.

The header shows the status on every screen: "Connected · host · team", "Offline, N queued" or "Paused". Tabs use the brutal style (the active tab is lime with a hard shadow).

Status: the single-window version (Collect, Transcript, Connection) was committed at 15:46. B is adding Sign in, Consent, tabs and Sign out, due about 16:10. Until then please do not edit `collector/renderer/*`; report bugs to Islam.

## Illustrations

Coming in `src/components/illustrations/` (inline SVG, light animations, reduced-motion safe): HeroPulse, BridgeBuild, RadarScan, step icons (StepDraft, StepQuestions, StepCard, StepRating, StepPublish), level icons, empty states (EmptyCatalog, EmptyProposals, EmptyTasks), AiThinking loader, PublishedStamp, LevelUpBurst, PrivacyShield, CollectorLaptop, MilestoneFlag, TeamAvatar, BusinessAvatar, ErrorBridge, GridBackground.

## Legal documents and consent (B: texts by Islam, lawyer)

Texts: `src/content/legal.ts` (`LEGAL_DOCS.terms`, `LEGAL_DOCS.privacy`, `LEGAL_DOCS.collector`, `LEGAL_LIST`), written for the Law of the Republic of Kazakhstan "On personal data and their protection". Components in `src/components/domain/legal.tsx`, exported from `@/components/domain`.

For C, about 10 minutes:
1. Route `src/app/legal/[slug]/page.tsx`: `<LegalDocument doc={LEGAL_DOCS[slug]} />`, `notFound()` for unknown slugs.
2. Footer in `layout.tsx`: `<LegalLinks docs={LEGAL_LIST} />`.
3. First visit: mount `<ConsentGate open={!saved} onAccept={(c) => save(c)} />` in the layout; store the result in localStorage (for example `kopir:consent:v1`).
4. Forms: `<ConsentCheckbox required>` before "Опубликовать" (business confirms the data is theirs to share) and before "Отправить предложение" (team agrees to the terms).
5. `CollectorDownload` already asks for the employer's confirmation before the download button unlocks.

### Three languages (16:00)

Documents exist in Kazakh (`kk/`), Russian (folder root) and English (`en/`). KK and RU are legally binding with equal force; EN is a translation, and every document shows its `legalNote` above the text. For C, `/legal/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { LegalDocument } from '@/components/domain';
import { LegalLanguageSwitch } from '@/components/domain/legal';
import { LEGAL_DOCS, getLegalDoc, isLegalLang, type LegalSlug } from '@/content/legal';

export default async function LegalPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const { lang: q } = await searchParams;
  if (!(slug in LEGAL_DOCS)) notFound();
  const lang = isLegalLang(q) ? q : 'en';
  return (
    <>
      <LegalLanguageSwitch current={lang} basePath={`/legal/${slug}`} className="mx-auto mb-6 w-full max-w-6xl" />
      <LegalDocument doc={getLegalDoc(slug as LegalSlug, lang)} />
    </>
  );
}
```

Footer: `<LegalLinks docs={getLegalList('en')} lang="en" />`.

## AI interview (16:05)

`AiInterview` in `src/components/domain/interview.tsx` is a pop-up window where the AI interviews the business about its task (the Clarify step of `/business/new`). It has a voice-first mode with an animated orb avatar, and a "Switch to text chat" button for people who prefer typing. Questions come from `/api/ai/clarify`, answers go to `/api/ai/card`. For voice, pass `voice={{ status, onStart, onStop }}` from A's `VoiceInterview` (`src/lib/voice/interview.ts`).

## Final decisions (15:35)

- **Language: English UI.** B components are being switched to English. Legal documents stay in Russian (official texts); the footer can say "Documents in Russian".
- **Favicon: "КӨ"** on lime, `src/app/icon.svg` (Next picks it up automatically).
- **Project page `/catalog/[id]`: A "Document + proposal on the side".** Left: card header (business · industry, title, skill chips) and `TechSpecView`. Right, sticky: score ring + `LevelBadge`, `RatingPanel` compact, proposal form (idea, plan and deadline, prototype link) with `ConsentCheckbox` and the LED button "Send proposal".
- **Business proposals `/business/tasks/[id]`: A "Compare in columns".** `ProposalCompare` with `skillsNeeded={card.skillsNeeded}`; accepted column gets the lime ring; Accept / Reject under each column; milestones below.
- **Student `/student`: B "Progress as a game".** Top: team card with team level and a thick progress bar to the next level ("120 of 160 points to level 4"). Then "Quests": milestones as rows with square checkboxes (lime when confirmed, "+40" points). Then "Projects for you" and `Leaderboard` with `currentTeamId`.
