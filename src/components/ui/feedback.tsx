// Progress and loading states (owner: B, design): ProgressBar, Spinner, Skeleton, EmptyState.
// Server-safe: no hooks, no handlers.
import type { ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import type { LevelTone } from './styles';

export type ProgressTone = 'accent' | 'primary' | LevelTone;

const progressTones: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  primary: 'bg-primary',
  draft: 'bg-level-draft',
  working: 'bg-level-working',
  ready: 'bg-level-ready',
  priority: 'bg-level-priority',
};

export type ProgressBarProps = {
  /** Current value, clamped to 0..max. */
  value: number;
  /** Upper bound, 100 by default. Use e.g. max={20} for one rating component. */
  max?: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  /** Accessible name, e.g. "Готовность задачи". */
  label?: string;
  className?: string;
};

export function ProgressBar({ value, max = 100, tone = 'accent', size = 'md', label, className }: ProgressBarProps) {
  const upper = max > 0 ? max : 100;
  const current = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), upper);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={upper}
      aria-valuenow={current}
      className={clsx(
        'w-full overflow-hidden rounded-[var(--radius-pill)] bg-border/60',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
    >
      <div
        className={clsx(
          'h-full rounded-[var(--radius-pill)] transition-[width] duration-500 ease-out motion-reduce:transition-none',
          progressTones[tone],
        )}
        style={{ width: `${(current / upper) * 100}%` }}
      />
    </div>
  );
}

const spinnerSizes = { sm: 'size-4', md: 'size-5', lg: 'size-8' } as const;

export type SpinnerProps = {
  size?: keyof typeof spinnerSizes;
  /** Screen reader text. Pass "" when the spinner sits next to visible text, e.g. inside a button. */
  label?: string;
  className?: string;
};

export function Spinner({ size = 'md', label = 'Загрузка', className }: SpinnerProps) {
  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={clsx(
        'shrink-0 animate-spin motion-reduce:[animation-duration:2s]',
        spinnerSizes[size],
        !label && className,
      )}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  if (!label) return icon;
  return (
    <span role="status" className={clsx('inline-flex', className)}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Loading placeholder. Size it with className, e.g. <Skeleton className="h-4 w-40" />. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={clsx('animate-pulse rounded-control bg-border/70 motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

export type EmptyStateProps = {
  /** Decorative icon, e.g. a lucide icon. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Usually one or two Buttons. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-3 grid size-11 place-items-center rounded-control bg-surface-2 text-muted [&_svg]:size-5"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-pretty text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
