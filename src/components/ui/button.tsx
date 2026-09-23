// Buttons (owner: B, design): Button, IconButton and buttonClasses for links styled as buttons.
// Server-safe: no hooks and no internal handlers, so both server and client pages can render them.
import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Spinner } from './feedback';
import { focusRing } from './styles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  // Approved primary: graphite with a pulsing lime LED (class btn-led in globals.css).
  primary: 'btn-led bg-primary text-primary-foreground hover:bg-[#27272a]',
  secondary: 'border-border bg-surface text-foreground hover:bg-accent-soft',
  ghost: 'text-foreground hover:bg-foreground/5',
  danger: 'bg-danger text-white hover:bg-danger/90',
  accent: 'border-border bg-accent text-accent-foreground shadow-card hover:bg-[#a3e635] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm [&_svg]:size-4',
  md: 'h-9 gap-2 px-4 text-sm [&_svg]:size-4',
  lg: 'h-11 gap-2 px-5 text-base [&_svg]:size-5',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'size-8 [&_svg]:size-4',
  md: 'size-9 [&_svg]:size-4',
  lg: 'size-11 [&_svg]:size-5',
};

export type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button for a single icon. */
  iconOnly?: boolean;
  /** Keeps full opacity while the button is disabled for loading. */
  loading?: boolean;
  className?: string;
};

/**
 * Button look as a class string, for elements that are not <button>, e.g. a Next.js Link:
 * <Link href="/catalog" className={buttonClasses({ variant: 'secondary' })}>Каталог</Link>
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  loading = false,
  className,
}: ButtonClassOptions = {}) {
  return clsx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-control border-2 border-transparent font-semibold select-none',
    'transition-[background-color,color,box-shadow,translate] duration-150 motion-reduce:transition-none active:translate-y-px',
    'disabled:pointer-events-none aria-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    !loading && 'disabled:opacity-50 aria-disabled:opacity-50',
    focusRing,
    variants[variant],
    iconOnly ? iconSizes[size] : sizes[size],
    className,
  );
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy. The label stays, so the width does not jump. */
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, loading, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" label="" /> : null}
      {children}
    </button>
  );
}

export type IconButtonProps = Omit<ButtonProps, 'aria-label'> & {
  /** Accessible name. Required: the button shows only an icon. */
  label: string;
};

/** Square icon-only button, ghost by default: <IconButton label="Удалить"><Trash2 /></IconButton>. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={buttonClasses({ variant, size, iconOnly: true, loading, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" label="" /> : children}
    </button>
  );
}
