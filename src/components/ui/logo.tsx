// Brand logo "КӨПІР" (owner: B, design). Approved 23.09 14:50: concept "Techno",
// Tektur 800 uppercase + lime indicator square with a soft glow.
// Usage: <Logo /> in the header; <Logo size="lg" /> on the landing; <Logo onDark /> on graphite backgrounds.
import clsx from 'clsx';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<LogoSize, { text: string; dot: string }> = {
  sm: { text: 'text-base', dot: 'size-1.5' },
  md: { text: 'text-xl', dot: 'size-2' },
  lg: { text: 'text-4xl', dot: 'size-3' },
  xl: { text: 'text-6xl', dot: 'size-4' },
};

export function Logo({
  size = 'md',
  onDark = false,
  className,
}: {
  size?: LogoSize;
  /** Light letters for graphite backgrounds. */
  onDark?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      aria-label="Көпір"
      role="img"
      className={clsx(
        'inline-flex items-start gap-[0.12em] font-display font-extrabold uppercase leading-none tracking-[0.03em] select-none',
        s.text,
        onDark ? 'text-[#FAFAF9]' : 'text-foreground',
        className,
      )}
    >
      <span aria-hidden="true">КӨПІР</span>
      <span
        aria-hidden="true"
        className={clsx('mt-[0.08em] shrink-0 bg-accent shadow-[0_0_0.4em_var(--accent)]', s.dot)}
      />
    </span>
  );
}
