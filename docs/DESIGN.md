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
- **Body:** the team chooses next (candidates: Geologica, Onest, Inter, Golos Text). Until then, the system font.
- Every font here is checked for the full Kazakh alphabet: Ә Ғ Қ Ң Ө Ұ Ү Һ І. Manrope, Space Grotesk, Unbounded, JetBrains Mono and Playfair Display lack these letters: do not use them.

## Shape

**Direction approved: D "Brutal tech"** (14:55): hard 2px graphite borders, square corners, hard shadows without blur (4px 4px 0 graphite), lime top bar, Tektur for numbers and labels. Exact buttons, tabs and highlights are being finalized; tokens below will be switched to this direction in the next commit.


- Radius: cards `rounded-card` (14px), controls `rounded-control` (10px). May shrink once the UI direction is chosen.
- Shadows: `shadow-card` for cards, `shadow-pop` for popovers and toasts.
- No gradients and no emoji in the UI.

## Components

- Generic: `src/components/ui/*` (Button, Card, Badge, Input, Select, Tabs, ProgressBar, Stat, EmptyState and more).
- Domain: `src/components/domain/*` (RatingPanel, LevelBadge, PositionPreview, LevelUpToast, ProjectCard, ProposalCompare and more). Props follow the contract in `docs/PLAN.md`, §5.
