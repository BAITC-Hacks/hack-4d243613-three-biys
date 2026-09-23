'use client';
// Landing "Pulse" (owner: B, design). Long scrolling page made of sections; C mounts <Landing /> on `/`.
// Presentational only: links come in as props, no store or API access. No new dependencies:
// reveal-on-scroll uses IntersectionObserver, counters use requestAnimationFrame, the step line uses a scroll listener.
// Every animation switches off under prefers-reduced-motion and the final state is shown instead.
// Bilingual (EN/RU): every visible string lives in `T`; <Landing> owns the language and shows the switch in the hero.
import {
  createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode,
} from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowRight, Building2, Check, EyeOff, GraduationCap, Landmark, RotateCcw, ShieldCheck, Users,
} from 'lucide-react';
import type { Level } from '@/lib/types';
import { buttonClasses } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { controlBase } from '@/components/ui/styles';
import {
  CollectorLaptop, GridBackground, HeroPulse, PrivacyShield, StepCard, StepDraft, StepPublish, StepQuestions, StepRating,
} from '@/components/illustrations';
import { CollectorDownload } from './collector';
import { LevelBadge } from './rating';

// ---------------------------------------------------------------------------------------------------------------
// Language and copy

type LandingLang = 'en' | 'ru';

const LANGS: LandingLang[] = ['en', 'ru'];
const LANG_KEY = 'kopir:lang';

type CalcKey = 'people' | 'hours' | 'rate';

type Copy = {
  langLabel: string;
  quote: readonly [string, string];
  hero: {
    title: string;
    lead: string;
    describe: string;
    find: string;
    example: string;
    rated: (score: number) => string;
    ticker: readonly string[];
  };
  pain: {
    eyebrow: string;
    title: string;
    lead: string;
    solves: string;
    items: readonly { who: string; pain: string; fix: string }[];
  };
  how: {
    eyebrow: string;
    title: string;
    lead: string;
    ofPath: string;
    stepOf: (step: number, total: number) => string;
    steps: readonly { title: string; text: string }[];
  };
  calc: {
    eyebrow: string;
    title: string;
    lead: string;
    fields: Record<CalcKey, { label: string; hint: string; unit: string }>;
    formula: (weeks: number) => string;
    cta: string;
    estimate: string;
    hoursLost: string;
    hoursUnit: string;
    moneyLost: string;
    srEstimate: (hours: string, money: string) => string;
    teamNote: string;
    example: string;
    startAt: string;
    then: string;
    reach: string;
    after: string;
  };
  rating: {
    eyebrow: string;
    title: string;
    lead: string;
    levels: Record<Level, { name: string; line: string }>;
    exampleTask: string;
    ringLabel: (score: number, level: string) => string;
    of100: string;
    replay: string;
  };
  collector: {
    eyebrow: string;
    title: string;
    lead: string;
    points: readonly { title: string; text: string }[];
    exampleSignal: string;
    anonymized: string;
    spreadsheet: string;
    crm: string;
    to: string;
    habit: string;
    suggested: string;
    draft: string;
  };
  cta: { title: string; lead: string };
};

const T: Record<LandingLang, Copy> = {
  en: {
    langLabel: 'Language',
    quote: ['“', '”'],
    hero: {
      title: 'The bridge between a business task and a student team',
      lead:
        "Write the need in your own words, answer the AI's questions, and publish a task card with a transparent 0-100 rating that student teams can actually start on.",
      describe: 'Describe a task',
      find: 'Find a project',
      example: 'Example',
      rated: (score) => `rated ${score}`,
      ticker: [
        'Stock sync for a coffee chain',
        'Weekly sales report from three spreadsheets',
        'Clinic appointment reminders',
      ],
    },
    pain: {
      eyebrow: 'The problem',
      title: 'What hurts today',
      lead: 'Three sides want the same thing, a real task done well, and each one gets stuck at a different step.',
      solves: 'How Көпір solves it',
      items: [
        {
          who: 'Businesses',
          pain: 'Our task is a vague paragraph, and nobody picks it up.',
          fix: 'The AI asks at least 3 questions about what is missing, and the rating shows which answer adds the most points.',
        },
        {
          who: 'Students',
          pain: 'There are no real tasks, only toy projects.',
          fix: 'A catalog of real business tasks sorted by rating. Your team sends its own proposal: idea, plan, deadline, prototype.',
        },
        {
          who: 'Universities and accelerators',
          pain: 'There is no way to compare the quality of tasks.',
          fix: 'A transparent 0-100 score with a breakdown by component, and every accept or reject is a manual decision.',
        },
      ],
    },
    how: {
      eyebrow: 'How it works',
      title: 'From a vague paragraph to a card students can start on',
      lead: 'Five steps. The AI asks and suggests, you decide. Nothing is published until you confirm it.',
      ofPath: 'of the path',
      stepOf: (step, total) => `Step ${step} of ${total}`,
      steps: [
        { title: 'Draft', text: 'Write the need in your own words. One paragraph is enough to start.' },
        {
          title: 'AI questions',
          text: 'The AI finds the gaps and asks at least 3 questions, each one showing the points it can add.',
        },
        {
          title: 'Task card',
          text: 'Nine fields filled only from what you said. The AI never adds facts. You edit and confirm each field.',
        },
        {
          title: 'Rating 0-100',
          text: 'Points only for filled and confirmed fields, with a breakdown and the next step that raises the score.',
        },
        {
          title: 'Catalog',
          text: 'Publish at your rating position. Student teams send proposals, and you accept or reject them yourself.',
        },
      ],
    },
    calc: {
      eyebrow: 'Impact',
      title: 'What is the routine costing you?',
      lead: 'Put in your own numbers. Nothing here is a statistic: it is simple arithmetic on what you enter.',
      fields: {
        people: { label: 'People doing the routine', hint: 'Employees who repeat the same manual work', unit: 'people' },
        hours: { label: 'Hours per person per week', hint: 'Copying, checking, re-typing, reporting', unit: 'h' },
        rate: { label: 'Hourly cost', hint: 'Salary and overhead per hour, in tenge', unit: '₸' },
      },
      formula: (weeks) => `Formula: people × hours per week × ${weeks} weeks × hourly cost.`,
      cta: 'Turn this into a task',
      estimate: 'Estimate from your numbers',
      hoursLost: 'Hours lost per year',
      hoursUnit: 'h',
      moneyLost: 'Money lost per year',
      srEstimate: (hours, money) => `Estimate: ${hours} hours and ${money} tenge lost per year.`,
      teamNote: 'A student team can automate a routine like this in about 6-8 weeks.',
      example: 'Example',
      startAt: 'Your task would start at rating',
      then: 'then',
      reach: 'reach',
      after: 'after 3 AI questions.',
    },
    rating: {
      eyebrow: 'The rating',
      title: 'Every answer moves the task up the catalog',
      lead:
        'The score counts only fields that are filled and confirmed by the business. It is recalculated after every confirmed edit.',
      levels: {
        draft: { name: 'Draft 0-39', line: 'Visible in the catalog with a flag. The AI asks what is missing.' },
        working: { name: 'Working 40-69', line: 'Teams can send proposals, and it is recommended to matching teams.' },
        ready: { name: 'Ready 70-89', line: 'Boosted position in the catalog.' },
        priority: { name: 'Priority 90-100', line: 'Highlighted in the catalog. A low score never hides a task.' },
      },
      exampleTask: 'Example task',
      ringLabel: (score, level) => `Example rating ${score} of 100, level ${level}`,
      of100: 'of 100',
      replay: 'Replay',
    },
    collector: {
      eyebrow: 'Discover',
      title: 'Find the task in real work, not in a brainstorm',
      lead:
        'The Windows Collector notices where time goes: meetings and repeated hops between apps. Discover turns the patterns into drafts with the evidence attached.',
      points: [
        {
          title: 'What is collected',
          text: 'App categories (spreadsheet, CRM, mail), switches and data transfers between them, and meeting transcripts when you turn them on.',
        },
        {
          title: 'What never leaves the computer',
          text: 'Window titles and window contents. Only categories and anonymous events are sent.',
        },
        {
          title: 'The 5+ people rule',
          text: 'Discover shows a pattern only if at least 5 people share it, so no one can be singled out.',
        },
      ],
      exampleSignal: 'Example signal',
      anonymized: 'anonymized, 7 people',
      spreadsheet: 'Spreadsheet',
      crm: 'CRM',
      to: 'to',
      habit: 'copy and paste, every workday',
      suggested: 'Suggested draft:',
      draft: 'import spreadsheet rows into the CRM automatically',
    },
    cta: {
      title: "Your next task could be a student team's first real project",
      lead: 'Start with one paragraph. The rating shows what to add, and you choose the team.',
    },
  },
  ru: {
    langLabel: 'Язык',
    quote: ['«', '»'],
    hero: {
      title: 'Мост между задачей бизнеса и студенческой командой',
      lead:
        'Опишите потребность своими словами, ответьте на вопросы ИИ и опубликуйте карточку задачи с прозрачным рейтингом 0-100. С такой карточкой студенческая команда может сразу начать работу.',
      describe: 'Описать задачу',
      find: 'Найти проект',
      example: 'Пример',
      rated: (score) => `рейтинг ${score}`,
      ticker: ['Остатки для сети кофеен', 'Сводка продаж из трех таблиц', 'Напоминания о записи к врачу'],
    },
    pain: {
      eyebrow: 'Проблема',
      title: 'Что мешает сегодня',
      lead: 'Три стороны хотят одного: чтобы реальную задачу сделали хорошо. Но каждая застревает на своем шаге.',
      solves: 'Как это решает Көпір',
      items: [
        {
          who: 'Бизнес',
          pain: 'Наша задача описана расплывчатым абзацем, и за нее никто не берется.',
          fix: 'ИИ задает минимум 3 вопроса о том, чего не хватает, а рейтинг показывает, какой ответ добавит больше всего баллов.',
        },
        {
          who: 'Студенты',
          pain: 'Реальных задач нет, одни учебные проекты.',
          fix: 'Каталог реальных задач бизнеса, отсортированный по рейтингу. Ваша команда отправляет свое предложение: идею, план, срок, прототип.',
        },
        {
          who: 'Вузы и акселераторы',
          pain: 'Качество задач невозможно сравнить.',
          fix: 'Прозрачная оценка 0-100 с разбивкой по компонентам. Принять или отклонить каждое предложение решает человек.',
        },
      ],
    },
    how: {
      eyebrow: 'Как это работает',
      title: 'От расплывчатого абзаца к карточке, готовой для студенческой команды',
      lead: 'Пять шагов. ИИ спрашивает и предлагает, а решаете вы. Ничего не публикуется без вашего подтверждения.',
      ofPath: 'пути',
      stepOf: (step, total) => `Шаг ${step} из ${total}`,
      steps: [
        { title: 'Черновик', text: 'Опишите потребность своими словами. Для начала хватит одного абзаца.' },
        {
          title: 'Вопросы ИИ',
          text: 'ИИ находит пробелы и задает минимум 3 вопроса. У каждого видно, сколько баллов он может добавить.',
        },
        {
          title: 'Карточка задачи',
          text: 'Девять полей заполняются только из ваших слов. ИИ не добавляет фактов от себя. Каждое поле вы правите и подтверждаете сами.',
        },
        {
          title: 'Рейтинг 0-100',
          text: 'Баллы только за заполненные и подтвержденные поля. Видны разбивка и следующий шаг, который поднимет оценку.',
        },
        {
          title: 'Каталог',
          text: 'Задача публикуется на позиции по своему рейтингу. Студенческие команды присылают предложения, а принять или отклонить их решаете вы.',
        },
      ],
    },
    calc: {
      eyebrow: 'Эффект',
      title: 'Сколько вам стоит рутина?',
      lead: 'Введите свои цифры. Здесь нет статистики: только простая арифметика на основе ваших данных.',
      fields: {
        people: {
          label: 'Сколько человек занято рутиной',
          hint: 'Сотрудники, которые вручную повторяют одну и ту же работу',
          unit: 'чел.',
        },
        hours: { label: 'Часов в неделю на одного человека', hint: 'Копирование, сверка, перепечатка, отчеты', unit: 'ч' },
        rate: { label: 'Стоимость часа', hint: 'Зарплата и накладные расходы за час, в тенге', unit: '₸' },
      },
      formula: (weeks) => `Формула: люди × часы в неделю × ${weeks} нед. × стоимость часа.`,
      cta: 'Превратить в задачу',
      estimate: 'Оценка по вашим цифрам',
      hoursLost: 'Потеряно часов за год',
      hoursUnit: 'ч',
      moneyLost: 'Потеряно денег за год',
      srEstimate: (hours, money) => `Оценка потерь за год: ${hours} ч и ${money} тенге.`,
      teamNote: 'Студенческая команда может автоматизировать такую рутину примерно за 6-8 недель.',
      example: 'Пример',
      startAt: 'Ваша задача стартует с рейтинга',
      then: 'затем',
      reach: 'дойдет до',
      after: 'после 3 вопросов ИИ.',
    },
    rating: {
      eyebrow: 'Рейтинг',
      title: 'Каждый ответ поднимает задачу в каталоге',
      lead:
        'В оценку идут только поля, которые бизнес заполнил и подтвердил. Она пересчитывается после каждой подтвержденной правки.',
      levels: {
        draft: { name: 'Черновик 0-39', line: 'Видна в каталоге с пометкой. ИИ спрашивает, чего не хватает.' },
        working: {
          name: 'Рабочая 40-69',
          line: 'Команды могут присылать предложения, задачу рекомендуют подходящим командам.',
        },
        ready: { name: 'Готовая 70-89', line: 'Поднимается выше в каталоге.' },
        priority: { name: 'Приоритетная 90-100', line: 'Выделена в каталоге. Низкая оценка никогда не скрывает задачу.' },
      },
      exampleTask: 'Пример задачи',
      ringLabel: (score, level) => `Пример рейтинга: ${score} из 100, уровень ${level}`,
      of100: 'из 100',
      replay: 'Повторить',
    },
    collector: {
      eyebrow: 'Discover',
      title: 'Находите задачи в реальной работе, а не на мозговом штурме',
      lead:
        'Collector для Windows замечает, куда уходит время: встречи и повторяющиеся переходы между приложениями. Discover превращает эти закономерности в черновики задач с подтверждающими данными.',
      points: [
        {
          title: 'Что собирается',
          text: 'Категории приложений (таблицы, CRM, почта), переключения и передача данных между ними, а также расшифровки встреч, если вы их включите.',
        },
        {
          title: 'Что никогда не покидает компьютер',
          text: 'Заголовки и содержимое окон. Отправляются только категории и анонимные события.',
        },
        {
          title: 'Правило «от 5 человек»',
          text: 'Discover показывает закономерность, только если она есть минимум у 5 человек, поэтому выделить конкретного сотрудника нельзя.',
        },
      ],
      exampleSignal: 'Пример сигнала',
      anonymized: 'обезличено, 7 человек',
      spreadsheet: 'Таблица',
      crm: 'CRM',
      to: 'в',
      habit: 'копирование и вставка, каждый рабочий день',
      suggested: 'Предложенный черновик:',
      draft: 'автоматически переносить строки таблицы в CRM',
    },
    cta: {
      title: 'Ваша следующая задача может стать первым реальным проектом студенческой команды',
      lead: 'Начните с одного абзаца. Рейтинг подскажет, что добавить, а команду выберете вы.',
    },
  },
};

/** Sections rendered on their own (outside <Landing>) fall back to English and show no switch. */
const LangContext = createContext<{ lang: LandingLang; setLang?: (lang: LandingLang) => void }>({ lang: 'en' });

function useLang() {
  const { lang, setLang } = useContext(LangContext);
  return { lang, t: T[lang], setLang };
}

function readSavedLang(): LandingLang | null {
  try {
    const value = window.localStorage.getItem(LANG_KEY);
    return value === 'en' || value === 'ru' ? value : null;
  } catch {
    return null;
  }
}

/** "EN | RU" in the approved brutal-tab style: separate bordered boxes, the active one lime with a hard shadow. */
function LangSwitch({
  lang,
  label,
  onChange,
  className,
}: {
  lang: LandingLang;
  label: string;
  onChange: (lang: LandingLang) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={clsx('flex items-center gap-2', className)}>
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => onChange(code)}
            className={clsx(
              'inline-flex min-h-10 min-w-11 cursor-pointer items-center justify-center rounded-control border-2 border-border px-3 font-display text-sm font-extrabold tracking-[0.08em]',
              'transition-[background-color,box-shadow,translate] duration-150 motion-reduce:transition-none',
              'focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:outline-hidden',
              active
                ? 'bg-accent text-accent-foreground shadow-[3px_3px_0_var(--foreground)] -translate-x-px -translate-y-px'
                : 'bg-surface text-foreground hover:bg-accent-soft',
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Motion helpers

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** True when the user asked for less motion. False on the server. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Reveal-on-scroll: `shown` turns true once the element enters the viewport and stays true.
 * Under reduced motion it is true right away, so nothing waits for a scroll.
 */
export function useReveal<T extends Element = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -8% 0px',
}: { threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, inView, threshold, rootMargin]);

  return { ref, shown: inView || reduced, reduced };
}

/** Fade and slide up once in view. `delay` in ms staggers siblings. */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={clsx(
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'motion-safe:translate-y-6 motion-safe:opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Animated number: eases from the previous value to `target` while `active`. Reduced motion returns `target`. */
function useCountUp(target: number, active: boolean, duration = 700) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!active || reduced) return;
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, reduced, duration]);

  return reduced ? target : value;
}

/** 2808000 -> "2 808 000" (non-breaking spaces, so the number never wraps). */
function formatNumber(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function levelOf(score: number): Level {
  if (score >= 90) return 'priority';
  if (score >= 70) return 'ready';
  if (score >= 40) return 'working';
  return 'draft';
}

// ---------------------------------------------------------------------------------------------------------------
// Shared section chrome

function SectionHead({
  id,
  eyebrow,
  title,
  lead,
  onDark = false,
  className,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={clsx('max-w-2xl', className)}>
      <p
        className={clsx(
          'flex items-center gap-2 font-display text-xs font-bold tracking-[0.14em] uppercase',
          onDark ? 'text-white/60' : 'text-muted',
        )}
      >
        <span aria-hidden="true" className="size-2 shrink-0 bg-accent" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-3 text-3xl leading-tight font-extrabold text-balance sm:text-4xl">
        {title}
      </h2>
      {lead ? (
        <p className={clsx('mt-4 text-base sm:text-lg', onDark ? 'text-white/70' : 'text-muted')}>{lead}</p>
      ) : null}
    </Reveal>
  );
}

const sectionPad = 'py-20 sm:py-28';

// ---------------------------------------------------------------------------------------------------------------
// 1. Hero

// HACK: demo examples for the live ticker, not real catalog data (they are labelled "Example" in the UI).
// Titles live in T.<lang>.hero.ticker, in the same order.
const TICKER_SCORES = [72, 45, 91] as const;

function HeroTicker() {
  const { lang, t } = useLang();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % TICKER_SCORES.length), 2800);
    return () => window.clearInterval(id);
  }, [reduced]);

  const shownIndex = reduced ? 0 : index;
  const score = TICKER_SCORES[shownIndex];
  const level = levelOf(score);
  return (
    <div className="mx-auto mt-10 flex w-full max-w-xl items-stretch border-2 border-border bg-surface text-sm shadow-card">
      <span className="flex shrink-0 items-center gap-2 border-r-2 border-border bg-primary px-3 py-2 font-display text-xs font-bold tracking-[0.12em] text-primary-foreground uppercase">
        <span aria-hidden="true" className="led" />
        {t.hero.example}
      </span>
      <span className="relative flex min-w-0 flex-1 items-center overflow-hidden px-3 py-2" aria-live="off">
        {/* Phones: the title takes its own line, so the score and badge wrap instead of being clipped. */}
        <span
          key={index}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 transition-[opacity,translate] duration-300 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none sm:flex-nowrap"
        >
          <span className="min-w-0 truncate font-medium max-sm:basis-full">{t.hero.ticker[shownIndex]}</span>
          <span aria-hidden="true" className="text-muted max-sm:hidden">·</span>
          <span className="shrink-0 font-extrabold tabular-nums">{t.hero.rated(score)}</span>
          <LevelBadge level={level} locale={lang} className="ml-auto shrink-0" />
        </span>
      </span>
    </div>
  );
}

export function LandingHero({
  businessHref = '/business/new',
  catalogHref = '/catalog',
  className,
}: {
  businessHref?: string;
  catalogHref?: string;
  className?: string;
}) {
  const { lang, t, setLang } = useLang();
  const enter =
    'transition-[opacity,translate] duration-500 ease-out starting:translate-y-4 starting:opacity-0 motion-reduce:transition-none';
  return (
    <section
      aria-labelledby="landing-hero-title"
      className={clsx(
        'relative -mx-4 flex min-h-[80svh] flex-col items-center justify-center overflow-hidden border-y-2 border-border bg-background px-4 py-16 sm:mx-0 sm:border-2 sm:px-8 sm:shadow-card',
        className,
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <GridBackground />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <HeroPulse className="h-auto w-[min(640px,140vw)] -translate-y-[12%]" />
      </div>

      {setLang ? (
        <LangSwitch
          lang={lang}
          label={t.langLabel}
          onChange={setLang}
          className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4"
        />
      ) : null}

      <div className="relative flex w-full max-w-3xl flex-col items-center text-center">
        <div className={enter}>
          <Logo size="xl" className="sm:text-7xl md:text-8xl" />
        </div>
        <h1
          id="landing-hero-title"
          className={clsx(
            'mt-8 text-3xl leading-[1.1] font-extrabold text-balance sm:text-5xl',
            enter,
            'delay-100',
          )}
        >
          {t.hero.title}
        </h1>
        <p className={clsx('mt-5 max-w-2xl text-base text-muted text-pretty sm:text-lg', enter, 'delay-200')}>
          {t.hero.lead}
        </p>
        <div
          className={clsx('mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center', enter, 'delay-300')}
        >
          <Link href={businessHref} className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}>
            {t.hero.describe}
          </Link>
          <Link
            href={catalogHref}
            className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-full shadow-card sm:w-auto' })}
          >
            {t.hero.find} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <HeroTicker />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Pain

const PAIN_ICONS = [Building2, GraduationCap, Landmark] as const;

function PainCard({ item, index }: { item: Copy['pain']['items'][number]; index: number }) {
  const { t } = useLang();
  const { ref, shown } = useReveal<HTMLLIElement>({ threshold: 0.3 });
  const Icon = PAIN_ICONS[index];
  const lit = { transitionDelay: shown ? `${450 + index * 180}ms` : '0ms' } satisfies CSSProperties;
  return (
    <li
      ref={ref}
      style={{ transitionDelay: shown ? `${index * 120}ms` : '0ms' }}
      className={clsx(
        'flex flex-col border-2 border-border bg-surface shadow-card',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'motion-safe:translate-y-8 motion-safe:opacity-0',
      )}
    >
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-bold">
          <span className="grid size-9 shrink-0 place-items-center border-2 border-border bg-surface-2">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          {item.who}
        </p>
        <p className="mt-5 text-xl leading-snug font-extrabold text-balance">
          {t.quote[0]}
          {item.pain}
          {t.quote[1]}
        </p>
      </div>
      <div
        style={lit}
        className={clsx(
          'relative border-t-2 border-border p-5 transition-colors duration-500 motion-reduce:transition-none sm:p-6',
          shown ? 'bg-accent-soft' : 'bg-surface-2',
        )}
      >
        <span
          aria-hidden="true"
          style={lit}
          className={clsx(
            'absolute inset-x-0 -top-0.5 h-1.5 origin-left bg-accent transition-transform duration-500 ease-out motion-reduce:transition-none',
            shown ? 'scale-x-100' : 'scale-x-0',
          )}
        />
        <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.1em] uppercase">
          <span
            aria-hidden="true"
            style={lit}
            className={clsx(
              'size-2 shrink-0 transition-[background-color,box-shadow] duration-500 motion-reduce:transition-none',
              shown ? 'bg-accent shadow-glow' : 'bg-level-draft',
            )}
          />
          {t.pain.solves}
        </p>
        <p className="mt-2 text-sm text-foreground">{item.fix}</p>
      </div>
    </li>
  );
}

export function PainSection({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <section aria-labelledby="landing-pain-title" className={clsx(sectionPad, className)}>
      <SectionHead id="landing-pain-title" eyebrow={t.pain.eyebrow} title={t.pain.title} lead={t.pain.lead} />
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {t.pain.items.map((item, i) => (
          <PainCard key={i} item={item} index={i} />
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 3. How it works

// Illustrations for the steps in T.<lang>.how.steps, in the same order.
const STEP_ARTS = [StepDraft, StepQuestions, StepCard, StepRating, StepPublish] as const;

export function HowItWorks({ className }: { className?: string }) {
  const { t } = useLang();
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = listRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const anchor = window.innerHeight * 0.6;
      const next = Math.min(1, Math.max(0, (anchor - rect.top) / Math.max(1, rect.height)));
      setProgress((prev) => (Math.abs(prev - next) < 0.002 ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  const shownProgress = reduced ? 1 : progress;
  const steps = t.how.steps;

  return (
    <section aria-labelledby="landing-how-title" className={clsx(sectionPad, className)}>
      <div className="grid gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start">
          <SectionHead id="landing-how-title" eyebrow={t.how.eyebrow} title={t.how.title} lead={t.how.lead} />
          <Reveal delay={150} className="mt-8 hidden md:block">
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="tabular-nums">{Math.round(shownProgress * 100)}%</span>
              <span className="relative h-2 flex-1 border-2 border-border bg-surface">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 origin-left bg-accent"
                  style={{ width: '100%', transform: `scaleX(${shownProgress})` }}
                />
              </span>
              <span className="text-muted">{t.how.ofPath}</span>
            </div>
          </Reveal>
        </div>

        <div className="relative">
          <span aria-hidden="true" className="absolute top-2 bottom-2 left-[30px] w-1 bg-surface-2" />
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[30px] w-1 origin-top bg-accent"
            style={{ transform: `scaleY(${shownProgress})` }}
          />
          <ol ref={listRef} className="relative grid gap-8 sm:gap-10">
          {steps.map((step, i) => {
            const active = shownProgress >= (i + 0.35) / steps.length;
            const Art = STEP_ARTS[i];
            return (
              <li key={i} className="relative flex gap-5">
                <span
                  className={clsx(
                    'relative grid size-16 shrink-0 place-items-center border-2 border-border transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none',
                    active ? 'bg-accent-soft shadow-accent' : 'bg-surface',
                  )}
                >
                  <Art size={40} animated={!reduced} />
                </span>
                <Reveal delay={60} className="min-w-0 flex-1 pt-1">
                  <p className="font-display text-xs font-bold tracking-[0.14em] text-muted uppercase">
                    {t.how.stepOf(i + 1, steps.length)}
                  </p>
                  <h3 className="mt-1 flex items-center gap-2 text-xl font-extrabold">
                    {step.title}
                    {active ? <Check aria-hidden="true" className="size-5 text-accent-strong" /> : null}
                  </h3>
                  <p className="mt-2 text-sm text-muted sm:text-base">{step.text}</p>
                </Reveal>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Impact calculator

type CalcField = {
  key: CalcKey;
  min: number;
  max: number;
  sliderMin: number;
  sliderMax: number;
  step: number;
  initial: number;
};

// Labels, hints and units live in T.<lang>.calc.fields.
const CALC_FIELDS: CalcField[] = [
  { key: 'people', min: 1, max: 50, sliderMin: 1, sliderMax: 50, step: 1, initial: 6 },
  { key: 'hours', min: 1, max: 20, sliderMin: 1, sliderMax: 20, step: 1, initial: 3 },
  { key: 'rate', min: 0, max: 1_000_000, sliderMin: 500, sliderMax: 20_000, step: 500, initial: 3000 },
];

const WEEKS_PER_YEAR = 52;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseField(text: string, field: CalcField) {
  const n = Number(text.replace(/[\s ]/g, ''));
  return Number.isFinite(n) && text.trim() !== '' ? clampNumber(Math.round(n), field.min, field.max) : field.min;
}

function CalcInput({
  field,
  copy,
  text,
  onText,
}: {
  field: CalcField;
  copy: { label: string; hint: string; unit: string };
  text: string;
  onText: (text: string) => void;
}) {
  const id = useId();
  const value = parseField(text, field);
  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={`${id}-n`} className="min-w-0">
          <span className="block text-sm font-bold">{copy.label}</span>
          <span id={`${id}-h`} className="block text-xs text-muted">{copy.hint}</span>
        </label>
        <span className="flex shrink-0 items-center gap-1.5">
          <input
            id={`${id}-n`}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            step={field.key === 'rate' ? 100 : 1}
            value={text}
            aria-describedby={`${id}-h`}
            onChange={(e) => onText(e.target.value)}
            onBlur={() => onText(String(value))}
            className={clsx(controlBase, 'h-10 w-24 px-2 text-right font-bold tabular-nums')}
          />
          <span aria-hidden="true" className="w-12 text-xs text-muted">{copy.unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={field.sliderMin}
        max={field.sliderMax}
        step={field.step}
        value={clampNumber(value, field.sliderMin, field.sliderMax)}
        aria-label={copy.label}
        aria-valuetext={`${formatNumber(value)} ${copy.unit}`}
        onChange={(e) => onText(e.target.value)}
        className="h-6 w-full cursor-pointer accent-[var(--accent-strong)]"
      />
    </div>
  );
}

export function ImpactCalculator({
  businessHref = '/business/new',
  className,
}: {
  businessHref?: string;
  className?: string;
}) {
  const { t } = useLang();
  const [texts, setTexts] = useState<Record<CalcKey, string>>(() => ({
    people: String(CALC_FIELDS[0].initial),
    hours: String(CALC_FIELDS[1].initial),
    rate: String(CALC_FIELDS[2].initial),
  }));
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.25 });

  const [people, hours, rate] = CALC_FIELDS.map((f) => parseField(texts[f.key], f));
  const hoursYear = people * hours * WEEKS_PER_YEAR;
  const moneyYear = hoursYear * rate;

  const hoursShown = useCountUp(hoursYear, shown);
  const moneyShown = useCountUp(moneyYear, shown);

  return (
    <section aria-labelledby="landing-calc-title" className={clsx(sectionPad, className)}>
      <SectionHead id="landing-calc-title" eyebrow={t.calc.eyebrow} title={t.calc.title} lead={t.calc.lead} />

      <Reveal delay={100} className="mt-12">
        <div className="grid border-2 border-border bg-surface shadow-card lg:grid-cols-2">
          <div className="grid content-start gap-7 p-5 sm:p-8">
            {CALC_FIELDS.map((field) => (
              <CalcInput
                key={field.key}
                field={field}
                copy={t.calc.fields[field.key]}
                text={texts[field.key]}
                onText={(text) => setTexts((prev) => ({ ...prev, [field.key]: text }))}
              />
            ))}
            <p className="border-2 border-dashed border-border bg-surface-2 p-3 text-xs text-muted">
              {t.calc.formula(WEEKS_PER_YEAR)}
            </p>
            <Link
              href={businessHref}
              className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto sm:justify-self-start' })}
            >
              {t.calc.cta}
            </Link>
          </div>

          <div ref={ref} className="flex flex-col border-t-2 border-border bg-primary p-5 text-primary-foreground sm:p-8 lg:border-t-0 lg:border-l-2">
            <p className="inline-flex items-center gap-2 self-start border-2 border-accent px-2 py-1 font-display text-xs font-bold tracking-[0.12em] text-accent uppercase">
              <span aria-hidden="true" className="size-1.5 shrink-0 bg-accent" />
              {t.calc.estimate}
            </p>

            <div aria-hidden="true" className="mt-8 grid gap-8">
              <div>
                <p className="text-sm text-white/60">{t.calc.hoursLost}</p>
                <p className="mt-1 text-5xl leading-none font-extrabold tabular-nums sm:text-6xl">
                  {formatNumber(hoursShown)}
                  <span className="ml-2 text-2xl text-white/60">{t.calc.hoursUnit}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60">{t.calc.moneyLost}</p>
                <p className="mt-1 text-4xl leading-none font-extrabold [overflow-wrap:anywhere] tabular-nums sm:text-6xl">
                  {formatNumber(moneyShown)}
                  <span className="ml-2 text-accent">₸</span>
                </p>
              </div>
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {t.calc.srEstimate(formatNumber(hoursYear), formatNumber(moneyYear))}
            </p>

            <div className="mt-auto grid gap-3 pt-10 text-sm">
              <p className="flex gap-3 border-t-2 border-white/15 pt-4">
                <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{t.calc.teamNote}</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-white/15 pt-4">
                <span className="border border-white/40 px-1.5 text-[11px] font-bold tracking-[0.08em] text-white/70 uppercase">
                  {t.calc.example}
                </span>
                <span>{t.calc.startAt}</span>
                <b className="font-extrabold tabular-nums">~35</b>
                <ArrowRight aria-label={t.calc.then} className="size-4 text-accent" />
                <span>{t.calc.reach}</span>
                <b className="font-extrabold text-accent tabular-nums">80+</b>
                <span>{t.calc.after}</span>
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 5. Rating showcase

// Level names and lines live in T.<lang>.rating.levels.
const SHOWCASE: { score: number; level: Level }[] = [
  { score: 12, level: 'draft' },
  { score: 45, level: 'working' },
  { score: 72, level: 'ready' },
  { score: 91, level: 'priority' },
];

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

const RING_STROKE: Record<Level, string> = {
  draft: 'stroke-level-draft',
  working: 'stroke-level-working',
  ready: 'stroke-level-ready',
  priority: 'stroke-level-priority',
};

export function RatingShowcase({ className }: { className?: string }) {
  const { lang, t } = useLang();
  const { ref, shown, reduced } = useReveal<HTMLDivElement>({ threshold: 0.4 });
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!shown || reduced || !auto || stage >= SHOWCASE.length - 1) return;
    const id = window.setTimeout(() => setStage((s) => s + 1), 1700);
    return () => window.clearTimeout(id);
  }, [shown, reduced, auto, stage]);

  const current = reduced && auto ? SHOWCASE.length - 1 : stage;
  const target = SHOWCASE[current];
  const value = useCountUp(target.score, shown, 900);
  const shownScore = Math.round(value);
  const level = levelOf(shownScore);

  return (
    <section aria-labelledby="landing-rating-title" className={clsx(sectionPad, className)}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHead id="landing-rating-title" eyebrow={t.rating.eyebrow} title={t.rating.title} lead={t.rating.lead} />
          <ul className="mt-8 grid gap-3">
            {SHOWCASE.map((s, i) => {
              const on = level === s.level;
              const copy = t.rating.levels[s.level];
              return (
                <li key={s.level}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setAuto(false);
                      setStage(i);
                    }}
                    className={clsx(
                      'flex w-full cursor-pointer items-start gap-3 border-2 border-border p-3 text-left transition-[background-color,box-shadow,translate] duration-200 motion-reduce:transition-none',
                      'focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:outline-hidden',
                      on ? 'bg-surface shadow-accent motion-safe:-translate-y-0.5' : 'bg-surface-2 hover:bg-surface',
                    )}
                  >
                    {/* Russian level names are longer ("Приоритетная"), so the badge column is a bit wider. */}
                    <span className={clsx('shrink-0', lang === 'ru' ? 'w-32' : 'w-28')}>
                      <LevelBadge level={s.level} locale={lang} />
                    </span>
                    <span className="min-w-0 text-sm">
                      <b className="block font-bold">{copy.name}</b>
                      <span className="text-muted">{copy.line}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <Reveal delay={120}>
          <div ref={ref} className="relative mx-auto flex max-w-md flex-col items-center border-2 border-border bg-surface p-6 shadow-card sm:p-8">
            <p className="self-start font-display text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.rating.exampleTask}</p>
            <div
              role="img"
              aria-label={t.rating.ringLabel(target.score, t.rating.levels[target.level].name)}
              className="relative mt-4 size-52 sm:size-60"
            >
              <svg viewBox="0 0 200 200" aria-hidden="true" className="size-full -rotate-90">
                <circle cx="100" cy="100" r={RING_R} fill="none" strokeWidth="14" className="stroke-surface-2" />
                <circle
                  cx="100"
                  cy="100"
                  r={RING_R}
                  fill="none"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - value / 100)}
                  className={clsx(RING_STROKE[level], 'transition-[stroke] duration-300 motion-reduce:transition-none')}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl leading-none font-extrabold tabular-nums sm:text-7xl">{shownScore}</span>
                <span className="mt-1 text-xs text-muted">{t.rating.of100}</span>
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <LevelBadge key={level} level={level} locale={lang} className="transition-[scale] duration-300 starting:scale-75 motion-reduce:transition-none" />
              {reduced ? null : (
                <button
                  type="button"
                  onClick={() => {
                    setStage(0);
                    setAuto(true);
                  }}
                  className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                >
                  <RotateCcw aria-hidden="true" /> {t.rating.replay}
                </button>
              )}
            </div>
            <ol aria-hidden="true" className="mt-5 grid w-full grid-cols-4 gap-1">
              {SHOWCASE.map((s) => (
                <li
                  key={s.level}
                  className={clsx(
                    'h-2 border-2 border-border transition-colors duration-300 motion-reduce:transition-none',
                    shownScore >= s.score ? 'bg-accent' : 'bg-surface-2',
                  )}
                />
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 6. Collector

// Icons for the points in T.<lang>.collector.points, in the same order.
const COLLECTOR_ICONS = [Check, EyeOff, ShieldCheck] as const;

export function CollectorSection({
  href,
  serverUrl,
  version,
  sizeLabel,
  className,
}: {
  /** Windows build URL, passed to CollectorDownload. */
  href?: string;
  serverUrl?: string;
  version?: string;
  sizeLabel?: string;
  className?: string;
}) {
  const { t } = useLang();
  return (
    <section aria-labelledby="landing-collector-title" className={clsx(sectionPad, className)}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <div className="relative overflow-hidden border-2 border-border bg-surface shadow-card">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <GridBackground />
            </div>
            <div className="relative flex items-center justify-center gap-2 px-4 pt-8 sm:gap-4">
              <CollectorLaptop className="h-auto w-[44%] max-w-[220px]" />
              <ArrowRight aria-hidden="true" className="size-6 shrink-0" />
              <PrivacyShield className="h-auto w-[44%] max-w-[220px]" />
            </div>
            {/* HACK: illustrative signal for the demo, not real collected data. */}
            <div className="relative m-4 mt-6 border-2 border-border bg-background p-4 sm:m-6">
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <span className="border-2 border-border bg-surface-2 px-1.5 font-bold tracking-[0.08em] uppercase">
                  {t.collector.exampleSignal}
                </span>
                <span className="text-muted">{t.collector.anonymized}</span>
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="border-2 border-border bg-surface px-2 py-0.5">{t.collector.spreadsheet}</span>
                <ArrowRight aria-label={t.collector.to} className="size-4" />
                <span className="border-2 border-border bg-surface px-2 py-0.5">{t.collector.crm}</span>
                <span className="font-medium text-muted">{t.collector.habit}</span>
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm">
                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 bg-accent" />
                <span>
                  {t.collector.suggested} <b className="font-bold">{t.collector.draft}</b>
                </span>
              </p>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHead
            id="landing-collector-title"
            eyebrow={t.collector.eyebrow}
            title={t.collector.title}
            lead={t.collector.lead}
          />
          <ul className="mt-8 grid gap-4">
            {t.collector.points.map((point, i) => {
              const Icon = COLLECTOR_ICONS[i];
              return (
                <li key={i}>
                  <Reveal delay={i * 100} className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center border-2 border-border bg-accent">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <b className="block font-bold">{point.title}</b>
                      <span className="text-sm text-muted">{point.text}</span>
                    </span>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Reveal delay={100} className="mt-14">
        <CollectorDownload href={href} serverUrl={serverUrl} version={version} sizeLabel={sizeLabel} />
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 7. Final call to action

export function FinalCta({
  businessHref = '/business/new',
  catalogHref = '/catalog',
  className,
}: {
  businessHref?: string;
  catalogHref?: string;
  className?: string;
}) {
  const { t } = useLang();
  return (
    <section aria-labelledby="landing-cta-title" className={clsx('pt-8 pb-20 sm:pb-28', className)}>
      <Reveal>
        <div className="relative -mx-4 overflow-hidden border-y-2 border-border bg-primary px-5 py-14 text-primary-foreground sm:mx-0 sm:border-2 sm:px-10 sm:py-16 sm:shadow-[8px_8px_0_var(--accent)]">
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-2xl">
              <Logo size="md" onDark />
              <h2 id="landing-cta-title" className="mt-5 text-3xl leading-tight font-extrabold text-balance sm:text-5xl">
                {t.cta.title}
              </h2>
              <p className="mt-4 text-white/70 sm:text-lg">{t.cta.lead}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
              <Link
                href={businessHref}
                className={buttonClasses({
                  variant: 'accent',
                  size: 'lg',
                  className: 'w-full border-surface! shadow-[4px_4px_0_var(--surface)]! sm:w-auto',
                })}
              >
                <span aria-hidden="true" className="size-2 shrink-0 bg-foreground motion-safe:animate-pulse" />
                {t.hero.describe}
              </Link>
              <Link
                href={catalogHref}
                className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-full sm:w-auto' })}
              >
                {t.hero.find} <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Whole page

export type LandingProps = {
  /** "Describe a task" target. Default /business/new. */
  businessHref?: string;
  /** "Find a project" target. Default /catalog. */
  catalogHref?: string;
  /** Windows Collector build URL. Without it CollectorDownload shows "Coming soon". */
  collectorHref?: string;
  /** Server address shown in the Collector install steps. */
  serverUrl?: string;
  collectorVersion?: string;
  collectorSizeLabel?: string;
  className?: string;
};

export function Landing({
  businessHref = '/business/new',
  catalogHref = '/catalog',
  collectorHref,
  serverUrl,
  collectorVersion,
  collectorSizeLabel,
  className,
}: LandingProps) {
  // Starts in English on the server and on the first client render; a saved choice is applied after hydration.
  const [lang, setLang] = useState<LandingLang>('en');

  useEffect(() => {
    const saved = readSavedLang();
    if (!saved || saved === 'en') return;
    const id = requestAnimationFrame(() => setLang(saved));
    return () => cancelAnimationFrame(id);
  }, []);

  // While the landing is mounted the document language follows the switch; the previous value comes back on unmount.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);

  const choose = (next: LandingLang) => {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  };

  return (
    <LangContext value={{ lang, setLang: choose }}>
      <div lang={lang} className={className}>
        <LandingHero businessHref={businessHref} catalogHref={catalogHref} />
        <PainSection />
        <HowItWorks />
        <ImpactCalculator businessHref={businessHref} />
        <RatingShowcase />
        <CollectorSection href={collectorHref} serverUrl={serverUrl} version={collectorVersion} sizeLabel={collectorSizeLabel} />
        <FinalCta businessHref={businessHref} catalogHref={catalogHref} />
      </div>
    </LangContext>
  );
}
