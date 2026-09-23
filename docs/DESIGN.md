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

- **Landing `/`: "Pulse".** Full-width hero, height about 60vh: faint 22px grid background, three lime square waves pulsing out from the center (illustration `HeroPulse`, coming from `src/components/illustrations`), the big logo `<Logo size="xl" />`, one line "Мост между задачей бизнеса и студенческой командой", two buttons: primary "Описать задачу" → `/business/new`, secondary "Найти проект" → `/catalog`. Below: a row of 5 step cards with icons (Черновик, Вопросы ИИ, Карточка, Рейтинг 0-100, Каталог). Then `<CollectorDownload />`.
- **New task `/business/new`: "Wizard + rating panel".** Three columns on desktop: left a vertical step rail (5 steps with icons, the current step is a white box with a lime hard shadow), center the form or card editor, right a sticky `RatingPanel` (ring, level badge, catalog position "#5 из 12 → #2", hints "+10 Контакт и формат"). On narrow screens the rail becomes a horizontal step bar and the panel moves below the form.
- **Catalog `/catalog`: "Tiles".** Filter chips on top (active chip lime with a hard shadow), sort "по рейтингу", a 2-3 column grid of `ProjectCard`s with the score in a colored block, draft tasks visible with "нужно уточнение". Right column: `Leaderboard`.
- **Discover `/business/discover`: "Radar".** Left a dark panel: animated radar (`RadarScan`), source counters, privacy numbers (0 людей идентифицировано, k = 5), lime "Анализировать" button. Right: `InsightCard`s with a quoted piece of evidence and "В черновик". Below or above: `<CollectorDownload href=... serverUrl=... />`.

## Collector download

`src/components/domain/collector.tsx` exports `CollectorDownload({ href?, version?, sizeLabel?, serverUrl? })`. Without `href` the button reads "Скоро для Windows". For A: publish the Windows build (for example a zip in `public/downloads/` or an external link) and pass its URL. For C: place it on `/business/discover` and the landing.

## Illustrations

Coming in `src/components/illustrations/` (inline SVG, light animations, reduced-motion safe): HeroPulse, BridgeBuild, RadarScan, step icons (StepDraft, StepQuestions, StepCard, StepRating, StepPublish), level icons, empty states (EmptyCatalog, EmptyProposals, EmptyTasks), AiThinking loader, PublishedStamp, LevelUpBurst, PrivacyShield, CollectorLaptop, MilestoneFlag, TeamAvatar, BusinessAvatar, ErrorBridge, GridBackground.
