// Rating UI: the business sees a transparent readiness score 0-100, why it is what it is, and how to raise it.
// Owner: B. Presentational only: props in, callbacks out, no store or API access. Types: src/lib/types.ts.
// Motion is CSS only (transitions plus @starting-style through Tailwind `starting:`) and switches off under
// prefers-reduced-motion. No hooks, so every component renders in server and client trees alike.
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronRight, Sparkles, Trophy, X } from 'lucide-react';
import type {
  CardField, Level, PositionPreview as PositionPreviewData, Rating, RatingComponent, RatingKey, TaskCard,
} from '@/lib/types';
import { levelFor } from '@/lib/rating';

export type RatingLocale = 'ru' | 'en';

/** Language of the whole rating UI. One switch for every component below; each also takes a `locale` prop. */
const DEFAULT_LOCALE: RatingLocale = 'en';

const LEVELS: Level[] = ['draft', 'working', 'ready', 'priority'];

/** First total of each level, read from the rating module so the scale never drifts from the real rules. */
const LEVEL_START: Record<Level, number> = (() => {
  const start: Record<Level, number> = { draft: 0, working: 40, ready: 70, priority: 90 };
  for (let total = 100; total >= 0; total--) start[levelFor(total)] = total;
  return start;
})();

function levelRange(level: Level): [number, number] {
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  return [LEVEL_START[level], next ? LEVEL_START[next] - 1 : 100];
}

// ---------------------------------------------------------------------------------------------------------------
// Copy

function ruPlural(n: number, one: string, few: string, many: string) {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function ruPoints(n: number) {
  return ruPlural(n, 'балл', 'балла', 'баллов');
}

interface Dict {
  levels: Record<Level, string>;
  perks: Record<Level, string>;
  fields: Record<CardField, string>;
  panelTitle: string;
  of100: string;
  gauge: (total: number, level: string) => string;
  toNext: (points: number, level: string) => string;
  topLevel: string;
  scale: (ranges: string, total: number) => string;
  breakdown: string;
  breakdownNote: string;
  checks: (passed: number, total: number) => string;
  passed: string;
  failed: string;
  raise: string;
  gain: (points: number) => string;
  more: (count: number) => string;
  less: string;
  allDone: string;
  vague: string;
  vagueIn: (phrase: string, field: string) => string;
  position: string;
  of: (count: number) => string;
  ifNext: (position: number) => string;
  top: string;
  nextStep: string;
  levelUp: (level: string) => string;
  levelDown: (level: string) => string;
  close: string;
  history: string;
  historyEmpty: string;
  historyChart: (values: string) => string;
}

const RU: Dict = {
  levels: { draft: 'Черновик', working: 'Рабочая', ready: 'Готовая', priority: 'Приоритетная' },
  perks: {
    draft: 'Видна в каталоге с пометкой',
    working: 'Попадает в рекомендации командам',
    ready: 'Поднимается выше в каталоге',
    priority: 'Выделена в каталоге',
  },
  fields: {
    title: 'Название', context: 'Контекст', need: 'Потребность', users: 'Пользователи', data: 'Данные и материалы',
    constraints: 'Ограничения', expectedResult: 'Ожидаемый результат', successCriteria: 'Критерии успеха',
    contact: 'Контакт и формат',
  },
  panelTitle: 'Рейтинг готовности',
  of100: 'из 100',
  gauge: (total, level) => `Рейтинг готовности ${total} из 100, уровень «${level}»`,
  toNext: (points, level) => `Еще ${points} ${ruPoints(points)} до уровня «${level}»`,
  topLevel: 'Максимальный уровень',
  scale: (ranges, total) => `Шкала уровней: ${ranges}. Сейчас ${total}`,
  breakdown: 'Из чего складывается',
  breakdownNote: 'Считает код по открытым правилам, без ИИ. Баллы только за заполненные и подтвержденные поля.',
  checks: (passed, total) => `Проверки: ${passed} из ${total}`,
  passed: 'Пройдено:',
  failed: 'Не пройдено:',
  raise: 'Как поднять рейтинг',
  gain: (points) => `+${points} ${ruPoints(points)}`,
  more: (count) => `Показать еще ${count}`,
  less: 'Свернуть',
  allDone: 'Все проверки пройдены',
  vague: 'Размытые формулировки',
  vagueIn: (phrase, field) => `«${phrase}» в поле «${field}»`,
  position: 'Место в каталоге',
  of: (count) => `из ${count}`,
  ifNext: (position) => `→ #${position}, если:`,
  top: 'Первое место в каталоге',
  nextStep: 'Следующий шаг:',
  levelUp: (level) => `Новый уровень: ${level}`,
  levelDown: (level) => `Уровень снижен: ${level}`,
  close: 'Закрыть',
  history: 'История рейтинга',
  historyEmpty: 'Истории пока нет',
  historyChart: (values) => `История рейтинга: ${values}`,
};

const EN: Dict = {
  levels: { draft: 'Draft', working: 'Working', ready: 'Ready', priority: 'Priority' },
  perks: {
    draft: 'Visible in the catalog, flagged as draft',
    working: 'Recommended to matching teams',
    ready: 'Boosted catalog position',
    priority: 'Highlighted in the catalog',
  },
  fields: {
    title: 'Title', context: 'Context', need: 'Need', users: 'Users', data: 'Data & materials',
    constraints: 'Constraints', expectedResult: 'Expected result', successCriteria: 'Success criteria',
    contact: 'Contact & format',
  },
  panelTitle: 'Readiness rating',
  of100: 'of 100',
  gauge: (total, level) => `Readiness rating ${total} of 100, level ${level}`,
  toNext: (points, level) => `${points} ${points === 1 ? 'point' : 'points'} to ${level}`,
  topLevel: 'Top level reached',
  scale: (ranges, total) => `Level scale: ${ranges}. Now ${total}`,
  breakdown: 'Breakdown',
  breakdownNote: 'Computed by code from open rules, no AI. Points only for filled and confirmed fields.',
  checks: (passed, total) => `Checks: ${passed} of ${total}`,
  passed: 'Passed:',
  failed: 'Failed:',
  raise: 'How to raise the score',
  gain: (points) => `+${points} ${points === 1 ? 'pt' : 'pts'}`,
  more: (count) => `Show ${count} more`,
  less: 'Show less',
  allDone: 'All checks passed',
  vague: 'Vague wording',
  vagueIn: (phrase, field) => `"${phrase}" in ${field}`,
  position: 'Catalog position',
  of: (count) => `of ${count}`,
  ifNext: (position) => `→ #${position} if you:`,
  top: 'Top of the catalog',
  nextStep: 'Next step:',
  levelUp: (level) => `New level: ${level}`,
  levelDown: (level) => `Level down: ${level}`,
  close: 'Close',
  history: 'Score history',
  historyEmpty: 'No history yet',
  historyChart: (values) => `Score history: ${values}`,
};

const DICT: Record<RatingLocale, Dict> = { ru: RU, en: EN };

/** Localized level name, for other components (catalog filters, cards) that need the same wording. */
export function levelLabel(level: Level, locale: RatingLocale = DEFAULT_LOCALE): string {
  return DICT[locale].levels[level];
}

// Russian for the texts rateCard() emits in English. Exact match only: when a rule changes in src/lib/rating,
// the new text shows as is (in English) instead of a stale translation that no longer matches the rule.
const RU_COMPONENT: Record<RatingKey, string> = {
  contextNeed: 'Контекст и потребность',
  data: 'Данные и материалы',
  expectedResult: 'Ожидаемый результат',
  successCriteria: 'Критерии успеха (измеримые)',
  constraints: 'Ограничения',
  users: 'Пользователи',
  contact: 'Контакт и формат работы',
};

const RU_FIELD = new Map<string, string>([
  ['context', 'Контекст'],
  ['need', 'Потребность'],
  ['data & materials', 'Данные и материалы'],
  ['expected result', 'Ожидаемый результат'],
  ['success criteria', 'Критерии успеха'],
  ['constraints', 'Ограничения'],
  ['users', 'Пользователи'],
  ['contact & format', 'Контакт и формат'],
]);

const RU_TEXT = new Map<string, string>([
  // check rules (also used as next-action texts)
  ['At least a short sentence is provided (≥ 8 characters)', 'Есть хотя бы короткое предложение (от 8 символов)'],
  ['Points only for filled AND confirmed fields', 'Баллы только за заполненные и подтвержденные поля'],
  ['Describe the current process in ≥ 12 words', 'Опишите текущий процесс, от 12 слов'],
  ['Say what should change (a verb like automate / reduce / replace)', 'Скажите, что должно измениться (глагол: автоматизировать, сократить, заменить)'],
  ['Mention concrete files, systems, samples or access (e.g. "Excel export", "CRM API")', 'Назовите файлы, системы, примеры или доступы (например, «выгрузка Excel», «API CRM»)'],
  ['Name the deliverable (script, service, dashboard, bot, report, prototype…)', 'Назовите, что нужно сдать (скрипт, сервис, дашборд, бот, отчет, прототип…)'],
  ['Include a number, %, time or threshold (e.g. "entry time −80%", "zero duplicates")', 'Добавьте число, %, время или порог (например, «время ввода −80%», «ноль дублей»)'],
  ['State a deadline, required tech, or access/permission boundaries', 'Укажите срок, нужные технологии или границы доступа'],
  ['Name the role and how many (e.g. "6 sales managers")', 'Назовите роль и количество (например, «6 менеджеров по продажам»)'],
  ['Name a contact role and the format of consultations (e.g. weekly call, chat)', 'Назовите контактное лицо и формат консультаций (например, созвон раз в неделю, чат)'],
  // quality check labels
  ['Context describes the current situation', 'Контекст описывает текущую ситуацию'],
  ['Need states what must change', 'Сказано, что должно измениться'],
  ['Names concrete sources or examples', 'Названы конкретные источники или примеры'],
  ['Result is a concrete deliverable', 'Результат назван конкретно'],
  ['Criteria are measurable', 'Критерии измеримы'],
  ['Mentions deadline, technology or access limits', 'Есть срок, технологии или ограничения доступа'],
  ['Users are specific', 'Пользователи названы конкретно'],
  ['Contact person and interaction format', 'Есть контактное лицо и формат работы'],
  // vagueness asks
  ['Give a concrete deadline (e.g. "by 15 November").', 'Укажите конкретный срок (например, «до 15 ноября»).'],
  ['List the items explicitly instead of "etc."', 'Перечислите пункты явно вместо «и т.д.»'],
  ['Name the exact data/files/users and where they are.', 'Назовите конкретные данные, файлы или пользователей и где они находятся.'],
  ['State what to improve, by how much and how you will measure it.', 'Укажите, что улучшить, насколько и как это измерить.'],
  ['Which exact steps should be automated, from what input to what output?', 'Какие именно шаги автоматизировать: от какого входа к какому результату?'],
  ['Give a concrete deadline.', 'Укажите конкретный срок.'],
  ['Replace "better/faster" with a measurable target.', 'Замените «лучше/быстрее» измеримой целью.'],
]);

const RU_TEMPLATES: [RegExp, (field: string) => string][] = [
  [/^(.+): filled$/, (field) => `${field}: заполнено`],
  [/^(.+): confirmed by business$/, (field) => `${field}: подтверждено бизнесом`],
  [/^Add (.+)$/, (field) => `Заполните «${field}»`],
  [/^Confirm (.+)$/, (field) => `Подтвердите «${field}»`],
];

function localize(text: string, locale: RatingLocale): string {
  if (locale !== 'ru') return text;
  const exact = RU_TEXT.get(text);
  if (exact) return exact;
  for (const [pattern, format] of RU_TEMPLATES) {
    const match = pattern.exec(text);
    const field = match ? RU_FIELD.get(match[1].toLowerCase()) : undefined;
    if (field) return format(field);
  }
  return text;
}

interface NoteCopy {
  exact: Map<string, string>;
  /** Field names by CardField key ("successCriteria"). */
  fieldByKey: Map<string, string>;
  /** Field names by lowercase English label ("expected result"), the shape seed notes use. */
  fieldByLabel: Map<string, string>;
  confirmed: string;
  unconfirmed: string;
}

const NOTE_COPY: Record<RatingLocale, NoteCopy> = {
  ru: {
    exact: new Map([
      ['created', 'Карточка создана'],
      ['card created from draft', 'Карточка создана из черновика'],
      ['published', 'Опубликована в каталоге'],
    ]),
    fieldByKey: new Map(Object.entries(RU.fields)),
    fieldByLabel: RU_FIELD,
    confirmed: 'Подтверждено',
    unconfirmed: 'Снято подтверждение',
  },
  en: {
    exact: new Map([
      ['created', 'Card created'],
      ['card created from draft', 'Card created from draft'],
      ['published', 'Published to the catalog'],
    ]),
    fieldByKey: new Map(Object.entries(EN.fields)),
    fieldByLabel: new Map(Object.values(EN.fields).map((label): [string, string] => [label.toLowerCase(), label])),
    confirmed: 'Confirmed',
    unconfirmed: 'Unconfirmed',
  },
};

/** History notes come from the store ("confirmed successCriteria") or seed data; known shapes become readable text. */
function localizeNote(note: string, locale: RatingLocale): string {
  const copy = NOTE_COPY[locale];
  const exact = copy.exact.get(note);
  if (exact) return exact;
  const match = /^(un)?confirmed (.+)$/.exec(note);
  if (!match) return note;
  const fields = match[2].split(/,\s*/).map((f) => copy.fieldByKey.get(f) ?? copy.fieldByLabel.get(f.toLowerCase()));
  if (fields.some((f) => !f)) return note;
  return `${match[1] ? copy.unconfirmed : copy.confirmed}: ${fields.join(', ')}`;
}

function componentLabel(component: RatingComponent, locale: RatingLocale): string {
  return locale === 'ru' ? RU_COMPONENT[component.key] ?? component.label : component.label;
}

// ---------------------------------------------------------------------------------------------------------------
// Shared styles (docs/DESIGN.md, "Brutal tech": radius 0, 2px graphite borders, hard shadows, hairline inside cards)

const SURFACE = 'rounded-card border-2 border-border bg-surface';
/** Same lime focus ring as the UI kit (src/components/ui/styles.ts, focusRing). */
const FOCUS = 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
/** Enter animation for values that change: the new value rises in. Keyed elements replay it. */
const POP = 'transition-[opacity,translate] duration-300 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none';

const BADGE: Record<Level, string> = {
  draft: 'bg-surface-2 text-zinc-600',
  working: 'bg-amber-100 text-amber-800',
  ready: 'bg-accent-soft text-[#365314]',
  priority: 'bg-primary text-primary-foreground',
};
const BADGE_DOT: Record<Level, string> = {
  draft: 'bg-level-draft',
  working: 'bg-level-working',
  ready: 'bg-accent-strong',
  priority: 'bg-accent',
};
const LEVEL_FILL: Record<Level, string> = {
  draft: 'bg-level-draft',
  working: 'bg-level-working',
  ready: 'bg-level-ready',
  priority: 'bg-level-priority',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------------------------------------------
// LevelBadge

export function LevelBadge({ level, locale = DEFAULT_LOCALE, className }: {
  level: Level;
  locale?: RatingLocale;
  className?: string;
}) {
  const t = DICT[locale];
  const [from, to] = levelRange(level);
  return (
    <span
      title={`${t.levels[level]}: ${from}-${to}. ${t.perks[level]}`}
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        BADGE[level],
        className,
      )}
    >
      <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', BADGE_DOT[level])} />
      {t.levels[level]}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// ScoreBar

/** Thin progress bar. Decorative unless `label` is given (then it is an accessible progressbar). */
export function ScoreBar({ points, max, level, label, className }: {
  points: number;
  max: number;
  /** Fill with the level color instead of lime. */
  level?: Level;
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? clamp((points / max) * 100, 0, 100) : 0;
  return (
    <span
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? max : undefined}
      aria-valuenow={label ? points : undefined}
      aria-hidden={label ? undefined : true}
      className={clsx('block h-1.5 w-full overflow-hidden bg-surface-2', className)}
    >
      <span
        className={clsx(
          'block h-full w-(--fill) transition-[width] duration-[600ms] ease-[ease] starting:w-0 motion-reduce:transition-none',
          level ? LEVEL_FILL[level] : 'bg-accent',
        )}
        style={{ '--fill': `${pct}%` } as CSSProperties}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// RatingPanel

const RING_R = 52; // circumference 2 * PI * 52 = 326.73, the literal in the gauge's starting:[stroke-dashoffset]
const RING_C = 2 * Math.PI * RING_R;

function Gauge({ total, label, caption }: { total: number; label: string; caption: string }) {
  return (
    <div role="img" aria-label={label} className="relative size-32 shrink-0">
      <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="10" className="stroke-surface-2" />
        {total > 0 && (
          <circle
            cx="60"
            cy="60"
            r={RING_R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="butt"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - total / 100)}
            className="stroke-accent transition-[stroke-dashoffset] duration-[600ms] ease-[ease] starting:[stroke-dashoffset:326.73px] motion-reduce:transition-none"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span key={total} className={clsx('font-display text-4xl font-bold leading-none tabular-nums text-foreground', POP)}>
          {total}
        </span>
        <span className="mt-1 text-xs text-muted">{caption}</span>
      </span>
    </div>
  );
}

function LevelTrack({ total, level, t }: { total: number; level: Level; t: Dict }) {
  const current = LEVELS.indexOf(level);
  const widths = LEVELS.map((l, i) => (i < LEVELS.length - 1 ? LEVEL_START[LEVELS[i + 1]] : 101) - LEVEL_START[l]);
  const ranges = LEVELS.map((l) => `${t.levels[l]} ${levelRange(l).join('-')}`).join(', ');
  return (
    <div role="img" aria-label={t.scale(ranges, total)} className="relative mt-5">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: widths.map((w) => `${w}fr`).join(' ') }}>
        {LEVELS.map((l, i) => {
          const [from, to] = levelRange(l);
          return (
            <div key={l} title={`${t.levels[l]}: ${from}-${to}. ${t.perks[l]}`}>
              <span
                className={clsx(
                  'block h-2 transition-opacity duration-300 motion-reduce:transition-none',
                  LEVEL_FILL[l],
                  i > current && 'opacity-25',
                )}
              />
              <span className={clsx('mt-1.5 block text-[11px] leading-none tabular-nums', i === current ? 'font-semibold text-foreground' : 'text-muted')}>
                {from}
              </span>
            </div>
          );
        })}
      </div>
      <span
        aria-hidden="true"
        className="absolute -top-1 left-(--pos) h-4 w-1 -translate-x-1/2 bg-foreground ring-2 ring-surface transition-[left] duration-[600ms] ease-[ease] starting:left-0 motion-reduce:transition-none"
        style={{ '--pos': `${total}%` } as CSSProperties}
      />
    </div>
  );
}

function ComponentRow({ component, locale, open }: { component: RatingComponent; locale: RatingLocale; open: boolean }) {
  const t = DICT[locale];
  const passed = component.checks.filter((check) => check.passed).length;
  const complete = component.points >= component.max;
  return (
    <li className="py-1.5">
      <details open={open} className="group/row">
        <summary
          className={clsx(
            'flex cursor-pointer list-none items-start gap-2 rounded-control py-1.5 [&::-webkit-details-marker]:hidden',
            FOCUS,
          )}
        >
          <ChevronRight
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-open/row:rotate-90 motion-reduce:transition-none"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{componentLabel(component, locale)}</span>
              <span className="shrink-0 text-sm tabular-nums">
                <span className={clsx('font-bold', complete ? 'text-[#365314]' : 'text-foreground')}>{component.points}</span>
                <span className="text-muted">/{component.max}</span>
              </span>
            </span>
            <ScoreBar points={component.points} max={component.max} className="mt-1.5" />
            <span aria-hidden="true" className="mt-1.5 flex items-center gap-1">
              {component.checks.map((check, i) => (
                <span
                  key={i}
                  className={clsx('size-1.5', check.passed ? 'bg-accent-strong' : 'border border-zinc-400')}
                />
              ))}
            </span>
            <span className="sr-only">{t.checks(passed, component.checks.length)}</span>
          </span>
        </summary>
        <ul className="mt-1 space-y-2 pb-1 pl-6">
          {component.checks.map((check, i) => (
            <li key={`${i}-${check.label}`} className="flex gap-2 text-xs">
              <span
                className={clsx(
                  'mt-px grid size-4 shrink-0 place-items-center',
                  check.passed ? 'bg-accent-soft text-[#365314]' : 'bg-surface-2 text-muted',
                )}
              >
                {check.passed
                  ? <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                  : <X aria-hidden="true" className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    <span className="sr-only">{check.passed ? t.passed : t.failed} </span>
                    {localize(check.label, locale)}
                  </span>
                  {check.points > 0 && (
                    <span className={clsx('shrink-0 tabular-nums', check.passed ? 'font-bold text-[#365314]' : 'text-muted')}>
                      +{check.points}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-muted">{localize(check.rule, locale)}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

/** A list row that becomes a real button when there is something to do on click. */
function ActionItem({ onClick, hover, children }: { onClick?: () => void; hover: string; children: ReactNode }) {
  const base = 'flex w-full items-start gap-2 rounded-control px-2.5 py-2 text-left text-sm text-foreground';
  if (!onClick) return <div className={base}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(base, 'group/item cursor-pointer transition-colors motion-reduce:transition-none', hover, FOCUS)}
    >
      {children}
      <ChevronRight
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-hover/item:translate-x-0.5 motion-reduce:transition-none"
      />
    </button>
  );
}

export function RatingPanel({
  rating,
  onAction,
  locale = DEFAULT_LOCALE,
  defaultExpanded = false,
  maxActions = 5,
  showVagueness = true,
  className,
}: {
  rating: Rating;
  /** Called with the card field to jump to when a next best action (or a vague phrase) is clicked. */
  onAction?: (field: CardField) => void;
  locale?: RatingLocale;
  /** Open every component's check list. Default: collapsed rows with bars and check pips. */
  defaultExpanded?: boolean;
  /** Next best actions shown before "show more". */
  maxActions?: number;
  showVagueness?: boolean;
  className?: string;
}) {
  const t = DICT[locale];
  const total = clamp(Math.round(rating.total), 0, 100);
  const levelName = t.levels[rating.level];
  const next = LEVELS[LEVELS.indexOf(rating.level) + 1];
  const toNext = next ? Math.max(0, LEVEL_START[next] - total) : 0;
  const gaugeLabel = t.gauge(total, levelName);
  const shown = rating.nextActions.slice(0, Math.max(0, maxActions));
  const rest = rating.nextActions.slice(Math.max(0, maxActions));

  const actionRow = (action: Rating['nextActions'][number], i: number) => (
    <li key={`${action.field}-${i}`}>
      <ActionItem hover="hover:bg-accent-soft" onClick={onAction && (() => onAction(action.field))}>
        <span className="min-w-0 flex-1">
          <span className="font-bold tabular-nums text-[#365314]">{t.gain(action.gain)}</span>
          <span aria-hidden="true" className="text-muted"> · </span>
          <span>{localize(action.text, locale)}</span>
        </span>
      </ActionItem>
    </li>
  );

  return (
    <section className={clsx(SURFACE, 'p-5 shadow-card', className)}>
      <h2 className="text-sm font-extrabold text-foreground">{t.panelTitle}</h2>

      <div className="mt-4 flex items-center gap-4">
        <Gauge total={total} label={gaugeLabel} caption={t.of100} />
        <div className="min-w-0 space-y-2">
          <LevelBadge
            key={rating.level}
            level={rating.level}
            locale={locale}
            className="transition-[opacity,scale] duration-300 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none"
          />
          <p className="text-xs text-foreground">{next ? t.toNext(toNext, t.levels[next]) : t.topLevel}</p>
          <p className="text-xs text-muted">{t.perks[rating.level]}</p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{gaugeLabel}</p>

      <LevelTrack total={total} level={rating.level} t={t} />

      {rating.components.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-foreground">{t.breakdown}</h3>
          <p className="mt-1 text-xs text-muted">{t.breakdownNote}</p>
          <ul className="mt-2 divide-y divide-hairline">
            {rating.components.map((component) => (
              <ComponentRow key={component.key} component={component} locale={locale} open={defaultExpanded} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-bold text-foreground">{t.raise}</h3>
        {rating.nextActions.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#365314]">
            <span className="grid size-5 place-items-center bg-accent-soft">
              <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
            </span>
            {t.allDone}
          </p>
        ) : (
          <>
            <ul className="-mx-2.5 mt-1">{shown.map(actionRow)}</ul>
            {rest.length > 0 && (
              <details className="group/more">
                <summary
                  className={clsx(
                    '-ml-1 mt-1 inline-flex cursor-pointer list-none items-center gap-1 rounded-control px-1 py-1 text-xs font-medium text-muted hover:text-foreground [&::-webkit-details-marker]:hidden',
                    FOCUS,
                  )}
                >
                  <ChevronRight aria-hidden="true" className="size-3.5 transition-transform group-open/more:rotate-90 motion-reduce:transition-none" />
                  <span className="group-open/more:hidden">{t.more(rest.length)}</span>
                  <span className="hidden group-open/more:inline">{t.less}</span>
                </summary>
                <ul className="-mx-2.5 mt-1">{rest.map((action, i) => actionRow(action, i + shown.length))}</ul>
              </details>
            )}
          </>
        )}
      </div>

      {showVagueness && rating.vagueness.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-foreground">{t.vague}</h3>
          <ul className="-mx-2.5 mt-1">
            {rating.vagueness.map((flag, i) => (
              <li key={`${flag.field}-${flag.phrase}-${i}`}>
                <ActionItem hover="hover:bg-amber-50" onClick={onAction && (() => onAction(flag.field))}>
                  <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-level-working" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t.vagueIn(flag.phrase, t.fields[flag.field] ?? flag.field)}</span>
                    <span className="block text-xs text-muted">{localize(flag.ask, locale)}</span>
                  </span>
                </ActionItem>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// PositionPreview

function Hint({ tone, icon, onClick, children }: {
  tone: 'lime' | 'neutral';
  icon: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls = clsx(
    'mt-3 flex w-full items-start gap-2.5 rounded-control p-3 text-left text-sm',
    tone === 'lime' ? 'bg-accent-soft text-[#365314]' : 'bg-surface-2 text-foreground',
  );
  const body = (
    <>
      <span
        className={clsx(
          'grid size-6 shrink-0 place-items-center',
          tone === 'lime' ? 'bg-accent text-accent-foreground' : 'bg-surface text-muted',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </>
  );
  if (!onClick) return <p className={cls}>{body}</p>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        cls,
        'group/hint cursor-pointer transition-colors motion-reduce:transition-none',
        tone === 'lime' ? 'hover:bg-lime-200' : 'hover:bg-border',
        FOCUS,
      )}
    >
      {body}
      <ChevronRight
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 opacity-60 transition-transform group-hover/hint:translate-x-0.5 motion-reduce:transition-none"
      />
    </button>
  );
}

export function PositionPreview({ preview, onAction, locale = DEFAULT_LOCALE, className }: {
  preview: PositionPreviewData;
  /** Makes the "if you do X" hint a button that jumps to the field. */
  onAction?: (field: CardField) => void;
  locale?: RatingLocale;
  className?: string;
}) {
  const t = DICT[locale];
  const { position, of, ifNext } = preview;
  const climb = ifNext && ifNext.position < position ? ifNext : undefined;

  let hint: ReactNode = null;
  if (climb) {
    hint = (
      <Hint
        tone="lime"
        icon={<ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
        onClick={onAction && (() => onAction(climb.action.field))}
      >
        <span className="font-bold tabular-nums">{t.ifNext(climb.position)}</span>{' '}
        {localize(climb.action.text, locale)}
        <span className="mt-0.5 block text-xs font-bold tabular-nums">{t.gain(climb.action.gain)}</span>
      </Hint>
    );
  } else if (position === 1) {
    hint = (
      <Hint tone="lime" icon={<Trophy aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}>
        <span className="font-medium">{t.top}</span>
      </Hint>
    );
  } else if (ifNext) {
    const step = ifNext;
    hint = (
      <Hint
        tone="neutral"
        icon={<ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
        onClick={onAction && (() => onAction(step.action.field))}
      >
        <span className="font-bold">{t.nextStep}</span> {localize(step.action.text, locale)}
        <span className="mt-0.5 block text-xs font-bold tabular-nums text-[#365314]">{t.gain(step.action.gain)}</span>
      </Hint>
    );
  }

  return (
    <section className={clsx(SURFACE, 'p-4 shadow-card', className)}>
      <h2 className="text-xs font-medium text-muted">{t.position}</h2>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span key={position} className={clsx('font-display text-3xl font-bold leading-none tabular-nums text-foreground', POP)}>
          #{position}
        </span>
        <span className="text-sm tabular-nums text-muted">{t.of(of)}</span>
      </p>
      {hint}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// LevelUpToast

/** Level-change card. Fixed at the bottom center by default; the caller mounts it and hides it after a timeout. */
export function LevelUpToast({ from, to, locale = DEFAULT_LOCALE, floating = true, onClose, className }: {
  from: Level;
  to: Level;
  locale?: RatingLocale;
  /** false renders the card in place, for callers that position it themselves. */
  floating?: boolean;
  /** Shows a close button. */
  onClose?: () => void;
  className?: string;
}) {
  const t = DICT[locale];
  const up = LEVELS.indexOf(to) >= LEVELS.indexOf(from);
  const card = (
    <div
      key={`${from}-${to}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={clsx(
        SURFACE,
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4 shadow-pop',
        'transition-[opacity,scale,translate] duration-300 ease-out starting:translate-y-2 starting:scale-95 starting:opacity-0 motion-reduce:transition-none',
        className,
      )}
    >
      <span
        className={clsx(
          'grid size-9 shrink-0 place-items-center',
          up ? 'bg-accent text-accent-foreground' : 'bg-surface-2 text-muted',
        )}
      >
        {up
          ? <Sparkles aria-hidden="true" className="size-[18px]" />
          : <ArrowDown aria-hidden="true" className="size-[18px]" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-foreground">
          {up ? t.levelUp(t.levels[to]) : t.levelDown(t.levels[to])}
        </p>
        <p aria-hidden="true" className="mt-2 flex flex-wrap items-center gap-1.5">
          <LevelBadge level={from} locale={locale} />
          <ArrowRight className="size-3.5 text-muted" />
          <LevelBadge level={to} locale={locale} />
        </p>
        <p className="mt-2 text-xs text-muted">{t.perks[to]}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className={clsx(
            '-mr-1 -mt-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-control text-muted hover:bg-surface-2 hover:text-foreground',
            FOCUS,
          )}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
  if (!floating) return card;
  return <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">{card}</div>;
}

// ---------------------------------------------------------------------------------------------------------------
// ScoreHistory

const CHART_W = 240;
const CHART_H = 56;
const CHART_PAD = 6;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** Step chart of the score after each confirmed change (TaskCard.history), with the values underneath. */
export function ScoreHistory({ history, locale = DEFAULT_LOCALE, className }: {
  history: TaskCard['history'];
  locale?: RatingLocale;
  className?: string;
}) {
  const t = DICT[locale];
  // One point per score change: consecutive snapshots with the same total collapse into the first of them.
  const points = history.filter((entry, i) => i === 0 || entry.total !== history[i - 1].total);

  if (points.length === 0) {
    return (
      <section className={clsx(SURFACE, 'p-4 shadow-card', className)}>
        <h2 className="text-sm font-extrabold text-foreground">{t.history}</h2>
        <p className="mt-1 text-xs text-muted">{t.historyEmpty}</p>
      </section>
    );
  }

  const values = points.map((entry) => clamp(Math.round(entry.total), 0, 100));
  const n = values.length;
  const x = (i: number) => round1(n === 1 ? CHART_W / 2 : CHART_PAD + (i * (CHART_W - 2 * CHART_PAD)) / (n - 1));
  const y = (value: number) => round1(CHART_PAD + (1 - value / 100) * (CHART_H - 2 * CHART_PAD));
  let line = `M${x(0)} ${y(values[0])}`;
  for (let i = 1; i < n; i++) line += ` H${x(i)} V${y(values[i])}`;
  const area = `${line} V${y(0)} H${x(0)} Z`;
  const delta = values[n - 1] - values[0];
  const labels: (number | null)[] = n > 6 ? [values[0], null, ...values.slice(-5)] : values;
  const thresholds = LEVELS.slice(1).map((l) => LEVEL_START[l]);

  return (
    <section className={clsx(SURFACE, 'p-4 shadow-card', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-foreground">{t.history}</h2>
        {delta !== 0 && (
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
              delta > 0 ? 'bg-accent-soft text-[#365314]' : 'bg-surface-2 text-muted',
            )}
          >
            {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        aria-label={t.historyChart(values.join(' → '))}
        className="mt-3 block h-auto w-full overflow-visible"
      >
        {thresholds.map((value) => (
          <line key={value} x1={0} x2={CHART_W} y1={y(value)} y2={y(value)} strokeWidth={1} strokeDasharray="2 3" className="stroke-border" />
        ))}
        <path d={area} className="fill-accent-soft transition-opacity duration-500 starting:opacity-0 motion-reduce:transition-none" />
        <path
          d={line}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="stroke-foreground transition-[stroke-dashoffset] duration-700 ease-out starting:[stroke-dashoffset:1] motion-reduce:transition-none"
        />
        {values.map((value, i) => (
          <g key={i}>
            <title>{`${value} · ${localizeNote(points[i].note, locale)}`}</title>
            <circle cx={x(i)} cy={y(value)} r={8} fill="transparent" />
            {i === n - 1 ? (
              // endpoint: lime square, the same "LED" as the logo indicator
              <rect x={x(i) - 4.5} y={y(value) - 4.5} width={9} height={9} strokeWidth={1.5} className="fill-accent stroke-foreground" />
            ) : (
              <rect x={x(i) - 2.5} y={y(value) - 2.5} width={5} height={5} strokeWidth={1.5} className="fill-surface stroke-foreground" />
            )}
          </g>
        ))}
      </svg>
      <p aria-hidden="true" className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums text-muted">
        {labels.map((value, i) => (
          <Fragment key={i}>
            {i > 0 && <span>→</span>}
            <span className={clsx(i === labels.length - 1 && 'font-semibold text-foreground')}>{value ?? '…'}</span>
          </Fragment>
        ))}
      </p>
    </section>
  );
}
