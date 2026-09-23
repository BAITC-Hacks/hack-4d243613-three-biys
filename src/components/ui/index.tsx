// Generic UI kit — owner: B. Placeholders so C can build against the API today; B replaces the internals.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      className={clsx(
        'rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'border border-border bg-surface',
        variant === 'danger' && 'bg-red-600 text-white',
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-lg border border-border bg-surface p-4', className)}>{children}</div>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('inline-block rounded-full border border-border px-2 py-0.5 text-xs', className)}>{children}</span>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full rounded-md border border-border px-2 py-1 text-sm" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="w-full rounded-md border border-border px-2 py-1 text-sm" {...props} />;
}

export function Heading({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold">{children}</h1>;
}
