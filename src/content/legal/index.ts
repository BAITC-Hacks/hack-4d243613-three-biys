// Legal content of Көпір (owner: B; texts by Islam Shagatayev, lawyer).
// Source of truth: the .md files in this folder. docs.generated.ts embeds them as strings.
import { LEGAL_LANGS, LEGAL_RAW, LEGAL_RAW_BY_LANG, type LegalLang, type LegalRawSlug } from './docs.generated';
import { parseMarkdown, type ParsedDoc } from './markdown';
import clausesData from './clauses.json';
import clausesKk from './kk/clauses.json';
import clausesEn from './en/clauses.json';

export type { Block, ParsedDoc } from './markdown';
export { LEGAL_LANGS, type LegalLang };
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
const LIST_SLUGS = ['terms', 'privacy', 'rating-rules', 'ai-notice'] as const;
export const LEGAL_LIST: ParsedDoc[] = LIST_SLUGS.map((s) => LEGAL_DOCS[s]);

/**
 * Russian (root) and Kazakh (kk/) are legally binding with equal force; English (en/) is a convenience translation.
 * Every en/kk document carries meta.lang and meta.legalNote (shown above the text). Missing translations fall back to Russian.
 */
export const LEGAL_DOCS_BY_LANG = Object.fromEntries(
  LEGAL_LANGS.map((lang) => [
    lang,
    Object.fromEntries(
      (Object.keys(LEGAL_DOCS) as LegalSlug[]).map((slug) => {
        const raw = slug === 'collector' ? undefined : LEGAL_RAW_BY_LANG[lang][slug];
        return [slug, raw ? parseMarkdown(slug, raw) : LEGAL_DOCS[slug]];
      }),
    ),
  ]),
) as Record<LegalLang, Record<LegalSlug, ParsedDoc>>;

export function isLegalLang(lang: unknown): lang is LegalLang {
  return typeof lang === 'string' && (LEGAL_LANGS as readonly string[]).includes(lang);
}

/** Document in the requested language (default ru, the official text). */
export function getLegalDoc(slug: LegalSlug, lang: LegalLang = 'ru'): ParsedDoc {
  return LEGAL_DOCS_BY_LANG[lang][slug];
}

/** Footer list in the requested language. */
export function getLegalList(lang: LegalLang = 'ru'): ParsedDoc[] {
  return LIST_SLUGS.map((s) => LEGAL_DOCS_BY_LANG[lang][s]);
}

export function isLegalSlug(slug: string): slug is LegalSlug {
  return slug in LEGAL_DOCS;
}

/** Text of the consent checkbox from consent.md frontmatter, in the interface language. */
export const getConsentLabel = (lang: LegalLang = 'en') =>
  LEGAL_DOCS_BY_LANG[lang].consent.meta.checkboxLabel ?? LEGAL_DOCS.consent.meta.checkboxLabel ?? '';
/** Banner shown next to every AI result until a person confirms it (ai-notice.md frontmatter). */
export const getAiBannerText = (lang: LegalLang = 'en') =>
  LEGAL_DOCS_BY_LANG[lang]['ai-notice'].meta.bannerText ?? LEGAL_DOCS['ai-notice'].meta.bannerText ?? '';
/** Russian texts, kept for existing imports. */
export const CONSENT_LABEL = getConsentLabel('ru');
export const AI_BANNER_TEXT = getAiBannerText('ru');

/** Options for the "Collaboration terms" block of a task card (see README.md in this folder). */
export const COLLAB_CLAUSES = clausesData;
export const COLLAB_CLAUSES_BY_LANG = { ru: clausesData, kk: clausesKk, en: clausesEn } as const;
