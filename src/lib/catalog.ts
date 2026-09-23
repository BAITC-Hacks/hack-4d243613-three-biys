// Catalog sort/filter + rule-based matching — owner: C. Contract signatures (PLAN.md §5); C fills in the logic.
import type { Level, Match, TaskCard, TeamProfile } from '@/lib/types';
import { catalogSortKey, rateCard } from '@/lib/rating';

export interface CatalogOptions { topic?: string; level?: Level; sort: 'rating' | 'new' }

export function getCatalog(cards: TaskCard[], opts: CatalogOptions): { card: TaskCard; rating: ReturnType<typeof rateCard> }[] {
  const rows = cards
    .filter((c) => c.status === 'published')
    .map((card) => ({ card, rating: rateCard(card) }))
    .filter((r) => (opts.topic ? r.card.topic === opts.topic : true))
    .filter((r) => (opts.level ? r.rating.level === opts.level : true));
  if (opts.sort === 'new') return rows.sort((a, b) => (b.card.publishedAt ?? '').localeCompare(a.card.publishedAt ?? ''));
  return rows.sort((a, b) => catalogSortKey(b.card, b.rating) - catalogSortKey(a.card, a.rating));
}

export function matchTasks(team: TeamProfile, cards: TaskCard[]): Match[] {
  // STUB: overlap of team interests/skills/tech with task topic/skillsNeeded; level >= working only.
  const mine = new Set([...team.interests, ...team.skills, ...team.tech].map((s) => s.toLowerCase()));
  return getCatalog(cards, { sort: 'rating' })
    .filter((r) => r.rating.level !== 'draft')
    .map((r) => {
      const wants = [r.card.topic, ...r.card.skillsNeeded];
      const reasons = wants.filter((w) => mine.has(w.toLowerCase())).map((w) => `Your team knows ${w} · task needs ${w}`);
      return { taskId: r.card.id, score: reasons.length, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
