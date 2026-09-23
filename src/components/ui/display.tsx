// Surfaces, labels and typography (owner: B, design): Card, Badge, Chip, Stat, Divider, Heading.
// Server-safe: no hooks. Chip only forwards the caller's onClick.
import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { focusRing, type LevelTone } from './styles';

export type CardProps = ComponentProps<'div'> & {
  /** Hover lift for clickable cards. Put a link inside the card or wrap the card in a link. */
  interactive?: boolean;
  /** Inner padding, true by default. Pass false to build edge-to-edge sections with className. */
  padded?: boolean;
};

export function Card({ className, interactive = false, padded = true, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-card border-2 border-border bg-surface text-foreground shadow-card',
        padded ? 'p-4 sm:p-5' : 'overflow-hidden',
        interactive &&
          // Approved card hover: hard lift, the shadow grows from 4px to 6px.
          'transition-[box-shadow,translate] duration-150 ease-out hover:shadow-lift motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

export type BadgeVariant = 'neutral' | 'accent' | 'outline' | LevelTone;

// Level badges: soft fills with readable text (lime is never text on light fills; ready uses dark lime).
const badgeVariants: Record<BadgeVariant, string> = {
  // Brutal tech: solid fills with a 2px graphite border.
  neutral: 'border-border bg-surface-2 text-foreground',
  accent: 'border-border bg-accent text-accent-foreground',
  outline: 'border-border bg-transparent text-foreground',
  draft: 'border-border bg-[#e4e4e7] text-foreground',
  working: 'border-border bg-[#fde047] text-foreground',
  ready: 'border-border bg-accent text-accent-foreground',
  priority: 'border-border bg-primary text-accent',
};

const badgeDots: Record<BadgeVariant, string> = {
  neutral: 'bg-muted',
  accent: 'bg-primary',
  outline: 'bg-muted',
  draft: 'bg-level-draft',
  working: 'bg-level-working',
  ready: 'bg-level-ready',
  priority: 'bg-accent',
};

export type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant;
  /** Small status dot in the variant color before the text. */
  dot?: boolean;
};

export function Badge({ children, className, variant = 'neutral', dot = false, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center gap-1.5 rounded-control border-2 px-2 py-0.5 text-xs leading-4 font-bold [&_svg]:size-3 [&_svg]:shrink-0',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-[var(--radius-pill)]', badgeDots[variant])} />
      ) : null}
      {children}
    </span>
  );
}

export type ChipProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  /** Selected state. When set (true or false) the chip is a toggle button with aria-pressed. */
  selected?: boolean;
  /** Leading icon. A selected chip without an icon shows a check mark, so the state is not color-only. */
  icon?: ReactNode;
  size?: 'sm' | 'md';
};

/**
 * Pill for filters, tags and suggestions. With onClick or selected it renders a <button>,
 * otherwise a static <span>.
 */
export function Chip({ selected, icon, size = 'md', className, children, ...props }: ChipProps) {
  const interactive = props.onClick !== undefined || selected !== undefined;
  const classes = clsx(
    'inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border font-medium [&_svg]:size-3.5 [&_svg]:shrink-0',
    size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
    selected ? 'border-accent bg-accent-soft text-[#365314]' : 'border-border bg-surface text-foreground',
    interactive && [
      focusRing,
      'cursor-pointer transition-colors duration-150 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50',
      selected ? 'hover:bg-accent/25' : 'hover:bg-surface-2',
    ],
    className,
  );
  const lead = icon ?? (selected ? <Check aria-hidden="true" /> : null);

  if (!interactive) {
    return (
      <span className={classes} {...(props as ComponentPropsWithoutRef<'span'>)}>
        {lead}
        {children}
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={selected} className={classes} {...props}>
      {lead}
      {children}
    </button>
  );
}

export type StatProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
};

/** Key number with a caption, e.g. <Stat label="Рейтинг" value="72" hint="из 100" />. */
export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <dl className={clsx('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="font-display text-2xl leading-tight font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </dd>
      {hint ? <dd className="text-xs text-muted">{hint}</dd> : null}
    </dl>
  );
}

export type DividerProps = {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

/** Thin separator line. A vertical divider needs a flex row parent. */
export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <hr
        aria-orientation="vertical"
        className={clsx('h-auto w-px shrink-0 self-stretch border-0 bg-border', className)}
      />
    );
  }
  return <hr className={clsx('border-border', className)} />;
}

const headingTags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const;

const headingSizes = {
  1: 'text-2xl font-semibold tracking-tight',
  2: 'text-xl font-semibold tracking-tight',
  3: 'text-base font-semibold',
  4: 'text-sm font-semibold',
} as const;

export type HeadingProps = ComponentProps<'h1'> & {
  /** Heading level, 1 by default. Sets both the tag (h1..h4) and the size. */
  level?: 1 | 2 | 3 | 4;
};

export function Heading({ level = 1, className, ...props }: HeadingProps) {
  const Tag = headingTags[level];
  return <Tag className={clsx('text-balance text-foreground', headingSizes[level], className)} {...props} />;
}
