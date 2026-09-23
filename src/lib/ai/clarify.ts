// /api/ai/clarify logic: extract what the draft states, ask ≥3 questions ranked by rating gain. Owner: A.
import { callJson, loadPrompt } from '@/lib/llm';
import { GAIN_FOR_FIELD, isPlaceholder } from '@/lib/rating';
import { ClarifyResponseSchema, type ClarifyRequest, type ClarifyResponse } from '@/lib/schemas';
import type { AgentStep, CardField } from '@/lib/types';

type Lang = 'ru' | 'en';
const LABEL: Record<Lang, Record<CardField, string>> = {
  en: { title: 'title', context: 'current situation', need: 'what needs to change', users: 'who will use the solution', data: 'available data and materials', constraints: 'constraints (deadline, tech, access)', expectedResult: 'expected result', successCriteria: 'success criteria', contact: 'contact person and meeting format' },
  ru: { title: 'название', context: 'текущая ситуация', need: 'что нужно изменить', users: 'кто будет пользоваться решением', data: 'доступные данные и материалы', constraints: 'ограничения (сроки, технологии, доступы)', expectedResult: 'ожидаемый результат', successCriteria: 'критерии успеха', contact: 'контактное лицо и формат взаимодействия' },
};
const TEMPLATE: Record<Lang, Partial<Record<CardField, string>>> = {
  en: {
    context: 'What happens today — who does what, and where does it go wrong?',
    need: 'What exactly should change after the students finish?',
    data: 'What data, files or examples can you give the team (and in what format)?',
    expectedResult: 'What concrete result do you expect from the team — a service, a script, a report?',
    successCriteria: 'How will you measure success? Give a number, a percentage or a deadline.',
    users: 'Who will use the solution, and how many people?',
    constraints: 'What are the constraints: deadline, technologies, access to systems?',
    contact: 'Who is the contact person, and how often can the team meet with you?',
  },
  ru: {
    context: 'Что происходит сейчас: кто что делает и где возникает проблема?',
    need: 'Что именно должно измениться после работы студентов?',
    data: 'Какие данные, файлы или примеры вы можете дать команде и в каком формате?',
    expectedResult: 'Какой конкретный результат вы ждёте от команды: сервис, скрипт, отчёт?',
    successCriteria: 'Как вы поймёте, что задача решена? Укажите число, процент или срок.',
    users: 'Кто будет пользоваться решением и сколько таких людей?',
    constraints: 'Какие есть ограничения: сроки, технологии, доступы к системам?',
    contact: 'Кто контактное лицо и как часто команда может с вами созваниваться?',
  },
};
const WHY: Record<Lang, string> = { en: 'Missing in the draft', ru: 'Не указано в черновике' };
const MAX_QUESTIONS = 8;

// Cyrillic draft → Russian questions (Kazakh drafts are Cyrillic too; Russian is the shared fallback).
function langOf(text: string): Lang {
  const cyr = (text.match(/[Ѐ-ӿ]/g) ?? []).length;
  const lat = (text.match(/[a-z]/gi) ?? []).length;
  return cyr > lat ? 'ru' : 'en';
}

export async function clarify(req: ClarifyRequest, trace: AgentStep[]): Promise<ClarifyResponse> {
  const system = await loadPrompt('clarify');
  const lang = langOf(req.draftText);
  const user = JSON.stringify({ draftText: req.draftText, industry: req.industry ?? null, alreadyKnownFields: req.fields ?? {}, answerLanguage: lang === 'ru' ? 'Russian' : 'English' }, null, 2);
  const out = await callJson({ endpoint: 'clarify', system, user, schema: ClarifyResponseSchema, trace });

  // Never let the model "extract" a field the draft doesn't contain; "N/A" / "не указано" count as missing.
  const extracted = { ...out.extracted };
  for (const [k, v] of Object.entries(extracted) as [CardField, string | null][]) {
    if (isPlaceholder(v)) extracted[k] = null;
    else if (v && k !== 'title' && !req.fields?.[k] && !overlaps(req.draftText, v)) extracted[k] = null;
  }
  const known = (f: CardField) => !!extracted[f] || !isPlaceholder(req.fields?.[f]);

  // One question per field (first wins), only for fields that are still missing; gain comes from the rating engine.
  const byField = new Map<CardField, ClarifyResponse['questions'][number]>();
  for (const q of out.questions) {
    if (q.field === 'title' || byField.has(q.field) || known(q.field)) continue;
    byField.set(q.field, { ...q, gain: GAIN_FOR_FIELD[q.field] });
  }
  // Always ask about every missing scored field, highest weight first (data, context/need, result, success, …).
  const missing = (Object.keys(TEMPLATE[lang]) as CardField[])
    .filter((f) => !known(f) && !byField.has(f))
    .sort((a, b) => GAIN_FOR_FIELD[b] - GAIN_FOR_FIELD[a]);
  for (const f of missing) {
    byField.set(f, { id: `q-${f}`, field: f, question: TEMPLATE[lang][f]!, why: `${WHY[lang]}: ${LABEL[lang][f]}`, gain: GAIN_FOR_FIELD[f] });
  }
  const questions = [...byField.values()]
    .map((q, i) => ({ ...q, id: q.id || `q${i + 1}` }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, MAX_QUESTIONS);
  return { extracted, questions };
}

// Cheap grounding check: at least half of the content words of the value appear in the draft.
function overlaps(draft: string, value: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 3);
  const d = new Set(norm(draft));
  const v = norm(value);
  if (!v.length) return true;
  return v.filter((w) => d.has(w)).length / v.length >= 0.5;
}
