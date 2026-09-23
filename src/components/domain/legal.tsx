'use client';
// Legal UI (owner: B, design + legal texts by Islam). Props only; C decides where to mount and where to persist consent.
//   <LegalDocument doc={LEGAL_DOCS.privacy} />            on /legal/[slug]
//   <ConsentCheckbox checked onChange>…</ConsentCheckbox>   in forms (publish task, send proposal, Collector download)
//   <ConsentGate open onAccept={(c) => save(c)} />          first visit, until required consents are given
import { useId, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check, FileText } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import type { LegalDoc } from '@/content/legal';

export function LegalDocument({ doc, className }: { doc: LegalDoc; className?: string }) {
  return (
    <article className={clsx('mx-auto grid max-w-5xl gap-8 md:grid-cols-[220px_1fr]', className)}>
      <nav aria-label="Содержание" className="md:sticky md:top-6 md:self-start">
        <p className="text-xs font-extrabold tracking-[0.12em] text-muted uppercase">Содержание</p>
        <ol className="mt-3 grid gap-1 border-l-2 border-border">
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block py-1 pl-3 text-sm hover:bg-accent-soft">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="rounded-card border-2 border-border bg-surface p-6 shadow-card sm:p-8">
        <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">
          <FileText aria-hidden="true" className="size-4" /> Версия {doc.version} · {doc.updated}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-balance">{doc.title}</h1>
        <p className="mt-2 text-muted">{doc.short}</p>
        <div className="mt-8 grid gap-8">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-lg font-extrabold">{s.title}</h2>
              <div className="mt-2 grid max-w-[68ch] gap-3 text-[15px] leading-relaxed">
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

/** Brutal square checkbox with a lime check. `children` is the label, links inside are allowed. */
export function ConsentCheckbox({
  checked,
  onChange,
  required = false,
  children,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={clsx('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          required={required}
          aria-required={required || undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="peer size-5 cursor-pointer appearance-none border-2 border-border bg-surface checked:bg-accent focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:outline-hidden"
        />
        <Check
          aria-hidden="true"
          strokeWidth={3.5}
          className="pointer-events-none absolute size-3.5 text-accent-foreground opacity-0 peer-checked:opacity-100"
        />
      </span>
      <label htmlFor={id} className="cursor-pointer text-sm leading-5 [&_a]:font-semibold [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2 [&_a]:underline-offset-2">
        {children}
        {required ? <span className="text-muted"> (обязательно)</span> : null}
      </label>
    </div>
  );
}

export type Consents = { terms: boolean; privacy: boolean; news: boolean; acceptedAt: string };

/**
 * First-visit consent window. Required: terms + personal data. Optional: news.
 * C mounts it in the layout while no saved consent exists and stores the result (e.g. localStorage).
 */
export function ConsentGate({
  open,
  onAccept,
  termsHref = '/legal/terms',
  privacyHref = '/legal/privacy',
}: {
  open: boolean;
  onAccept: (consents: Consents) => void;
  termsHref?: string;
  privacyHref?: string;
}) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [news, setNews] = useState(false);
  if (!open) return null;
  const ready = terms && privacy;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full max-w-lg border-2 border-border bg-surface shadow-[8px_8px_0_var(--accent)]"
      >
        <div className="flex items-center gap-2 border-b-2 border-border bg-accent px-5 py-3">
          <span className="font-display text-lg font-extrabold tracking-[0.03em]">КӨПІР</span>
          <span aria-hidden="true" className="size-2 bg-foreground" />
        </div>
        <form
          className="grid gap-4 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) onAccept({ terms, privacy, news, acceptedAt: new Date().toISOString() });
          }}
        >
          <h2 id="consent-title" className="text-2xl font-extrabold text-balance">
            Прежде чем начать
          </h2>
          <p className="text-sm text-muted">
            Көпір соединяет задачи бизнеса со студенческими командами. Нам нужно ваше согласие на правила платформы и
            обработку данных, которые вы укажете.
          </p>
          <ConsentCheckbox checked={terms} onChange={setTerms} required>
            Я принимаю <a href={termsHref} target="_blank" rel="noreferrer">Пользовательское соглашение</a>
          </ConsentCheckbox>
          <ConsentCheckbox checked={privacy} onChange={setPrivacy} required>
            Я даю согласие на обработку персональных данных по{' '}
            <a href={privacyHref} target="_blank" rel="noreferrer">Политике</a>
          </ConsentCheckbox>
          <ConsentCheckbox checked={news} onChange={setNews}>
            Сообщать мне о новых задачах в каталоге
          </ConsentCheckbox>
          <button type="submit" disabled={!ready} className={buttonClasses({ variant: 'primary', size: 'lg', className: 'mt-2 w-full' })}>
            Принять и продолжить
          </button>
          <p className="text-xs text-muted">Согласие можно отозвать в любой момент. Демонстрационная версия, HackAlem AI 2026.</p>
        </form>
      </div>
    </div>
  );
}

/** Footer row with links to all legal documents. */
export function LegalLinks({ docs, className }: { docs: Pick<LegalDoc, 'slug' | 'title'>[]; className?: string }) {
  return (
    <nav aria-label="Юридические документы" className={clsx('flex flex-wrap gap-x-5 gap-y-2 text-sm', className)}>
      {docs.map((d) => (
        <a key={d.slug} href={`/legal/${d.slug}`} className="font-medium underline decoration-accent decoration-2 underline-offset-4 hover:bg-accent-soft">
          {d.title}
        </a>
      ))}
    </nav>
  );
}
