'use client';
// Collector download block (owner: B, design). Shown on /business/discover and the landing.
// Props only: the page passes the real download URL once A publishes the Windows build.
import { useState } from 'react';
import clsx from 'clsx';
import { Download, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { ConsentCheckbox } from './legal';

export function CollectorDownload({
  href,
  version,
  sizeLabel,
  serverUrl,
  className,
}: {
  /** Download URL of the Windows build (.zip or .exe). Without it the button shows "Coming soon". */
  href?: string;
  version?: string;
  sizeLabel?: string;
  /** Server address the user pastes into the Collector settings. */
  serverUrl?: string;
  className?: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const features = [
    ['Activity tracker', 'App categories and data transfers between them, never window contents'],
    ['Meeting notes', 'Zoom, Teams or Meet audio turned into a transcript'],
    ['Team channels', 'Work group messages with names replaced by roles'],
  ] as const;

  return (
    <section
      aria-labelledby="collector-download-title"
      className={clsx('rounded-card border-2 border-border bg-surface shadow-card', className)}
    >
      <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-extrabold tracking-[0.12em] text-muted uppercase">Windows app</p>
          <h2 id="collector-download-title" className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <span className="font-display tracking-[0.03em]">КӨПІР</span> Collector
            <span aria-hidden="true" className="led" />
          </h2>
          <p className="mt-2 text-sm text-muted">
            Install it on your team&apos;s computers, and Discover will find tasks for students in real work: meetings,
            messages and the places where time gets lost.
          </p>
          <ul className="mt-4 grid gap-2">
            {features.map(([title, text]) => (
              <li key={title} className="flex gap-3 text-sm">
                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 bg-accent" />
                <span>
                  <b className="font-semibold">{title}.</b> <span className="text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 md:w-64">
          {href ? (
            <>
              <ConsentCheckbox checked={agreed} onChange={setAgreed} required>
                Employees are informed and agree to{' '}
                <a href="/legal/collector" target="_blank" rel="noreferrer">
                  anonymized analytics
                </a>
              </ConsentCheckbox>
              {agreed ? (
                <a href={href} download className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full' })}>
                  <Download aria-hidden="true" /> Download for Windows
                </a>
              ) : (
                <span aria-disabled="true" className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full' })}>
                  <Download aria-hidden="true" /> Download for Windows
                </span>
              )}
            </>
          ) : (
            <span
              aria-disabled="true"
              className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-full' })}
            >
              <MonitorSmartphone aria-hidden="true" /> Coming soon for Windows
            </span>
          )}
          {version || sizeLabel ? (
            <p className="text-center text-xs text-muted tabular-nums">
              {[version && `Version ${version}`, sizeLabel].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <ol className="grid gap-1.5 border-2 border-border bg-surface-2 p-3 text-xs">
            <li>1. Download and unzip the archive.</li>
            <li>2. Run КӨПІР Collector.</li>
            <li>
              3. Paste the server address{serverUrl ? <b className="font-semibold break-all"> {serverUrl}</b> : null} and
              the token, then turn on the toggles you need.
            </li>
          </ol>
        </div>
      </div>
      <p className="flex items-start gap-2 border-t-2 border-border px-5 py-3 text-xs text-muted sm:px-6">
        <ShieldCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-foreground" />
        Window titles and contents never leave the computer. Only app categories and anonymous events are sent, and a
        pattern is shown only if at least 5 people are in it.
      </p>
    </section>
  );
}
