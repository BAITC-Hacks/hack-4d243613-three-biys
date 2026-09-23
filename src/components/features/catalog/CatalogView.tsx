'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Level } from '@/lib/types';
import { useStore } from '@/lib/store';
import { getCatalog, LEVELS, topicsOf, type CatalogOptions } from '@/lib/catalog';
import { useHydrated } from '../useHydrated';
import { ProjectCard } from '@/components/domain';

export function CatalogView() {
  const hydrated = useHydrated();
  const cards = useStore((s) => s.cards);
  const [q, setQ] = useState<CatalogOptions>({ sort: 'rating' });
  if (!hydrated) return null;

  const items = getCatalog(cards, q);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Project catalog</h1>
      <div className="flex flex-wrap gap-3 text-sm">
        <select className="rounded-control border-2 border-border bg-surface px-2 py-1" value={q.topic ?? ''}
          onChange={(e) => setQ({ ...q, topic: e.target.value || undefined })}>
          <option value="">All topics</option>
          {topicsOf(cards).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="rounded-control border-2 border-border bg-surface px-2 py-1" value={q.level ?? ''}
          onChange={(e) => setQ({ ...q, level: (e.target.value || undefined) as Level | undefined })}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="rounded-control border-2 border-border bg-surface px-2 py-1" value={q.sort}
          onChange={(e) => setQ({ ...q, sort: e.target.value as CatalogOptions['sort'] })}>
          <option value="rating">Sort by rating</option>
          <option value="new">Newest first</option>
        </select>
      </div>
      {items.length === 0 && <p className="text-muted">No published projects match these filters.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ card, rating }) => (
          <Link key={card.id} href={`/catalog/${card.id}`}
            className={`block transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${rating.level === 'priority' ? 'rounded-control ring-2 ring-accent' : ''}`}>
            <ProjectCard card={card} rating={rating} />
            {rating.level === 'draft' && (
              <p className="mt-1 px-1 text-xs text-amber-700">Needs clarification — you can still send a proposal.</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
