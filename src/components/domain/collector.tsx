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
  /** Download URL of the Windows build (.zip or .exe). Without it the button shows "скоро". */
  href?: string;
  version?: string;
  sizeLabel?: string;
  /** Server address the user pastes into the Collector settings. */
  serverUrl?: string;
  className?: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const features = [
    ['Трекер активности', 'Категории приложений и переносы между ними, без содержимого окон'],
    ['Заметки встреч', 'Звук Zoom, Teams или Meet превращается в расшифровку'],
    ['Каналы связи', 'Сообщения рабочей группы, имена заменены ролями'],
  ] as const;

  return (
    <section
      aria-labelledby="collector-download-title"
      className={clsx('rounded-card border-2 border-border bg-surface shadow-card', className)}
    >
      <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-extrabold tracking-[0.12em] text-muted uppercase">Приложение для Windows</p>
          <h2 id="collector-download-title" className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <span className="font-display tracking-[0.03em]">КӨПІР</span> Collector
            <span aria-hidden="true" className="led" />
          </h2>
          <p className="mt-2 text-sm text-muted">
            Установите на компьютеры команды, и Discover найдет задачи для студентов по реальной работе: встречам,
            переписке и тому, где теряется время.
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
                Сотрудники уведомлены и согласны на{' '}
                <a href="/legal/collector" target="_blank" rel="noreferrer">
                  обезличенную аналитику
                </a>
              </ConsentCheckbox>
              {agreed ? (
                <a href={href} download className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full' })}>
                  <Download aria-hidden="true" /> Скачать для Windows
                </a>
              ) : (
                <span aria-disabled="true" className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full' })}>
                  <Download aria-hidden="true" /> Скачать для Windows
                </span>
              )}
            </>
          ) : (
            <span
              aria-disabled="true"
              className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-full' })}
            >
              <MonitorSmartphone aria-hidden="true" /> Скоро для Windows
            </span>
          )}
          {version || sizeLabel ? (
            <p className="text-center text-xs text-muted tabular-nums">
              {[version && `Версия ${version}`, sizeLabel].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <ol className="grid gap-1.5 border-2 border-border bg-surface-2 p-3 text-xs">
            <li>1. Скачайте и распакуйте архив.</li>
            <li>2. Запустите КӨПІР Collector.</li>
            <li>
              3. Вставьте адрес сервера{serverUrl ? <b className="font-semibold break-all"> {serverUrl}</b> : null} и
              токен, включите нужные переключатели.
            </li>
          </ol>
        </div>
      </div>
      <p className="flex items-start gap-2 border-t-2 border-border px-5 py-3 text-xs text-muted sm:px-6">
        <ShieldCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-foreground" />
        Названия окон и содержимое не покидают компьютер. Отправляются только категории приложений и анонимные
        события, паттерн показывается, только если в нем минимум 5 человек.
      </p>
    </section>
  );
}
