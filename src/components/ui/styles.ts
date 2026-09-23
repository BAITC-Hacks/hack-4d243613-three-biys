// Shared class recipes of the UI kit (owner: B, design). Palette tokens live in src/app/globals.css.
// Every class is a full static string so the Tailwind scanner can see it.

/** Readiness levels of a task card, reused as color tones by Badge and ProgressBar. */
export type LevelTone = 'draft' | 'working' | 'ready' | 'priority';

/**
 * Keyboard focus ring for buttons and chips: 2px lime ring with a 2px offset.
 * outline-hidden leaves a transparent outline, so focus stays visible in Windows high-contrast mode.
 */
export const focusRing =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2';

/**
 * Shared look of Input, Textarea and Select. Focus: lime-strong border plus a soft lime halo.
 * The error state comes from aria-invalid, set by <Field error> or by the caller.
 */
export const controlBase = [
  'block w-full min-w-0 rounded-control border-2 border-border bg-surface text-sm text-foreground',
  'placeholder:text-muted',
  'transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none',
  'focus-visible:outline-hidden focus-visible:border-accent-strong focus-visible:ring-3 focus-visible:ring-accent/35',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:border-danger aria-[invalid=true]:focus-visible:ring-danger/20',
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted',
].join(' ');
