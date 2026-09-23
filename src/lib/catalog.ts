// Catalog sort/filter + rule-based matching — owner: C. Contract signatures (PLAN.md §5).
import type { Level, Match, Rating, TaskCard, TeamProfile } from '@/lib/types';
import { catalogSortKey, rateCard } from '@/lib/rating';

export const LEVELS: Level[] = ['draft', 'working', 'ready', 'priority'];
const levelRank = (l: Level) => LEVELS.indexOf(l);

export interface CatalogItem { card: TaskCard; rating: Rating }
export interface CatalogOptions { topic?: string; level?: Level; sort: 'rating' | 'new' }

/** Published cards only. Low rating never hides a card — filters are the user's choice. */
export function getCatalog(cards: TaskCard[], opts: CatalogOptions): CatalogItem[] {
  const rows = cards
    .filter((c) => c.status === 'published')
    .filter((c) => !opts.topic || c.topic === opts.topic)
    .map((card) => ({ card, rating: rateCard(card) }))
    .filter((r) => !opts.level || r.rating.level === opts.level);

  if (opts.sort === 'new') {
    const t = (r: CatalogItem) => Date.parse(r.card.publishedAt ?? r.card.createdAt) || 0;
    return rows.sort((a, b) => t(b) - t(a));
  }
  return rows.sort((a, b) => catalogSortKey(b.card, b.rating) - catalogSortKey(a.card, a.rating));
}

export function topicsOf(cards: TaskCard[]): string[] {
  return [...new Set(cards.filter((c) => c.status === 'published').map((c) => c.topic))].sort();
}

const norm = (s: string) => s.trim().toLowerCase();

/** Rule-based matches for a team: published tasks with level ≥ working. Never restricts the catalog. */
export function matchTasks(team: TeamProfile, cards: TaskCard[]): Match[] {
  const interests = new Map(team.interests.map((s) => [norm(s), s]));
  const know = new Map([...team.skills, ...team.tech].map((s) => [norm(s), s]));

  const matches: Match[] = [];
  for (const { card, rating } of getCatalog(cards, { sort: 'rating' })) {
    if (levelRank(rating.level) < levelRank('working')) continue;

    const reasons: string[] = [];
    let score = 0;
    const topic = interests.get(norm(card.topic));
    if (topic) {
      score += 2;
      reasons.push(`Your team is interested in ${topic} · task topic is ${card.topic}`);
    }
    for (const skill of card.skillsNeeded) {
      const own = know.get(norm(skill));
      if (own) {
        score += 1;
        reasons.push(`Your team knows ${own} · task needs ${skill}`);
      }
    }
    if (score > 0) matches.push({ taskId: card.id, score, reasons });
  }
  return matches.sort((a, b) => b.score - a.score);
}
