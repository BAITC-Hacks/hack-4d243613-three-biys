'use client';
// Tabs (owner: B, design): controlled segmented tabs. The caller keeps the state and renders the content:
// <Tabs items={[{ id: 'card', label: 'Card' }, { id: 'proposals', label: 'Proposals', count: 3 }]} value={tab} onChange={setTab} />
// Keyboard: Left/Right arrows move and select, Home/End jump to the first/last tab.
import type { KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';

export type TabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  /** Small counter after the label, e.g. the number of proposals. */
  count?: number;
  disabled?: boolean;
};

export type TabsProps<T extends string = string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name of the tab list, e.g. "Task sections". */
  'aria-label'?: string;
  /** Stretch the tabs to the container width. */
  fullWidth?: boolean;
  className?: string;
};

const navigationKeys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  const enabled = items.filter((item) => !item.disabled);
  // The one tab reachable with Tab (roving tabindex): the selected one, or the first enabled one.
  const focusable = enabled.find((item) => item.id === value) ?? enabled[0];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!navigationKeys.includes(event.key) || enabled.length === 0) return;
    event.preventDefault();
    const current = focusable ? enabled.indexOf(focusable) : 0;
    let next = current;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else if (event.key === 'ArrowRight') next = (current + 1) % enabled.length;
    else next = (current - 1 + enabled.length) % enabled.length;
    const target = enabled[next];
    if (target.id !== value) onChange(target.id);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[items.indexOf(target)]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={clsx(
        // Approved tabs: separate bordered boxes; the active one is lime with a hard shadow.
        'max-w-full items-center gap-2 overflow-x-auto p-1 pb-2',
        fullWidth ? 'flex w-full' : 'inline-flex',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={item === focusable ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={clsx(
              // Inner radius = control radius minus the 4px track padding, so the corners stay concentric.
              'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control border-2 border-border px-3 text-sm font-semibold whitespace-nowrap',
              'transition-[background-color,box-shadow,translate] duration-150 motion-reduce:transition-none',
              'focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:outline-hidden focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              fullWidth && 'flex-1',
              selected
                ? 'bg-accent text-accent-foreground shadow-[3px_3px_0_var(--foreground)] -translate-x-px -translate-y-px'
                : 'bg-surface text-foreground hover:bg-accent-soft',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={clsx(
                  'min-w-5 rounded-[var(--radius-pill)] px-1.5 text-center text-xs leading-5 tabular-nums',
                  selected ? 'bg-accent-soft text-[#365314]' : 'bg-surface text-foreground/70',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
