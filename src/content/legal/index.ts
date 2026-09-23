// Legal content of Көпір (owner: B; texts by Islam Shagatayev, lawyer).
// Source of truth: the .md files in this folder. docs.generated.ts embeds them as strings.
import { LEGAL_RAW, type LegalRawSlug } from './docs.generated';
import { parseMarkdown, type ParsedDoc } from './markdown';
import clausesData from './clauses.json';

export type { Block, ParsedDoc } from './markdown';
export type LegalSlug = LegalRawSlug | 'collector';

/** Values for {{placeholders}} known in the MVP. Anything else renders as an empty highlighted field. */
export const LEGAL_DEFAULTS: Record<string, string> = {
  aiProviders: 'OpenAI, NVIDIA',
  hostingProvider: 'Vercel',
  operatorName: 'будет указано при запуске',
  operatorBin: 'будет указано при запуске',
  operatorAddress: 'будет указано при запуске',
  operatorEmail: 'будет указано при запуске',
  acceptanceDays: '5',
};

// Consent to anonymized work analytics for the Windows Collector (not part of the markdown pack).
const COLLECTOR_MD = `---
slug: collector
title: Согласие на обезличенную аналитику работы
version: "1.0"
updated: "2026-09-23"
---

# Согласие на обезличенную аналитику работы

Условия использования приложения КӨПІР Collector в компании.

## 1. Что собирает Collector

Трекер активности: категорию активного приложения (например, «таблица», «CRM», «почта») и факты переноса данных между приложениями. Названия окон, тексты документов и нажатия клавиш не покидают компьютер.

Заметки встреч: звук встречи и расшифровку, только когда пользователь сам включил этот переключатель. Участники встречи должны быть предупреждены о записи.

Каналы связи: сообщения рабочей группы, в которых имена заменены ролями.

## 2. Обезличивание

До анализа идентификатор устройства заменяется псевдонимом и удаляется при агрегировании. Показываются только недельные показатели команды. Паттерн отображается, только если в нем участвуют не менее 5 человек, остальное скрывается.

Результаты нельзя использовать для оценки, наказания или увольнения конкретного работника. Цель одна: найти процессы, которые стоит автоматизировать силами студенческих команд.

## 3. Обязанности компании

Компания, которая устанавливает Collector, обязуется заранее уведомить работников о сборе обезличенной аналитики, получить их согласие и предоставить возможность в любой момент приостановить сбор.

## 4. Контроль работника

Каждый переключатель можно выключить в окне приложения. Сбор приостанавливается сразу. Работник вправе запросить удаление данных, собранных с его устройства.
`;

export const LEGAL_DOCS = Object.fromEntries([
  ...Object.entries(LEGAL_RAW).map(([slug, raw]) => [slug, parseMarkdown(slug, raw)]),
  ['collector', parseMarkdown('collector', COLLECTOR_MD)],
]) as Record<LegalSlug, ParsedDoc>;

/** Documents linked in the footer, in this order. */
export const LEGAL_LIST: ParsedDoc[] = [
  LEGAL_DOCS.terms,
  LEGAL_DOCS.privacy,
  LEGAL_DOCS['rating-rules'],
  LEGAL_DOCS['ai-notice'],
];

export function isLegalSlug(slug: string): slug is LegalSlug {
  return slug in LEGAL_DOCS;
}

/** Text of the consent checkbox from consent.md frontmatter. */
export const CONSENT_LABEL = LEGAL_DOCS.consent.meta.checkboxLabel ?? 'Я даю согласие на обработку персональных данных';
/** Banner shown next to every AI result until a person confirms it (ai-notice.md frontmatter). */
export const AI_BANNER_TEXT =
  LEGAL_DOCS['ai-notice'].meta.bannerText ?? 'Подготовлено с помощью ИИ. Проверьте и подтвердите перед публикацией.';

/** Options for the "Collaboration terms" block of a task card (see README.md in this folder). */
export const COLLAB_CLAUSES = clausesData;
