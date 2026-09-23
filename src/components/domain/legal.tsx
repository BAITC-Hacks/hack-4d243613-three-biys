'use client';
// Legal UI (owner: B, design + legal texts by Islam). Props only; C decides where to mount and where to persist consent.
//   <LegalDocument doc={LEGAL_DOCS.privacy} />                         on /legal/[slug]
//   <ConsentCheckbox checked onChange required>…</ConsentCheckbox>       before publishing a task and sending a proposal
//   <ConsentGate open onAccept={(c) => save(c)} />                       first visit, until required consents are given
//   <AiNoticeBanner />                                                   next to every AI result until a person confirms it
//   <LegalLinks docs={LEGAL_LIST} />                                     footer
import { Fragment, useId, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check, FileText, Languages, Scale, Sparkles } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { LEGAL_DEFAULTS, getAiBannerText, getConsentLabel, type LegalLang, type ParsedDoc } from '@/content/legal';

/** Renders **bold** and {{placeholders}}. Unknown placeholders become an empty highlighted field. */
function Inline({ text, values }: { text: string; values: Record<string, string> }) {
  const parts = text.split(/(\{\{[^}]+\}\}|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const ph = part.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
        if (ph) {
          const value = values[ph[1]];
          return value ? (
            <span key={i} className="bg-accent-soft px-1 font-medium">
              {value}
            </span>
          ) : (
            <span
              key={i}
              title={`To be filled in: ${ph[1]}`}
              className="inline-block min-w-24 border-b-2 border-dashed border-[#a16207] bg-[#fef9c3] px-1 align-baseline text-transparent select-none"
            >
              {ph[1]}
            </span>
          );
        }
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i} className="font-bold">{bold[1]}</strong>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Document chrome follows the document language, not the interface language. */
const CHROME: Record<LegalLang, { contents: string; version: string; draft: string }> = {
  ru: { contents: 'Содержание', version: 'Версия', draft: 'Проект документа' },
  kk: { contents: 'Мазмұны', version: 'Нұсқа', draft: 'Құжат жобасы' },
  en: { contents: 'Contents', version: 'Version', draft: 'Draft document' },
};
const docLang = (doc: ParsedDoc): LegalLang =>
  doc.meta.lang === 'kk' || doc.meta.lang === 'en' ? doc.meta.lang : 'ru';

export function LegalDocument({
  doc,
  values,
  className,
}: {
  doc: ParsedDoc;
  /** Extra placeholder values, e.g. { siteUrl, effectiveDate }. Defaults cover the MVP operator fields. */
  values?: Record<string, string>;
  className?: string;
}) {
  const v = { ...LEGAL_DEFAULTS, ...values };
  const toc = doc.blocks.flatMap((b) => (b.type === 'h2' ? [b] : []));
  const lang = docLang(doc);
  const c = CHROME[lang];
  return (
    <article lang={lang} className={clsx('mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[240px_1fr]', className)}>
      <nav aria-label={c.contents} className="md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:self-start md:overflow-y-auto">
        <p className="text-xs font-extrabold tracking-[0.12em] text-muted uppercase">{c.contents}</p>
        <ol className="mt-3 grid gap-0.5 border-l-2 border-border">
          {toc.map((h) => (
            <li key={h.id}>
              <a href={`#${h.id}`} className="block py-1 pl-3 text-sm leading-snug hover:bg-accent-soft">
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="min-w-0 rounded-card border-2 border-border bg-surface p-6 shadow-card sm:p-10">
        <p className="flex flex-wrap items-center gap-2 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">
          <FileText aria-hidden="true" className="size-4" />
          {doc.meta.version ? `${c.version} ${doc.meta.version}` : null}
          {doc.meta.updated ? ` · ${doc.meta.updated}` : null}
          {doc.meta.status === 'draft' ? (
            <span className="border-2 border-border bg-[#fde047] px-1.5 py-0.5 text-foreground">{c.draft}</span>
          ) : null}
        </p>
        {doc.meta.legalNote ? (
          <p
            role="note"
            className={clsx(
              'mt-4 flex max-w-[70ch] items-start gap-2 border-2 border-border px-3 py-2 text-sm leading-5',
              lang === 'en' ? 'bg-[#fef9c3]' : 'bg-accent-soft',
            )}
          >
            <Scale aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{doc.meta.legalNote}</span>
          </p>
        ) : null}
        <div className="mt-4 grid max-w-[70ch] gap-4 text-[15px] leading-relaxed">
          {doc.blocks.map((b, i) => {
            switch (b.type) {
              case 'h1':
                return (
                  <h1 key={i} className="text-3xl leading-tight font-extrabold text-balance">
                    <Inline text={b.text} values={v} />
                  </h1>
                );
              case 'h2':
                return (
                  <h2 key={i} id={b.id} className="mt-4 scroll-mt-6 border-t-2 border-hairline pt-5 text-lg font-extrabold">
                    <Inline text={b.text} values={v} />
                  </h2>
                );
              case 'h3':
                return (
                  <h3 key={i} className="mt-2 font-bold">
                    <Inline text={b.text} values={v} />
                  </h3>
                );
              case 'p':
                return (
                  <p key={i}>
                    <Inline text={b.text} values={v} />
                  </p>
                );
              case 'ul':
              case 'ol': {
                const List = b.type === 'ul' ? 'ul' : 'ol';
                return (
                  <List key={i} className="grid gap-2">
                    {b.items.map((item, j) => (
                      <li key={j} className="flex gap-3">
                        {b.type === 'ul' ? (
                          <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 bg-accent" />
                        ) : (
                          <span className="w-5 shrink-0 font-extrabold tabular-nums">{j + 1}.</span>
                        )}
                        <span>
                          <Inline text={item} values={v} />
                        </span>
                      </li>
                    ))}
                  </List>
                );
              }
              case 'table':
                return (
                  <div key={i} className="overflow-x-auto border-2 border-border">
                    <table className="w-full min-w-[480px] border-collapse text-sm">
                      <thead className="bg-surface-2">
                        <tr>
                          {b.head.map((c, j) => (
                            <th key={j} className="border-b-2 border-border px-3 py-2 text-left font-bold">
                              <Inline text={c} values={v} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {b.rows.map((r, j) => (
                          <tr key={j} className="border-b border-hairline last:border-b-0">
                            {r.map((c, k) => (
                              <td key={k} className="px-3 py-2 align-top">
                                <Inline text={c} values={v} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
            }
          })}
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
      <label
        htmlFor={id}
        className="cursor-pointer text-sm leading-5 [&_a]:font-semibold [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2 [&_a]:underline-offset-2"
      >
        {children}
        {required ? <span className="text-muted"> (required)</span> : null}
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
  termsHref = '/legal/terms?lang=en',
  privacyHref = '/legal/privacy?lang=en',
  consentHref = '/legal/consent?lang=en',
}: {
  open: boolean;
  onAccept: (consents: Consents) => void;
  termsHref?: string;
  privacyHref?: string;
  consentHref?: string;
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
            Before you start
          </h2>
          <p className="text-sm text-muted">
            Көпір connects business tasks with student teams. We need your consent to the platform rules and to the
            processing of the data you provide.
          </p>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Languages aria-hidden="true" className="size-4 shrink-0" />
            Documents in Kazakh and Russian (legally binding) and English (translation).
          </p>
          <ConsentCheckbox checked={terms} onChange={setTerms} required>
            I accept the{' '}
            <a href={termsHref} target="_blank" rel="noreferrer">
              Terms of Use
            </a>
          </ConsentCheckbox>
          <ConsentCheckbox checked={privacy} onChange={setPrivacy} required>
            {getConsentLabel('en')}.{' '}
            <a href={consentHref} target="_blank" rel="noreferrer">
              Consent text
            </a>{' '}
            and{' '}
            <a href={privacyHref} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
          </ConsentCheckbox>
          <ConsentCheckbox checked={news} onChange={setNews}>
            Notify me about new tasks in the catalog
          </ConsentCheckbox>
          <button
            type="submit"
            disabled={!ready}
            className={buttonClasses({ variant: 'primary', size: 'lg', className: 'mt-2 w-full' })}
          >
            Accept and continue
          </button>
          <p className="text-xs text-muted">You can withdraw your consent at any time. Demo version, HackAlem AI 2026.</p>
        </form>
      </div>
    </div>
  );
}

/** AI transparency banner (English summary of ai-notice.md). Show it next to every AI result until a person confirms it. */
export function AiNoticeBanner({ href = '/legal/ai-notice?lang=en', className }: { href?: string; className?: string }) {
  return (
    <p
      role="note"
      className={clsx('flex items-start gap-2 border-2 border-border bg-accent-soft px-3 py-2 text-xs leading-5 text-foreground', className)}
    >
      <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        {getAiBannerText('en')}{' '}
        <a href={href} target="_blank" rel="noreferrer" className="font-semibold underline decoration-2 underline-offset-2">
          How we use AI
        </a>
      </span>
    </p>
  );
}

/** Footer row with links to the legal documents. */
export function LegalLinks({
  docs,
  lang,
  className,
}: {
  docs: Pick<ParsedDoc, 'slug' | 'title'>[];
  /** Appends ?lang= to every link, e.g. 'en' for the English interface. */
  lang?: LegalLang;
  className?: string;
}) {
  return (
    <nav aria-label="Legal documents" className={clsx('flex flex-wrap gap-x-5 gap-y-2 text-sm', className)}>
      {docs.map((d) => (
        <a
          key={d.slug}
          href={lang ? `/legal/${d.slug}?lang=${lang}` : `/legal/${d.slug}`}
          className="font-medium underline decoration-accent decoration-2 underline-offset-4 hover:bg-accent-soft"
        >
          {d.title}
        </a>
      ))}
    </nav>
  );
}

const LANG_OPTIONS: { lang: LegalLang; short: string; name: string; official: boolean }[] = [
  { lang: 'kk', short: 'KK', name: 'Қазақша', official: true },
  { lang: 'ru', short: 'RU', name: 'Русский', official: true },
  { lang: 'en', short: 'EN', name: 'English', official: false },
];

/**
 * Language switch for /legal/[slug] (brutal tabs as links, works in server components).
 *   <LegalLanguageSwitch current={lang} basePath={`/legal/${slug}`} />   → /legal/terms?lang=kk
 */
export function LegalLanguageSwitch({
  current,
  basePath,
  className,
}: {
  current: LegalLang;
  basePath: string;
  className?: string;
}) {
  return (
    <nav aria-label="Document language" className={clsx('flex flex-wrap items-center gap-3', className)}>
      <ul className="flex gap-2">
        {LANG_OPTIONS.map((o) => {
          const active = o.lang === current;
          return (
            <li key={o.lang}>
              <a
                href={`${basePath}?lang=${o.lang}`}
                hrefLang={o.lang}
                lang={o.lang}
                aria-current={active ? 'page' : undefined}
                title={o.official ? `${o.name} · legally binding` : `${o.name} · translation`}
                className={clsx(
                  'inline-flex min-h-10 items-center gap-2 border-2 border-border px-3 text-sm font-bold transition-[transform,box-shadow] duration-150',
                  active
                    ? '-translate-x-px -translate-y-px bg-accent text-accent-foreground shadow-[3px_3px_0_var(--foreground)]'
                    : 'bg-surface hover:bg-accent-soft',
                )}
              >
                <span className="font-extrabold">{o.short}</span>
                <span className="hidden sm:inline">{o.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">KK and RU are legally binding. EN is a translation.</p>
    </nav>
  );
}
