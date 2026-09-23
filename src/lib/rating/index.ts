// Deterministic readiness rating (PLAN.md §1, §5). Pure code, no AI. Owner: A.
//
// Rules (also documented in README "Rating formula"):
// - A component earns points ONLY if its field(s) are filled AND confirmed by the business.
// - Each component has transparent checks; every check has a rule text and a point value.
// - "Measurable" checks look for numbers / % / time units / comparison words in the text.
// - Vagueness detector flags phrases like "ASAP", "etc.", "some data", "improve efficiency".
import type {
  CardField, Level, NextAction, PositionPreview, Rating, RatingComponent, RatingKey, TaskCard, VaguenessFlag,
} from '@/lib/types';

export const RATING_MAX: Record<RatingKey, { label: string; max: number }> = {
  contextNeed: { label: 'Context & need', max: 20 },
  data: { label: 'Data & materials', max: 20 },
  expectedResult: { label: 'Expected result', max: 15 },
  successCriteria: { label: 'Success criteria (measurable)', max: 15 },
  constraints: { label: 'Constraints', max: 10 },
  users: { label: 'Users', max: 10 },
  contact: { label: 'Business contact & format', max: 10 },
};

export const FIELD_FOR_KEY: Record<RatingKey, CardField> = {
  contextNeed: 'context', data: 'data', expectedResult: 'expectedResult', successCriteria: 'successCriteria',
  constraints: 'constraints', users: 'users', contact: 'contact',
};

// Points a field is worth (used by /api/ai/clarify to rank questions by gain).
export const GAIN_FOR_FIELD: Record<CardField, number> = {
  title: 0, context: 10, need: 10, data: 20, expectedResult: 15, successCriteria: 15, constraints: 10, users: 10, contact: 10,
};

export function levelFor(total: number): Level {
  if (total >= 90) return 'priority';
  if (total >= 70) return 'ready';
  if (total >= 40) return 'working';
  return 'draft';
}

export type RatableCard = Pick<TaskCard, 'fields' | 'confirmed'>;

const MEASURABLE = /(\d+\s*%|\d+(\.\d+)?\s*(sec|second|min|minute|hour|day|week|month|year|ms|kzt|tenge|₸|\$|usd|orders?|users?|records?|items?|errors?|x\b))|\b(zero|no more than|at least|under|below|above|less than|more than|per (day|week|month))\b|\d+/i;
const TIME_OR_TECH = /(\d+\s*(day|week|month|year)s?|deadline|by\s+\d|\bapi\b|\bsql\b|\bpython\b|\bexcel\b|\bcrm\b|\berp\b|\b1c\b|no access|only|must|cannot|can't|not allowed|budget)/i;
const CONTACT_LIKE = /(@|\+?\d[\d\s-]{6,}|telegram|whatsapp|email|call|meeting|weekly|daily|chat|slack|teams|zoom|manager|head of|cto|ceo|director)/i;
const HAS_CHANGE_VERB = /(want|need|should|must|automate|reduce|remove|replace|build|create|improve|speed|cut|stop|избав|хотим|нужно|автоматиз|сократ|убрать)/i;

const VAGUE: { re: RegExp; ask: string }[] = [
  { re: /\basap\b/i, ask: 'Give a concrete deadline (e.g. "by 15 November").' },
  { re: /\betc\.?\b|\band so on\b|\bи т\.?д\.?/i, ask: 'List the items explicitly instead of "etc."' },
  { re: /\bsome (data|files|documents|examples?|users?|people)\b/i, ask: 'Name the exact data/files/users and where they are.' },
  { re: /\bimprove (efficiency|productivity|performance|process(es)?)\b/i, ask: 'State what to improve, by how much and how you will measure it.' },
  { re: /\bautomate it\b|\bautomate everything\b/i, ask: 'Which exact steps should be automated, from what input to what output?' },
  { re: /\bas soon as possible\b|\bквартал\b|\bкак можно (скорее|быстрее)\b/i, ask: 'Give a concrete deadline.' },
  { re: /\bbetter\b|\bfaster\b|\beasier\b/i, ask: 'Replace "better/faster" with a measurable target.' },
];

function filledAndConfirmed(card: RatableCard, field: CardField): { filled: boolean; confirmed: boolean; text: string } {
  const text = (card.fields[field] ?? '').trim();
  return { filled: text.length >= 8, confirmed: !!card.confirmed[field], text };
}

function words(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

type Check = RatingComponent['checks'][number];

function component(key: RatingKey, checks: Check[], hints: RatingComponent['hints']): RatingComponent {
  const points = Math.min(RATING_MAX[key].max, checks.filter((c) => c.passed).reduce((s, c) => s + c.points, 0));
  return {
    key, label: RATING_MAX[key].label, max: RATING_MAX[key].max, points,
    reasons: checks.filter((c) => c.passed).map((c) => `${c.label} (+${c.points})`),
    checks, hints,
  };
}

// A field earns its base points only if filled AND confirmed; extra quality checks add on top, also gated by confirm.
function gated(card: RatableCard, field: CardField, label: string, basePoints: number, extra: { label: string; points: number; rule: string; test: (t: string) => boolean }[] = []) {
  const f = filledAndConfirmed(card, field);
  const gate = f.filled && f.confirmed;
  const checks: Check[] = [
    { label: `${label}: filled`, passed: f.filled, points: 0, rule: 'At least a short sentence is provided (≥ 8 characters)' },
    { label: `${label}: confirmed by business`, passed: gate, points: basePoints, rule: 'Points only for filled AND confirmed fields' },
    ...extra.map((e) => ({ label: e.label, passed: gate && e.test(f.text), points: e.points, rule: e.rule })),
  ];
  const hints: RatingComponent['hints'] = [];
  const total = basePoints + extra.reduce((s, e) => s + e.points, 0);
  if (!f.filled) hints.push({ text: `Add ${label.toLowerCase()}`, gain: total });
  else if (!f.confirmed) hints.push({ text: `Confirm ${label.toLowerCase()}`, gain: total });
  else extra.filter((e) => !e.test(f.text)).forEach((e) => hints.push({ text: e.rule, gain: e.points }));
  return { checks, hints };
}

export function rateCard(card: RatableCard): Rating {
  const ctx = gated(card, 'context', 'Context', 8, [
    { label: 'Context describes the current situation', points: 2, rule: 'Describe the current process in ≥ 12 words', test: (t) => words(t) >= 12 },
  ]);
  const need = gated(card, 'need', 'Need', 8, [
    { label: 'Need states what must change', points: 2, rule: 'Say what should change (a verb like automate / reduce / replace)', test: (t) => HAS_CHANGE_VERB.test(t) },
  ]);
  const contextNeed = component('contextNeed', [...ctx.checks, ...need.checks], [...ctx.hints, ...need.hints]);

  const data = component('data', ...Object.values(gated(card, 'data', 'Data & materials', 14, [
    { label: 'Names concrete sources or examples', points: 6, rule: 'Mention concrete files, systems, samples or access (e.g. "Excel export", "CRM API")', test: (t) => /(excel|csv|xlsx|json|api|export|sample|example|database|db|crm|erp|1c|sheet|dataset|log|report|access|документ|выгрузк|пример|таблиц|база)/i.test(t) },
  ])) as [Check[], RatingComponent['hints']]);

  const expectedResult = component('expectedResult', ...Object.values(gated(card, 'expectedResult', 'Expected result', 10, [
    { label: 'Result is a concrete deliverable', points: 5, rule: 'Name the deliverable (script, service, dashboard, bot, report, prototype…)', test: (t) => /(script|service|app|dashboard|bot|report|prototype|integration|module|tool|api|website|mvp|model|сервис|скрипт|бот|отчет|отчёт|прототип|приложени|дашборд)/i.test(t) },
  ])) as [Check[], RatingComponent['hints']]);

  const successCriteria = component('successCriteria', ...Object.values(gated(card, 'successCriteria', 'Success criteria', 7, [
    { label: 'Criteria are measurable', points: 8, rule: 'Include a number, %, time or threshold (e.g. "entry time −80%", "zero duplicates")', test: (t) => MEASURABLE.test(t) },
  ])) as [Check[], RatingComponent['hints']]);

  const constraints = component('constraints', ...Object.values(gated(card, 'constraints', 'Constraints', 6, [
    { label: 'Mentions deadline, technology or access limits', points: 4, rule: 'State a deadline, required tech, or access/permission boundaries', test: (t) => TIME_OR_TECH.test(t) },
  ])) as [Check[], RatingComponent['hints']]);

  const users = component('users', ...Object.values(gated(card, 'users', 'Users', 7, [
    { label: 'Users are specific', points: 3, rule: 'Name the role and how many (e.g. "6 sales managers")', test: (t) => /\d/.test(t) || /(manager|operator|accountant|dispatcher|customer|client|student|teacher|doctor|driver|admin|менеджер|оператор|бухгалтер|клиент|водител|диспетчер)/i.test(t) },
  ])) as [Check[], RatingComponent['hints']]);

  const contact = component('contact', ...Object.values(gated(card, 'contact', 'Contact & format', 6, [
    { label: 'Contact person and interaction format', points: 4, rule: 'Name a contact role and the format of consultations (e.g. weekly call, chat)', test: (t) => CONTACT_LIKE.test(t) },
  ])) as [Check[], RatingComponent['hints']]);

  const components = [contextNeed, data, expectedResult, successCriteria, constraints, users, contact];
  const total = Math.min(100, components.reduce((s, c) => s + c.points, 0));

  const nextActions: NextAction[] = components
    .flatMap((c) => c.hints.map((h) => ({ field: FIELD_FOR_KEY[c.key], text: h.text, gain: h.gain })))
    .sort((a, b) => b.gain - a.gain);
  // contextNeed hints belong to two fields: fix the field for "need" hints
  for (const a of nextActions) if (/\bneed\b/i.test(a.text) && a.field === 'context') a.field = 'need';

  const vagueness: VaguenessFlag[] = [];
  for (const field of Object.keys(card.fields) as CardField[]) {
    const text = card.fields[field];
    if (!text) continue;
    for (const v of VAGUE) {
      const m = text.match(v.re);
      if (m) vagueness.push({ field, phrase: m[0], ask: v.ask });
    }
  }

  return { total, level: levelFor(total), components, nextActions, vagueness };
}

// The ONE catalog ordering rule: rating desc, ready/priority boosted, newer first on ties. Higher = earlier.
export function catalogSortKey(card: Pick<TaskCard, 'publishedAt' | 'createdAt'>, rating: Pick<Rating, 'total' | 'level'>): number {
  const boost = rating.level === 'priority' ? 20 : rating.level === 'ready' ? 10 : 0;
  const t = Date.parse(card.publishedAt ?? card.createdAt) || 0;
  return (rating.total + boost) * 1e13 + t;
}

export function positionPreview(card: TaskCard, publishedCards: TaskCard[]): PositionPreview {
  const mine = rateCard(card);
  const others = publishedCards.filter((c) => c.id !== card.id).map((c) => catalogSortKey(c, rateCard(c)));
  const rank = (key: number) => others.filter((k) => k > key).length + 1;
  const position = rank(catalogSortKey(card, mine));
  const action = mine.nextActions[0];
  if (!action) return { position, of: others.length + 1 };
  const total = Math.min(100, mine.total + action.gain);
  return { position, of: others.length + 1, ifNext: { action, position: rank(catalogSortKey(card, { total, level: levelFor(total) })) } };
}
