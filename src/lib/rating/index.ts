// Deterministic readiness rating (PLAN.md §1, §5). Pure code, no AI. Owner: A.
// STUB (H1): valid zero Rating + the exported signatures; real scoring lands in H2.
import type { Level, NextAction, PositionPreview, Rating, RatingComponent, RatingKey, TaskCard } from '@/lib/types';

export const RATING_MAX: Record<RatingKey, { label: string; max: number }> = {
  contextNeed: { label: 'Context & need', max: 20 },
  data: { label: 'Data & materials', max: 20 },
  expectedResult: { label: 'Expected result', max: 15 },
  successCriteria: { label: 'Success criteria (measurable)', max: 15 },
  constraints: { label: 'Constraints', max: 10 },
  users: { label: 'Users', max: 10 },
  contact: { label: 'Business contact & format', max: 10 },
};

const FIELD_FOR_KEY: Record<RatingKey, NextAction['field']> = {
  contextNeed: 'context', data: 'data', expectedResult: 'expectedResult', successCriteria: 'successCriteria',
  constraints: 'constraints', users: 'users', contact: 'contact',
};

export function levelFor(total: number): Level {
  if (total >= 90) return 'priority';
  if (total >= 70) return 'ready';
  if (total >= 40) return 'working';
  return 'draft';
}

export type RatableCard = Pick<TaskCard, 'fields' | 'confirmed'>;

export function rateCard(_card: RatableCard): Rating {
  const components: RatingComponent[] = (Object.keys(RATING_MAX) as RatingKey[]).map((key) => ({
    key,
    label: RATING_MAX[key].label,
    max: RATING_MAX[key].max,
    points: 0,
    reasons: [],
    checks: [{ label: 'Filled and confirmed', passed: false, points: 0, rule: 'Points only for filled AND confirmed fields' }],
    hints: [{ text: `Fill and confirm: ${RATING_MAX[key].label}`, gain: RATING_MAX[key].max }],
  }));
  const nextActions: NextAction[] = components
    .flatMap((c) => c.hints.map((h) => ({ field: FIELD_FOR_KEY[c.key], text: h.text, gain: h.gain })))
    .sort((a, b) => b.gain - a.gain);
  return { total: 0, level: levelFor(0), components, nextActions, vagueness: [] };
}

// The ONE catalog ordering rule: rating desc, ready/priority boosted, newer first on ties. Higher = earlier.
export function catalogSortKey(card: Pick<TaskCard, 'publishedAt' | 'createdAt'>, rating: Rating): number {
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
  const improved: Rating = { ...mine, total: Math.min(100, mine.total + action.gain) };
  improved.level = levelFor(improved.total);
  return { position, of: others.length + 1, ifNext: { action, position: rank(catalogSortKey(card, improved)) } };
}
